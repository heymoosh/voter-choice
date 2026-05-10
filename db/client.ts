/**
 * db/client.ts
 *
 * Neon serverless client wrapper. Defensive pattern mirrors
 * src/lib/server/durable-store.ts: returns a working client when
 * DATABASE_URL is set in env; returns a typed sentinel (or throws a
 * typed error the caller can catch) when it is not.
 *
 * This module is server-only. Never import it from client components.
 */

import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

export type DbClient = ReturnType<typeof buildClient>;

/** Sentinel value returned when DATABASE_URL is unset. */
export const DB_NOT_CONFIGURED = "DB_NOT_CONFIGURED" as const;
export type DbNotConfigured = typeof DB_NOT_CONFIGURED;

function buildClient(connectionString: string) {
  const sql = neon(connectionString);
  return drizzle(sql, { schema });
}

/**
 * Returns a Drizzle/Neon DB client when DATABASE_URL is set,
 * or the DB_NOT_CONFIGURED sentinel when it is not.
 *
 * Callers must narrow the return value before executing queries:
 *
 *   const db = getDb();
 *   if (db === DB_NOT_CONFIGURED) { ... handle gracefully ... }
 *   await db.select().from(schema.bills);
 */
export function getDb(): DbClient | DbNotConfigured {
  const url = process.env.DATABASE_URL;
  if (!url) return DB_NOT_CONFIGURED;
  return buildClient(url);
}

/**
 * Like getDb() but throws a typed error instead of returning the sentinel.
 * Prefer this inside ingest scripts that *require* a real connection.
 */
export function requireDb(): DbClient {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new DatabaseNotConfiguredError(
      "DATABASE_URL is not set. Provide it via .env.local or the Vercel environment.",
    );
  }
  return buildClient(url);
}

export class DatabaseNotConfiguredError extends Error {
  readonly code = "DATABASE_NOT_CONFIGURED" as const;
  constructor(message: string) {
    super(message);
    this.name = "DatabaseNotConfiguredError";
  }
}
