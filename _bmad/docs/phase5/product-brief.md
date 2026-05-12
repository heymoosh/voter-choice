# Phase 5 Product Brief — LLM Chat Window, Downloadable Ballot, and Voter Profile

## Problem Statement

Users currently must copy a prompt and paste it into an external AI chatbot to research their ballot. This adds friction and means users leave the site. Phase 5 adds an on-site AI chat experience powered by Claude, plus downloadable ballot and voter profile features.

## Core Features

### 1. LLM Chat Window (Path A)
An on-site chat interface powered by Claude Sonnet via the Anthropic API. Users can research their ballot directly on the site with streaming responses.

### 2. Downloadable Ballot
A printable one-page document with the user's ballot choices, generated from either the chat conversation or structured copy-paste input.

### 3. Voter Profile
A downloadable .txt file capturing the user's values and voting history, uploadable in future sessions.

### 4. Alignment Score Banner
Per-candidate alignment scores (0-100) with per-issue drill-down, rendered as a banner on each candidate card.

## Two User Paths

- **Path A (Chat Here):** On-site LLM-powered chat with streaming responses
- **Path B (Copy & Paste):** Existing flow enhanced with paste-back for ballot and profile generation

## Constraints

- Budget cap: $20/month via Anthropic API hard limit
- No user authentication, no persistent server-side storage
- All conversation content stays in browser memory only
- Prompt injection protection for uploaded voter profiles
