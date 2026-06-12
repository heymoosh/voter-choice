/**
 * scripts/ingest/_pac-issue-mapping.ts
 *
 * Re-export shim. The issue-PAC classification rules now live in
 * `src/lib/issuePacRules.ts` so both the ingest pipeline (this directory) and
 * the render/assembly layer (`src/lib/server/race-data.ts`) share one source of
 * truth without a `src → scripts` import. See that module for the rules and the
 * `ruleName` lookups the render layer uses.
 */
export * from "../../src/lib/issuePacRules";
