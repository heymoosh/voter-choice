#!/usr/bin/env node
import {
  F03_REHEARSAL_JURISDICTIONS,
  f03CongressionalSourceInventory,
  validateF03CongressionalSourceInventory,
} from "./congressional-rosters/f03-source-inventory";

function main(argv: string[]): void {
  if (argv.length !== 1 || argv[0] !== "--fixtures") {
    console.error(
      "Usage: npm run verify:f03-congressional-source-inventory -- --fixtures",
    );
    process.exitCode = 1;
    return;
  }
  const result = validateF03CongressionalSourceInventory(
    f03CongressionalSourceInventory,
  );
  if (result.errors.length > 0) {
    console.error("F03 congressional source inventory rehearsal: FAIL");
    for (const error of result.errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }
  console.log(
    `F03 congressional source inventory rehearsal: PASS (${result.coveredJurisdictions.join(", ")}; ${result.coverageStates.join(", ")}).`,
  );
  if (result.coveredJurisdictions.length !== F03_REHEARSAL_JURISDICTIONS.length)
    process.exitCode = 1;
}

main(process.argv.slice(2));
