module.exports = {
  ci: {
    collect: {
      url: ["http://127.0.0.1:3001"],
      startServerCommand: "PORT=3001 npm run start",
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
