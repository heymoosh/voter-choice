#!/usr/bin/env node
import {
  validateCongressionalSourceInventory,
  type CongressionalSourceInventory,
} from "../src/lib/congressional-source-inventory";
import { fixtureCongressionalSourceInventory } from "./congressional-rosters/fixtures/source-inventory.fixture";

function main(argv: string[]): void {
  if (argv.length !== 1 || argv[0] !== "--fixtures") {
    console.error(
      "Usage: npm run verify:congressional-source-inventory -- --fixtures",
    );
    process.exitCode = 1;
    return;
  }

  const inventory: CongressionalSourceInventory =
    fixtureCongressionalSourceInventory;
  const result = validateCongressionalSourceInventory(inventory);
  if (result.errors.length > 0) {
    console.error("Congressional source inventory: FAIL");
    for (const error of result.errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }

  console.log(
    `Congressional source inventory: PASS (${result.coveredJurisdictions.length} jurisdictions; ${result.coverageStates.join(", ")}).`,
  );
}

main(process.argv.slice(2));
