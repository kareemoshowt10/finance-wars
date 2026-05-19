import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { assertMember } from "@/lib/household";
import { buildAgenda } from "@/lib/moneyDate";

export async function GET(req: NextRequest, { params }: { params: { hid: string; mdid: string } }) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const fb = await assertMember(r.user.id, params.hid);
  if (fb) return fb;
  const md = await prisma.moneyDate.findUnique({ where: { id: params.mdid } });
  if (!md || md.householdId !== params.hid) return bad("Not found", 404);
  const agenda = await buildAgenda(params.hid);
  // Cache the snapshot on the record for offline access
  await prisma.moneyDate.update({
    where: { id: md.id },
    data: { agenda: agenda as never },
  });
  return ok({ moneyDate: md, agenda });
}
