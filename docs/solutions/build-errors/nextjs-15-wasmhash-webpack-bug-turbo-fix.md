---
title: "Next.js 15.5.12 WasmHash webpack bug on Node 22.14.0 — fix with --turbo"
category: build-errors
date: 2026-05-11
tags: [nextjs, webpack, node22, turbopack, build-errors]
---

# Next.js 15.5.12 WasmHash webpack bug on Node 22.14.0

## Problem

`next build` (webpack mode) crashes on Node 22.14.0 with a `WasmHash` error from the webpack internals. The build exits with a non-zero code and no output bundle is produced.

## Root Cause

Next.js 15.5.x includes a webpack version that depends on a WebAssembly hash implementation incompatible with Node 22.14.0's updated WASM runtime constraints.

## Solution

Add `--turbo` to the build script in `package.json` to use Turbopack instead of webpack:

```json
"build": "next build --turbo"
```

Turbopack is the default bundler for `next dev --turbopack` in Next.js 15 and avoids the WasmHash codepath entirely.

## Prevention

- Always set `--turbo` in the build script when targeting Node 22+ with Next.js 15.x.
- Document the WasmHash issue in risk sections of any Next.js 15 plans.
- The `scoring/measure.mjs` script should call `npm run build` (not `npx next build` directly) so the `--turbo` flag is always inherited.
