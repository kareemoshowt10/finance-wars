// Test data factories and a way to call route handlers directly.
//
// Route handlers are plain functions — `POST(req, { params })` — so there's no
// need for an HTTP server. The only obstacle is authentication, and
// lib/auth.ts's resolveRequestUser() accepts an `Authorization: Bearer
// fw_pat_…` API token as well as a session cookie. Minting a real ApiToken row
// per test user means requests authenticate through the same code path
// production uses, with no cookie or next/headers mocking anywhere.

import { NextRequest } from "next/server";
import { generateApiToken, hashApiToken } from "@/lib/auth";
import { db } from "./setup";

let seq = 0;
const uniq = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${seq++}`;

export type TestUser = { id: string; email: string; name: string; token: string };

/** A user plus a live API token, ready to authenticate requests. */
export async function makeUser(overrides: Partial<{ name: string; email: string }> = {}): Promise<TestUser> {
  const email = overrides.email ?? `${uniq("user")}@example.test`;
  const name = overrides.name ?? "Test User";
  const user = await db.user.create({ data: { email, name, passwordHash: "x" } });
  const token = generateApiToken();
  await db.apiToken.create({
    data: { userId: user.id, tokenHash: hashApiToken(token), name: "integration test" },
  });
  return { id: user.id, email, name, token };
}

/** A household owned by `owner`, with `others` accepted as members. */
export async function makeHousehold(owner: TestUser, others: TestUser[] = [], data: Partial<{ name: string; plan: string; timezone: string }> = {}) {
  const household = await db.household.create({
    data: {
      name: data.name ?? "Test House",
      createdById: owner.id,
      plan: data.plan ?? "free",
      timezone: data.timezone ?? "UTC",
      members: {
        create: [
          { userId: owner.id, role: "OWNER", accepted: true, joinedAt: new Date() },
          ...others.map((u) => ({ userId: u.id, role: "MEMBER", accepted: true, joinedAt: new Date() })),
        ],
      },
    },
  });
  return household;
}

export async function makeChore(householdId: string, createdById: string, data: Partial<{ name: string; frequency: string; category: string; crownValue: number; xpValue: number }> = {}) {
  return db.chore.create({
    data: {
      householdId,
      createdById,
      name: data.name ?? "Dishes",
      emoji: "🧹",
      frequency: data.frequency ?? "DAILY",
      category: data.category ?? "ESSENTIAL",
      crownValue: data.crownValue ?? 10,
      xpValue: data.xpValue ?? 5,
    },
  });
}

export async function makeLoan(householdId: string, lenderUserId: string, borrowerUserId: string, data: Partial<{ principal: number; interestRateApr: number; purpose: string; lastAccruedAt: Date }> = {}) {
  const principal = data.principal ?? 100;
  return db.loan.create({
    data: {
      householdId,
      lenderUserId,
      borrowerUserId,
      principal,
      balanceRemaining: principal,
      interestRateApr: data.interestRateApr ?? 0,
      purpose: data.purpose ?? "Test loan",
      category: "ELECTIVE",
      status: "ACTIVE",
      lastAccruedAt: data.lastAccruedAt ?? new Date(),
    },
  });
}

export async function makeGoal(householdId: string, createdById: string, data: Partial<{ name: string; targetAmount: number; category: string }> = {}) {
  return db.householdGoal.create({
    data: {
      householdId,
      createdById,
      name: data.name ?? "Bathroom remodel",
      emoji: "🛁",
      targetAmount: data.targetAmount ?? 1000,
      category: data.category ?? "ESSENTIAL",
      status: "ACTIVE",
    },
  });
}

type CallOptions = {
  as?: TestUser | null;
  body?: unknown;
  query?: Record<string, string>;
  headers?: Record<string, string>;
  method?: string;
  rawBody?: string;
};

/**
 * Build a NextRequest the way the framework would, authenticated as `as`.
 * `path` only matters for handlers that read nextUrl (query params, origin).
 */
export function buildRequest(path: string, opts: CallOptions = {}): NextRequest {
  const url = new URL(path, "http://localhost:3000");
  for (const [k, v] of Object.entries(opts.query ?? {})) url.searchParams.set(k, v);

  const headers = new Headers({ "Content-Type": "application/json", ...(opts.headers ?? {}) });
  if (opts.as) headers.set("Authorization", `Bearer ${opts.as.token}`);

  const method = opts.method ?? (opts.body !== undefined || opts.rawBody !== undefined ? "POST" : "GET");
  const init: ConstructorParameters<typeof NextRequest>[1] = { method, headers };
  if (opts.rawBody !== undefined) init.body = opts.rawBody;
  else if (opts.body !== undefined) init.body = JSON.stringify(opts.body);

  return new NextRequest(url, init);
}

export type HandlerResult<T = Record<string, unknown>> = { status: number; body: T };

/**
 * Any App Router handler, whatever param shape it declares.
 *
 * Each route types its own context — `{ params: { hid: string; choreId:
 * string } }` and so on — and under strictFunctionTypes none of those accept a
 * plain Record<string, string>. Typing the context as `never` inverts that:
 * `never` is assignable to every param type, so every handler is assignable
 * here, and the one cast in call() supplies the params the tests pass by name.
 */
type RouteHandler = (req: NextRequest, ctx: never) => Promise<Response> | Response;

type LooseHandler = (req: NextRequest, ctx: { params: Record<string, string> }) => Promise<Response> | Response;

/** Invoke a route handler and unwrap its Response into { status, body }. */
export async function call<T = Record<string, unknown>>(
  handler: RouteHandler,
  path: string,
  params: Record<string, string> = {},
  opts: CallOptions = {}
): Promise<HandlerResult<T>> {
  const res = await (handler as LooseHandler)(buildRequest(path, opts), { params });
  const text = await res.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }
  return { status: res.status, body: body as T };
}
