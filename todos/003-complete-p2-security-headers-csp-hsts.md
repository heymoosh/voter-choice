---
status: pending
priority: p2
issue_id: "003"
tags: [code-review, security]
dependencies: []
---

# Add CSP and HSTS security headers

## Problem Statement

`next.config.ts` has X-Content-Type-Options, X-Frame-Options, and Referrer-Policy, but is missing Content Security Policy (CSP) and Strict-Transport-Security (HSTS). These are standard production security requirements.

## Findings

- No CSP header — increases XSS risk surface
- No HSTS header — leaves open SSL stripping vector
- All external links use `rel="noopener noreferrer"` ✅
- No `dangerouslySetInnerHTML` ✅
- App is static, no API routes — CSP is straightforward to configure
- Next.js requires `'unsafe-inline'` for Tailwind styles in current setup

## Proposed Solutions

### Option 1: Add CSP + HSTS to next.config.ts

```typescript
{ key: "Content-Security-Policy", value: [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join("; ")
},
{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }
```

**Pros:** Standard security baseline, straightforward for a static app
**Cons:** `unsafe-inline` required for Next.js/Tailwind (nonce-based CSP would be better but complex)
**Effort:** 20 minutes
**Risk:** Low

## Recommended Action

Implement Option 1. Skip `preload` on HSTS for now (requires HSTS preload list submission).

## Technical Details

**Affected files:**

- `next.config.ts` — add two headers to the existing headers() array

## Acceptance Criteria

- [ ] CSP header present in HTTP response
- [ ] HSTS header present in HTTP response
- [ ] `npm run build` succeeds
- [ ] App renders correctly (no CSP violations in browser console)

## Work Log

### 2026-03-20 - Discovered in security review

**By:** CE Review Pipeline
