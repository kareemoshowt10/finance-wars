import { NextRequest } from "next/server";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { assertOwner } from "@/lib/household";
import { downgradeToFree } from "@/lib/billing";
import { log } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { hid: string } }) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const fb = await assertOwner(r.user.id, params.hid);
  if (fb) return fb;

  try {
    await downgradeToFree(params.hid);
    await log(r.user.id, "billing.downgrade", { entity: "Household", entityId: params.hid, req });
    return ok({ plan: "free" });
  } catch (err) {
    return bad(err instanceof Error ? err.message : "Could not downgrade", 500);
  }
}
