import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DataCache } from "../dataCache";

describe("DataCache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns null for unseen key", () => {
    const cache = new DataCache(3600_000);
    expect(cache.get("unknown")).toBeNull();
  });

  it("returns cached value within TTL", () => {
    const cache = new DataCache(3600_000);
    cache.set("key1", { data: "value" });
    expect(cache.get("key1")).toEqual({ data: "value" });
  });

  it("returns null after TTL has expired", () => {
    const cache = new DataCache(3600_000);
    cache.set("key2", { data: "value" });
    vi.advanceTimersByTime(3600_001);
    expect(cache.get("key2")).toBeNull();
  });

  it("returns value just before TTL expires", () => {
    const cache = new DataCache(3600_000);
    cache.set("key3", { data: "value" });
    vi.advanceTimersByTime(3599_999);
    expect(cache.get("key3")).toEqual({ data: "value" });
  });

  it("overwrites existing value with set", () => {
    const cache = new DataCache(3600_000);
    cache.set("key4", "original");
    cache.set("key4", "updated");
    expect(cache.get("key4")).toBe("updated");
  });
});
