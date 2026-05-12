#!/usr/bin/env node

/**
 * Diff-hygiene metric for the voter-choice experiment.
 *
 * For each phase, did the diff vs the prior phase stay scoped to the
 * phase's expected surface area, or did it sprawl into unrelated parts
 * of the codebase? Reads `scoring/phase-scopes/phase<N>.json` which lists
 * the expected and adjacent-allowed file globs for the phase, then
 * classifies every changed file as in-scope, adjacent, or unexpected.
 *
 * Usage:
 *   node scoring/diff-hygiene.mjs --branch <branch> --phase <N>
 *
 * Optional:
 *   --repo <path>
 *   --prev-tag <tag>          Override the prior-phase tag
 *   --scope-file <path>       Override the phase-scope JSON path
 *   --output-json <path>      Write the result JSON here
 *
 * Output format (when called from measure.mjs, merged into the phase JSON
 * under a `diffHygiene` block; when called standalone, written to stdout):
 *   {
 *     scopeAdherence: 0.87,
 *     summary: { inScope: {...}, adjacent: {...}, unexpected: {...} },
 *     unexpectedFiles: [...],
 *     priorTag: "<framework>-phase<N-1>-complete"
 *   }
 */

import { execSync } from "child_process";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
function argValue(name) {
  const idx = args.indexOf(name);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
}

const branchName = argValue("--branch");
const phaseArg = argValue("--phase");
const repoArg = argValue("--repo");
const prevTagOverride = argValue("--prev-tag");
const scopeFileOverride = argValue("--scope-file");
const outputJson = argValue("--output-json");

if (!branchName || !phaseArg) {
  console.error("Usage: diff-hygiene.mjs --branch <branch> --phase <N>");
  process.exit(2);
}

const phase = parseInt(phaseArg, 10);
if (Number.isNaN(phase) || phase < 2) {
  console.error("--phase must be an integer >= 2 (Phase 1 has no prior phase)");
  process.exit(2);
}

const ROOT = repoArg ? resolve(repoArg) : process.cwd();

const frameworkSlug = branchName
  .replace(/^experiment\//, "")
  .replace(/^archive\//, "")
  .replace(/\//g, "-");

const prevTag =
  prevTagOverride || `${frameworkSlug}-phase${phase - 1}-complete`;

const scopePath =
  scopeFileOverride || join(__dirname, "phase-scopes", `phase${phase}.json`);
if (!existsSync(scopePath)) {
  console.error(`Phase-scope file not found: ${scopePath}`);
  console.error(
    "Diff-hygiene cannot run without a scope contract for this phase.",
  );
  process.exit(1);
}

const scope = JSON.parse(readFileSync(scopePath, "utf-8"));
const expectedGlobs = scope.expectedGlobs || [];
const adjacentGlobs = scope.adjacentAllowed || [];

// Minimal glob matcher. Supports `*` (no slash), `**` (any depth),
// and exact suffix matches like `foo.*`. We don't need full glob semantics
// here — the patterns are short and project-relative.
function globToRegex(pattern) {
  let re = "^";
  let i = 0;
  while (i < pattern.length) {
    const c = pattern[i];
    if (c === "*" && pattern[i + 1] === "*") {
      re += ".*";
      i += 2;
      if (pattern[i] === "/") i++;
    } else if (c === "*") {
      re += "[^/]*";
      i++;
    } else if (c === "?") {
      re += "[^/]";
      i++;
    } else if (
      c === "." ||
      c === "(" ||
      c === ")" ||
      c === "+" ||
      c === "$" ||
      c === "^" ||
      c === "|" ||
      c === "{" ||
      c === "}"
    ) {
      re += "\\" + c;
      i++;
    } else {
      re += c;
      i++;
    }
  }
  re += "$";
  return new RegExp(re);
}

const expectedRegexes = expectedGlobs.map(globToRegex);
const adjacentRegexes = adjacentGlobs.map(globToRegex);

function classify(file) {
  for (const re of expectedRegexes) if (re.test(file)) return "inScope";
  for (const re of adjacentRegexes) if (re.test(file)) return "adjacent";
  return "unexpected";
}

// Get the list of changed files and their numstat
let nameOnly;
let numstat;
try {
  nameOnly = execSync(`git diff --name-only ${prevTag}..HEAD`, {
    cwd: ROOT,
    encoding: "utf-8",
  })
    .trim()
    .split("\n")
    .filter(Boolean);
  numstat = execSync(`git diff --numstat ${prevTag}..HEAD`, {
    cwd: ROOT,
    encoding: "utf-8",
  })
    .trim()
    .split("\n")
    .filter(Boolean);
} catch (err) {
  console.error(`Could not compute diff vs ${prevTag}:`, err.message);
  process.exit(1);
}

const fileStats = new Map(); // path -> {added, removed}
for (const line of numstat) {
  const [addedStr, removedStr, ...pathParts] = line.split("\t");
  const file = pathParts.join("\t");
  const added = addedStr === "-" ? 0 : parseInt(addedStr, 10) || 0;
  const removed = removedStr === "-" ? 0 : parseInt(removedStr, 10) || 0;
  fileStats.set(file, { added, removed });
}

const buckets = {
  inScope: { files: [], locAdded: 0, locRemoved: 0 },
  adjacent: { files: [], locAdded: 0, locRemoved: 0 },
  unexpected: { files: [], locAdded: 0, locRemoved: 0 },
};

for (const file of nameOnly) {
  const klass = classify(file);
  const stats = fileStats.get(file) || { added: 0, removed: 0 };
  buckets[klass].files.push(file);
  buckets[klass].locAdded += stats.added;
  buckets[klass].locRemoved += stats.removed;
}

const totalScopedLOC = buckets.inScope.locAdded + buckets.unexpected.locAdded;
const scopeAdherence =
  totalScopedLOC > 0
    ? +(buckets.inScope.locAdded / totalScopedLOC).toFixed(4)
    : null;

const result = {
  metadata: {
    branch: branchName,
    phase,
    priorTag: prevTag,
    scopeFile: scopePath.replace(ROOT + "/", ""),
    computedAt: new Date().toISOString(),
  },
  scopeAdherence,
  summary: {
    inScope: {
      filesChanged: buckets.inScope.files.length,
      locAdded: buckets.inScope.locAdded,
      locRemoved: buckets.inScope.locRemoved,
    },
    adjacent: {
      filesChanged: buckets.adjacent.files.length,
      locAdded: buckets.adjacent.locAdded,
      locRemoved: buckets.adjacent.locRemoved,
    },
    unexpected: {
      filesChanged: buckets.unexpected.files.length,
      locAdded: buckets.unexpected.locAdded,
      locRemoved: buckets.unexpected.locRemoved,
    },
  },
  unexpectedFiles: buckets.unexpected.files,
  adjacentFiles: buckets.adjacent.files,
};

if (outputJson) {
  writeFileSync(outputJson, JSON.stringify(result, null, 2));
  console.log(`Wrote ${outputJson}`);
} else {
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
}
