# AWS Infrastructure (for C1 Textract bakeoff)

Two Node scripts that provision + verify a scoped IAM user for the Textract bakeoff. Equivalent to a tiny Terraform module without requiring Terraform to be installed.

## What gets provisioned

- **IAM user**: `voter-choice-textract-bakeoff`
- **Inline policy**: `VoterChoiceTextractScoped` allowing ONLY:
  - `textract:AnalyzeDocument`
  - `textract:DetectDocumentText`
- **One access key** for the user, output to `.env.local`

## Prerequisites

- Node.js (already used by the project)
- `@aws-sdk/client-iam` + `@aws-sdk/client-sts` in `devDependencies` (added by `npm install --save-dev`)
- Admin AWS credentials in `.env.local` for the bootstrap step (an admin IAM user with `iam:CreateUser`, `iam:PutUserPolicy`, `iam:CreateAccessKey` permissions — `AdministratorAccess` policy works)

## Workflow

### First time — bootstrap

1. Create an admin IAM user in the AWS Console with `AdministratorAccess` policy + MFA.
2. Generate an access key for that admin user.
3. Paste into `.env.local`:
   ```
   AWS_ACCESS_KEY_ID=AKIA...
   AWS_SECRET_ACCESS_KEY=...
   AWS_REGION=us-east-1
   ```
4. Verify the keys work:
   ```bash
   node experiments/pdf-extraction-bakeoff/infra/verify-aws-creds.mjs
   ```
   Expected: `✓ AWS credentials authenticate successfully` with the admin user's ARN.

### Provision the scoped user

```bash
node experiments/pdf-extraction-bakeoff/infra/provision-scoped-user.mjs
```

This script:
1. Creates the scoped IAM user (idempotent — skips if already exists).
2. Attaches the inline policy.
3. Generates an access key.
4. **Rewrites `.env.local`** — admin keys are replaced with scoped keys.

After it runs, you can deactivate the admin access key in the AWS Console (IAM → Users → admin-muxin → Security credentials → Make inactive). The admin USER stays for future ops; only its access key gets rotated out.

### Verify the scoped user works

```bash
node experiments/pdf-extraction-bakeoff/infra/verify-aws-creds.mjs
```

Expected: `✓ AWS credentials authenticate successfully` with ARN ending in `:user/voter-choice-textract-bakeoff`.

## Re-running

`provision-scoped-user.mjs` is idempotent:
- User already exists → skip creation
- Policy already attached → overwrite with same content (no-op effectively)
- Access keys already exist:
  - If 1 key present → creates a second (AWS allows up to 2 per user)
  - If 2 keys present → script exits with an error; delete one in the Console first

`verify-aws-creds.mjs` is read-only and safe to run anytime.

## Deprovisioning (future)

Not implemented. If/when the bakeoff is fully archived, manual cleanup in the AWS Console:
1. IAM → Users → `voter-choice-textract-bakeoff` → Security credentials → delete access keys
2. Same user → Permissions → remove the inline policy
3. Delete the user

Or a follow-up `deprovision-scoped-user.mjs` script could automate this — leaving it manual for now since the bakeoff is a one-off and the user can be reused if Textract ships to production with a tighter prod policy.

## Why not Terraform?

For provisioning a single IAM user with one inline policy, a Node script using `@aws-sdk/client-iam` is functionally equivalent to a Terraform module and avoids requiring `terraform` to be installed globally (per `.claude/CLAUDE.md` "no global installs without explicit user OK").

The script does sacrifice some IaC properties (no state file, no `terraform destroy`, no plan/apply separation), but for a one-resource provisioning of a scoped IAM user, the trade-off is reasonable. If this expands to managing many AWS resources, port to Terraform at that point.
