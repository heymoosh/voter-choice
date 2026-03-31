// Find Chrome binary from Playwright's install location
function findChromePath() {
  const fs = require("fs");
  const path = require("path");
  const browsersPath =
    process.env.PLAYWRIGHT_BROWSERS_PATH ||
    path.join(require("os").homedir(), ".cache", "ms-playwright");
  try {
    const dirs = fs.readdirSync(browsersPath);
    // Try chromium- first (full browser), then chromium_headless_shell-
    for (const prefix of ["chromium-", "chromium_headless_shell-"]) {
      const match = dirs.filter((d) => d.startsWith(prefix));
      if (match.length > 0) {
        const candidates = [
          path.join(browsersPath, match[0], "chrome-linux", "chrome"),
          path.join(browsersPath, match[0], "chrome-linux", "headless_shell"),
        ];
        for (const c of candidates) {
          if (fs.existsSync(c)) return c;
        }
      }
    }
  } catch {
    // fall through
  }
  return undefined;
}

module.exports = {
  ci: {
    collect: {
      url: ["http://127.0.0.1:3000"],
      startServerCommand: "npm run start",
      startServerReadyPattern: "Ready",
      startServerReadyTimeout: 30000,
      numberOfRuns: 1,
      chromePath: findChromePath(),
      settings: {
        preset: "desktop",
        chromeFlags: "--no-sandbox --headless --disable-gpu",
        onlyCategories: [
          "performance",
          "accessibility",
          "best-practices",
          "seo",
        ],
      },
    },
    assert: {
      assertions: {},
    },
    upload: {
      target: "filesystem",
      outputDir: ".lighthouseci",
    },
  },
};
