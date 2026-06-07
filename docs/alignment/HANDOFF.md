# Handoff: Alignment re-tag → cutover

Full run-by-run log + decisions: **`docs/alignment/ALIGNMENT_LEDGER.md`** (read first). Eval method:
`ALIGNMENT_EVAL.md`. Pole definitions (keystone): `POLE_VOCABULARY.md`.

- **Goal:** stop the alignment score silently inverting on contested issues (was ~40–55% wrong).
- **Status (2026-06-06): DONE — shipped.** Corrected pole-anchored tags are LIVE in production
  (`issue_tags` 42,506 → 24,866; validated 12/12 issues ≤5% inversion vs an independent Opus panel).
  Reversible via the `issue_tags_backup_precutover` table.
- **Next action:** none required. Follow-ups (non-blocking): stricter `public_safety` re-tag
  (over-eager); parked granularity/vocab code (border→immigration F7, public_safety+crime→
  criminal_justice, election→voting_access); recover the ~16% null-summary tags that shipped
  unvalidated; optional read-path `no_score` guard.
- **Blockers / awaiting:** none.
- **Key constraints:** alignment changes run the eval + append the ledger before merge (`AGENTS.md`).
  The corrected tagset is snapshotted at `scripts/ingest/_polev1-snapshot.jsonl.gz` because the
  `alignment-work` Neon branch auto-deletes 2026-07-04.
