## Meta

FRAMEWORK: Vanilla (no framework)
TAG_PREFIX: vanilla
FRAMEWORK_CHECK: .claude/CLAUDE.md

## Workflow Steps

No framework methodology. Build directly from the spec using default Claude Code behavior.

- **Phase 1:** Read `docs/PROJECT_SPEC.md` and implement the ballot tool. Make your own decisions about architecture, component structure, and implementation order.
- **Phase 2:** Read `docs/PHASE2_SPEC.md` and implement Spanish language support. Make your own decisions about i18n approach.

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
