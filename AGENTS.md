**Think Before Coding**  
Don't assume. Don't hide confusion. Surface tradeoffs.

**Simplicity First**  
Minimum code that solves the problem. Nothing speculative.

**Surgical Changes**  
Touch only what you must. Clean up only your own mess.

**Goal-Driven Execution**  
Define success criteria. Loop until verified.

Always verify changes by running whatever tests exist (and creating new ones for the feature you just built) plus the linter and any existing ./verify.sh or CI-equivalent scripts before declaring success.

When implementing new features, invoke /tdd. Before declaring any change complete, invoke /code-reviewer. If either command is unavailable, run the closest local equivalent.

**Voter Choice Safety**  
Do not expose API keys or secrets to client code. Do not log voter conversation content. Do not force-push, delete branches, rewrite history, or discard unrelated user changes. Production database writes require explicit user approval and a backup plan first.

**High-Stakes Alignment**  
Before changing issue poles, the bill tagger, the concern resolver, or alignment scoring behavior, read `docs/alignment/ALIGNMENT_LEDGER.md`, follow `docs/alignment/ALIGNMENT_EVAL.md`, run the eval on the `alignment-work` Neon branch, and append the result to the ledger before merge.

**Project History**  
`.ai/` work packets and project briefs are historical/planning artifacts only. Do not treat them as mandatory workflow unless the user explicitly asks.
