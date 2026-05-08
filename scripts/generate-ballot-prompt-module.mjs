import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");

const prompts = [
  {
    docsPath: path.join(repoRoot, "docs", "BALLOT_PROMPT.md"),
    outputPath: path.join(
      repoRoot,
      "src",
      "lib",
      "generated",
      "ballotPromptEn.generated.ts",
    ),
    exportName: "BALLOT_PROMPT_EN",
    sourceLabel: "docs/BALLOT_PROMPT.md",
  },
  {
    docsPath: path.join(repoRoot, "docs", "BALLOT_PROMPT_ES.md"),
    outputPath: path.join(
      repoRoot,
      "src",
      "lib",
      "generated",
      "ballotPromptEs.generated.ts",
    ),
    exportName: "BALLOT_PROMPT_ES",
    sourceLabel: "docs/BALLOT_PROMPT_ES.md",
  },
];

function extractPrompt(docs) {
  const startMarker = "## The Prompt\n\n";
  const endMarker = "\n---\n\n## Share this";
  const startIndex = docs.indexOf(startMarker);
  const endIndex = docs.indexOf(endMarker);

  if (startIndex >= 0 && endIndex > startIndex) {
    return docs.slice(startIndex + startMarker.length, endIndex).trim();
  }

  return docs.trim();
}

for (const promptConfig of prompts) {
  const docs = fs.readFileSync(promptConfig.docsPath, "utf8");
  const prompt = extractPrompt(docs);
  const escapedPrompt = prompt
    .replaceAll("\\", "\\\\")
    .replaceAll("`", "\\`")
    .replaceAll("${", "\\${");

  const declarationPrefix = `export const ${promptConfig.exportName} =`;
  const firstLine = prompt.split("\n")[0] ?? "";
  const declaration =
    declarationPrefix.length + 1 + firstLine.length > 80
      ? `${declarationPrefix}\n  \`${escapedPrompt}\` as const;`
      : `${declarationPrefix} \`${escapedPrompt}\` as const;`;

  const output = `// Generated from ${promptConfig.sourceLabel} by scripts/generate-ballot-prompt-module.mjs
// Do not edit by hand.

${declaration}
`;

  fs.mkdirSync(path.dirname(promptConfig.outputPath), { recursive: true });
  fs.writeFileSync(promptConfig.outputPath, output);
}
