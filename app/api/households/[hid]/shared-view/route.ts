import { NextRequest } from "next/server";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { assertMember } from "@/lib/household";
import { getSharedView } from "@/lib/sharing";

export async function GET(req: NextRequest, { params }: { params: { hid: string } }) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const fb = await assertMember(r.user.id, params.hid);
  if (fb) return fb;
  const url = new URL(req.url);
  const cursor = url.searchParams.get("cursor") || undefined;
  const pageSizeRaw = parseInt(url.searchParams.get("pageSize") || "50", 10);
  const pageSize = Math.min(200, Math.max(1, isNaN(pageSizeRaw) ? 50 : pageSizeRaw));
  const view = await getSharedView(r.user.id, params.hid, { cursor, pageSize });
  return ok(view);
}
