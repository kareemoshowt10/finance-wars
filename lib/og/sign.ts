import { createHmac } from "crypto";

const SECRET = process.env.OG_SECRET || "";

export function isSigningEnabled() {
  return !!SECRET;
}

export function signPayload(payload: string): string {
  if (!SECRET) return "";
  return createHmac("sha256", SECRET).update(payload).digest("hex").slice(0, 16);
}

export function verifyPayload(payload: string, sig: string | null): boolean {
  if (!SECRET) return true; // unsigned allowed (watermark applied)
  if (!sig) return false;
  const expected = signPayload(payload);
  if (expected.length !== sig.length) return false;
  let ok = 0;
  for (let i = 0; i < expected.length; i++) ok |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  return ok === 0;
}

export function buildOgUrl(kind: string, params: Record<string, string | number | undefined>) {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) usp.set(k, String(v));
  }
  const raw = usp.toString();
  if (SECRET) {
    const sig = signPayload(`${kind}?${raw}`);
    usp.set("sig", sig);
  }
  return `/api/og/${kind}?${usp.toString()}`;
}
