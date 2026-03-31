#!/usr/bin/env node
/**
 * Ensures Playwright Chromium is installed at /tmp/pw-browsers.
 * Runs automatically before `npm run e2e` and `npm run measure`.
 */

import { execSync } from "child_process";
import { existsSync } from "fs";

const BROWSERS_PATH = process.env.PLAYWRIGHT_BROWSERS_PATH || "/tmp/pw-browsers";
const CHROME = `${BROWSERS_PATH}/chromium-1169/chrome-linux/chrome`;

if (existsSync(CHROME)) {
  process.exit(0);
}

console.log("Playwright Chromium not found — installing to", BROWSERS_PATH);
try {
  execSync(
    `PLAYWRIGHT_BROWSERS_PATH=${BROWSERS_PATH} node node_modules/.bin/playwright install chromium`,
    { stdio: "inherit", timeout: 180000 },
  );
} catch (err) {
  console.error("Failed to install Playwright Chromium:", err.message);
  process.exit(1);
}
