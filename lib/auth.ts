import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { createHash, randomBytes } from "crypto";
import { prisma } from "./prisma";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-change-me"
);
const COOKIE_NAME = "fw_session";
const ALG = "HS256";

export type JwtPayload = { uid: string; email: string };

export async function signToken(payload: JwtPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET);
}

export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return { uid: payload.uid as string, email: payload.email as string };
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSessionCookie() {
  cookies().delete(COOKIE_NAME);
}

export async function getSession(): Promise<JwtPayload | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export function hashApiToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateApiToken(): string {
  const bytes = randomBytes(20);
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0, value = 0, out = "";
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += alphabet[(value << (5 - bits)) & 31];
  return "fw_pat_" + out.slice(0, 32);
}

const tokenTouches = new Map<string, number>();

export async function resolveRequestUser(
  req?: Request
): Promise<{ user: NonNullable<Awaited<ReturnType<typeof prisma.user.findUnique>>>; viaToken: boolean } | null> {
  if (req) {
    const auth = req.headers.get("authorization");
    if (auth && auth.toLowerCase().startsWith("bearer ")) {
      const raw = auth.slice(7).trim();
      if (raw.startsWith("fw_pat_")) {
        const hash = hashApiToken(raw);
        const token = await prisma.apiToken.findUnique({ where: { tokenHash: hash } });
        if (token && !token.revokedAt) {
          const user = await prisma.user.findUnique({ where: { id: token.userId } });
          if (user) {
            const now = Date.now();
            const last = tokenTouches.get(token.id) || 0;
            if (now - last > 60_000) {
              tokenTouches.set(token.id, now);
              prisma.apiToken
                .update({ where: { id: token.id }, data: { lastUsedAt: new Date() } })
                .catch(() => {});
            }
            return { user, viaToken: true };
          }
        }
        return null;
      }
    }
  }
  const session = await getSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({ where: { id: session.uid } });
  if (!user) return null;
  return { user, viaToken: false };
}

export async function requireUser() {
  const r = await resolveRequestUser();
  return r?.user ?? null;
}

export async function requireUserFromReq(req: Request) {
  return resolveRequestUser(req);
}

export const SESSION_COOKIE = COOKIE_NAME;
