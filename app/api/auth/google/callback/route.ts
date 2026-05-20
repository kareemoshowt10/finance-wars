import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { signToken, setSessionCookie } from "@/lib/auth";
import { exchangeCodeForProfile, isGoogleAuthConfigured } from "@/lib/googleAuth";
import { seedDefaultCategories } from "@/lib/defaults";
import { log } from "@/lib/audit";

const STATE_COOKIE = "fw_google_state";
const RETURN_COOKIE = "fw_google_return";

function failRedirect(req: NextRequest, reason: string) {
  const url = new URL("/login", req.url);
  url.searchParams.set("error", reason);
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest) {
  if (!isGoogleAuthConfigured()) return failRedirect(req, "google_not_configured");

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");
  if (!code || !stateParam) return failRedirect(req, "missing_code");

  const jar = cookies();
  const expectedState = jar.get(STATE_COOKIE)?.value;
  const returnTo = jar.get(RETURN_COOKIE)?.value || "/dashboard";
  jar.delete(STATE_COOKIE);
  jar.delete(RETURN_COOKIE);
  if (!expectedState || expectedState !== stateParam) return failRedirect(req, "state_mismatch");

  let profile;
  try {
    profile = await exchangeCodeForProfile(code);
  } catch {
    return failRedirect(req, "google_exchange_failed");
  }
  if (!profile.email || profile.email_verified === false) {
    return failRedirect(req, "email_unverified");
  }

  const existingByGoogle = await prisma.user.findUnique({ where: { googleId: profile.sub } });
  let user = existingByGoogle;
  let isNew = false;
  if (!user) {
    const existingByEmail = await prisma.user.findUnique({ where: { email: profile.email } });
    if (existingByEmail) {
      user = await prisma.user.update({
        where: { id: existingByEmail.id },
        data: {
          googleId: profile.sub,
          avatarUrl: profile.picture ?? existingByEmail.avatarUrl,
          name: existingByEmail.name || profile.name || profile.email,
        },
      });
    } else {
      user = await prisma.user.create({
        data: {
          email: profile.email,
          googleId: profile.sub,
          name: profile.name || profile.given_name || profile.email,
          avatarUrl: profile.picture,
        },
      });
      isNew = true;
      await seedDefaultCategories(user.id);
    }
  }

  const token = await signToken({ uid: user.id, email: user.email });
  await setSessionCookie(token);
  await log(user.id, isNew ? "auth.google.signup" : "auth.google.login", {
    entity: "user",
    entityId: user.id,
    req,
  });
  const { touchLoginStreak } = await import("@/lib/streak");
  await touchLoginStreak(user.id).catch(() => {});

  const safeReturn = returnTo.startsWith("/") ? returnTo : "/dashboard";
  return NextResponse.redirect(new URL(safeReturn, req.url));
}
