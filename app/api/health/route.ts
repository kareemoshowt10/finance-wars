import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Uptime-monitor target. Deliberately answers two different questions:
 * "is the process serving?" (200 with `database: "up"`) and "can it reach
 * Postgres?" (503 with `database: "down"`), so a paging rule can tell a
 * cold start apart from a database outage.
 *
 * Returns nothing about the environment — this endpoint is public.
 */
export async function GET() {
  const startedAt = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, database: "up", latencyMs: Date.now() - startedAt });
  } catch {
    return NextResponse.json({ ok: false, database: "down", latencyMs: Date.now() - startedAt }, { status: 503 });
  }
}
