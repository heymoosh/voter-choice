#!/usr/bin/env node
import {
  I11_JURISDICTIONS,
  i11CongressionalSourceInventory,
  validateI11CongressionalSourceInventory,
} from "./congressional-rosters/i11-source-inventory";

function main(argv: string[]): void {
  if (argv.length !== 1 || argv[0] !== "--fixtures") {
    console.error(
      "Usage: npm run verify:i11-congressional-source-inventory -- --fixtures",
    );
    process.exitCode = 1;
    return;
  }
  const result = validateI11CongressionalSourceInventory(
    i11CongressionalSourceInventory,
  );
  if (result.errors.length > 0) {
    console.error(
      "I11 congressional source inventory (WV, WI, WY, AS, GU, MP, VI): FAIL",
    );
    for (const error of result.errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }
  console.log(
    `I11 congressional source inventory: PASS (${result.coveredJurisdictions.join(", ")}; ${result.coverageStates.join(", ")}).`,
  );
  if (result.coveredJurisdictions.length !== I11_JURISDICTIONS.length)
    process.exitCode = 1;
}

main(process.argv.slice(2));
