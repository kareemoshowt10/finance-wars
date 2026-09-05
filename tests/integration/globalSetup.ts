// Brings the test database up to the current schema, once per `vitest run`.
//
// `prisma db push` creates the database itself if it doesn't exist, so there's
// no separate CREATE DATABASE step and no `pg` dependency. It's used rather
// than `migrate deploy` so that a schema change is testable before its
// migration has been written.

import { execSync } from "child_process";
import { TEST_DATABASE_URL } from "./setup";

export default async function globalSetup() {
  execSync("npx prisma db push --skip-generate --accept-data-loss", {
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL, DIRECT_URL: TEST_DATABASE_URL },
    stdio: "pipe",
  });
}
