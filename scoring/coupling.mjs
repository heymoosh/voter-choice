#!/usr/bin/env node

import { execSync } from "child_process";
import { resolve } from "path";

const args = process.argv.slice(2);

function argValue(name) {
  const idx = args.indexOf(name);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
}

const ROOT = argValue("--repo") ? resolve(argValue("--repo")) : process.cwd();

function run(cmd) {
  try {
    return {
      success: true,
      stdout: execSync(cmd, {
        cwd: ROOT,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      }),
      stderr: "",
    };
  } catch (error) {
    return {
      success: false,
      stdout: error.stdout || "",
      stderr: error.stderr || "",
    };
  }
}

const graphResult = run("npx madge --json --extensions ts,tsx src");
if (!graphResult.success) {
  console.error(graphResult.stderr || graphResult.stdout || "madge graph failed");
  process.exit(1);
}

const graph = JSON.parse(graphResult.stdout || "{}");
const nodes = Object.keys(graph).length;
const edges = Object.values(graph).reduce(
  (sum, deps) => sum + (Array.isArray(deps) ? deps.length : 0),
  0,
);

const fanIn = new Map();
const fanOut = new Map();
for (const [node, deps] of Object.entries(graph)) {
  const dependencyList = Array.isArray(deps) ? deps : [];
  fanOut.set(node, dependencyList.length);
  for (const dep of dependencyList) {
    fanIn.set(dep, (fanIn.get(dep) || 0) + 1);
  }
}

for (const node of Object.keys(graph)) {
  if (!fanIn.has(node)) fanIn.set(node, 0);
  if (!fanOut.has(node)) fanOut.set(node, 0);
}

const circularResult = run("npx madge --circular --json --extensions ts,tsx src");
let circular = 0;
if (circularResult.success) {
  try {
    const parsed = JSON.parse(circularResult.stdout || "[]");
    circular = Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    circular = 0;
  }
}

const density =
  nodes > 1 ? Math.round((edges / (nodes * (nodes - 1))) * 10000) / 10000 : null;
const meanFanIn =
  nodes > 0
    ? Math.round(
        ([...fanIn.values()].reduce((sum, count) => sum + count, 0) / nodes) * 100,
      ) / 100
    : 0;
const meanFanOut =
  nodes > 0
    ? Math.round(
        ([...fanOut.values()].reduce((sum, count) => sum + count, 0) / nodes) * 100,
      ) / 100
    : 0;

process.stdout.write(
  `${JSON.stringify(
    {
      coupling: {
        nodes,
        edges,
        density,
        meanFanIn,
        meanFanOut,
        circular,
      },
    },
    null,
    2,
  )}\n`,
);
