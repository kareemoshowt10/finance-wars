import { NextRequest } from "next/server";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { getInflationReport } from "@/lib/lifestyleInflation";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const report = await getInflationReport(r.user.id);
  return ok(report);
}
