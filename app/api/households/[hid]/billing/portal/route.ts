import { NextRequest } from "next/server";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { assertOwner } from "@/lib/household";
import { createPortalSession } from "@/lib/billing";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { hid: string } }) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const fb = await assertOwner(r.user.id, params.hid);
  if (fb) return fb;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
  try {
    const url = await createPortalSession(params.hid, appUrl);
    return ok({ url });
  } catch (err) {
    return bad(err instanceof Error ? err.message : "Could not open billing portal", 500);
  }
}
