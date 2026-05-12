import { readFile } from "node:fs/promises";
import path from "node:path";
import { deriveOpenStatesData } from "@/lib/openstates/derive";
import type {
  OpenStatesDerivedData,
  OpenStatesRawTables,
} from "@/lib/openstates/types";

const DEFAULT_DERIVED_PATH = path.join(
  process.cwd(),
  "src/data/openstates/derived.json",
);

export async function loadDerivedOpenStatesData(
  filePath: string = DEFAULT_DERIVED_PATH,
): Promise<OpenStatesDerivedData> {
  try {
    const content = await readFile(filePath, "utf8");
    return JSON.parse(content) as OpenStatesDerivedData;
  } catch {
    return {
      generatedAt: new Date().toISOString(),
      records: [],
    };
  }
}

export async function buildDerivedOpenStatesDataFromRawFile(
  filePath: string,
): Promise<OpenStatesDerivedData> {
  const content = await readFile(filePath, "utf8");
  const raw = JSON.parse(content) as OpenStatesRawTables;
  return deriveOpenStatesData(raw);
}
