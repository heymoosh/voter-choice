# Work Packet: free-first-ballot-data

## Intent

Make ballot data truthfulness launch-ready by using free official sources first, clearly labeling source confidence, and preventing the app from implying exact contests/candidates were found when they were not.

## Scope

- Keep `/api/civic` as the ballot/polling source boundary.
- Improve Google Civic lookup by retrying with explicit election IDs when the default voter info response does not include contests.
- Add source-confidence metadata to the civic response.
- Surface source confidence in the research UI and prompt.
- Keep county official sample-ballot links as fallback sources.
- Use `2400 Fountainview Drive, Houston TX 77057` as the primary live test address.

## Acceptance Criteria

- Google Civic default lookup is attempted first.
- If no contests are returned, the API tries explicit election IDs from `otherElections` and the elections list.
- Response distinguishes exact contests from partial/source-links-only data.
- UI says exact ballot is not confirmed unless contests are actually present.
- The AI prompt does not claim a definitive ballot when exact contests are missing.
- Existing tests pass; add focused API/unit coverage for the retry behavior.

## Anti-Solutions

- Do not scrape sites that require login, CAPTCHA, or unclear automated access.
- Do not claim exact candidate/contest data from source links alone.
- Do not send the exact address into the AI prompt.
- Do not add paid-provider code until an API key/source contract exists.

## Verification

- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run e2e`
- live smoke with the Houston test address
