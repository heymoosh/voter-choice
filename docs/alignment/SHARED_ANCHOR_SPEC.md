# Shared-Anchor Spec — one vocabulary, two consumers, no drift

**Status:** Design / spec. No source files edited (envelope: docs-only). Describes
how the tagger and the runtime resolver both consume `POLE_VOCABULARY.md` so they
cannot drift, and the data-driven disambiguation trigger. Execution is gated on
Muxin's approval + coordination with the redesign (it touches the tagger prompt and
the resolver prompt, which the `design-integration` worktree owns).

## The drift problem (why this spec exists)

Alignment is an XNOR (`computeVoteAlignment`) between two values measured against a
canonical issue:

- the **bill's** `stance_lens` (`in_favor | opposed`) — set by the **tagger**
  (`scripts/ingest/_classify-batch.ts`),
- the **voter's** `resolvedStance` (`in_favor | opposed`) — set by the runtime
  **concern-resolver** (emits `[CONCERN_INTERPRETATION]`, confirmed as
  `[VOTER CONFIRMED CONCERNS]` carrying `canonicalIssue` + `resolvedStance`).

These two are produced by **different prompts at different times**. If they interpret
"`in_favor` of `gun_rights_safety`" even slightly differently — one reads the subject
as *rights*, the other as *safety* — the XNOR inverts with high confidence. That
divergence is the root cause the audit measured (~40–55% on contested issues). The
only durable fix is to make both consume the **same defined poles** from one file.

## 1. Single source of truth

`docs/alignment/POLE_VOCABULARY.md` is canonical. For each of the 16 canonical
issues it fixes: `axis_type`, the two poles (Pole A ≡ `in_favor`, Pole B ≡
`opposed`) with `definition` + `bill_signals`, `example_concerns`, and (contested
only) the neutral disambiguation question + options.

**Both consumers read from this one file** (in practice, from a structured
derivative of it — see §5). Neither prompt may define its own per-issue
directionality; "what `in_favor` means for issue X" exists in exactly one place.

## 2. Tagger consumption (`stance_lens`)

For each bill, for each candidate issue, the tagger is given that issue's Pole A /
Pole B `definition` + `bill_signals` from the vocabulary, and answers the concrete
question: *does a **Yea** advance Pole A (`in_favor`) or Pole B (`opposed`)?* — instead
of today's undefined "does a Yea support the issue?" It also obeys the vocabulary's
**cross-cutting tagger rules**: fall-through = no-score (a bill matching neither pole
is not tagged for that issue); omnibus → dominant provision, else no-score + defer to
curated context; per-`(bill, issue)` storage so overlapping issues (immigration ↔
border_security; energy_grid ↔ environment_climate) can carry independent
orientations.

Output is unchanged in shape: an `issue_tags` row `(canonical_issue, stance_lens,
confidence)`. **Interface-preserving** — only the *prompt's definition* of
`stance_lens` changes.

## 3. Resolver consumption (`resolvedStance`)

The concern-resolver is given, for each issue the free-text concern might map to:
the same Pole A / Pole B definitions, the `example_concerns` few-shot anchors, and
(contested) the disambiguation question + options — all from the **same** vocabulary
entry the tagger used. It maps the concern to `canonicalIssue` + `resolvedStance`
against the identical pole definitions. The `[CONCERN_INTERPRETATION]` block's
`disambiguationQuestion` / `disambiguationOptions` are populated **from the
vocabulary**, not improvised per-utterance — so the option the voter taps binds to
the same pole the tagger scored bills against.

## 4. The data-driven disambiguation trigger (the key behavior change)

**Today:** the gate fires on the LLM's own `confidence` judgment — it emits
`confidence: "low"` + a question when *it* deems the concern ambiguous. That misses
cases where the model is confidently wrong (it reads "guns" as obviously pro-rights).

**Change:** drive the trigger off `axis_type` from the vocabulary, not the model's
self-assessment:

- **`axis_type: contested`** ⇒ a value-only concern **always** triggers the
  disambiguation question (from the vocabulary). The model may *not* skip it by
  declaring high confidence. (This now covers 12 of 16 issues, incl. the three the
  critic reclassified: economy_jobs, education_funding, property_taxes.)
- **`axis_type: valence_dominant`** ⇒ match the consensus pole (Pole A) and show the
  vote rationale; only ask if the concern's framing is *explicitly* counter-pole
  ("government shouldn't run healthcare" → `opposed`).
- **Still unresolvable after the question** ⇒ abstain honestly (no-score), never guess.

This makes the gate's firing **predictable and auditable** (a function of the issue,
not a model mood) and is the single most load-bearing reliability improvement after
the re-tag itself.

## 5. The structured derivative (described, not built here)

The prompts can't consume Markdown prose reliably. The intended shape is a small
structured artifact **generated from** `POLE_VOCABULARY.md` (one entry per issue):

```jsonc
{
  "gun_rights_safety": {
    "axis_type": "contested",
    "in_favor":  { "name": "Gun access / rights",   "definition": "...", "bill_signals": ["..."] },
    "opposed":   { "name": "Gun regulation / safety","definition": "...", "bill_signals": ["..."] },
    "example_concerns": [{ "text": "protect my Second Amendment rights", "pole": "in_favor" }],
    "disambiguation": {
      "question": "On guns, are you more focused on protecting access to firearms, or on tightening gun laws?",
      "options": [{ "label": "Protect access", "pole": "in_favor" }, { "label": "Tighten gun laws", "pole": "opposed" }]
    }
  }
}
```

Both the tagger prompt-builder and the resolver prompt-builder import this one
artifact. **Not created in this branch** (envelope: no live `src/`); when built, it
lives where both consumers can import it and is generated from the vocabulary so the
prose stays the human source of truth.

## 6. Drift guards

- **One file, two readers.** Neither prompt hardcodes per-issue directionality;
  both reference the derived artifact. A grep/lint check can assert neither
  `_classify-batch.ts` nor the resolver prompt contains issue-specific
  `in_favor`/`opposed` rules outside the shared import.
- **Version stamp.** The derived artifact carries a version; tagger runs and resolver
  responses record which version they used, so a mismatch is detectable (and a
  re-tag is triggered when the vocabulary changes a pole).
- **Round-trip test (offline).** A fixture of `example_concerns` → expected pole, run
  through the resolver, AND a fixture of example bills → expected `stance_lens`, run
  through the tagger, must agree on the same pole definitions. Diverging output = the
  drift alarm. (Offline; no DB/web.)

## 7. What changes downstream (all redesign-coordinated, none edited here)

- **`_classify-batch.ts`** — prompt change: ask the pole question, inject pole
  definitions, obey fall-through/omnibus rules. Tagger output shape unchanged.
- **The resolver prompt** (Act 2 / `[CONCERN_INTERPRETATION]`) — inject pole
  definitions + vocabulary-sourced questions; switch the trigger to `axis_type`.
- **No change** to `computeVoteAlignment`, the `in_favor`/`opposed` enum, the tool
  signatures, `AlignmentScoreBanner`, or `AlignmentDrilldown`. The fix lives entirely
  in how the two prompts interpret the enum — which is why it ports cleanly under the
  shipped UI.
