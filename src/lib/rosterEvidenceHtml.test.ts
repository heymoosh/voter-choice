import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const evidencePath = join(
  process.cwd(),
  "docs/operations/candidate-roster-correctness-evidence.html",
);

describe("candidate roster correctness HTML evidence", () => {
  it("captures unsafe-before plus safe FEC-only, unverified, and verified after states", () => {
    const html = readFileSync(evidencePath, "utf8");

    expect(html).toContain('data-evidence-state="before-unsafe-fec-only"');
    expect(html).toContain('data-evidence-state="after-fec-finance-only"');
    expect(html).toContain(
      'data-evidence-state="after-unverified-user-supplied"',
    );
    expect(html).toContain(
      'data-evidence-state="after-verified-current-roster"',
    );
    expect(html).toContain(
      "Campaign-finance records are not ballot roster proof",
    );
    expect(html).toContain("selectableAsReplacement=false");
    expect(html).toContain("selectableAsReplacement=true");
  });
});
