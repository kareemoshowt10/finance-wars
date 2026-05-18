import { NextResponse } from "next/server";
import { requireUser, resolveRequestUser } from "./auth";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function bad(message: string, status = 400, fields?: Record<string, string>) {
  const body: { error: string; fields?: Record<string, string> } = { error: message };
  if (fields) body.fields = fields;
  return NextResponse.json(body, { status });
}

export async function withUser<T>(
  handler: (user: { id: string; email: string; name: string; currency: string }) => Promise<T>
) {
  const user = await requireUser();
  if (!user) return bad("Unauthorized", 401);
  return handler(user);
}

export type AuthResult = NonNullable<Awaited<ReturnType<typeof resolveRequestUser>>>;
