import { resolveRequestUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";

export async function GET(req: Request) {
  const r = await resolveRequestUser(req);
  if (!r) return bad("Unauthorized", 401);
  const user = r.user;
  return ok({
    id: user.id,
    email: user.email,
    name: user.name,
    currency: user.currency,
    theme: user.theme,
    onboarded: user.onboarded,
  });
}
