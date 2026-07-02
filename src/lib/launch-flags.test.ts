import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  isLaunchFlagEnabled,
  LAUNCH_FLAG_REGISTRY,
  type LaunchFlagStatus,
} from "./launch-flags";

const VALID_STATUSES: LaunchFlagStatus[] = [
  "pre_launch_dark",
  "uncertain",
  "operational",
  "already_live",
];

beforeEach(() => {
  vi.unstubAllEnvs();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("isLaunchFlagEnabled — default-OFF behavior", () => {
  it("is OFF when the env var is unset", () => {
    vi.stubEnv("LAUNCH_TEST_EXAMPLE", "");
    delete process.env.LAUNCH_TEST_EXAMPLE;
    expect(isLaunchFlagEnabled("LAUNCH_TEST_EXAMPLE")).toBe(false);
  });

  it("is OFF for empty string", () => {
    vi.stubEnv("LAUNCH_TEST_EXAMPLE", "");
    expect(isLaunchFlagEnabled("LAUNCH_TEST_EXAMPLE")).toBe(false);
  });

  it("is OFF for common near-truthy values (strict === 'true' only)", () => {
    for (const v of ["false", "0", "1", "TRUE", "True", "yes", "on"]) {
      vi.stubEnv("LAUNCH_TEST_EXAMPLE", v);
      expect(isLaunchFlagEnabled("LAUNCH_TEST_EXAMPLE")).toBe(false);
    }
  });

  it("is ON only for the exact string 'true'", () => {
    vi.stubEnv("LAUNCH_TEST_EXAMPLE", "true");
    expect(isLaunchFlagEnabled("LAUNCH_TEST_EXAMPLE")).toBe(true);
  });

  it("defaults OFF in production when the flag is unset (proves prod-safe default)", () => {
    vi.stubEnv("NODE_ENV", "production");
    delete process.env.LAUNCH_TEST_EXAMPLE;
    expect(process.env.NODE_ENV).toBe("production");
    expect(isLaunchFlagEnabled("LAUNCH_TEST_EXAMPLE")).toBe(false);
  });

  it("respects an explicit ON value even when NODE_ENV=production (deliberate go-live flip still works)", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("LAUNCH_TEST_EXAMPLE", "true");
    expect(isLaunchFlagEnabled("LAUNCH_TEST_EXAMPLE")).toBe(true);
  });

  it("is OFF in non-production (development/test) when unset — same rule everywhere", () => {
    vi.stubEnv("NODE_ENV", "development");
    delete process.env.LAUNCH_TEST_EXAMPLE;
    expect(isLaunchFlagEnabled("LAUNCH_TEST_EXAMPLE")).toBe(false);
  });
});

describe("LAUNCH_FLAG_REGISTRY — inventory shape", () => {
  it("has no duplicate envVar entries", () => {
    const names = LAUNCH_FLAG_REGISTRY.map((f) => f.envVar);
    expect(new Set(names).size).toBe(names.length);
  });

  it("every entry has a valid status", () => {
    for (const entry of LAUNCH_FLAG_REGISTRY) {
      expect(VALID_STATUSES).toContain(entry.status);
    }
  });

  it("every entry documents where it's read and what it gates", () => {
    for (const entry of LAUNCH_FLAG_REGISTRY) {
      expect(entry.readAt.length).toBeGreaterThan(0);
      expect(entry.gates.length).toBeGreaterThan(0);
      expect(entry.note.length).toBeGreaterThan(0);
    }
  });

  it("includes the three confirmed pre-launch-dark surfaces from the inventory pass", () => {
    const preLaunch = LAUNCH_FLAG_REGISTRY.filter(
      (f) => f.status === "pre_launch_dark",
    ).map((f) => f.envVar);
    expect(preLaunch).toEqual(
      expect.arrayContaining([
        "CAN2026_DISPLAY_ENABLED",
        "VOTER_ISSUE_EVENTS_ENABLED",
        "POLIS_VECTOR_COLLECTION_ENABLED",
      ]),
    );
  });

  it("flags CHAT_USAGE_METRICS_ENABLED as uncertain rather than guessing", () => {
    const entry = LAUNCH_FLAG_REGISTRY.find(
      (f) => f.envVar === "CHAT_USAGE_METRICS_ENABLED",
    );
    expect(entry?.status).toBe("uncertain");
  });

  it("marks PROMPT_FLEET_V2 already_live so this card never gates it off", () => {
    const entry = LAUNCH_FLAG_REGISTRY.find(
      (f) => f.envVar === "PROMPT_FLEET_V2",
    );
    expect(entry?.status).toBe("already_live");
  });
});
