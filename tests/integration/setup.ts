// Integration-test bootstrap.
//
// These tests run against a REAL Postgres, not a mocked Prisma client. Mocking
// Prisma only proves that a function called Prisma; for interest accrual, plan
// limits and permission checks, whether the *query* is right is the entire
// question.
//
// The database is named by TEST_DATABASE_URL (or a `debtsucker_test` default),
// created and migrated once per run by tests/integration/globalSetup.ts, and
// truncated between test files by resetDb() below.

import { PrismaClient } from "@prisma/client";

export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL || "postgresql://debtsucker:debtsucker@localhost:5432/debtsucker_test";

// Every module under test imports the singleton from lib/prisma, which reads
// DATABASE_URL at construction — so it has to point at the test database
// before anything else is imported. vitest.integration.config.ts sets this in
// `env`, and this line is the belt to that suspenders.
process.env.DATABASE_URL = TEST_DATABASE_URL;
process.env.DIRECT_URL = TEST_DATABASE_URL;
process.env.JWT_SECRET = process.env.JWT_SECRET || "integration-test-secret";

export const db = new PrismaClient({ datasources: { db: { url: TEST_DATABASE_URL } } });

/**
 * Wipe every table between test files. TRUNCATE ... CASCADE is one statement
 * and ignores foreign-key ordering, which beats maintaining a delete order
 * across 64 tables that changes every time the schema does.
 */
export async function resetDb() {
  const tables = await db.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename NOT LIKE '_prisma%'
  `;
  if (tables.length === 0) return;
  const list = tables.map((t) => `"public"."${t.tablename}"`).join(", ");
  await db.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}
