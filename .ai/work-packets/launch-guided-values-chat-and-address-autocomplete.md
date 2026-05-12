# Work Packet: launch-guided-values-chat-and-address-autocomplete

Status: completed — guided ballot flow + address autocomplete + runoff prompt shipped (commits 6d35bd2, 6a9626c)
Owner: orchestrator
Source: live deployed-site feedback
Branch: launch/production

## Intent

Restore address autocomplete and correct the AI conversation flow so the product feels like a values-first ballot guide rather than an information dump.

## Original User Intent

"I'm on the deployed site. Issues: 1) when I enter my address, it should start auto-filling the entire address. This feature WAS implemented before adn is now stripped out. 2) I want to see the prompt that we're running the cahtbot on - it does NOT follow the flow i had asked for /Users/Muxin/Documents/GitHub/voter-choice/docs/BALLOT_PROMPT.md ... Let's get that nailed first before we touch anything else."

## Intent Interpretation

The deployed app must use address autocomplete wherever a user is asked for an address. The AI first response should briefly explain why the election matters, show a compact ballot-at-a-glance for fact checking, provide a clear missing-ballot CTA if needed, and then start learning the voter's values/tradeoffs before candidate-by-candidate detail.

## Business Logic

Rules:

- Do not assume the voter knows what an office, race, primary, runoff, proposition, or candidate does.
- Do not start with detailed candidate analysis.
- Research candidate actions, voting records, donors, endorsements, and news in the background.
- Use the research to summarize alignment after learning the voter's values and tradeoffs.
- Respect voter agency; recommendations must be conditional on the voter's stated values.
- Never send exact street address to the AI prompt.

Assumptions:

- Google Places autocomplete is intended to be visible on address entry surfaces when `NEXT_PUBLIC_GOOGLE_PLACES_API_KEY` is present.
- If Places is unavailable, the manual input must remain usable.

User-confirmed decisions:

- Fix these two issues before touching anything else.

Edge cases:

- Exact ballot may be missing. The first response must not fabricate; it should show source limits and direct the user to the sample ballot paste/upload fallback.
- Zip-only input must still work.

Out of scope:

- Paid ballot provider integration.
- Candidate enrichment API implementation.
- Full UI redesign.

## Scope

Touch:

- `src/components/ZipForm.tsx`
- `src/components/AddressInput.tsx`
- `src/lib/generatePrompt.ts`
- focused tests

Do not touch:

- provider secrets except inspection
- database/durable store
- deployment workflow unless verification reveals a deploy-only issue

## Ownership Audit

Concern: address autocomplete
Existing owner: `src/components/ZipForm.tsx` currently owns the Places hook, but it is duplicated/needed by `AddressInput`.
Neighboring owners:

- `src/components/AddressInput.tsx` owns polling-location address entry.
- `src/types/google-maps.d.ts` owns Places type declarations.

Concern: chatbot behavior and handoff prompt
Existing owner: `src/lib/generatePrompt.ts`
Neighboring owners:

- `docs/BALLOT_PROMPT.md` is the product prompt reference.
- `src/components/ChatPanel.tsx` sends `basePrompt` as system prompt and `contextBlock` as the first user message.

Files/modules/docs inspected:

- `docs/BALLOT_PROMPT.md`
- `src/lib/generatePrompt.ts`
- `src/components/ZipForm.tsx`
- `src/components/AddressInput.tsx`
- `src/app/api/chat/route.ts`
- `.github/workflows/deploy.yml`

Reuse/edit targets:

- Extract/reuse the Places hook rather than maintaining two different autocomplete implementations.
- Rewrite the English prompt and context start directive around the intended guided flow.

New owner needed:

- yes: `src/lib/useGooglePlacesAutocomplete.ts` should own client-side Google Places element wiring.

Overlap/bloat risks:

- Avoid having multiple Places implementations with different events/field names.
- Avoid prompt docs and runtime prompt drifting further apart.

## Acceptance Criteria

- The landing address field shows Google address autocomplete when the Places key is configured.
- The polling-location address field also supports autocomplete.
- Manual address/ZIP entry still works without Places.
- The runtime prompt clearly instructs the chatbot to keep first response short, explain why the election matters, show high-level ballot fact-check bullets, and provide the missing-ballot CTA.
- The runtime prompt requires values/tradeoff discovery before candidate detail/recommendations.
- Candidate research is framed as backend research used for alignment, not a candidate-info dump.

## Verification

- `npm run lint`
- focused tests for prompt and address extraction
- `npm run test`
- `npm run build`
- `npm run e2e` if feasible
- live smoke after deploy

## Anti-Solutions

- Do not send exact address into the AI prompt.
- Do not hide autocomplete behind an invisible component plus a separate visible input.
- Do not ask a broad "what issues matter to you?" before explaining the election stakes.
- Do not dump candidate bios or detailed candidate comparisons before learning values.
