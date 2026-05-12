# Phase 2 → Phase 3 delta — `experiment/vanilla-r1`

**Computed:** 2026-05-12T05:37:42.152Z
**Prior source:** `disk:/Users/Muxin/Documents/GitHub/voter-choice/metrics/experiment/vanilla-r1/phase2.json`
**Commits:** bd985b1 → 742f6a7

| Metric | Prev | Curr | Δ | % change |
|--------|-----:|-----:|--:|---------:|
| metadata.phase | 2 | 3 | +1 | +50% |
| eslint.errors | 0 | 0 | +0 | — |
| eslint.warnings | 2 | 9 | +7 | +350% |
| eslint.complexityViolations | 2 | 9 | +7 | +350% |
| complexity.count | 41 | 63 | +22 | +53.66% |
| complexity.average | 3.98 | 5.1 | +1.12 | +28.14% |
| complexity.max | 42 | 46 | +4 | +9.52% |
| complexity.p50 | 3 | 3 | +0 | +0% |
| complexity.p75 | 3 | 4 | +1 | +33.33% |
| complexity.p95 | 5 | 14 | +9 | +180% |
| complexity.distribution.simple_1_5 | 39 | 50 | +11 | +28.21% |
| complexity.distribution.moderate_6_10 | 0 | 4 | +4 | — |
| complexity.distribution.complex_11_15 | 1 | 6 | +5 | +500% |
| complexity.distribution.highComplex_16_20 | 0 | 2 | +2 | — |
| complexity.distribution.critical_21plus | 1 | 1 | +0 | +0% |
| vitest.tests.total | 62 | 62 | +0 | +0% |
| vitest.tests.passed | 62 | 62 | +0 | +0% |
| vitest.tests.failed | 0 | 0 | +0 | — |
| vitest.tests.skipped | 0 | 0 | +0 | — |
| vitest.tests.passRate | 100 | 100 | +0 | +0% |
| vitest.coverage.lines | 34.05 | 21.71 | -12.34 | -36.24% |
| vitest.coverage.branches | 82.35 | 74.62 | -7.73 | -9.39% |
| vitest.coverage.functions | 94.11 | 96 | +1.89 | +2.01% |
| vitest.coverage.statements | 34.05 | 21.71 | -12.34 | -36.24% |
| duplication.duplicatedLines | 11 | 36 | +25 | +227.27% |
| duplication.totalLines | 2364 | 4368 | +2004 | +84.77% |
| duplication.percentage | 0.47 | 0.82 | +0.35 | +74.47% |
| duplication.clones | 1 | 3 | +2 | +200% |
| bundleSize.firstLoadJsShared.size | 102 | 102 | +0 | +0% |
| lighthouse.performance | 100 | 100 | +0 | +0% |
| lighthouse.accessibility | 95 | 95 | +0 | +0% |
| lighthouse.bestPractices | 100 | 100 | +0 | +0% |
| lighthouse.seo | 100 | 100 | +0 | +0% |
| playwright.total | 54 | 66 | +12 | +22.22% |
| playwright.passed | 54 | 66 | +12 | +22.22% |
| playwright.failed | 0 | 0 | +0 | — |
| playwright.timedOut | 0 | 0 | +0 | — |
| playwright.skipped | 0 | 0 | +0 | — |
| playwright.passRate | 100 | 100 | +0 | +0% |
| linesOfCode.application.code | 2001 | 3349 | +1348 | +67.37% |
| linesOfCode.application.files | 12 | 26 | +14 | +116.67% |
| linesOfCode.application.byExtension..css.files | 1 | 1 | +0 | +0% |
| linesOfCode.application.byExtension..css.code | 21 | 21 | +0 | +0% |
| linesOfCode.application.byExtension..tsx.files | 3 | 4 | +1 | +33.33% |
| linesOfCode.application.byExtension..tsx.code | 774 | 1249 | +475 | +61.37% |
| linesOfCode.application.byExtension..json.files | 4 | 10 | +6 | +150% |
| linesOfCode.application.byExtension..json.code | 228 | 319 | +91 | +39.91% |
| linesOfCode.application.byExtension..ts.files | 4 | 11 | +7 | +175% |
| linesOfCode.application.byExtension..ts.code | 978 | 1760 | +782 | +79.96% |
| linesOfCode.plugin.code | 0 | 0 | +0 | — |
| linesOfCode.plugin.files | 0 | 0 | +0 | — |
| linesOfCode.infrastructure.code | 395 | 600 | +205 | +51.9% |
| linesOfCode.infrastructure.files | 10 | 10 | +0 | +0% |
| linesOfCode.total.code | 2396 | 3949 | +1553 | +64.82% |
| linesOfCode.total.files | 22 | 36 | +14 | +63.64% |
| workflowTests.count | 2 | 2 | +0 | +0% |
| workflowTiming.totalSteps | 2 | 3 | +1 | +50% |
| workflowTiming.completedSteps | 2 | 3 | +1 | +50% |
| diffHygiene.metadata.phase | 2 | 3 | +1 | +50% |
| diffHygiene.scopeAdherence | 0.6162 | 0.0374 | -0.5788 | -93.93% |
| diffHygiene.summary.inScope.filesChanged | 3 | 6 | +3 | +100% |
| diffHygiene.summary.inScope.locAdded | 647 | 97 | -550 | -85.01% |
| diffHygiene.summary.inScope.locRemoved | 0 | 0 | +0 | — |
| diffHygiene.summary.adjacent.filesChanged | 4 | 4 | +0 | +0% |
| diffHygiene.summary.adjacent.locAdded | 266 | 334 | +68 | +25.56% |
| diffHygiene.summary.adjacent.locRemoved | 105 | 21 | -84 | -80% |
| diffHygiene.summary.unexpected.filesChanged | 4 | 22 | +18 | +450% |
| diffHygiene.summary.unexpected.locAdded | 403 | 2494 | +2091 | +518.86% |
| diffHygiene.summary.unexpected.locRemoved | 56 | 4 | -52 | -92.86% |
