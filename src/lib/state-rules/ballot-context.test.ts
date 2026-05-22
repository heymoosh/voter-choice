/**
 * Tests for the BallotContext → `<ballot_context>` tag serializer.
 *
 * Non-negotiable: only state, county, ballotTag, electionDate, electionLabel
 * may reach the model. The serializer is the chokepoint — anything else
 * gets dropped silently. We assert that adversarial inputs (PII fields,
 * extra keys, prototype pollution attempts) never appear in the output.
 *
 * See .ai/work-packets/redesign-phase-5-state-party-gates.md.
 */

import { describe, it, expect } from "vitest";
import { serializeBallotContext } from "./ballot-context";

describe("serializeBallotContext — happy path", () => {
  it("emits a minimal <ballot_context> tag with all expected fields", () => {
    const out = serializeBallotContext({
      state: "TX",
      county: "Harris",
      ballotTag: "DEM-runoff",
      electionDate: "2026-05-25",
      electionLabel: "2026 Texas Primary Runoff",
    });
    expect(out).toContain("<ballot_context>");
    expect(out).toContain("</ballot_context>");
    expect(out).toContain("state: TX");
    expect(out).toContain("county: Harris");
    expect(out).toContain("ballot: DEM-runoff");
    expect(out).toContain("electionDate: 2026-05-25");
    expect(out).toContain("electionLabel: 2026 Texas Primary Runoff");
  });

  it("omits optional fields when not provided", () => {
    const out = serializeBallotContext({
      state: "PA",
      ballotTag: "DEM-primary",
      electionDate: "2026-05-19",
      electionLabel: "2026 Pennsylvania Primary",
    });
    expect(out).toContain("state: PA");
    expect(out).toContain("ballot: DEM-primary");
    expect(out).not.toContain("county:");
  });

  it("wraps content inside <ballot_context>…</ballot_context> exactly once", () => {
    const out = serializeBallotContext({
      state: "TX",
      ballotTag: "GENERAL",
      electionDate: "2026-11-03",
      electionLabel: "2026 General Election",
    });
    const openCount = (out.match(/<ballot_context>/g) ?? []).length;
    const closeCount = (out.match(/<\/ballot_context>/g) ?? []).length;
    expect(openCount).toBe(1);
    expect(closeCount).toBe(1);
  });
});

describe("serializeBallotContext — PII strip discipline", () => {
  it("drops extra fields silently — PII fields never reach the output", () => {
    const adversarial = {
      state: "TX",
      county: "Harris",
      ballotTag: "DEM-runoff",
      electionDate: "2026-05-25",
      electionLabel: "2026 Texas Primary Runoff",
      // PII / accidental fields that must NOT round-trip into the output.
      name: "Jane Doe",
      street: "123 Main St",
      address: "123 Main St, Houston, TX 77002",
      ssn: "123-45-6789",
      dob: "1990-01-01",
      phone: "+1-555-555-5555",
      email: "jane@example.com",
      id: "TX-DL-12345678",
      zip: "77002",
      precinct: "0123",
    } as unknown as Parameters<typeof serializeBallotContext>[0];
    const out = serializeBallotContext(adversarial);
    // Allowed fields present.
    expect(out).toContain("state: TX");
    expect(out).toContain("county: Harris");
    expect(out).toContain("ballot: DEM-runoff");
    // Disallowed fields absent — assert each one explicitly.
    expect(out).not.toContain("Jane Doe");
    expect(out).not.toContain("123 Main St");
    expect(out).not.toContain("123-45-6789");
    expect(out).not.toContain("1990-01-01");
    expect(out).not.toContain("555-5555");
    expect(out).not.toContain("jane@example.com");
    expect(out).not.toContain("TX-DL-12345678");
    expect(out).not.toContain("77002");
    expect(out).not.toContain("0123");
    // And no field labels leaked either.
    expect(out).not.toMatch(/\bname:/i);
    expect(out).not.toMatch(/\bssn:/i);
    expect(out).not.toMatch(/\bdob:/i);
    expect(out).not.toMatch(/\bemail:/i);
    expect(out).not.toMatch(/\bstreet:/i);
    expect(out).not.toMatch(/\baddress:/i);
  });

  it("normalises state input to uppercase", () => {
    const out = serializeBallotContext({
      state: "tx",
      ballotTag: "DEM-runoff",
      electionDate: "2026-05-25",
      electionLabel: "2026 Texas Primary Runoff",
    });
    expect(out).toContain("state: TX");
    expect(out).not.toContain("state: tx");
  });
});
