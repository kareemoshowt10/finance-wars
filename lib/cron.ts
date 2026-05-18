import { NextResponse } from "next/server";

export function verifyCron(req: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  // In production CRON_SECRET must be set. In dev we allow it.
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
    }
    return null;
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
