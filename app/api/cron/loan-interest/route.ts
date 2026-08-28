import { NextResponse } from "next/server";
import { verifyCron } from "@/lib/cron";
import { accrueAllActiveLoans } from "@/lib/loanAccrual";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const fail = verifyCron(req);
  if (fail) return fail;
  const result = await accrueAllActiveLoans();
  return NextResponse.json({ ok: true, ...result });
}
