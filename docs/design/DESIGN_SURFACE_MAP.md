# Design Surface Map

For UI/design review or component reuse (including by external AI assistants reading the GitHub
URL). Key paths as of `launch/production` HEAD:

- **Components**: `src/components/` — `PartyGate`, `BallotLookupNeeded`, `ColdOpenInput`,
  `WorkspaceRail`, `BallotPane`, `PrintBallot`, `ChatPanel`, `ThemeRanker`, `BudgetExhausted`, etc.
- **Page-level**: `src/app/PageContent.tsx` (landing), `src/app/page.tsx` (root server component).
- **Copy / labels (EN + ES)**: `src/lib/translations.ts`.
- **Design tokens / Civic mood**: `src/styles/globals.css` (color tokens, typography, mood/palette/
  treatment attributes) + `src/styles/print.css`.
- **Type definitions**: `src/lib/server/extract-types.ts` (ballot schema), `src/lib/raceDeriver.ts`
  (Race + RaceSection types).
- **Display normalizers**: `src/lib/normalizeRaceLabel.ts`, `src/lib/normalizeCandidateName.ts`.
- **Design source of truth**: `docs/design/2026-redesign/` (prototype HTML/CSS/JSX + README).
