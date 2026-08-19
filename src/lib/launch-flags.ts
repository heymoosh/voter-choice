/**
 * src/lib/launch-flags.ts
 *
 * Convention + inventory for "pre-launch dark" features — code that ships to
 * prod but must stay invisible to real users until a coordinated go-live
 * flip. See docs/operations/launch-flip-list.md for the flip checklist this
 * registry backs, and the "[P1] EPIC: Go-live launch gate" backlog card
 * (card-id 0054bb72-cb87-46a6-987d-9cebaeb3e0eb) for the umbrella that owns
 * the actual flip.
 *
 * ---------------------------------------------------------------------------
 * Two things live here, and they are DELIBERATELY DECOUPLED:
 *
 * 1. LAUNCH_FLAG_REGISTRY — a documentation-grade inventory of every
 *    env-flag / feature-gate in the app today (both the pre-2026-07 ad-hoc
 *    ones like CAN2026_DISPLAY_ENABLED and any future LAUNCH_-prefixed
 *    ones). This is metadata only — it does NOT read process.env and does
 *    NOT change how any existing gate behaves. Each ad-hoc flag keeps its
 *    own bespoke reader (e.g. `isCan2026DisplayEnabled()` in
 *    `./server/can-flag.ts`) with its own truthy rule; migrating a surface
 *    onto `isLaunchFlagEnabled()` below is a separate, later PR per card
 *    a09a77c8 ("do NOT rip out the existing ad-hoc flags in this card").
 *
 * 2. isLaunchFlagEnabled(envVar) — the ONE way NEW pre-launch dark features
 *    should gate themselves going forward. It only accepts names of the
 *    shape `LAUNCH_*` (enforced at compile time via the template-literal
 *    type below) and is strict-truthy (`=== "true"`; anything else,
 *    including unset, is OFF). That is the whole "LAUNCH_* convention":
 *    pick a `LAUNCH_<THING>` name, add it to `.env.example` documented as
 *    default-OFF, gate the surface with `isLaunchFlagEnabled("LAUNCH_THING")`
 *    server-side, and add a row to `LAUNCH_FLAG_REGISTRY` +
 *    docs/operations/launch-flip-list.md so the flip is tracked in one
 *    place.
 *
 * Server-only. `process.env` reads here are real runtime reads (correct for
 * server code, including Route Handlers and Server Components) — this
 * module must NOT be imported to gate a *client* bundle.
 *
 * Client (NEXT_PUBLIC_) launch flags: Next.js only statically inlines
 * `process.env.NEXT_PUBLIC_X` when that exact literal member-expression
 * appears in client source (see src/app/page.tsx for the existing example,
 * NEXT_PUBLIC_BALLOT_ENABLED). A parameterized `process.env[name]` lookup —
 * which is what `isLaunchFlagEnabled` below does — is NOT statically
 * replaced in the browser bundle, so it will not work for a client flag. A
 * future client-side pre-launch flag must be named `NEXT_PUBLIC_LAUNCH_*`
 * and read with the literal expression directly at its call site (still
 * register it in LAUNCH_FLAG_REGISTRY with `surface: "client"` for the
 * inventory/doc).
 */

/**
 * - pre_launch_dark: confirmed — a real not-yet-launched surface. Must stay
 *   default-OFF until the coordinated go-live flip.
 * - uncertain: flagged by the inventory pass but NOT yet confirmed either
 *   way. Muxin confirms/prunes at PR review (see inventory_uncertain).
 * - operational: a config/ops toggle (tuning value, kill-switch, credential
 *   presence check, experience switch already resolved to its live state).
 *   Not part of the go-live flip.
 * - already_live: the flag exists in code but is already effectively ON in
 *   production (set via Vercel dashboard/CI, not scripted default). Do not
 *   change its default — out of scope for this convention.
 */
export type LaunchFlagStatus =
  "pre_launch_dark" | "uncertain" | "operational" | "already_live";

export type LaunchFlagSurface = "server" | "client";

export interface LaunchFlagEntry {
  /** Env var exactly as read in code today. */
  envVar: string;
  /** True once the flag is renamed/added under the LAUNCH_ convention. */
  isLaunchConvention: boolean;
  surface: LaunchFlagSurface;
  status: LaunchFlagStatus;
  /** One line: what this flag gates. */
  gates: string;
  /** Repo-relative path of the primary reader. */
  readAt: string;
  /** Confirmation caveats, prod-live evidence, etc. */
  note: string;
}

/**
 * Inventory of every env-flag / feature-gate found in the app (2026-07-01
 * pass). Ad-hoc names are NOT renamed — see the module doc above. Keep this
 * in sync with docs/operations/launch-flip-list.md by hand; there is no
 * codegen between the two.
 */
export const LAUNCH_FLAG_REGISTRY: readonly LaunchFlagEntry[] = [
  {
    envVar: "CAN2026_DISPLAY_ENABLED",
    isLaunchConvention: false,
    surface: "server",
    status: "pre_launch_dark",
    gates:
      "CAN2026 curated context (race ratings, donor trail, key-vote prose) rendered on seat cards",
    readAt: "src/lib/server/can-flag.ts",
    note: "Confirmed dark: leave UNSET until can2026.org attribution terms are confirmed with the maintainer.",
  },
  {
    envVar: "PAC_TRANSPARENCY_ENABLED",
    isLaunchConvention: false,
    surface: "server",
    status: "already_live",
    gates:
      'Both Part 6 money-transparency blocks on the seat card: "Top PACs and their sponsors" (6a) and "Outside spending about this race" (6b)',
    readAt: "src/lib/server/pac-transparency-flag.ts",
    note: "FLIPPED LIVE by Muxin 2026-08-16 (Vercel prod env), after the live 6b ingest run and the 30-committee hand-curation pass (curated summaries + citations, migration 0024) — the two conditions the original dark note required.",
  },
  {
    envVar: "PROMISE_TRACKER_ENABLED",
    isLaunchConvention: false,
    surface: "server",
    status: "pre_launch_dark",
    gates:
      "Part 5 promise-ledger kept/broken verdicts (candidate_promises / promise_actions / promise_verdicts) rendered anywhere",
    readAt: "src/lib/server/promise-tracker-flag.ts",
    note: "Confirmed dark: leave UNSET until the rubric §6.4 ship gate clears (independent-annotator gold pass, κ >= 0.70, >= 90% adjudicator agreement, zero kept<->broken polarity flips) AND Muxin signs off regardless of the numbers. No reader/UI exists yet either way (deferred to a separate Claude Design session).",
  },
  {
    envVar: "VOTER_ISSUE_EVENTS_ENABLED",
    isLaunchConvention: false,
    surface: "server",
    status: "pre_launch_dark",
    gates:
      "Persisting anonymous voter issue-preference event rows (state + issue + stance, no identifier) to Postgres at session-end",
    readAt: "src/lib/server/counters.ts",
    note: "Confirmed dark: leave UNSET until the privacy-policy update covering this collection is live.",
  },
  {
    envVar: "POLIS_VECTOR_COLLECTION_ENABLED",
    isLaunchConvention: false,
    surface: "server",
    status: "pre_launch_dark",
    gates:
      "Writing de-identified Polis response vectors to polis_response_vectors",
    readAt: "src/lib/polis/collectVector.ts",
    note: "Confirmed dark: collectPolisVector() also has no caller on any live path yet (not wired into the counters route) — currently dead code even before the flag is considered.",
  },
  {
    envVar: "CHAT_USAGE_METRICS_ENABLED",
    isLaunchConvention: false,
    surface: "server",
    status: "uncertain",
    gates:
      "Recording per-call chat cost/token usage rows to Postgres (internal telemetry; wired into POST /api/chat already, invisible to voters either way)",
    readAt: "src/lib/server/chat-usage-metrics.ts",
    note: "UNCERTAIN: this never renders to a voter, so it may just be an ops toggle to flip on whenever convenient rather than a go-live gate item. Muxin to confirm whether it belongs on the flip-list.",
  },
  {
    envVar: "NEXT_PUBLIC_BALLOT_ENABLED",
    isLaunchConvention: false,
    surface: "client",
    status: "operational",
    gates:
      "Which experience mounts at `/`: unset/false = congress-assessment experience (current prod default); true = legacy ballot-centric app (parked for Phase 3 reuse)",
    readAt: "src/app/page.tsx",
    note: "Not a pre-launch-dark switch — the default (OFF) already serves the CURRENT live experience. The true state re-enables an intentionally-parked legacy app, not an unlaunched one.",
  },
  {
    envVar: "PROMPT_FLEET_V2",
    isLaunchConvention: false,
    surface: "server",
    status: "already_live",
    gates:
      "Six-prompt-fleet chat system-prompt composition (src/lib/prompts/*) vs the legacy single-block BALLOT_PROMPT",
    readAt: "src/app/api/chat/route.ts",
    note: 'ALREADY LIVE in prod (set via Vercel project env, and present in local .env.local) — see docs/operations/voter-choice-backlog.md ("PromptFleetV2 is ON in prod"). Do not change its default; out of scope for this card.',
  },
  {
    envVar: "POLIS_COMPASS_THRESHOLD",
    isLaunchConvention: false,
    surface: "server",
    status: "operational",
    gates:
      "Minimum session count before GET /api/polis/compass returns real clusters instead of the below_threshold sentinel (numeric, default 150)",
    readAt: "src/app/api/polis/compass/route.ts",
    note: "Config tuning, not a boolean feature switch. The endpoint itself is already live; it just has no data yet.",
  },
  {
    envVar: "CHAT_DAILY_SESSION_LIMIT",
    isLaunchConvention: false,
    surface: "server",
    status: "operational",
    gates: "Per-IP daily chat session cap (numeric abuse control)",
    readAt: "src/lib/server/rate-limit.ts",
    note: "A value change (100 -> 10 before launch), not a flag flip. Already tracked as its own line item on the Go-live EPIC.",
  },
] as const;

/**
 * Env var name shape for the LAUNCH_* convention. Compile-time guardrail so
 * `isLaunchFlagEnabled` can only be called with a name that follows the
 * convention (new pre-launch dark flags only — existing ad-hoc flags keep
 * reading `process.env` directly in their own module, see file doc above).
 */
export type LaunchFlagEnvVar = `LAUNCH_${string}`;

/**
 * Returns true only when `envVar` is set to the exact string "true".
 * Unset, empty, "false", "1", or any other value is OFF — including in
 * production, since nothing sets a LAUNCH_* var by default. A flag only
 * turns on when someone deliberately sets it (Vercel project env / CI), at
 * the coordinated go-live flip described in
 * docs/operations/launch-flip-list.md.
 */
export function isLaunchFlagEnabled(envVar: LaunchFlagEnvVar): boolean {
  return process.env[envVar] === "true";
}
