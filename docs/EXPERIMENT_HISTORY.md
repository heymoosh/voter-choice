# Experiment History

Index of all legacy experiment runs. These branches were archived as `archive/<name>` tags on 2026-05-10 and then deleted. Raw data (metrics JSONs, workflow logs) lives in the tags and is fully recoverable.

## How to retrieve archived data

```bash
# List all archive tags
git tag -l 'archive/*'

# Browse files from a specific archived branch
git show archive/run5/vanilla:metrics/run5/vanilla/baseline.json

# Restore a branch from its archive tag (read-only inspection)
git checkout -b recovered/run5-vanilla archive/run5/vanilla

# Extract the metrics folder from an archived branch to disk
git checkout archive/run5/vanilla -- metrics/
```

---

## Methodology notes (see docs/LEARNINGS.md for full detail)

| Runs                           | Rubric visible to workflows? | Valid for comparison?                                     |
| ------------------------------ | ---------------------------- | --------------------------------------------------------- |
| Run 1 (workflow/\*)            | Yes — Learning 001/002       | No — independent variable not varied; frameworks bypassed |
| Runs 2–3 (run2/_, run3/_)      | Yes — Learning 009           | No — rubric exposure enables metric gaming                |
| Run 4 (run4/_, run3/_ Phase 2) | Masked from run4 onward      | Partial — rubric masked, but CE is the only run4 branch   |
| Run 5 (run5/\*)                | Masked                       | Yes — clean runs; vanilla Phase 1 only complete           |

**Key learnings:**

- Learning 001: Frameworks were bypassed in Runs 1–4 until explicit skill invocation was enforced
- Learning 005/006: CE and Superpowers multi-agent engines require Skill tool invocation, not just file reading
- Learning 009: Rubric must be masked inside build container (tmpfs overlay) to prevent metric gaming

---

## Run history

### Run 5 — Phase 1 (partial; vanilla complete)

> **Archive tags:** `archive/run5/vanilla`, `archive/run5/bmad`, `archive/run5/compound-engineering`, `archive/run5/spec-kit`, `archive/run5/superpowers` > **Rubric masked:** Yes

| Branch                    | Framework   | Phase | Status                  | e2e   | Unit  | ESLint | Lighthouse      | LOC  |
| ------------------------- | ----------- | ----- | ----------------------- | ----- | ----- | ------ | --------------- | ---- |
| run5/vanilla              | Vanilla     | 1     | Complete                | 42/42 | 19/19 | 0/0/0  | 100/100/100/100 | 1837 |
| run5/bmad                 | BMAD        | 1     | In progress at archival | —     | —     | —      | —               | —    |
| run5/compound-engineering | CE          | 1     | In progress at archival | —     | —     | —      | —               | —    |
| run5/spec-kit             | Spec Kit    | 1     | Complete                | 42/42 | 72/72 | 0/0/0  | 100/100/100/100 | 1838 |
| run5/superpowers          | Superpowers | 1     | Complete                | 42/42 | 53/53 | 0/0/0  | 100/100/100/100 | 1623 |

---

### Runs 3–4 — Phase 2 (Spanish i18n iteration)

> **Archive tags:** `archive/run3/bmad`, `archive/run3/compound-engineering`, `archive/run3/spec-kit`, `archive/run3/superpowers`, `archive/run4/compound-engineering` > **Rubric masked:** Yes (run3/run4 onward)

| Branch                                   | Framework   | Phase | e2e   | Unit    | Coverage     | LOC  |
| ---------------------------------------- | ----------- | ----- | ----- | ------- | ------------ | ---- |
| run3/bmad (= Phase 2 BMAD)               | BMAD        | 2     | 62/62 | 101/101 | 37.75% lines | 2126 |
| run3/spec-kit (= Phase 2 Spec Kit)       | Spec Kit    | 2     | 42/42 | 159/159 | 91.62% lines | 3194 |
| run3/superpowers (= Phase 2 Superpowers) | Superpowers | 2     | 42/42 | 107/107 | 89.9% lines  | 2589 |
| run4/compound-engineering (= Phase 2 CE) | CE          | 2     | 42/42 | 39/39   | unchanged    | 2335 |

**Phase 2 key finding:** BMAD was the only framework to autonomously extend the e2e suite (+20 tests). CE added 0 new unit tests during i18n. Coverage delta range: CE 0 pp → Superpowers +9.7 pp → BMAD +18.68 pp → Spec Kit +3.3 pp.

---

### Runs 2–3 — Phase 1 (rubric-visible; methodology under construction)

> **Archive tags:** `archive/run2/bmad`, `archive/run2/compound-engineering`, `archive/run2/spec-kit`, `archive/run2/superpowers`, `archive/run3/bmad`, `archive/run3/compound-engineering`, `archive/run3/spec-kit`, `archive/run3/superpowers` > **Rubric masked:** No — these runs had the scoring rubric visible inside the container
> **Validity:** Not valid for cross-framework comparison (rubric exposure + framework-bypass issues)

Retain for methodology documentation only. See `docs/LEARNINGS.md` Learning 001, 005, 006, 009 for what these runs revealed about autonomous experiment design.

| Branch                    | Framework   | Phase      | Notes                                 |
| ------------------------- | ----------- | ---------- | ------------------------------------- |
| run2/compound-engineering | CE          | 1 (re-run) | First run with /lfg skill enforcement |
| run2/bmad                 | BMAD        | 1          | First BMAD run                        |
| run2/spec-kit             | Spec Kit    | 1          |                                       |
| run2/superpowers          | Superpowers | 1          |                                       |
| run3/bmad                 | BMAD        | 1 + 2      | Phase 2 final on this branch          |
| run3/compound-engineering | CE          | 1 + 2      | Phase 2 partial                       |
| run3/spec-kit             | Spec Kit    | 1 + 2      | Phase 2 final on this branch          |
| run3/superpowers          | Superpowers | 1 + 2      | Phase 2 final on this branch          |

---

### Run 1 — Phase 1 (original workflow/\* branches; frameworks bypassed)

> **Archive tags:** `archive/workflow/vanilla`, `archive/workflow/bmad`, `archive/workflow/compound-engineering`, `archive/workflow/spec-kit`, `archive/workflow/superpowers` > **Rubric masked:** No
> **Validity:** Invalid — Learning 001: frameworks were not actually invoked; all branches built identically as Vanilla

| Branch                        | Framework   | Phase | Notes                                                     |
| ----------------------------- | ----------- | ----- | --------------------------------------------------------- |
| workflow/vanilla              | Vanilla     | 1 + 2 | Baseline; 36/42 e2e (6 pre-existing failures never fixed) |
| workflow/compound-engineering | CE          | 1 + 2 | Framework bypassed; effectively vanilla                   |
| workflow/spec-kit             | Spec Kit    | 1 + 2 | Framework bypassed; effectively vanilla                   |
| workflow/superpowers          | Superpowers | 1 + 2 | Framework bypassed; effectively vanilla                   |
| workflow/bmad                 | BMAD        | 1     | Never completed; framework bypassed                       |

---

### Spec Kit naming artifact branches

> **Archive tags:** `archive/001-ballot-tool`, `archive/002-ballot-research-tool`, `archive/003-ballot-research-tool`

Spec Kit requires branches named `NNN-feature-name`. These were created when testing Spec Kit's branch-naming convention. Content is either empty or early scaffold only. No measurement data.

---

## Phase 3 Analysis

See `docs/ANALYSIS.md` for the cross-framework write-up covering Phase 1 and Phase 2 results from the valid runs (Run 4/5, rubric-masked).
