import { NextRequest } from "next/server";
import { z } from "zod";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { assertOwner } from "@/lib/household";
import { startUpgrade } from "@/lib/billing";
import { log } from "@/lib/audit";

export const dynamic = "force-dynamic";

const schema = z.object({ planId: z.enum(["rhythm", "household_hq"]) });

export async function POST(req: NextRequest, { params }: { params: { hid: string } }) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const fb = await assertOwner(r.user.id, params.hid);
  if (fb) return fb;

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return bad("Invalid plan", 400);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;

  try {
    const result = await startUpgrade(params.hid, parsed.data.planId, r.user.email, appUrl);
    await log(r.user.id, "billing.checkout", { entity: "Household", entityId: params.hid, meta: { planId: parsed.data.planId }, req });
    return ok(result);
  } catch (err) {
    return bad(err instanceof Error ? err.message : "Could not start checkout", 500);
  }
}
