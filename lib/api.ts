import { NextResponse } from "next/server";
import { requireUser } from "./auth";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function withUser<T>(
  handler: (user: { id: string; email: string; name: string; currency: string }) => Promise<T>
) {
  const user = await requireUser();
  if (!user) return bad("Unauthorized", 401);
  return handler(user);
}
