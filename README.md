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
