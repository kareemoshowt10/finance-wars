import { clearSessionCookie, getSession } from "@/lib/auth";
import { ok } from "@/lib/api";
import { log } from "@/lib/audit";

export async function POST(req: Request) {
  const session = await getSession();
  await clearSessionCookie();
  if (session) await log(session.uid, "auth.logout", { entity: "user", entityId: session.uid, req });
  return ok({ success: true });
}
