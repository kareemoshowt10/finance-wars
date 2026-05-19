import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { parseBody } from "@/lib/validate";
import { rateLimit, DEFAULT_MUTATION } from "@/lib/ratelimit";
import { log } from "@/lib/audit";
import { assertMember } from "@/lib/household";

const schema = z.object({ level: z.enum(["HIDDEN", "BALANCE", "FULL"]) });

export async function POST(req: NextRequest, { params }: { params: { hid: string; aid: string } }) {
  const rl = rateLimit(req, { key: "share-account", ...DEFAULT_MUTATION });
  if (rl) return rl;
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const fb = await assertMember(r.user.id, params.hid);
  if (fb) return fb;

  const acct = await prisma.account.findUnique({ where: { id: params.aid } });
  if (!acct || acct.userId !== r.user.id) return bad("Not your account", 403);

  const { data, error } = await parseBody(req, schema);
  if (error) return error;

  const share = await prisma.accountShare.upsert({
    where: { householdId_accountId: { householdId: params.hid, accountId: params.aid } },
    update: { level: data.level },
    create: {
      householdId: params.hid,
      accountId: params.aid,
      ownerUserId: r.user.id,
      level: data.level,
    },
  });
  await log(r.user.id, "household.share", {
    entity: "account",
    entityId: params.aid,
    meta: { level: data.level },
    req,
  });
  return ok(share);
}
