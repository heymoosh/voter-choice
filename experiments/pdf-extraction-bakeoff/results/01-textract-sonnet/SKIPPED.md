# Contender 1: AWS Textract Forms + Sonnet — SKIPPED

**Reason:** No AWS credentials available in any of the inspected locations:
- `~/.aws/credentials` — does not exist
- `~/.aws/` — directory does not exist
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` env vars — not set
- No `aws sso login` cached session

Per task spec: "If NONE are available, fail-fast for contender 1 and report — DO NOT prompt user, just note 'Textract skipped: no AWS credentials' in the final report and proceed with contenders 2 and 3."

The `@aws-sdk/client-textract` devDependency was NOT installed since the runner would never have been able to call AWS.

To enable this contender later: set up AWS credentials, install `@aws-sdk/client-textract`, write `experiments/pdf-extraction-bakeoff/runners/01-textract-sonnet.ts` following the pattern of contenders 2 and 3, then re-run.
