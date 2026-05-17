import { requireUser } from "@/lib/auth";
import { bad, ok } from "@/lib/api";

export async function GET() {
  const user = await requireUser();
  if (!user) return bad("Unauthorized", 401);
  return ok({
    id: user.id,
    email: user.email,
    name: user.name,
    currency: user.currency,
    theme: user.theme,
    onboarded: user.onboarded,
  });
}
