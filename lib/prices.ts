import { prisma } from "./prisma";

function hashStr(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededRand(seed: number) {
  // mulberry32
  return function () {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic daily walk per symbol: stable on a given day. */
function computePrice(symbol: string, date: Date): number {
  const sym = symbol.toUpperCase();
  const baseSeed = hashStr(sym);
  const base = 50 + (baseSeed % 451); // 50–500
  // walk over ~365 days, but cheap: pseudo-walk from epoch days
  const day = Math.floor(date.getTime() / 86_400_000);
  let price = base;
  // Use last 60 days to compose the walk deterministically
  for (let i = 0; i < 60; i++) {
    const r = seededRand(baseSeed ^ (day - i))();
    price *= 1 + (r - 0.5) * 0.02; // ±1% daily
  }
  return Math.max(1, Math.round(price * 100) / 100);
}

export async function getQuote(symbol: string) {
  const sym = symbol.toUpperCase();
  const existing = await prisma.priceQuote.findUnique({ where: { symbol: sym } });
  const now = Date.now();
  if (existing && now - existing.asOf.getTime() < 60 * 60 * 1000) return existing;
  const price = computePrice(sym, new Date());
  const upserted = await prisma.priceQuote.upsert({
    where: { symbol: sym },
    create: { symbol: sym, price, asOf: new Date() },
    update: { price, asOf: new Date() },
  });
  return upserted;
}

export async function getQuotes(symbols: string[]) {
  const unique = Array.from(new Set(symbols.map((s) => s.toUpperCase())));
  const out: Record<string, { price: number; asOf: Date }> = {};
  await Promise.all(
    unique.map(async (s) => {
      const q = await getQuote(s);
      out[s] = { price: q.price, asOf: q.asOf };
    })
  );
  return out;
}
