# Correction Packet: <slug>

Status: ready
Source work packet: `.ai/work-packets/<slug>.md`
Source evaluation: <evaluation summary, PR review, or evaluator finding reference>
Retry count: <1 | 2 | 3>

## Intent

Correct only the named evaluator findings so the original work satisfies the source work packet and user intent.

## Findings To Fix

### F1: <short title>

Severity: blocker | major | minor
Source: <AC/evidence/business rule/ownership constraint>
Observed: <what failed or was missing>
Expected: <what should happen>
Required correction: <specific fix outcome>
Evidence required: <command, artifact, screenshot, API response, DB proof, or observed behavior>
Change mapping: <files/commits/changes that should address this finding>

## Scope

Touch:

- <files/modules/surfaces likely in scope>

Do not touch:

- <unrelated files/modules/features>
- <working behavior that already passed evaluation>

## Verification

- <focused check for each finding>
- <regression check proving accepted behavior still works>

## Fix Mapping

- F1 -> <changed files/commits/checks>

## Escalation Trigger

Stop and return to the orchestrator if:

- the finding is not reproducible
- the required correction conflicts with the original work packet
- the fix requires new product/business/security decisions
- the correction would expand scope beyond the named findings
- the same finding has failed twice
