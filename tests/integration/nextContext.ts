// Next.js request-scope stub.
//
// `cookies()` from next/headers reads an async-local store that only exists
// inside a real request. Integration tests invoke route handlers directly, so
// any handler reaching cookies() — every unauthenticated path through
// resolveRequestUser(), which falls back to the session cookie when there's no
// Bearer token — throws "called outside a request scope" instead of behaving.
//
// This stubs the framework's request context, never the code under test:
// a plain in-memory cookie jar with the same shape. Requests authenticate via
// real API tokens, so the jar starts empty and an unauthenticated call gets a
// clean 401, exactly as it would in production.

import { vi } from "vitest";

type Cookie = { name: string; value: string };

const jar = new Map<string, string>();

/** Seed or clear the stubbed cookie jar — for tests that exercise cookie auth. */
export function setTestCookie(name: string, value: string) {
  jar.set(name, value);
}
export function clearTestCookies() {
  jar.clear();
}

vi.mock("next/headers", () => ({
  cookies: () => ({
    get: (name: string): Cookie | undefined => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
    getAll: (): Cookie[] => Array.from(jar, ([name, value]) => ({ name, value })),
    has: (name: string) => jar.has(name),
    set: (name: string | { name: string; value: string }, value?: string) => {
      if (typeof name === "string") jar.set(name, value ?? "");
      else jar.set(name.name, name.value);
    },
    delete: (name: string) => jar.delete(name),
  }),
  headers: () => new Headers(),
}));
