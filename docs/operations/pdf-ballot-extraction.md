# PDF Ballot Extraction

This repo uses `@sylphx/pdf-reader-mcp@2.4.0` as an operator/agent tool for extracting text from official sample ballot PDFs.

## What This Is For

- Extracting text from an official sample ballot PDF during launch operations.
- Feeding extracted ballot text into the app's existing "Use my official sample ballot" fallback.
- Testing whether a county PDF has machine-readable text before investing in a production PDF upload flow.

## What This Is Not

- It is not a browser-side voter upload parser.
- It is not a production serverless API.
- It does not OCR scanned PDFs. The upstream roadmap lists OCR as future work.
- It does not make user-provided ballot text official/API-confirmed.

## Security Posture

The repo MCP config pins the package and restricts access:

- Package: `@sylphx/pdf-reader-mcp@2.4.0`
- Filesystem allowlist: `.ai/local-pdfs/`
- HTTP sources: disabled with `--no-http`

This means an agent should first place a PDF under `.ai/local-pdfs/`, then use the `pdf-reader` MCP tool on that local file. The `.ai/local-pdfs/` and `.ai/extracted-ballots/` directories are gitignored.

## Operator Flow

1. Put the official sample ballot PDF in `.ai/local-pdfs/`.
2. Ask the agent to use the `pdf-reader` MCP tool to extract full text and page count.
3. Review the extracted text for obvious PDF ordering or missing-text issues.
4. Paste the cleaned text into the live app's **Use my official sample ballot** box.
5. Let Sonnet research candidates from that working ballot, with citations.

## Acceptance Standard

The extracted text is acceptable for same-day fallback only if it includes the race names and candidate names in readable order. If the PDF is scanned, image-only, or badly ordered, use manual copy/paste from the official source or wait for a proper OCR/parser implementation.
