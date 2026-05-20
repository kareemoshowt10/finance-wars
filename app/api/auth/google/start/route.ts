import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { buildAuthUrl, isGoogleAuthConfigured, randomState } from "@/lib/googleAuth";
import { bad } from "@/lib/api";

const STATE_COOKIE = "fw_google_state";
const RETURN_COOKIE = "fw_google_return";

export async function GET(req: NextRequest) {
  if (!isGoogleAuthConfigured()) return bad("Google sign-in not configured", 500);
  const state = randomState();
  const url = new URL(req.url);
  const returnTo = url.searchParams.get("returnTo") || "/dashboard";

  const jar = cookies();
  jar.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 300,
  });
  jar.set(RETURN_COOKIE, returnTo, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 300,
  });

  return NextResponse.redirect(buildAuthUrl(state));
}
