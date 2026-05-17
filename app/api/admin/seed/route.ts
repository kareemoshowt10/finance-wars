import { NextRequest, NextResponse } from "next/server";
import { runSeed } from "../../../../prisma/seed";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? req.headers.get("x-seed-token");
  if (!process.env.SEED_TOKEN || token !== process.env.SEED_TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    await runSeed();
    return NextResponse.json({ ok: true, message: "Seeded. Login: demo@financewars.app / demo1234" });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
