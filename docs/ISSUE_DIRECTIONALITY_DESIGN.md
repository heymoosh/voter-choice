# Issue Directionality Design — Pole-as-Data

**Status:** Design only. No source files edited. This doc is the durable spec a future coding agent picks up when we decide to make issue directionality explicit. It defines *what to build and why*, grounded in the code as it exists on `launch/production` today.

**Hard rule carried from the CAN doc:** Do **not** edit `src/lib/canonicalIssues.ts` to implement this. That file currently has uncommitted edits in another worktree (the 2026 redesign) and is a live-edit collision risk. This design adds directionality as a *new* table + a *new* config file and leaves `canonicalIssues.ts` as a pure label map. See §6.

---

## 1. Problem statement

### 1.1 The flaw in one sentence

Alignment scoring compares two binary `in_favor`/`opposed` signals — the voter's `resolvedStance` and a bill's `stanceLens` — but both are defined *relative to a canonical issue id that has no stored pole*. The only thing that makes "in_favor" mean the same thing on both sides is an **unwritten convention duplicated across two LLM prompts**. If those prompts ever drift, the alignment score silently inverts and nothing catches it.

### 1.2 Where the convention actually lives (and why that's fragile)

There is exactly one place the pole is defined, and it's prose inside the bill-tagger prompt. From `scripts/ingest/_classify-batch.ts` (and a byte-identical copy in `scripts/ingest/classify-bills.ts`), lines 53–56:

```
- "stance_lens": "in_favor" or "opposed" — what voting YEA on this bill MEANS for that issue
  * "in_favor": a YEA vote supports / expands / funds this issue
  * "opposed": a YEA vote restricts / cuts / opposes this issue
```

That is the *entire* definition of directionality in the system. It is:

- **Per-tagger, not per-issue.** "supports / expands / funds" is a single global rule applied to all 15 issues. For `gun_rights_safety` it is genuinely ambiguous: does a YEA on a background-check bill "support the issue"? The issue id names both poles, so "support / expand / fund the issue" has no determinate referent.
- **Not shared with the stance-resolver.** The stance-resolver lives in the ballot prompt (`src/lib/generated/ballotPromptEn.generated.ts`). It produces `resolvedStance` as a *natural-language phrase* — e.g. `"expand law enforcement funding"`, `"Protecting access to abortion"` (line 191) — and is explicitly told that `resolvedStance` "must still reflect the voter's side, not a neutral description" (line 305). It is never told the tagger's "YEA = supports/expands/funds" convention.
- **Collapsed to a binary by the LLM, off the record.** The `lookup_alignment` tool requires `resolved_stance` to be the enum `in_favor`/`opposed` (`src/app/api/chat/route.ts` lines 79–82; enforced again in `src/app/api/alignment/route.ts` lines 39–43). So between emitting the natural-language stance in the `[ALIGNMENT_SCORES]` block and calling the tool, the model silently maps `"expand law enforcement funding" → in_favor`. That mapping uses the model's *own* notion of which direction is positive for `crime_public_safety` — a notion that is written down nowhere and is not guaranteed to match the tagger's.

So we have **two independent LLM judgments of "which way is positive"** — one frozen into the `issue_tags.stance_lens` column at ingest time by the tagger, one made fresh at query time by the chat model — and **no shared source of truth** binding them. The scoring engine assumes they agree.

### 1.3 The scoring engine assumes agreement

`computeVoteAlignment(voteCast, stanceLens, resolvedStance)` in `src/lib/server/alignment.ts` (lines 161–180) is the truth table:

```ts
const candidateSupportsIssueDirection = yea
  ? stanceLens === "in_favor"
  : stanceLens === "opposed";
const voterWantsSupport = resolvedStance === "in_favor";
const aligned = candidateSupportsIssueDirection === voterWantsSupport;
```

This is a pure XNOR over two booleans. It is *correct* only if `stanceLens === "in_favor"` and `resolvedStance === "in_favor"` are anchored to the **same** pole of the issue. The function has no third input describing what that pole is — it cannot, because the pole isn't data. It trusts the two callers to have used the same convention.

### 1.4 Concrete inversion example

Take `gun_rights_safety` — a label that names both sides of the debate.

- A voter says: *"I want stricter background checks and an assault-weapons ban."* The stance-resolver reads "the gun-safety side" as the positive pole and emits `resolved_stance: "in_favor"` (in favor of *gun safety / regulation*).
- The bill-tagger, following its prompt ("YEA = supports/expands/**funds** this issue"), tags an *assault-weapons-ban bill* with `stance_lens: "opposed"` — reasoning that a YEA *restricts* guns, and it read the issue's positive pole as *gun rights / access*.
- Candidate votes **yea** on the ban (a pro-regulation vote — exactly what the voter wants).
- `computeVoteAlignment("yea", "opposed", "in_favor")`: `candidateSupportsIssueDirection = (yea ? false : …) = false`; `voterWantsSupport = true`; `aligned = (false === true) = false` → **"against"**.

The candidate voted *exactly the way the voter wanted* and the engine reports they voted **against** the voter's stance. The score is inverted, silently, with full confidence, and the contributing-votes list will cite that very bill as evidence *against* alignment. Nothing logs an error — both inputs were valid enum values.

The bidirectional label is what *causes* this: with a single-pole label like `gun_safety` ("in_favor = more regulation"), the resolver and tagger have a fighting chance of agreeing because the label itself names the pole. With `gun_rights_safety`, "in_favor" is a coin flip, and the two coins are flipped independently.

### 1.5 Which issues are exposed

Inspecting `CANONICAL_ISSUE_LABELS` in `src/lib/canonicalIssues.ts`, the labels split into two risk classes:

| Issue id | Label | Pole risk |
|---|---|---|
| `gun_rights_safety` | Gun Rights & Safety | **High** — names both poles in the id |
| `reproductive_rights` | Reproductive Rights | Medium — "rights" implies a pole, but "in favor of reproductive rights" vs. "in favor of restrictions" is read-dependent |
| `election_integrity` | Election Integrity | Medium — "integrity" is claimed by both access-expansion and restriction camps |
| `environment_climate` | Environment & Climate | Medium — "in favor of the environment" is intuitive but "climate" alone is neutral |
| `immigration`, `border_security` | Immigration / Border Security | Medium — "in favor of immigration" vs. "in favor of border security" point opposite ways |
| `healthcare_affordability`, `education_funding`, `housing_affordability`, `water_infrastructure`, `energy_grid` | (affordability/funding framings) | Low — the label names a directional good; "in_favor = more of it" is unambiguous |
| `economy_jobs`, `property_taxes`, `public_safety`, `crime_public_safety` | — | Low–medium — mostly directional, but `property_taxes` ("in favor" = raise or cut?) is genuinely ambiguous |

The "Low" rows are exactly the ones where the tagger's "supports / expands / funds" rule happens to land on the intuitive pole. The "High/Medium" rows are where it doesn't, and where the inversion in §1.4 is live.

---

## 2. Current model (cite the real files)

End-to-end, directionality flows like this today:

1. **Ingest / tagging** — `scripts/ingest/_classify-batch.ts` `buildSystemPrompt()` injects `CANONICAL_ISSUE_LABELS` (id + label only — see lines 42–49) and the prose pole convention (lines 53–56). The model returns `{canonical_issue, stance_lens, confidence}` per bill. Validated against `VALID_STANCE_LENSES = {"in_favor","opposed"}` (line 38) and written to `issue_tags.stance_lens` (`db/schema.ts` line 113, commented `"in_favor" | "opposed" — what voting yea on this bill *means* for the issue`).

2. **Stance resolution (UI)** — `src/components/ConcernInterpretation.tsx` captures the user's position. `ConcernConfirmation.resolvedStance` is typed `string` (a natural-language phrase, line 39), populated either from the picked disambiguation option (`s.pickedOption`, line 530) or from `entry.stance` (line 536). `ConcernInterpretationEntry.stance` is also a free `string` (`src/lib/structured-blocks.ts` line 799).

3. **Stance resolution (LLM → tool)** — the ballot prompt emits `[ALIGNMENT_SCORES]` with a natural-language `resolvedStance` (`ballotPromptEn.generated.ts` lines 290, 305), then calls `lookup_alignment` with the **enum** `resolved_stance: in_favor|opposed` (`route.ts` lines 79–82, prompt line 300). The natural-language→enum mapping happens inside the model with no recorded rule.

4. **Scoring** — `lookupAlignment(candidateId, canonicalIssue, resolvedStance)` (`alignment.ts` lines 195–300) joins `votes → bills → issue_tags` on `canonical_issue` (lines 227–233), then `computeVoteAlignment` (lines 161–180) does the XNOR described in §1.3. `AlignmentScore.resolvedStance` is persisted in the parsed block as a `string` (`structured-blocks.ts` line 562).

5. **PACs** — there is currently **no** PAC directionality anywhere. Donor data exists only as `donor_aggregates` (`db/schema.ts` lines 133–158), bucketed into industry `bucket_label`s with no agenda/pole. The CAN doc proposes `can_issue_pac_contributions` (`docs/CAN2026_ENRICHMENT_SCHEMA.md` §3.7) keyed by `pac_name` with a free-text `pac_category` ("pro_israel", "crypto") — descriptive, not computable, and not tied to any vote.

**Net:** `in_favor`/`opposed` appears in 4 places (tagger, `issue_tags`, chat tool, alignment route) and is anchored by 0 stored definitions.

---

## 3. Proposed model — pole as data

### 3.1 Core idea

Introduce **one canonical, stored definition per issue of what `in_favor` means**, and make it the single source of truth consumed by *both* the tagger and the stance-resolver. Directionality stops being prose-in-a-prompt and becomes a row in a table (and a typed config the build can read).

A pole definition answers exactly one question: *"For this issue, which real-world direction does `in_favor` point at?"* — stated as a positive-pole phrase, a negative-pole phrase, and example signals for each side so both LLMs disambiguate the same way.

### 3.2 New table: `issue_poles`

Drizzle-style, in the existing `db/schema.ts` convention (text enums documented inline, see `votes.vote_cast` / `issue_tags.stance_lens`). **To be added to `db/schema.ts` when greenlit — not now.**

```ts
// ---------------------------------------------------------------------------
// issue_poles — canonical directionality definition, one row per canonical issue
//   (or per directional axis; see issue_axes in §3.4). This is the single
//   source of truth that BOTH the bill-tagger and the stance-resolver consume,
//   so "in_favor" means the same real-world direction on both sides.
// ---------------------------------------------------------------------------
export const issuePoles = pgTable("issue_poles", {
  // Matches a canonical issue id from src/lib/canonicalIssues.ts, OR an axis id
  // from issue_axes (§3.4) when an issue is split. Text PK so re-seed is an upsert.
  issueId: text("issue_id").primaryKey(),
  // Human label, mirrors CANONICAL_ISSUE_LABELS but stored so DB-only consumers
  // don't need the TS map. Kept in sync by the seed script (§5.2).
  label: text("label").notNull(),
  // The heart of the table: what each pole MEANS, in plain language.
  // positivePole === the direction that maps to in_favor.
  positivePole: text("positive_pole").notNull(),   // "Expanding / protecting access to firearms"
  negativePole: text("negative_pole").notNull(),   // "Restricting access to firearms"
  // Disambiguating example signals, fed verbatim into both prompts so the two
  // LLMs anchor identically. Short noun phrases, not sentences.
  positiveExamples: jsonb("positive_examples").notNull(), // ["concealed-carry expansion","suppressor deregulation"]
  negativeExamples: jsonb("negative_examples").notNull(), // ["assault-weapons ban","universal background checks"]
  // "single_pole" = a normal directional issue; "axis" = a split half (§3.4);
  // "bidirectional_unsafe" = flagged as un-pole-able, MUST be split before use.
  poleKind: text("pole_kind").notNull(),           // "single_pole" | "axis" | "bidirectional_unsafe"
  // Bumped whenever positivePole/examples change; lets us detect tags written
  // under an older pole definition and re-tag only those (§5.3).
  poleVersion: text("pole_version").notNull(),     // e.g. "2026-06-01.1"
  notes: text("notes"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
```

### 3.3 Typed config mirror (build-time source of truth)

The table is the runtime authority, but the *seed* values live in a typed config so they're code-reviewable and the tagger script (which runs offline against `CANONICAL_ISSUE_LABELS`) can import them without a DB round-trip. **New file — do NOT put this in `canonicalIssues.ts`.** Suggested path `src/lib/issuePoles.ts`:

```ts
// src/lib/issuePoles.ts — seed source of truth for issue directionality.
// Mirrors the issue_poles table; the seed script (§5.2) upserts these rows.
// Consumed by: the bill-tagger prompt, the stance-resolver prompt builder,
// and the resolvedStance->enum mapper. Do NOT add directionality to
// canonicalIssues.ts (live-edit collision risk — see CAN2026 doc §5).
export type PoleKind = "single_pole" | "axis" | "bidirectional_unsafe";

export interface IssuePole {
  issueId: string;          // matches a CANONICAL_ISSUE_LABELS key or an axis id
  positivePole: string;     // what in_favor means, plain language
  negativePole: string;     // what opposed means
  positiveExamples: string[];
  negativeExamples: string[];
  poleKind: PoleKind;
  poleVersion: string;
}

export const ISSUE_POLES: Record<string, IssuePole> = {
  gun_rights_safety: {
    issueId: "gun_rights_safety",
    positivePole: "Expanding and protecting access to firearms",
    negativePole: "Restricting access to firearms",
    positiveExamples: ["concealed-carry expansion", "suppressor deregulation", "stand-your-ground"],
    negativeExamples: ["assault-weapons ban", "universal background checks", "red-flag laws"],
    poleKind: "bidirectional_unsafe", // candidate for splitting — see §3.4
    poleVersion: "2026-06-01.1",
  },
  healthcare_affordability: {
    issueId: "healthcare_affordability",
    positivePole: "Making healthcare more affordable / expanding coverage",
    negativePole: "Reducing public healthcare spending / coverage",
    positiveExamples: ["ACA subsidy expansion", "Medicaid expansion", "drug price caps"],
    negativeExamples: ["ACA repeal", "Medicaid block grants"],
    poleKind: "single_pole",
    poleVersion: "2026-06-01.1",
  },
  // … one entry per CANONICAL_ISSUE_LABELS id …
};
```

> **Why both a table and a config?** The tagger (`scripts/ingest/*`) is an offline batch job that already imports `CANONICAL_ISSUE_LABELS` from TS — it should import `ISSUE_POLES` the same way (no DB needed to tag). The chat path is online and may want the freshest pole text without a redeploy — it reads `issue_poles`. The seed script (§5.2) keeps them identical; `poleVersion` is the reconciliation key.

### 3.4 Splitting irreducibly bidirectional topics into directional axes

A single positive-pole definition works when the debate is genuinely one-dimensional (more vs. less of a thing). It fails when an issue id bundles **two distinct debates** whose "positive" directions aren't opposites of each other. For those, define an **axis** — a child directional issue with its own pole — and route tagging/scoring to the axis.

Optional companion table (add only if/when the first split happens):

```ts
// issue_axes — directional children of a bidirectional parent issue.
// A parent stays in canonicalIssues.ts as a *grouping label*; its axes carry
// the poles (each axis also gets an issue_poles row with poleKind="axis").
export const issueAxes = pgTable("issue_axes", {
  axisId: text("axis_id").primaryKey(),            // "guns_access" | "guns_safety_regulation"
  parentIssueId: text("parent_issue_id").notNull(),// "gun_rights_safety"
  label: text("label").notNull(),                  // "Firearm access" / "Firearm safety regulation"
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```

**Criteria — split into axes when ANY of these hold; otherwise a pole-definition suffices:**

1. **The id names both poles** (`gun_rights_safety`) AND a voter can coherently be "pro" *neither* framing as stated (they want regulation, not "anti-gun"). A single pole forces a false binary.
2. **The two sides optimize different quantities**, not the same quantity in opposite directions. Gun *access* and gun *safety* aren't a single slider — a bill can expand training requirements (safety) without restricting access. One axis can't capture that; "more regulation" and "less access" are not the same vote.
3. **Bills routinely tag to the issue but sit orthogonal to the chosen pole** — i.e. after seeding a single pole, a meaningful share of bills are neither clearly positive nor negative. That's the empirical tell that one axis is lossy.

**When a single pole suffices (do NOT split):** the issue is "more vs. less of one good" — `healthcare_affordability`, `education_funding`, `housing_affordability`, `economy_jobs`. "In favor" = more affordability/funding/jobs; the negative pole is just the absence. Splitting these adds taxonomy with no scoring gain.

**Initial recommendation:** mark `gun_rights_safety` `poleKind: "bidirectional_unsafe"` immediately (it fails criteria 1 and 2). Decide between (a) splitting into `guns_access` + `guns_safety_regulation` axes, or (b) accepting a documented single pole (`in_favor = access`). This is the single most important user decision — see §7. Hold `election_integrity`, `immigration`/`border_security`, `reproductive_rights` at `single_pole` with carefully written poles and revisit if criterion 3 shows up in the data.

### 3.5 What stays in `canonicalIssues.ts`

Nothing changes there. It remains the id→label map. If axes are introduced, the parent id stays as a grouping label and axes live in `issue_axes` + `issue_poles`. This keeps the design clear of the active uncommitted edits in that file.

---

## 4. How each consumer changes

### 4.1 Bill-tagger (`scripts/ingest/_classify-batch.ts` + `classify-bills.ts`)

Today `buildSystemPrompt()` injects only id+label and a global pole rule (lines 42–56). Change it to inject the **per-issue pole** from `ISSUE_POLES`:

- Replace the generic bullet:
  ```
  * "in_favor": a YEA vote supports / expands / funds this issue
  * "opposed": a YEA vote restricts / cuts / opposes this issue
  ```
  with a per-issue rendering, e.g.:
  ```
  - gun_rights_safety (Gun Rights & Safety):
      in_favor  = a YEA vote moves toward: Expanding and protecting access to firearms
                  (e.g. concealed-carry expansion, suppressor deregulation)
      opposed   = a YEA vote moves toward: Restricting access to firearms
                  (e.g. assault-weapons ban, universal background checks)
  ```
- For `poleKind: "axis"` issues, the tagger emits the **axis id** in `canonical_issue` (and `VALID_CANONICAL_ISSUES` is widened to include axis ids).
- Stamp each written tag with the `poleVersion` it was tagged under. Add `pole_version` to `issue_tags` (nullable for back-compat; see §5). This is what makes selective re-tagging possible.
- `poleKind: "bidirectional_unsafe"` issues should be **refused** by the tagger (emit `[]`) until split or downgraded to `single_pole`, so we never write a tag whose pole is known-ambiguous.

Both tagger files carry the same prompt block — update both (or extract the shared builder; out of scope here, just keep them identical as they are today).

### 4.2 Stance-resolver (`ballotPromptEn.generated.ts` via its prompt builder)

The ballot prompt is generated; edit its **source builder** (not the `.generated.ts` artifact). Two changes:

1. **Inject the same `ISSUE_POLES` poles** into the prompt section that defines the canonical issue vocabulary, using the *identical* positive/negative phrasing and examples the tagger sees. This is the whole point: one string, two consumers.
2. **Make the natural-language→enum mapping explicit and rule-bound.** Today the model maps `"expand law enforcement funding" → in_favor` on its own (prompt lines 300, 305). Replace that with: *"Map the voter's stance to `in_favor` if it aligns with the issue's `positivePole` as defined above, else `opposed`."* Now both the mapping and the tagger reference the same pole text.

The UI (`ConcernInterpretation.tsx`) and `structured-blocks.ts` keep `resolvedStance: string` (the human-readable phrase) for display — no type change needed. The enum derivation is a prompt-level rule anchored to stored poles, not a new field. (Optional hardening: also pass the chosen `in_favor`/`opposed` back in the `[ALIGNMENT_SCORES]` block so it's auditable; today only the natural-language form is recorded there.)

### 4.3 `alignment.ts` — minimal, mostly unchanged

`computeVoteAlignment` (lines 161–180) stays as-is: it's a correct XNOR *once both inputs share a pole*, which is now guaranteed by data rather than convention. The improvements are defensive:

- **Optional pole guard in `lookupAlignment`** (lines 195–300): look up the issue's `issue_poles` row; if `poleKind === "bidirectional_unsafe"`, return `found: true` with an `unavailable.reason` ("This issue is being split into clearer sub-issues; alignment is paused") instead of scoring against an ambiguous pole. This reuses the existing `unavailable` plumbing (lines 246–251) and the `attachLimitedDataNotice` pattern (lines 72–85) — no new return shape.
- **Pole-version skew check (optional):** the join at lines 227–233 can also select `issue_tags.pole_version`; if a tag's version predates the issue's current `issue_poles.poleVersion`, exclude it (or surface it via a notice) so a stale-pole tag can't contribute a possibly-inverted vote. Cheap insurance until re-tagging completes.

No change to `computeVoteAlignment`'s signature — its three inputs already suffice once they're pole-anchored.

### 4.4 PAC agenda — directional poles for PACs, tied to key votes

This extends the same "directionality as data" idea from bills to PACs, and makes "is this PAC fighting for the same agenda as the voter?" computable. It builds on the CAN doc's `can_issue_pac_contributions` (§3.7), which today has only a free-text `pac_category` ("pro_israel", "crypto") — descriptive, not scorable, and not linked to any vote.

Add two CAN-namespaced tables (in the CAN doc's style; implement alongside the CAN schema, not now):

```ts
// can_pac_agendas — a PAC's directional agenda, expressed as a pole on an
// issue/axis. The PAC analog of issue_tags.stance_lens: it says which
// direction the PAC's money pushes, on the SAME issue/axis vocabulary.
export const canPacAgendas = pgTable("can_pac_agendas", {
  id: uuid("id").primaryKey().defaultRandom(),
  pacName: text("pac_name").notNull(),             // "Fairshake" | "AIPAC"  (matches can_issue_pac_contributions.pac_name)
  // Reuses the issue/axis vocabulary so PAC agenda and voter stance are
  // directly comparable. May reference a *new* issue/axis (e.g. "digital_assets",
  // "foreign_policy_israel") — adding those is the deliberate canonicalIssues.ts
  // decision the CAN doc flags as separable (CAN §5). Until then, free issueId.
  issueId: text("issue_id").notNull(),             // "digital_assets" | "foreign_policy_israel"
  // The PAC's pole on that issue, in the SAME polarity as issue_poles:
  agenda: text("agenda").notNull(),                // "in_favor" | "opposed"
  agendaSummary: text("agenda_summary").notNull(), // "Pro crypto-deregulation" / "Pro-Israel security funding"
  confidence: numeric("confidence", { precision: 4, scale: 3 }),
  snapshotDate: date("snapshot_date").notNull(),
  sourceUrl: text("source_url").notNull(),
}, (t) => [
  uniqueIndex("can_pac_agendas_pac_issue_uidx").on(t.pacName, t.issueId),
]);

// can_pac_key_votes — links a PAC agenda to the bills/votes that ADVANCE it,
// using the existing issue_tags polarity so the join is meaningful. The CAN
// doc notes the Fairshake -> CLARITY Act linkage; this is where that lives.
export const canPacKeyVotes = pgTable("can_pac_key_votes", {
  id: uuid("id").primaryKey().defaultRandom(),
  pacName: text("pac_name").notNull(),
  issueId: text("issue_id").notNull(),
  // Crosswalk to our bills (nullable; CAN may cite bills we lack — mirrors
  // can_bill_narratives.ourBillId in CAN §3.8).
  ourBillId: text("our_bill_id"),                  // -> bills.id when matched
  canKey: text("can_key"),                         // CAN's short key, e.g. "clarity_act"
  // Which vote on that bill advances the PAC's agenda. Combined with the bill's
  // issue_tags.stance_lens this is computable, not just labeled.
  advancingVote: text("advancing_vote").notNull(), // "yea" | "nay"
  note: text("note"),                              // "Fairshake spent heavily for CLARITY Act passage"
  snapshotDate: date("snapshot_date").notNull(),
  sourceUrl: text("source_url").notNull(),
});
```

**How "same agenda as the voter?" becomes computable.** Given a voter `resolvedStance` already mapped to `in_favor`/`opposed` on an `issueId` (§4.2), a PAC's alignment is the same XNOR `computeVoteAlignment` already implements — just with `can_pac_agendas.agenda` standing in for `issue_tags.stance_lens`:

- Voter `in_favor` of `digital_assets` (pro-crypto-deregulation) + Fairshake `agenda = in_favor` → **same agenda**.
- Voter `opposed` to `digital_assets` + Fairshake `in_favor` → **opposing agenda**.

And via `can_pac_key_votes`, this ties to candidate behavior: if Fairshake's agenda is advanced by a **yea on the CLARITY Act**, and a candidate voted yea on a `digital_assets`-tagged CLARITY Act bill (in `issue_tags`), then *the candidate voted the PAC's way* — surfaceable as "voted with Fairshake's agenda," computed, not asserted. Note this is **display/insight tier**, not a change to the core voting-record alignment score (consistent with CAN §4's "Alignment scoring: unchanged"). It's a new, separately-gated signal.

**Dependency:** scoring crypto/Israel votes requires those issues to exist in the tagging vocabulary (`digital_assets`, `foreign_policy_israel`). That is exactly the optional, deliberate `canonicalIssues.ts` addition the CAN doc calls out (§5) — and must be coordinated because of the live-edit collision. Until then, `can_pac_agendas.issueId` can hold those ids speculatively (free text) so PAC agendas are storable before the scorer can use them.

---

## 5. Migration & back-compat

The existing `in_favor`/`opposed` binary is **not** broken by this design — it's *anchored*. Rollout is additive and staged.

### 5.1 Phase 0 — additive schema (no behavior change)
- Add `issue_poles` table + `src/lib/issuePoles.ts` config. Add nullable `pole_version` to `issue_tags`. Nothing reads them yet. Existing tags, the existing tagger, `computeVoteAlignment`, and the chat tool all keep working exactly as before. (Drizzle migration lands in a worktree clear of the active 2026 redesign — same caution as CAN doc §6.1.)

### 5.2 Phase 1 — seed + dual-write
- Seed script upserts `ISSUE_POLES` → `issue_poles`. Write each issue's `positivePole`/`negativePole` to match **the pole the current tagger prompt already implied** ("supports/expands/funds" = positive) for the Low-risk issues, so existing tags remain valid under the seeded pole (no inversion introduced). For High/Medium-risk issues, write the pole deliberately and flag for re-tag (§5.3).
- Switch the tagger and stance-resolver prompts to render from `ISSUE_POLES` (§4.1, §4.2). New tags get stamped with `pole_version`.

### 5.3 Phase 2 — selective re-tag (only where the pole actually moved)
- **No blanket re-tag.** Re-tag a bill's `issue_tags` row only when its `issueId`'s seeded `positivePole` differs from the convention the old tag was written under — in practice, only the High/Medium-risk issues and any issue that gets split into axes.
- Detection: rows with `pole_version IS NULL` (pre-migration) OR `pole_version < issue_poles.poleVersion` for an issue whose pole changed. The optional skew check in §4.3 makes these safe to leave in place until re-tagged (they're excluded/flagged, not silently scored).
- For split issues: old `gun_rights_safety` tags are re-run against the new axis vocabulary; the parent id is retired from `VALID_CANONICAL_ISSUES` for *new* tags once re-tag completes.

### 5.4 Back-compat guarantees
- `computeVoteAlignment` signature and truth table unchanged → every existing caller and test (`alignment.test.ts`) stays green.
- `lookup_alignment` tool schema unchanged (still `in_favor`/`opposed`) → `route.ts` and `alignment/route.ts` validation unchanged.
- `resolvedStance: string` in the UI / `structured-blocks` unchanged → no client breakage.
- PAC tables are net-new and CAN-namespaced → zero impact on existing donor/alignment paths (same isolation principle as CAN doc §1).

---

## 6. Why this does NOT touch `canonicalIssues.ts`

Directionality is added as `issue_poles` (a sibling table) + `src/lib/issuePoles.ts` (a new file), both keyed *by* canonical issue id. `canonicalIssues.ts` stays a pure label map. This is deliberate: that file has uncommitted edits in the 2026-redesign worktree (CAN doc §5), and adding a parallel data structure there would collide. The *only* future reason to edit it is the separable decision to add brand-new alignment issues (`digital_assets`, `foreign_policy_israel`) so the scorer can rate crypto/Israel votes for the PAC-agenda feature (§4.4) — and that must be coordinated, exactly as the CAN doc states.

---

## 7. Open decisions for the user

1. **`gun_rights_safety`: split into axes, or document a single pole?** *(Most important decision.)* Splitting into `guns_access` + `guns_safety_regulation` is the only option that fairly handles a voter who wants regulation without being "anti-gun" (§3.4 criteria 1–2), but it adds axis vocabulary, requires re-tagging every gun bill, and touches the tagger's valid-id set. A documented single pole (`in_favor = access`) is far cheaper and unblocks everything else, at the cost of mis-scoring safety-regulation voters. Everything else in this design works under either choice — this is the fork.
2. **Pole polarity convention for ambiguous issues.** For `immigration`/`border_security`, `election_integrity`, `property_taxes`, `reproductive_rights`: which direction is `in_favor`? Each needs an explicit human call written into `ISSUE_POLES`. (Recommendation: pick the framing the issue *label* leans toward — "in favor of border_security" = more enforcement — and document it.)
3. **Re-tag scope & budget.** Re-tagging is an LLM batch cost. Confirm: re-tag only the issues whose pole moved (§5.3, cheaper), accepting that Low-risk issues keep their existing tags unchanged? Or re-tag everything for uniformity?
4. **Audit field.** Record the derived `in_favor`/`opposed` enum in the `[ALIGNMENT_SCORES]` block (alongside the natural-language `resolvedStance`) so inversions are debuggable post-hoc? Small prompt + `structured-blocks` change; improves observability.
5. **PAC agenda gating + new issues.** Is "voted with Fairshake's agenda"-style insight in scope, and if so, are we ready to add `digital_assets`/`foreign_policy_israel` to the tagging vocabulary (the coordinated `canonicalIssues.ts` edit)? PAC agendas can be *stored* before this; they can't be *scored against votes* until it happens.
