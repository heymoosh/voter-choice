## Meta

FRAMEWORK: Vanilla (no framework)
TAG_PREFIX: vanilla
FRAMEWORK_CHECK: .claude/CLAUDE.md

## Workflow Steps

No framework methodology. Build directly from the spec using default Claude Code behavior.

- **Phase 1:** Read `docs/PROJECT_SPEC.md` and implement the ballot tool (copy-paste baseline). Make your own decisions about architecture, component structure, and implementation order.
- **Phase 2:** Read `docs/PHASE2_SPEC.md` and implement Spanish language support.
- **Phase 3:** Read `docs/PHASE3_SPEC.md` and replace stub data with real API integrations (Google Civic, Vote Smart, etc.).
- **Phase 4:** Read `docs/PHASE4_SPEC.md` and scale to 5 languages including Arabic RTL.
- **Phase 5:** Read `docs/PHASE5_SPEC.md` and add on-site Claude Sonnet chat, budget management, downloadable ballot, and voter profile.

Commit regularly with meaningful messages prefixed `phase1:` or `phase2:`.

Log workflow start and end for timing consistency with other branches:

```bash
echo '{"step":"vanilla-build","status":"started","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl
```

When complete:

```bash
echo '{"step":"vanilla-build","status":"completed","timestamp":"'$(date -Iseconds)'"}' >> metrics/workflow-log.jsonl
```

## Adherence Check

```bash
echo '--- Vanilla Adherence Check ---'
echo "No framework artifacts expected."
echo "Application code:" && ls src/app/ src/components/ src/lib/ 2>/dev/null || echo "  Check src/ structure"
echo "Workflow log:" && cat metrics/workflow-log.jsonl 2>/dev/null || echo "  NONE"
```
