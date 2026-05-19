import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { parseBody } from "@/lib/validate";
import { rateLimit, DEFAULT_MUTATION } from "@/lib/ratelimit";
import { log } from "@/lib/audit";
import { getMyHouseholds } from "@/lib/household";

const createSchema = z.object({ name: z.string().min(1).max(80) });

export async function GET(req: NextRequest) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const hs = await getMyHouseholds(r.user.id);
  return ok(hs);
}

export async function POST(req: NextRequest) {
  const rl = rateLimit(req, { key: "households", ...DEFAULT_MUTATION });
  if (rl) return rl;
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const { data, error } = await parseBody(req, createSchema);
  if (error) return error;

  const hh = await prisma.household.create({
    data: {
      name: data.name,
      createdById: r.user.id,
      members: {
        create: { userId: r.user.id, role: "OWNER", accepted: true, joinedAt: new Date() },
      },
      pact: { create: {} },
    },
    include: { pact: true, members: true },
  });
  await log(r.user.id, "household.create", { entity: "household", entityId: hh.id, req });
  return ok(hh);
}
