import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 10000,
  expect: {
    timeout: 3000,
  },
  reporter: [["json", { outputFile: "playwright-report.json" }], ["list"]],
  use: {
    baseURL: "http://127.0.0.1:3001",
    actionTimeout: 3000,
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
    command: "PORT=3001 npm run start",
    url: "http://127.0.0.1:3001",
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
