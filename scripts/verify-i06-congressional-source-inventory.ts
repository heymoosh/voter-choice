#!/usr/bin/env node
import {
  I06_JURISDICTIONS,
  i06CongressionalSourceInventory,
  validateI06CongressionalSourceInventory,
} from "./congressional-rosters/i06-source-inventory";

function main(argv: string[]): void {
  if (argv.length !== 1 || argv[0] !== "--fixtures") {
    console.error(
      "Usage: npm run verify:i06-congressional-source-inventory -- --fixtures",
    );
    process.exitCode = 1;
    return;
  }
  const result = validateI06CongressionalSourceInventory(
    i06CongressionalSourceInventory,
  );
  if (result.errors.length > 0) {
    console.error(
      "I06 congressional source inventory (HI, ID, IL, IN, IA, KS, KY): FAIL",
    );
    for (const error of result.errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }
  console.log(
    `I06 congressional source inventory: PASS (${result.coveredJurisdictions.join(", ")}; ${result.coverageStates.join(", ")}).`,
  );
  if (result.coveredJurisdictions.length !== I06_JURISDICTIONS.length)
    process.exitCode = 1;
}

main(process.argv.slice(2));
