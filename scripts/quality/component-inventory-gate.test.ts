// Unit tests for the inventory gate's pure logic (the fs walk + parse +
// compare). Importing the module must not run the gate — see the main-guard
// at the bottom of component-inventory-gate.ts.

import { describe, expect, it } from "vitest";
import { compareInventory, parseInventory } from "./component-inventory-gate";

describe("parseInventory", () => {
  it("extracts backticked .tsx entries from list lines only", () => {
    const md = [
      "# Component inventory",
      "Some prose mentioning `NotAnEntry.tsx` inline.",
      "- `RepCard.tsx` — the single-seat candidate card",
      "- `MoneyGap.tsx` — money-scale primitives",
      "  - `Indented.tsx` — nested lists count too",
      "- plain bullet without a component",
    ].join("\n");
    expect(parseInventory(md)).toEqual([
      "Indented.tsx",
      "MoneyGap.tsx",
      "RepCard.tsx",
    ]);
  });
});

describe("compareInventory", () => {
  it("passes when files and entries match exactly", () => {
    const out = compareInventory(["A.tsx", "B.tsx"], ["A.tsx", "B.tsx"]);
    expect(out.missingEntries).toEqual([]);
    expect(out.staleEntries).toEqual([]);
  });

  it("flags a new component file with no inventory entry", () => {
    const out = compareInventory(["A.tsx", "New.tsx"], ["A.tsx"]);
    expect(out.missingEntries).toEqual(["New.tsx"]);
    expect(out.staleEntries).toEqual([]);
  });

  it("flags a stale entry whose file was deleted", () => {
    const out = compareInventory(["A.tsx"], ["A.tsx", "Gone.tsx"]);
    expect(out.missingEntries).toEqual([]);
    expect(out.staleEntries).toEqual(["Gone.tsx"]);
  });
});
