/**
 * Strip personally identifiable information (PII) from user-supplied text before
 * it ships to any LLM, gets injected into a <tag> block, or lands in a log line.
 *
 * Contract:
 *   - Replaces each matched PII shape with the literal token "[REDACTED]"
 *     EXCEPT ZIP+4, where the 5-digit ZIP survives and the +4 is dropped.
 *   - Never strips "<city>, <state>" patterns — those are explicitly allowed by
 *     the prompt fleet (see docs/design/2026-redesign/prompts.md §0 rule 3).
 *
 * Application order is load-bearing:
 *   1. ZIP+4               — runs first so the 5-digit ZIP capture survives
 *   2. Labeled IDs          — Voter ID / VRN / License / ID: <value>
 *   3. Format-locked shapes — SSN, phone, email, DOB
 *   4. Street / PO Box      — number + street + suffix (and "PO Box N")
 *   5. State-prefixed DL    — e.g. "TX 12345678"
 *   6. Conservative name    — only after explicit cue (see comment below)
 *
 * If you change this order, re-check pii-strip.test.ts — the negatives ("Senate
 * Bill 1", "Austin, TX") prove the order doesn't over-match.
 */

const REDACTED = "[REDACTED]";

// 1. ZIP+4 → preserve the 5-digit ZIP, drop the +4 extension.
const ZIP_PLUS_4 = /\b(\d{5})-\d{4}\b/g;

// 2. Labeled IDs. The label appears literally in the input and we redact the
//    label-plus-value together so the redacted line stays self-explanatory.
//    Voter ID / VRN / Voter Registration / License / ID. Match alphanumeric
//    values of 4+ characters to avoid clobbering "ID: x" style fragments.
const LABELED_ID =
  /\b(?:Voter\s*ID|VRN|Voter\s*Registration(?:\s*Number)?|License|ID)\s*[:#]?\s*[A-Z]{0,3}\s*[A-Z0-9]{4,}/gi;

// 3a. SSN — strict ###-##-#### shape with word boundaries.
const SSN = /\b\d{3}-\d{2}-\d{4}\b/g;

// 3b. Phone — US shapes. Anchored to a boundary or '+' so we don't bite into
//     longer digit runs.
const PHONE = /(?:\+1[\s.-]?)?(?:\(\d{3}\)\s*|\d{3}[\s.-])\d{3}[\s.-]\d{4}\b/g;

// 3c. Email — keep simple. The '@' is the signature.
const EMAIL = /\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g;

// 3d. DOB. Three shapes:
//     - 12/31/1985 or 12-31-1985 (mm/dd/yyyy or mm-dd-yyyy)
//     - 1985-12-31 (ISO)
//     - Dec 31, 1985 / December 31, 1985 (long)
const DOB_SLASHES = /\b\d{1,2}[/-]\d{1,2}[/-]\d{4}\b/g;
const DOB_ISO = /\b\d{4}-\d{2}-\d{2}\b/g;
const DOB_LONG =
  /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},\s+\d{4}\b/g;

// 4. Street address + PO Box.
//    Street: <number> <words> <suffix>. Suffix list is conservative but covers
//    the common shapes. The number anchors the pattern so 'Senate Bill 1' (no
//    suffix word after) doesn't match.
const STREET_ADDRESS =
  /\b\d{1,6}\s+(?:[A-Z][A-Za-z.'-]*\s+){1,4}(?:Street|St|Avenue|Ave|Boulevard|Blvd|Road|Rd|Drive|Dr|Lane|Ln|Way|Court|Ct|Circle|Cir|Place|Pl|Parkway|Pkwy|Highway|Hwy|Terrace|Ter|Trail|Trl)\b\.?/g;
const PO_BOX = /\bP\.?\s?O\.?\s*Box\s+\d+\b/gi;

// 5. State-prefixed driver's license — two-letter postal code + space + 6–10
//    digits/alnum. This is separate from the labeled-ID path because the cue
//    is the state code itself, not a "License:" label. Restricted to a fixed
//    list of US state codes to avoid eating "TO 12345678" or other prefixes.
const STATE_DL =
  /\b(?:AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)\s+[A-Z0-9]{6,10}\b/g;

// 6. Conservative name detection.
//    LIMIT: only redact when the input explicitly cues a personal name — "my
//    name is X", "I'm X", "I am X", "Name: X", "Signed, X", "Regards, X".
//    A bare two-capitalized-words pattern would also match "Senate Bill",
//    "Austin Texas", "Drug Pricing" etc., so we never match it.
const NAME_WITH_CUE =
  /\b(?:my name is|i'?m|i am|name\s*[:=]|signed,?|regards,?)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\b/gi;

export function stripPII(input: string): string {
  if (input === "") return "";

  let out = input;

  // 1. ZIP+4: preserve the 5-digit ZIP capture group.
  out = out.replace(ZIP_PLUS_4, "$1");

  // 2. Labeled IDs (Voter ID / VRN / License / ID:).
  out = out.replace(LABELED_ID, REDACTED);

  // 3a. SSN.
  out = out.replace(SSN, REDACTED);

  // 3b. Phone.
  out = out.replace(PHONE, REDACTED);

  // 3c. Email.
  out = out.replace(EMAIL, REDACTED);

  // 3d. DOB shapes — order: long > ISO > slashes (long is most specific).
  out = out.replace(DOB_LONG, REDACTED);
  out = out.replace(DOB_ISO, REDACTED);
  out = out.replace(DOB_SLASHES, REDACTED);

  // 4. Street address / PO Box.
  out = out.replace(STREET_ADDRESS, REDACTED);
  out = out.replace(PO_BOX, REDACTED);

  // 5. State-prefixed driver's license.
  out = out.replace(STATE_DL, REDACTED);

  // 6. Name with explicit cue — LAST, because it's the most ambiguous shape.
  //    We redact the cue-plus-name together so the redaction reads cleanly.
  out = out.replace(NAME_WITH_CUE, REDACTED);

  return out;
}
