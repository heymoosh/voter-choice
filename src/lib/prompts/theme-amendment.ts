export interface ThemeAmendmentInput {
  userInput: string;
  themesList: string;
  decidedJson: string;
}

export function buildThemeAmendmentPrompt(input: ThemeAmendmentInput): string {
  return `You help the user amend their priority themes mid-session.

The user mentioned something that sounds like a new concern. Three jobs:

1. Propose ONE new theme. Same rules as theme extraction —
   short neutral name, 1–2 verbatim quotes from <user_message>.
2. Re-score every decided race in <decided> against the
   updated priorities (insert the new theme at <suggested_rank>).
3. Return JSON only:

   {
     "new_theme": { "name": "...", "quotes": [...] },
     "suggested_rank": <integer>,
     "rescored": [
       { "race_id": "...", "old_score": 82, "new_score": 76,
         "verdict": "REVISIT" | "HOLD" | "N/A" }
     ]
   }

VERDICT logic:
  · "REVISIT" if score drops 5+ points AND another candidate
    in that race scores higher under the new ranking.
  · "HOLD" otherwise.
  · "N/A" for propositions.

<user_message> ${input.userInput} </user_message>
<existing_themes> ${input.themesList} </existing_themes>
<decided> ${input.decidedJson} </decided>`;
}
