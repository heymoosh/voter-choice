# Contender 1: AWS Textract Forms + Sonnet — STILL SKIPPED (account-level block)

**Status:** Runner code is now written and committed at `runners/01-textract-sonnet.ts`.
What still blocks the run: AWS account `132769310990` returns
`SubscriptionRequiredException` for ALL Textract operations.

This is NOT an IAM policy gap. The scoped user
(`arn:aws:iam::132769310990:user/voter-choice-textract-bakeoff`) authenticates
successfully via STS GetCallerIdentity, and its inline policy
`VoterChoiceTextractScoped` grants `textract:AnalyzeDocument` +
`textract:DetectDocumentText`. The error is at the account/billing layer, one
above IAM.

## Evidence

Probe run 2026-05-28 via `infra/verify-textract-access.mjs`:

```
--- region: us-east-1 ---
  DetectDocumentText: ✗ SubscriptionRequiredException: The AWS Access Key Id needs a subscription for the service
  AnalyzeDocument:    ✗ SubscriptionRequiredException: The AWS Access Key Id needs a subscription for the service

--- region: us-west-2 ---
  DetectDocumentText: ✗ SubscriptionRequiredException: ...
  AnalyzeDocument:    ✗ SubscriptionRequiredException: ...
```

Two regions × two operations = consistent account-level block.

## What this means

`SubscriptionRequiredException` ≠ `AccessDeniedException`. The IAM scoped user
is correctly configured. Textract is not enabled at the account level — common
causes:

1. **Account not yet fully activated** (new AWS account in limited/pending state
   before email/billing verification completes).
2. **AWS Organizations SCP** blocking `textract:*` at the org root.
3. **Marketplace-bound or restricted account** that needs explicit Textract
   service enablement from the console.
4. **Billing alarm or payment method issue** auto-suspending pay-per-use
   services (Textract has no free tier as of 2026).

## To unblock — admin actions required

1. Log into the AWS console as the account root user (account ID
   `132769310990`).
2. Navigate to https://console.aws.amazon.com/textract/home?region=us-east-1
   — the service landing page sometimes prompts a one-click activation
   acceptance that flips the account into "Textract-enabled" state.
3. If that doesn't fix it: check IAM → Account Settings for activation status;
   check Billing → Account → status; check Organizations (if applicable) for an
   SCP attached to this account that excludes `textract:*`.
4. If none of the above resolves it: open an AWS support ticket — root cause is
   account-side, not policy-side.

## Re-running after unblock

```bash
# 1. Reverify access:
node experiments/pdf-extraction-bakeoff/infra/verify-textract-access.mjs
# Expected: "✓ accepted" on both DetectDocumentText and AnalyzeDocument.

# 2. Smoke-test the runner on TX Harris (single page, cheap):
npx tsx experiments/pdf-extraction-bakeoff/runners/01-textract-sonnet.ts tx-harris-2026-dem-runoff.pdf

# 3. If smoke passes, run all 4 fixtures:
npx tsx experiments/pdf-extraction-bakeoff/runners/01-textract-sonnet.ts

# 4. Re-score:
npx tsx experiments/pdf-extraction-bakeoff/score.ts

# 5. Update decision.md with the C1 numbers (the existing Caveat 3 / P0
#    backlog item gets resolved here).
```

## Status against the bakeoff

- Phase 4: SKIPPED — no credentials anywhere.
- Phase 5+ (2026-05-28): Credentials provisioned via scoped IAM user. Runner
  written. SubscriptionRequiredException at account level still blocks
  execution. P0 backlog item upgraded — credential gap closed, account
  activation gap open.

The runner code (`runners/01-textract-sonnet.ts`) is reusable as-is once
Textract becomes available; no code changes needed.
