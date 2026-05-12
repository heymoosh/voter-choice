#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync } from "fs";
import { join, resolve } from "path";

const args = process.argv.slice(2);

function argValue(name) {
  const idx = args.indexOf(name);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
}

const ROOT = argValue("--repo") ? resolve(argValue("--repo")) : process.cwd();
const transcriptsDirArg = argValue("--transcripts-dir");
const transcriptCandidates = [
  transcriptsDirArg,
  join(ROOT, "metrics", "transcripts"),
  join(ROOT, "transcripts"),
].filter(Boolean);

function parseTranscriptEntries(filePath) {
  return readFileSync(filePath, "utf-8")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function extractToolUses(entry) {
  const toolUses = [];
  if (entry?.type === "tool_use") {
    toolUses.push(entry);
  }
  if (Array.isArray(entry?.content)) {
    for (const item of entry.content) {
      if (item?.type === "tool_use") {
        toolUses.push(item);
      }
    }
  }
  if (entry?.message?.type === "tool_use") {
    toolUses.push(entry.message);
  }
  if (Array.isArray(entry?.message?.content)) {
    for (const item of entry.message.content) {
      if (item?.type === "tool_use") {
        toolUses.push(item);
      }
    }
  }
  return toolUses;
}

function findTranscriptFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith(".jsonl"))
    .map((name) => join(dir, name));
}

let transcriptSource = null;
let transcriptFiles = [];

for (const candidate of transcriptCandidates) {
  const files = findTranscriptFiles(candidate);
  if (files.length > 0) {
    transcriptSource = candidate;
    transcriptFiles = files;
    break;
  }
}

if (!transcriptSource) {
  process.stdout.write(
    `${JSON.stringify({ subagentCalls: null, transcriptSource: null }, null, 2)}\n`,
  );
  process.exit(0);
}

const byType = {};
let total = 0;

for (const file of transcriptFiles) {
  for (const entry of parseTranscriptEntries(file)) {
    for (const toolUse of extractToolUses(entry)) {
      if (toolUse?.name !== "Task") continue;
      total += 1;
      const type =
        toolUse?.input?.subagent_type ||
        toolUse?.input?.subagentType ||
        toolUse?.input?.agent_type ||
        "unknown";
      byType[type] = (byType[type] || 0) + 1;
    }
  }
}

process.stdout.write(
  `${JSON.stringify({ subagentCalls: { total, byType, transcriptSource } }, null, 2)}\n`,
);
