import { NextResponse } from "next/server";
import { ZodSchema, ZodError } from "zod";

export type ApiError = { error: string; fields?: Record<string, string> };

export function errorResponse(error: string, status = 400, fields?: Record<string, string>) {
  const body: ApiError = { error };
  if (fields) body.fields = fields;
  return NextResponse.json(body, { status });
}

export async function parseBody<T>(
  req: Request,
  schema: ZodSchema<T>
): Promise<{ data: T; error: null } | { data: null; error: NextResponse }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { data: null, error: errorResponse("Invalid JSON", 400) };
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    const fields: Record<string, string> = {};
    for (const issue of (result.error as ZodError).issues) {
      const path = issue.path.join(".") || "_";
      if (!fields[path]) fields[path] = issue.message;
    }
    return {
      data: null,
      error: errorResponse("Validation failed", 422, fields),
    };
  }
  return { data: result.data, error: null };
}
