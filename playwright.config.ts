import { defineConfig, devices } from "@playwright/test";

// CI-conditional timeouts. Local dev keeps tight budgets (10s/3s) so flake
// surfaces fast and the dev loop stays snappy. CI runs against a freshly
// booted `next start` on a clean Ubuntu runner with no warm caches, so
// per-test, action, and webServer budgets must accommodate cold-start
// hydration plus the helper-level `waitFor` budgets that are nested inside
// each test (the `goToTexasWorkspace` and `waitForResearchWorkspace`
// helpers each carry up to ~12.5s of nested waitFor budget, which cannot
// fit inside a 10s per-test cap).
//
// Documented in .ai/work-packets/tdd-phase-1a-e2e-ci-compatibility.md.
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: 0,
  workers: 1,
  timeout: isCI ? 30000 : 10000,
  expect: {
    timeout: isCI ? 10000 : 3000,
  },
  reporter: [["json", { outputFile: "playwright-report.json" }], ["list"]],
  use: {
    baseURL: "http://127.0.0.1:3000",
    actionTimeout: isCI ? 10000 : 3000,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium-desktop",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chromium-mobile",
      use: { ...devices["Pixel 5"] },
    },
  ],
  webServer: {
    command: "npm run start",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !isCI,
    timeout: isCI ? 120000 : 30000,
  },
});
