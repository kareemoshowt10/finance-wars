import { NextRequest, NextResponse } from "next/server";
import { runSeed } from "../../../../prisma/seed";
import { rateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const rl = rateLimit(req, { key: "admin/seed", limit: 1, windowMs: 60_000 });
  if (rl) return rl;
  const token = req.nextUrl.searchParams.get("token") ?? req.headers.get("x-seed-token");
  if (!process.env.SEED_TOKEN || token !== process.env.SEED_TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    await runSeed();
    return NextResponse.json({ ok: true, message: "Seed complete." });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
