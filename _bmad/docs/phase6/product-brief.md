# Phase 6 Product Brief — Voter Choice App

## Overview
Phase 6 adds three intertwined features to the voter-choice app:
1. **Issue Ranking UX** — Drag-and-rank interface for 12 canonical issues
2. **Concern Disambiguation** — Free-text → canonical-issue mapping via Claude AI with user confirmation
3. **Anonymous Aggregate Counters + Polis Overlay** — County-level anonymized issue counts

## Problems Solved
- Users lack a structured way to express their priorities
- Free-form values discussion doesn't feed the alignment scorer in a structured way
- Voters have no social context for how other voters in their county prioritize issues

## Target Users
U.S. voters using the ballot research tool

## Key Requirements
- Drag-and-rank 12 canonical issues (dnd-kit)
- Keyboard accessibility (arrows + space, aria-live announcements)
- Free-text concern disambiguation via /api/disambiguate-concerns
- User confirmation of AI concern mapping
- Anonymous county-level aggregate counters (Upstash Redis)
- Polis-style overlay on issue cards
- Top-3 priorities fed into Phase 5 chat system prompt and copy-paste block
- Graceful degradation if Upstash credentials missing
- No PII storage

## BMAD Workflow Answers
- **Q: Primary user action?** A: Rank issues by personal priority before starting chat
- **Q: Key data flows?** A: Issue ranking → system prompt preamble; concern text → disambiguate API → confirmed issues → system prompt; confirmed issue → increment counter; GET county counts → Polis overlay
- **Q: External dependencies?** A: @dnd-kit/core, @dnd-kit/sortable (drag-and-drop); Upstash Redis (aggregate counters); existing Anthropic API (concern disambiguation)
- **Q: Privacy constraints?** A: No PII in Redis, only count:<county_fips>:<issue_slug> keys; explicit user-facing privacy disclosure required
