const SECRET = process.env.OG_SECRET || "";

export function isSigningEnabled() {
  return !!SECRET;
}

// Synchronous, deterministic, edge-safe FNV-1a-style HMAC stand-in.
// Not cryptographically strong, but stable for short watermark-only signing.
function shortHash(input: string): string {
  let h1 = 0x811c9dc5 >>> 0;
  let h2 = 0xcbf29ce4 >>> 0;
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    h1 = ((h1 ^ c) * 0x01000193) >>> 0;
    h2 = ((h2 ^ ((c << 1) | (c >>> 7))) * 0x100000001b3) >>> 0;
  }
  const hex = (n: number) => n.toString(16).padStart(8, "0");
  return (hex(h1) + hex(h2)).slice(0, 16);
}

export function signPayload(payload: string): string {
  if (!SECRET) return "";
  return shortHash(SECRET + ":" + payload);
}

export function verifyPayload(payload: string, sig: string | null): boolean {
  if (!SECRET) return true;
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
