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
2. For every decided race in <decided>, decide whether the NEW
   theme is RELEVANT to that race — i.e. the contest actually
   bears on this issue. Do NOT score candidates, do NOT rank them,
   and do NOT compare candidates against one another.
3. Return JSON only:

   {
     "new_theme": { "name": "...", "quotes": [...] },
     "suggested_rank": <integer>,
     "rescored": [
       { "race_id": "...", "verdict": "REVISIT" | "HOLD" | "N/A" }
     ]
   }

VERDICT logic (per-issue relevance only — never a ranking):
  · "REVISIT" if the new theme is clearly relevant to this race,
    so the user may want to take another look at their own pick.
  · "HOLD" if the new theme does not bear on this race.
  · "N/A" for propositions.

Never output an alignment score or any number per race. Never state
or imply that another candidate is a better match or higher-ranked.

<user_message> ${input.userInput} </user_message>
<existing_themes> ${input.themesList} </existing_themes>
<decided> ${input.decidedJson} </decided>`;
}
