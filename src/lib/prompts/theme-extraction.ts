import { renderResolverPoleDirections } from "../alignment/poleVocabulary";
import { renderResolverSubIssues } from "../alignment/subIssues";

export interface ThemeExtractionInput {
  userInput: string;
}

/** The theme JSON contract shared by extraction (turn 1) and the
 *  conversational refinement builder (turns 2+) — kept as one block so the
 *  two prompts can never drift apart on field semantics. */
export const THEME_FIELDS_PROMPT_BLOCK = `  "name":   a short neutral noun phrase (3–7 words).
            No advocacy verbs ("fight against", "stand up for").
            No party labels.
  "quotes": 1–2 short verbatim phrases from the user's message
            that grounded this theme. Use their EXACT words.
  "canonicalIssue": the single best-matching id from the CANONICAL
            ISSUES list below, or omit the field entirely if none
            fits. This maps the voter's words to a known issue so the
            app can score candidates' voting records — you are doing
            language understanding, not judging candidates.
  "stance": "in_favor" or "opposed" — the FIXED per-issue side (see
            POLE DIRECTIONS below; NOT "good vs bad"). Key off the issue's
            [contested]/[valence] tag there:
              · [contested]: set "stance" ONLY if the words pick a side
                ("protect my 2A rights"→in_favor; "fewer guns on the
                street"→opposed). If value-only and no side ("I care
                about guns"), OMIT "stance" — an honest no-score beats a
                guess. Never default a bare contested concern to in_favor.
              · [valence]: aspirational concerns ("lower drug prices")→
                in_favor; "opposed" only if they want LESS government
                action ("government shouldn't run healthcare").
  "subIssue": OPTIONAL — a finer id from the SUB-ISSUES list below,
            only when one clearly fits the voter's words. Its parent
            MUST equal canonicalIssue; otherwise omit. Never invent ids.`;

/** Canonical-issue vocabulary, shared verbatim by both theme builders. */
export const CANONICAL_ISSUES_PROMPT_BLOCK = `CANONICAL ISSUES (id — what it covers):
  healthcare_affordability — drug/insulin prices, ACA, Medicare/Medicaid, care costs
  housing_affordability — rent, home prices, housing supply, zoning
  economy_jobs — jobs, wages, inflation, small business
  education_funding — K-12 funding, teacher pay, vouchers, student debt
  public_safety — policing, community safety (general)
  crime_public_safety — crime rates, bail reform, prosecution
  immigration — immigration policy beyond border enforcement
  border_security — border control, asylum, ICE/CBP
  reproductive_rights — abortion access, contraception
  gun_rights_safety — gun ownership, background checks, gun reform
  environment_climate — climate, emissions, conservation
  energy_grid — grid reliability, energy generation
  water_infrastructure — water access, treatment, dams
  property_taxes — property tax rates, assessments
  election_integrity — voting rights, voter ID, election administration
  congressional_accountability — stock-trading bans, term limits, ethics

${renderResolverPoleDirections()}

${renderResolverSubIssues()}`;

export function buildThemeExtractionPrompt(
  input: ThemeExtractionInput,
): string {
  return `You extract civic themes from a voter's own words.

The user just wrote a free-form message about what they care about
politically. Return a JSON array of 1–5 themes. Each theme:

${THEME_FIELDS_PROMPT_BLOCK}

${CANONICAL_ISSUES_PROMPT_BLOCK}

Rules:
  · Don't pad to a fixed count. One thing, one theme.
  · SPLIT distinct concerns joined by "and"/commas into a SEPARATE
    theme each — even one with no canonicalIssue (omit that field).
    Never merge distinct concerns into one literal-named theme.
  · Don't generalize the NAME. "ICE detention near my kid's school"
    stays specific in "name". (canonicalIssue may still be
    "border_security" — that field is for matching, the name is the
    voter's framing.)
  · Only use a canonicalIssue id from the list above, verbatim. If the
    voter's concern doesn't fit any, omit the field — do not invent ids.
  · subIssue ids are also verbatim from the SUB-ISSUES list, and only
    when the parent matches canonicalIssue — otherwise omit.
  · Order doesn't matter — the user will rerank in the UI.
  · No prose. Return JSON only.

<user_message>
${input.userInput}
</user_message>`;
}
