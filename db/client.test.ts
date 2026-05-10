/**
 * db/client.test.ts
 *
 * Unit tests for the defensive-failure mode of getDb() / requireDb().
 * No real database connection is made.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getDb,
  requireDb,
  DB_NOT_CONFIGURED,
  DatabaseNotConfiguredError,
} from "./client";

describe("db/client", () => {
  const originalEnv = process.env.DATABASE_URL;

  beforeEach(() => {
    // Ensure DATABASE_URL is unset for isolation
    delete process.env.DATABASE_URL;
  });

  afterEach(() => {
    // Restore original value (may be undefined — that's fine)
    if (originalEnv !== undefined) {
      process.env.DATABASE_URL = originalEnv;
    } else {
      delete process.env.DATABASE_URL;
    }
    vi.restoreAllMocks();
  });

  describe("getDb()", () => {
    it("returns DB_NOT_CONFIGURED sentinel when DATABASE_URL is unset", () => {
      const result = getDb();
      expect(result).toBe(DB_NOT_CONFIGURED);
    });

    it("returns DB_NOT_CONFIGURED sentinel when DATABASE_URL is empty string", () => {
      process.env.DATABASE_URL = "";
      const result = getDb();
      expect(result).toBe(DB_NOT_CONFIGURED);
    });

    it("returns a client object (not the sentinel) when DATABASE_URL is set", () => {
      // Use a syntactically-valid placeholder — no real connection is made
      // because we never execute a query in this test.
      process.env.DATABASE_URL =
        "postgresql://user:pass@localhost:5432/testdb";
      const result = getDb();
      expect(result).not.toBe(DB_NOT_CONFIGURED);
      expect(typeof result).toBe("object");
    });
  });

  describe("requireDb()", () => {
    it("throws DatabaseNotConfiguredError when DATABASE_URL is unset", () => {
      expect(() => requireDb()).toThrow(DatabaseNotConfiguredError);
    });

    it("thrown error has code DATABASE_NOT_CONFIGURED", () => {
      try {
        requireDb();
        expect.fail("should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(DatabaseNotConfiguredError);
        expect((err as DatabaseNotConfiguredError).code).toBe(
          "DATABASE_NOT_CONFIGURED",
        );
      }
    });

    it("returns a client object when DATABASE_URL is set", () => {
      process.env.DATABASE_URL =
        "postgresql://user:pass@localhost:5432/testdb";
      const result = requireDb();
      expect(result).toBeDefined();
      expect(typeof result).toBe("object");
    });
  });
});
