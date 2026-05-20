import { NextResponse } from "next/server";
import { verifyCron } from "@/lib/cron";
import { settleMonth, previousMonthKey } from "@/lib/predictions";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const fail = verifyCron(req);
  if (fail) return fail;
  const prev = previousMonthKey();
  const result = await settleMonth(prev);
  return NextResponse.json({ ok: true, month: prev, ...result });
}
