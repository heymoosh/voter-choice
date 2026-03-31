module.exports = {
  ci: {
    collect: {
      url: ["http://127.0.0.1:3000"],
      startServerCommand: "npm run start",
      startServerReadyPattern: "Ready",
      startServerReadyTimeout: 30000,
      numberOfRuns: 1,
      settings: {
        preset: "desktop",
        onlyCategories: [
          "performance",
          "accessibility",
          "best-practices",
          "seo",
        ],
        chromeFlags: "--no-sandbox",
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
