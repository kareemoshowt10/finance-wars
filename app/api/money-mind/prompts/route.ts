import { NextRequest } from "next/server";
import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";
import { getPrompts } from "@/lib/moneyMind";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  return ok({ prompts: getPrompts() });
}
