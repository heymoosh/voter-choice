# CLAUDE.md

## Project

Voter Choice — a civic tool that helps voters research their ballot.

The user enters their zip code, the site looks up their state's election data (dates, registration deadlines, early voting, resources) from static JSON, and generates a customized AI ballot research prompt for them to copy into any free AI chatbot.

Reference the feature spec at `docs/PROJECT_SPEC.md` for full requirements.

## Tech Stack

- Next.js (App Router), TypeScript
- Static JSON data in `src/data/`
- ESLint + Prettier configured

## Code Style

- TypeScript. Strict mode.
- ESLint + Prettier (run `npm run lint` and `npm run format` to check)
- Pin exact versions in package.json
- Meaningful commit messages

## Data

- State election data: `src/data/states/*.json` (TX, CA, NH have stub data)
- Zip-to-state mapping: `src/data/zip-to-state.json`

## Testing

- Unit tests: Vitest (`npm test`)
- E2E: Playwright (`npm run e2e`) — shared test suite, do not modify
- Measure script: `npm run measure` — runs all metrics

## Boundaries

- No sudo. No global npm installs.
- No force push, no branch deletion.
- `rm -rf` only on build artifacts (node_modules, .next, coverage) with exact paths.
