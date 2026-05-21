import { describe, expect, it } from "vitest";
import { stripPII } from "./pii-strip";

// Each row: [label, input, expectedSubstringPresent (or null for absence-only), forbiddenSubstring]
//
// The contract:
//   - PII shapes are replaced with the literal token "[REDACTED]" — EXCEPT
//     ZIP+4, where the +4 is dropped but the 5-digit ZIP is preserved.
//   - "<city>, <state>" is explicitly allowed and must pass through untouched.
//   - Common civic-research phrasings like bill numbers must NOT be misread
//     as names or IDs.

type Row = {
  name: string;
  input: string;
  /** Substring that must appear in the output. Use null when only absence matters. */
  mustInclude: string | null;
  /** Substring that MUST NOT appear in the output (the PII shape, redacted). */
  mustNotInclude: string;
};

const positiveCases: Row[] = [
  {
    name: "street address with suffix",
    input: "Send mail to 1600 Pennsylvania Ave for more info.",
    mustInclude: "[REDACTED]",
    mustNotInclude: "1600 Pennsylvania Ave",
  },
  {
    name: "PO Box variant",
    input: "Mail to PO Box 1234 if interested.",
    mustInclude: "[REDACTED]",
    mustNotInclude: "PO Box 1234",
  },
  {
    name: "full personal name with cue 'my name is'",
    input: "Hi, my name is John Smith and I have a question.",
    mustInclude: "[REDACTED]",
    mustNotInclude: "John Smith",
  },
  {
    name: "date of birth (slash format)",
    input: "DOB 12/31/1985, please confirm.",
    mustInclude: "[REDACTED]",
    mustNotInclude: "12/31/1985",
  },
  {
    name: "date of birth (ISO format)",
    input: "Born 1985-12-31.",
    mustInclude: "[REDACTED]",
    mustNotInclude: "1985-12-31",
  },
  {
    name: "date of birth (long format)",
    input: "She was born Dec 31, 1985.",
    mustInclude: "[REDACTED]",
    mustNotInclude: "Dec 31, 1985",
  },
  {
    name: "phone (parens format)",
    input: "Call me at (555) 555-5555 tomorrow.",
    mustInclude: "[REDACTED]",
    mustNotInclude: "(555) 555-5555",
  },
  {
    name: "phone (dash format)",
    input: "Reach me at 555-555-5555 anytime.",
    mustInclude: "[REDACTED]",
    mustNotInclude: "555-555-5555",
  },
  {
    name: "phone (international +1 format)",
    input: "International number: +1 555 555 5555 here.",
    mustInclude: "[REDACTED]",
    mustNotInclude: "+1 555 555 5555",
  },
  {
    name: "email address",
    input: "Reach me at user@example.com for follow-up.",
    mustInclude: "[REDACTED]",
    mustNotInclude: "user@example.com",
  },
  {
    name: "SSN-shaped string",
    input: "SSN 123-45-6789 belongs to nobody you know.",
    mustInclude: "[REDACTED]",
    mustNotInclude: "123-45-6789",
  },
  {
    name: "driver's license (state-prefixed)",
    input: "License is TX 12345678 on file.",
    mustInclude: "[REDACTED]",
    mustNotInclude: "TX 12345678",
  },
  {
    name: "voter registration ID (VRN label)",
    input: "VRN: 12345678 was assigned at registration.",
    mustInclude: "[REDACTED]",
    mustNotInclude: "12345678",
  },
  {
    name: "voter registration ID (Voter ID label)",
    input: "Voter ID: ABC12345678 issued last month.",
    mustInclude: "[REDACTED]",
    mustNotInclude: "ABC12345678",
  },
  {
    name: "labeled ID card number",
    input: "ID: A98765432 was the one used.",
    mustInclude: "[REDACTED]",
    mustNotInclude: "A98765432",
  },
  {
    name: "labeled license number",
    input: "License: B12345678 expires soon.",
    mustInclude: "[REDACTED]",
    mustNotInclude: "B12345678",
  },
  {
    name: "ZIP+4 preserves the 5-digit ZIP",
    input: "Mailed to 12345-6789 yesterday.",
    mustInclude: "12345",
    mustNotInclude: "12345-6789",
  },
];

const negativeCases: Row[] = [
  {
    name: "'Austin, TX' passes through untouched",
    input: "I live in Austin, TX and care about local elections.",
    mustInclude: "Austin, TX",
    mustNotInclude: "[REDACTED]",
  },
  {
    name: "'Tell me about Senate Bill 1' passes through untouched",
    input: "Tell me about Senate Bill 1 and what it does.",
    mustInclude: "Senate Bill 1",
    mustNotInclude: "[REDACTED]",
  },
];

describe("stripPII — positive (redacts PII)", () => {
  it.each(positiveCases)(
    "redacts $name",
    ({ input, mustInclude, mustNotInclude }) => {
      const out = stripPII(input);
      if (mustInclude !== null) {
        expect(out).toContain(mustInclude);
      }
      expect(out).not.toContain(mustNotInclude);
    },
  );
});

describe("stripPII — negative (preserves non-PII)", () => {
  it.each(negativeCases)(
    "preserves $name",
    ({ input, mustInclude, mustNotInclude }) => {
      const out = stripPII(input);
      if (mustInclude !== null) {
        expect(out).toContain(mustInclude);
      }
      expect(out).not.toContain(mustNotInclude);
    },
  );
});

describe("stripPII — invariants", () => {
  it("returns a string for an empty input", () => {
    expect(stripPII("")).toBe("");
  });

  it("is idempotent on already-redacted strings", () => {
    const input = "Reach [REDACTED] for follow-up.";
    expect(stripPII(input)).toBe(input);
  });

  it("preserves 'city, state' even when other PII is present", () => {
    const out = stripPII(
      "My name is Jane Doe and I live in Austin, TX. Call 555-555-5555.",
    );
    expect(out).toContain("Austin, TX");
    expect(out).not.toContain("Jane Doe");
    expect(out).not.toContain("555-555-5555");
  });
});
