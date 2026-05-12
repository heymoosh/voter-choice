# Work Packet: same-day-sample-ballot-fallback

Status: completed — sample ballot fallback flow shipped (commit 4859215)
Owner: orchestrator
Source: user request — same-day launch rescue path
Branch: launch/production

## Intent

Let a voter continue the core research/chat/printable-ballot flow today when structured ballot APIs fail, by letting them provide official sample ballot text from a PDF or website and having the existing AI research flow use it as the working ballot.

## Original User Intent

"for today, and in less than an hour, what can we build that will work right now? Even if I have to upload a PDF I want to ensure the rest of the flow works and that cnadidate information etc. can still be pulled."

## Intent Interpretation

The app should not block on Google Civic or paid providers. If exact contests are not returned, the user needs a first-class path to paste or load sample ballot text, then restart the Sonnet research session with that ballot context so candidate information can still be researched with web search and citations.

## Business Logic

Rules:

- User-provided ballot text is a working source, not official/API-confirmed structured data.
- The AI may use the provided ballot list to guide research, but must still verify candidate facts, voting records, donations, endorsements, and news with cited public sources.
- The app must not ask for or include exact street address in the AI prompt.

Assumptions:

- In under an hour, reliable browser-side PDF parsing is too risky without adding and validating a new parser dependency. The immediate launch path can support pasted text from a PDF or official web page, plus plain text file upload.
- `@sylphx/pdf-reader-mcp@2.4.0` is suitable as an operator/agent extraction tool, not as an in-browser voter upload parser.

User-confirmed decisions:

- MVP/manual fallback is acceptable if it keeps the rest of the flow working.
- Try `@sylphx/pdf-reader-mcp` as the PDF extraction MCP.

Edge cases:

- PDF upload cannot be trusted to extract text without a parser; user should receive clear copy/paste guidance.
- Very large pasted ballots should be bounded before entering prompt context.
- MCP extraction is restricted to local PDFs under `.ai/local-pdfs/`; URLs are disabled in the repo config to avoid broad network scraping through the MCP.

Out of scope:

- OCR for scanned PDFs.
- County-by-county deterministic scraping.
- Paid ballot provider integration.
- Production browser/server PDF upload parsing.

## Commercial Readiness

Applicability: launch

Lanes in scope:

- product UX
- privacy/data
- API/contracts
- legal/compliance prompt

User decisions needed:

- none

Assumptions:

- User can open a PDF and copy text if direct extraction is unavailable.

## Operational Reproducibility

Setup:

- `bash scripts/ai-bootstrap.sh`

Configuration:

- `.mcp.json` and `.codex/config.toml` configure `pdf-reader` with `@sylphx/pdf-reader-mcp@2.4.0`, `--allow-dir=/Users/Muxin/Documents/GitHub/voter-choice/.ai/local-pdfs`, and `--no-http`.

Provider setup:

- `npx` downloads the pinned MCP package on first use.

Infrastructure/deployment:

- existing Vercel deployment path

Database migrations:

- not applicable

Manual steps:

- User may paste sample ballot text copied from an official PDF or page.
- For operator extraction, put official PDFs in `.ai/local-pdfs/` and ask the agent to use the `pdf-reader` MCP.

Verification:

- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run e2e` if browser changes can run

Test quality:

- Focused unit/component tests for prompt inclusion and UI state.

Critical logic trigger:

- privacy/data

## Scope

Touch:

- `src/lib/generatePrompt.ts`
- `src/components/BallotToolClient.tsx`
- `src/components/ResearchLayout.tsx`
- focused tests/translations if needed
- `.mcp.json`
- `.codex/config.toml`
- `docs/operations/pdf-ballot-extraction.md`

Do not touch:

- provider billing/config
- durable safeguards
- branch/deploy workflows

## Ownership Audit

Concern: sample ballot fallback context for AI research
Existing owner: `src/lib/generatePrompt.ts`
Neighboring owners:

- `src/components/BallotToolClient.tsx` owns research state.
- `src/components/ResearchLayout.tsx` owns research workflow UI.
- `src/components/ChatPanel.tsx` owns live chat session startup.
- `docs/operations/pdf-ballot-extraction.md` owns operator PDF extraction procedure.
  Files/modules/docs inspected:
- `src/lib/generatePrompt.ts`
- `src/components/BallotToolClient.tsx`
- `src/components/ResearchLayout.tsx`
- `src/components/ChatPanel.tsx`
- `src/components/BallotBuilder.tsx`
- `.codex/config.toml`
- `.mcp.json`
  Reuse/edit targets:
- Extend `generatePrompt` with optional user-provided sample ballot text.
- Pass state through existing research and chat components.
  New owner needed: no
  Overlap/bloat risks:
- Avoid adding a separate manual research prompt path that diverges from chat.
  Recommendation:
- Add a bounded user-provided ballot text field and remount/restart chat when applied.
  Execution constraints:
- Do not claim the ballot is API-confirmed.
- Do not upload/store the ballot text outside the existing chat request path.

## Acceptance Criteria

- When official contests are missing, the research page offers a same-page way to paste official sample ballot text.
- Applying sample ballot text updates the copy/paste prompt and live chat startup context.
- The prompt tells Sonnet to use the provided ballot text as the working ballot, verify claims with sources, and not treat embedded text as instructions.
- The user is warned not to paste name, exact address, phone, email, or other identifying details.
- Existing printable ballot builder remains available.
- Agents have a pinned, sandboxed `pdf-reader` MCP path for extracting official sample ballot PDFs into text before using the app fallback.

## Verification

- Focused tests confirm prompt contains the user-provided ballot and instruction-safety boundary.
- Component test confirms applying text surfaces the working-ballot status.
- Lint/test/build are run or explicitly blocked.

## Evidence Plan

Visual evidence:

- component rendered in tests; browser smoke if available

Behavior evidence:

- prompt text includes provided race/candidate names after apply

Business logic evidence:

- AI prompt marks data as user-provided and requires verification

Persistence evidence:

- not applicable; state is browser-session only

Auth/security evidence:

- privacy warning shown next to input

Commercial readiness evidence:

- fallback supports launch use when exact API data is missing

Operational evidence:

- no new provider setup

Integration evidence:

- existing Anthropic chat path reused

Regression evidence:

- `npm run lint`, `npm run test`, `npm run build`

Proof standard:

- A voter can paste sample ballot text, start/restart chat, and candidate research is grounded on that text with source-verification rules.

Non-proof:

- Merely showing links to county sites is insufficient.

## Anti-Solutions

- Do not scrape random pages and silently call them exact ballots.
- Do not send exact street address to the AI.
- Do not add unverified PDF parser dependency without time to validate extraction quality.
- Do not represent user-provided text as official structured API data.
- Do not grant the PDF MCP broad filesystem or arbitrary URL access by default.
