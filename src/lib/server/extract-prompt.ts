/**
 * Standardized extraction prompt for both the pdfjs cheap path and the
 * Sonnet-vision escalation path.
 *
 * Source: PDF bake-off `decision-design.md` §"Standardized post-processor
 * prompt". The vision-direct variant (page images instead of upstream
 * text) is the same prompt minus the [INPUT] block.
 *
 * Two named exports:
 *  - `VISION_DIRECT_PROMPT` — sent alongside page images
 *  - `buildPostProcessorPrompt(rawText)` — sent for pdfjs cheap-path
 *    normalization, with the upstream pdfjs text in the [INPUT] block
 */

const TARGET_SCHEMA = `Target schema:
{
  "election_metadata": {
    "election_date": "YYYY-MM-DD",
    "election_type": "primary" | "primary_runoff" | "general" | "special",
    "jurisdiction": "string",
    "ballot_style": "string (optional)"
  },
  "sections": [
    {
      "section_name": "Federal" | "State" | "County" | "Municipal" | "Judicial" | "Propositions" | "Constitutional Amendments" | "County Questions" | "Ballot Measures" | "Judicial Retention" | "Bond Measures",
      "races": [
        {
          "office": "string",
          "district": "string (optional)",
          "position": "string (optional)",
          "vote_for_n": 1,
          "party_context": "Democratic Primary" | "Republican Primary" | null,
          "candidates": [
            {
              "name": "string | null",
              "party": "string | null",
              "ballot_position": "string (optional)",
              "placeholder_reason": "no_petition_filed" | "write_in" | "illegible" | null
            }
          ]
        }
      ]
    }
  ]
}`;

const SHARED_INSTRUCTIONS = `Produce JSON that conforms to the target schema below. Extract every race and every candidate visible on the ballot — do NOT filter based on party affiliation or voting rules; the presentation layer handles that.

Accuracy over completeness — transcribe, never invent. Read every name, office, party, and slogan as carefully as you can and write down EXACTLY the letters printed; small text is fine to transcribe. NEVER infer, autocomplete, or "correct" a name toward a known or expected politician, and NEVER invent or pad a plausible name to fill a slot. Only when the letters are genuinely impossible to make out should you emit that candidate with name=null and placeholder_reason="illegible" — a marked gap is always better than a guessed or invented name. Emit exactly the candidate slots printed; do not add slots that are not there.

If the upstream output is incomplete or unreliable, prefer to mark a field as null rather than guess. Mark "NO PETITION FILED" rows as placeholder_reason="no_petition_filed", not as candidates. Mark write-in slots as placeholder_reason="write_in" with name=null. For multi-seat races (vote_for_n > 1), emit one write-in placeholder PER SEAT (so vote_for_n=2 → 2 write-in placeholders, vote_for_n=4 → 4 write-in placeholders).

For multi-party ballots (e.g., both DEM and REP on same page), set party_context per race. For single-party ballots, leave party_context null and the election_metadata.election_type carries the party info.

For bilingual ballots (English + Spanish): the English office/name is canonical. Spanish in italics or parentheses is a translation, NOT a separate race.

${TARGET_SCHEMA}

Output: JSON only. No prose. No markdown code fences.`;

export const VISION_DIRECT_PROMPT = `You are extracting structured ballot data from the page images of a ballot PDF.

${SHARED_INSTRUCTIONS}`;

export function buildPostProcessorPrompt(upstreamRawOutput: string): string {
  return `You are extracting structured ballot data from raw text produced by an upstream PDF extraction tool.

[INPUT: raw upstream output]
${upstreamRawOutput}
[/INPUT]

${SHARED_INSTRUCTIONS}`;
}
