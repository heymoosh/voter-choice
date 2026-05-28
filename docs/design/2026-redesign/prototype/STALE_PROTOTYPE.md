# What to do with the stale prototype already in the repo

**TL;DR — overwrite it in place, one commit. Don't pre-delete, don't add a
second copy.**

---

## The situation

The repo on `launch/production` already contains an **earlier snapshot** of
this prototype at:

```
docs/design/2026-redesign/prototype/
  Voter Choice Prototype.html   (~1.7 KB)
  prototype-app.jsx             (~5.5 KB)
  prototype-components.jsx      (~14 KB)
  prototype-data.jsx            (~9 KB)
  prototype-views.jsx           (~23 KB)
  prototype.css                 (~41 KB)
```

That snapshot is **pre-Pass-C**: it has no `prototype-c.css`,
`prototype-shared.jsx`, `prototype-i18n.jsx`, `prototype-data-c.jsx`,
`prototype-components-c.jsx`, `prototype-screens.jsx`,
`prototype-screens-c.jsx`. It predates polling, settings/BYOK, error states,
EN/ES, About/Methodology/Privacy/Tip, how-it-works, resume nudge, the
sticky-sidebar workspace, the shared design-system primitives, and the
progressive-disclosure candidate card.

**This package is the current version** (~14 files, Pass C complete). It is
the one to diff against.

## Why not just delete the old one first

- A separate delete-then-add loses the reviewable diff. Overwriting in one
  commit makes git show a clean old→new change.
- `src/app/globals.css` cites `docs/design/2026-redesign/prototype/prototype.css`
  as the source of its design tokens. Keeping the **same path** (overwriting)
  keeps that citation valid; deleting or moving to a new path dangles it.
- Two copies at two paths is exactly how a visual-diff ends up run against the
  wrong (stale) version.

## Do this

1. Replace the **contents** of `docs/design/2026-redesign/prototype/` with the
   contents of this package (this folder). Net effect: the 6 stale files are
   replaced/superseded by this package's ~14 files, at the same directory.
2. Commit as one change (e.g. `docs: refresh 2026-redesign prototype to
   Pass-C current`). The diff is the reviewable record.
3. Reconcile two sibling references (doc-only, low priority):
   - `docs/design/2026-redesign/README.md` — may list the old file set or
     describe the prototype; update if stale.
   - `src/app/globals.css` — token comment references this `prototype.css`.
     Path stays valid after overwrite. Confirm the `:root` token block still
     matches this package's tokens (it should; these are the source of truth).
4. Keep `docs/design/2026-redesign/README.md`, `prompts.md`, and
   `Voter Choice Redesign.html` siblings unless they're clearly superseded —
   they're provenance, not build inputs.

## Then

Proceed with `PORT_PROMPT.md` (STEP 0 onward). Everything in this package
assumes the prototype lives at `docs/design/2026-redesign/prototype/`.
