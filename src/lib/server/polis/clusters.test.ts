/**
 * Tests for polis cluster label hygiene + threshold gating (Phase 8).
 *
 * Pure functions. No DB. Fixtures only.
 */

import { describe, it, expect } from "vitest";
import {
  CLUSTER_LABELS,
  shouldShowCompass,
  resolveCompassThreshold,
  isPartisanLabel,
  emergeUnalignedCluster,
  DEFAULT_COMPASS_THRESHOLD,
} from "./clusters";

/* ── Cluster label hygiene (no partisan strings) ─────────────── */

describe("CLUSTER_LABELS", () => {
  it("contains the v1 set: Service-first progressives, Pocketbook moderates, Civic libertarians, Unaligned", () => {
    expect(CLUSTER_LABELS).toEqual([
      "Service-first progressives",
      "Pocketbook moderates",
      "Civic libertarians",
      "Unaligned",
    ]);
  });

  it("no label contains a partisan string", () => {
    const partisan = /democrat|republican|independent|\bdem\b|\brep\b/i;
    for (const label of CLUSTER_LABELS) {
      expect(label).not.toMatch(partisan);
    }
  });
});

describe("isPartisanLabel", () => {
  it("flags partisan strings (any casing)", () => {
    expect(isPartisanLabel("Democrat-leaning")).toBe(true);
    expect(isPartisanLabel("REPUBLICAN voters")).toBe(true);
    expect(isPartisanLabel("INDEPENDENT")).toBe(true);
    expect(isPartisanLabel("Dem-curious")).toBe(true);
    expect(isPartisanLabel("Rep coalition")).toBe(true);
  });

  it("does NOT flag the v1 cluster labels", () => {
    for (const label of CLUSTER_LABELS) {
      expect(isPartisanLabel(label)).toBe(false);
    }
  });
});

/* ── Unaligned not forced ────────────────────────────────────── */

describe("emergeUnalignedCluster", () => {
  it("emits Unaligned when unaligned share >= 10%", () => {
    const result = emergeUnalignedCluster([
      { name: "Service-first progressives", percent: 30 },
      { name: "Pocketbook moderates", percent: 30 },
      { name: "Civic libertarians", percent: 27 },
      { name: "Unaligned", percent: 13 },
    ]);
    expect(result.find((c) => c.name === "Unaligned")).toBeDefined();
  });

  it("does NOT force Unaligned when unaligned share is 0%", () => {
    const result = emergeUnalignedCluster([
      { name: "Service-first progressives", percent: 50 },
      { name: "Pocketbook moderates", percent: 30 },
      { name: "Civic libertarians", percent: 20 },
    ]);
    expect(result.find((c) => c.name === "Unaligned")).toBeUndefined();
  });

  it("does NOT force Unaligned when share is between 0 and 10%", () => {
    const result = emergeUnalignedCluster([
      { name: "Service-first progressives", percent: 50 },
      { name: "Pocketbook moderates", percent: 30 },
      { name: "Civic libertarians", percent: 17 },
      { name: "Unaligned", percent: 3 },
    ]);
    expect(result.find((c) => c.name === "Unaligned")).toBeUndefined();
  });
});

/* ── Compass threshold gating ────────────────────────────────── */

describe("shouldShowCompass", () => {
  it("returns true when count >= threshold", () => {
    expect(shouldShowCompass(150, 150)).toBe(true);
    expect(shouldShowCompass(200, 150)).toBe(true);
  });

  it("returns false when count < threshold", () => {
    expect(shouldShowCompass(149, 150)).toBe(false);
    expect(shouldShowCompass(0, 150)).toBe(false);
    expect(shouldShowCompass(50, 150)).toBe(false);
  });
});

describe("resolveCompassThreshold", () => {
  it("returns DEFAULT_COMPASS_THRESHOLD (150) when env var is undefined", () => {
    expect(resolveCompassThreshold(undefined)).toBe(DEFAULT_COMPASS_THRESHOLD);
    expect(DEFAULT_COMPASS_THRESHOLD).toBe(150);
  });

  it("returns env-overridden integer threshold", () => {
    expect(resolveCompassThreshold("200")).toBe(200);
    expect(resolveCompassThreshold("75")).toBe(75);
  });

  it("falls back to default when env var is non-numeric or non-positive", () => {
    expect(resolveCompassThreshold("abc")).toBe(DEFAULT_COMPASS_THRESHOLD);
    expect(resolveCompassThreshold("0")).toBe(DEFAULT_COMPASS_THRESHOLD);
    expect(resolveCompassThreshold("-5")).toBe(DEFAULT_COMPASS_THRESHOLD);
    expect(resolveCompassThreshold("")).toBe(DEFAULT_COMPASS_THRESHOLD);
  });
});
