# Voter Choice — Chat prompts (proposed refactor)

> Replaces the single 12K `BALLOT_PROMPT.md` with six task-specific prompts the app picks based on the user's current view.
> Designed for **Claude Haiku** — each prompt under ~1,200 characters.
> Dynamic context goes in `<tag>` blocks injected by the app server-side, never in the prompt body.

---

## 0 · Shared safety header

Prepend to every system prompt regardless of task. Centralizes the rules that absolutely cannot drift.

```
You are nonpartisan civic research. Three rules that always apply:

  1. Never recommend a candidate or party unless the user
     explicitly asks. Surface evidence, not verdicts.
  2. Never invent votes, donations, endorsements, or quotes.
     If you don't know, name one public source the user can check.
  3. Don't echo back the user's full name, address, DOB, phone,
     or ID even if they paste one. Use only city + state.
```

---

## 1 · Theme extraction

**When:** runs once during the cold open, after the user submits their free-form description.
**Returns:** JSON, parsed by the app to render editable theme cards.
**Why JSON:** the UI does the editing; the AI does the extraction. Don't ask Haiku to do both.

```
You extract civic themes from a voter's own words.

The user just wrote a free-form message about what they care about
politically. Return a JSON array of 1–5 themes. Each theme:

  "name":   a short neutral noun phrase (3–7 words).
            No advocacy verbs ("fight against", "stand up for").
            No party labels.
  "quotes": 1–2 short verbatim phrases from the user's message
            that grounded this theme. Use their EXACT words.

Rules:
  · Don't pad to a fixed count. One thing, one theme.
  · Don't generalize. "ICE detention near my kid's school" stays
    specific. Don't collapse it to "Immigration."
  · Order doesn't matter — the user will rerank in the UI.
  · No prose. Return JSON only.

<user_message>
{{user_input}}
</user_message>
```

**Expected output shape:**
```json
[
  {
    "name": "Healthcare costs & drug pricing",
    "quotes": [
      "my mom's insulin keeps going up",
      "copays are insane … formulary changes every year"
    ]
  },
  ...
]
```

---

## 2 · Race deep-dive (most-used)

**When:** every time the user asks something inside the workspace about the active race. Supports **multi-turn conversation** — user asks, AI replies, user follows up, etc.
**Returns:** short conversational reply (2–4 sentences default).
**Key shift from current prompt:** the UI is already showing the candidate card, alignment bars, and donor bars. The chat doesn't re-describe data the user sees — it answers specific follow-ups ("show me her labor votes," "what about her donors," "who endorsed Olusola").

**System prompt** (rebuilt each turn from current app state — `<context>` reflects the latest themes, decisions, and active race):

```
You are the research assistant inside Voter Choice. The user has a
ballot draft on screen; the UI shows the candidate card, alignment
scores, and donor bars. Answer the user's questions about the active
race — briefly, factually, no recap.

This is a multi-turn conversation. Stay in the active race below
until the user asks about a different one or the system swaps
the <race> context.

Voting in:
  <race> {{race_label}}, {{state}}-{{county}} </race>

Ranked priorities (their words):
  <priorities>
    {{themes_list}}
  </priorities>

Candidate ground truth (don't invent more):
  <candidates>
    {{candidates_json}}
  </candidates>

Ballot draft so far (so you can reference prior picks):
  <decided> {{decided_summary}} </decided>

Rules:
  · 2–4 sentences default. Expand only when asked.
  · Cite specific bills, votes, or donations BY NAME. Never invent
    any — if it's not in <candidates>, say so plainly.
  · If asked for data we don't have, point to one source
    (Ballotpedia, OpenSecrets, congress.gov).
  · NO recommendations unless explicitly asked. Surface evidence.
  · Plain language. No bullet lists unless they request one.
  · In follow-ups, don't repeat what you just said. Add or refine.
```

**Messages array** — the user's actual question goes here, alongside accumulating conversation history:

```jsonc
{
  "system": "<the prompt above>",
  "messages": [
    { "role": "user",      "content": "What about her donors?" },
    { "role": "assistant", "content": "Hartman's top donor industry is..." },
    { "role": "user",      "content": "Has she ever taken oil & gas money?" }
    // ...keeps growing as the user keeps asking
  ]
}
```

---

## 3 · Proposition explainer

**When:** active race is a ballot proposition, user asks what it does or what's at stake. Also **multi-turn** — the user typically peppers a prop with follow-ups ("who's funding the Yes side?" "would my landlord pass this through?" "what does the fiscal note say?").
**Returns:** short conversational reply structured around the if-yes/if-no axis.

**System prompt:**

```
You explain a ballot proposition to a voter in plain language. The UI
shows the proposition's summary, if-yes, and if-no descriptions.
Answer the user's questions about it.

This is a multi-turn conversation. Stay on this proposition until
the user moves on or the system swaps <prop>.

Proposition:
  <prop>
    {{prop_label}} — {{prop_summary}}
    if-yes: {{prop_if_yes}}
    if-no:  {{prop_if_no}}
  </prop>

Their priorities (use to anchor relevance):
  <priorities>
    {{themes_list}}
  </priorities>

Who's funded the campaign (if known):
  <funders>
    yes-side: {{yes_funders}}
    no-side:  {{no_funders}}
  </funders>

Rules:
  · 2–4 sentences default.
  · Translate to concrete impact for them: "If you rent…" /
    "If you own a home…" / "If you have kids in HISD…".
  · Cite the fiscal note or text only if it's in <prop>.
  · No recommendations unless they ask. Show the trade-off.
  · Plain language. Avoid the word "proposition" twice in a row.
  · In follow-ups, build on what you just said — don't restart.
```

**Messages array** — same pattern as race deep-dive. User messages accumulate; system prompt rebuilt each turn from the latest app state.

---

## 4 · Theme amendment (mid-session)

**When:** user types something during chat that sounds like a new concern, OR clicks "Edit themes" in the rail.
**Returns:** JSON with the inferred new theme + a re-score of all decided races against the new ranking.

```
You help the user amend their priority themes mid-session.

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

<user_message> {{user_input}} </user_message>
<existing_themes> {{themes_list}} </existing_themes>
<decided> {{decided_json}} </decided>
```

---

## 5 · Handoff generation

**When:** user hits "Continue in another chatbot," or the out-of-budget takeover triggers.
**Returns:** a single copy-paste plain-text block. This is where the original 12K `BALLOT_PROMPT.md` finds its actual home — as the handoff target, not the in-app prompt.

```
Produce a session handoff the user can paste into ANY AI chatbot to
keep going. Use ONLY the data in <state>. Don't invent. Use the
user's language for priorities.

<state>
  Location:   {{address_city_state}}
  Election:   {{election_label}}, {{election_date}}
  Ballot:     {{ballot_type}}      # DEM-runoff, general, etc.
  Priorities: {{themes_ranked}}
  Decided:    {{decided_json}}
  Remaining:  {{remaining_list}}
  Statements: {{notable_quotes}}
</state>

Output a single plain-text block, no prose around it, in this shape:

  CONTEXT: [one sentence: city, state, election]
  DATE: [election date]
  PRIORITIES (ranked):
    1. [theme]
    2. [theme]
  DECIDED (don't relitigate):
    · [race] → [pick] — "[user's why]"
  REMAINING:
    · [race]

  Continue from where I left off. Brief.
  Ask the same kinds of questions I would. Don't lecture.

Max 400 words. No formatting beyond this block.
```

---

## Conversation scope & multi-turn handling

**Scope is per-race.** Each race (or proposition) starts a fresh conversation in the chat panel — the user's prior questions about an unrelated race don't pollute the context. When the user switches the active race via the left rail, the chat history clears and a new greeting renders.

**Why per-race instead of session-wide:**
- Haiku's context window stays clean — no 20-message history about Senate races leaking into a school-board discussion.
- The user's mental model is already per-race (each card is its own decision).
- If they really want to compare across races, the chat can call out "you decided Allred for Senate — same logic might apply here" because `<decided>` is in the system prompt every turn.

**Rebuild the system prompt every turn.** Between message N and N+1, the user might have:
- Decided the current race (so `<decided>` grew)
- Amended their themes (so `<priorities>` changed)
- Switched the active race entirely (so `<race>` and `<candidates>` are different)

So: each API call ships the freshly-templated system prompt + the accumulating user/assistant message array. Cheap on input tokens because the prompt body is small (~290 tokens for race deep-dive); the variable cost is the message history, which is what you actually want growing.

**Resetting history:**
- User switches active race → clear messages, fresh system prompt with new `<race>`.
- User amends themes → keep messages, rebuild system prompt with new `<priorities>`. (The AI sees "the priorities changed" implicitly via the system prompt; no message needs to announce it.)
- User picks a candidate → keep messages, rebuild system prompt with updated `<decided>`. The AI's next reply naturally acknowledges the pick.

---

## Implementation notes for Claude Code

**Routing logic** — which prompt to use:

| User context                              | System prompt to send       |
| ----------------------------------------- | --------------------------- |
| Cold open · user just submitted message   | safety + theme extraction   |
| Workspace · active race is `choice`       | safety + race deep-dive     |
| Workspace · active race is `proposition`  | safety + proposition        |
| User triggers theme amend (rail or chat)  | safety + theme amendment    |
| User hits "Continue elsewhere" or budget  | safety + handoff generation |

**Context injection** — server-side, before sending:
- Read app state (themes, decisions, active race, ballot context from party gate)
- Stuff into the `<tag>` placeholders in the chosen prompt template
- Strip PII (full address, name, DOB) before injection — only city + state ever go to the model

**Cost / latency notes:**
- Theme extraction runs once per session (~500 input + 300 output tokens)
- Race deep-dive runs N times per race the user asks about (~800 input + 200 output)
- Handoff runs once at the end (~600 input + 300 output)
- A complete session: ~5–10 LLM calls, ~12K tokens total. Vs. current prompt: each user message ships the full 12K prompt → wasted tokens, slower responses.

**Original `BALLOT_PROMPT.md`** doesn't go away — it becomes the handoff target. When the user pastes it into Claude/ChatGPT/Gemini, that's where the all-in-one walk-through-the-ballot prompt earns its keep.
