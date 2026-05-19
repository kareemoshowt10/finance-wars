import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { parseBody } from "@/lib/validate";
import { ACTIVE_HOUSEHOLD_COOKIE, isMember } from "@/lib/household";

const schema = z.object({ householdId: z.string().min(1) });

export async function POST(req: NextRequest) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const { data, error } = await parseBody(req, schema);
  if (error) return error;
  if (!(await isMember(r.user.id, data.householdId))) return bad("Forbidden", 403);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ACTIVE_HOUSEHOLD_COOKIE, data.householdId, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
