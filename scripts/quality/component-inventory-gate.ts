#!/usr/bin/env node
// scripts/quality/component-inventory-gate.ts
//
// Component-minimization gate: every component file under
// src/prototype/redesign/ must have an entry in component-inventory.md
// stating what UI function it serves (and, for new ones, why an existing
// component couldn't serve it). The literal-clone ratchet
// (duplication-gate.ts) can't see two independently-written components that
// serve the same function — this gate forces the overlap question to be
// answered in review, where a human (or the advisory AI overlap review, see
// .github/workflows/component-review.yml) can actually judge it.
//
//   - New component file, no inventory entry → FAIL (with the entry
//     template to add).
//   - Inventory entry whose file no longer exists → FAIL (stale entries rot
//     the list the overlap judgment depends on).
//
// Usage:
//   npm run inventory:check
//
// Deliberately scoped to src/prototype/redesign/ — the actively-designed
// surface where parallel lanes have demonstrably created same-function
// components. Widen the scope here if that changes.

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const SCRIPT_DIR = path.dirname(new URL(import.meta.url).pathname);
const REPO_ROOT = path.resolve(SCRIPT_DIR, "../..");
const COMPONENT_DIR = path.join(REPO_ROOT, "src/prototype/redesign");
const INVENTORY_PATH = path.join(SCRIPT_DIR, "component-inventory.md");

/** Component files the inventory tracks: .tsx under the component dir,
 *  excluding tests (unit-test files aren't UI surface). */
export function listComponentFiles(dir: string): string[] {
  return fs
    .readdirSync(dir)
    .filter(
      (f) =>
        f.endsWith(".tsx") && !f.endsWith(".test.tsx") && !f.includes(".spec."),
    )
    .sort();
}

/** Inventory entries: lines of the form "- `FileName.tsx` — ...". */
export function parseInventory(markdown: string): string[] {
  const entries: string[] = [];
  for (const line of markdown.split("\n")) {
    const m = /^- `([A-Za-z0-9_.-]+\.tsx)`/.exec(line.trim());
    if (m) entries.push(m[1]);
  }
  return entries.sort();
}

export interface InventoryOutcome {
  missingEntries: string[]; // files with no inventory line
  staleEntries: string[]; // inventory lines with no file
}

export function compareInventory(
  files: string[],
  entries: string[],
): InventoryOutcome {
  const fileSet = new Set(files);
  const entrySet = new Set(entries);
  return {
    missingEntries: files.filter((f) => !entrySet.has(f)),
    staleEntries: entries.filter((e) => !fileSet.has(e)),
  };
}

function main(): void {
  const files = listComponentFiles(COMPONENT_DIR);
  const entries = parseInventory(fs.readFileSync(INVENTORY_PATH, "utf8"));
  const { missingEntries, staleEntries } = compareInventory(files, entries);

  if (missingEntries.length === 0 && staleEntries.length === 0) {
    console.log(
      `Component inventory gate: PASS (${files.length} components, all inventoried).`,
    );
    return;
  }

  console.error("Component inventory gate: FAIL\n");
  if (missingEntries.length > 0) {
    console.error(
      "New component file(s) with no entry in scripts/quality/component-inventory.md:",
    );
    for (const f of missingEntries) {
      console.error(`  - src/prototype/redesign/${f}`);
    }
    console.error(
      [
        "",
        "Before adding an entry, check the inventory for an existing component that",
        "already serves this UI function — extending it with a prop/variant beats a",
        "new file that will drift out of sync. If a new component is genuinely",
        "needed, add a line in the ## Entries list:",
        "",
        "  - `YourComponent.tsx` — <UI function it serves; why existing components",
        "    couldn't serve it>",
        "",
      ].join("\n"),
    );
  }
  if (staleEntries.length > 0) {
    console.error(
      "Inventory entries for files that no longer exist (remove the lines):",
    );
    for (const e of staleEntries) console.error(`  - ${e}`);
  }
  process.exit(1);
}

// Import-safe (tests): only run when executed directly — same guard as
// duplication-gate.ts.
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  main();
}
