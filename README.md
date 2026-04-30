# Voter Choice

Voter Choice is a free AI-powered ballot research tool for Texas voters. Users enter a zip code to get election information, then research their ballot with Claude-powered assistance or a copy/paste fallback.

Stack: Next.js 15 App Router, TypeScript, Tailwind CSS, Vercel.

Production branch: `launch/production`.

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Verification

```bash
npm run lint
npm run test
npm run build
npm run e2e
```

Kit-aware verification:

```bash
bash scripts/ai-verify.sh
```

## AI Coding Practices

This repo uses the AI Coding Practices operating model.

Start here:

```text
AI_AGENT_START_HERE.md
AGENTS.md
CLAUDE.md
CODEX.md
TRACKER.md
docs/ai-coding-practices/
```

For first-run setup:

```bash
bash scripts/ai-bootstrap.sh
```

## Deployment

Pushes to `launch/production` run `.github/workflows/deploy.yml`, which runs tests, pulls secrets from Bitwarden Secrets Manager, and deploys to Vercel.

## Production Safeguards

The chat budget, chat rate limits, and Civic lookup throttle use process-local
memory in local development. For production launch, configure a Redis-compatible
REST store such as Vercel KV or Upstash Redis with either:

```text
KV_REST_API_URL
KV_REST_API_TOKEN
```

or:

```text
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
```

When these variables are present, production counters are shared across Vercel
instances and cold starts. Without them, the app still runs, but spend and abuse
limits are not durable enough for public traffic.

Optional server-side chat abuse controls:

```text
CHAT_CONCURRENT_SESSION_LIMIT
CHAT_DAILY_SESSION_LIMIT
```

The launch defaults allow 10 active sessions per IP and 10 new chat sessions per
IP per day. Tune these in Vercel/GitHub secrets if real traffic shows the limits
are too strict or too loose.

To provision the Upstash Redis database and store the production secrets with
minimal manual setup:

```bash
bash scripts/provision-durable-safeguards.sh
```

The script can either store an existing Upstash Redis REST URL/token, or create a
new Upstash Redis Global database with Terraform/OpenTofu in `infra/upstash`.
New databases default to primary region `us-west-1`. The script stores
`UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in GitHub Actions
secrets. If `VERCEL_TOKEN` is set, it also updates Vercel production env
directly; otherwise the existing deploy workflow syncs the secrets to Vercel on
the next `launch/production` deploy.
