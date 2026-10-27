import { Pool } from "pg";

/**
 * One pool per process. In dev, Next reloads modules on every edit, so the pool
 * is cached on `globalThis` to avoid leaking connections to Postgres.
 */
const globalForDb = globalThis as unknown as { lmsPool?: Pool };

function createPool() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Add it to .env before starting the app.",
    );
  }

  return new Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 30_000,
  });
}

export const pool = globalForDb.lmsPool ?? createPool();

if (process.env.NODE_ENV !== "production") {
  globalForDb.lmsPool = pool;
}
