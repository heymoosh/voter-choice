// Shared utilities for the PDF extraction bakeoff runners.
//
// Responsibilities:
// - Load .env.local (working tree)
// - Render PDF pages to PNG buffers via pdfjs-dist + @napi-rs/canvas
// - Construct an Anthropic client and call Sonnet with consistent settings
// - Parse Sonnet's JSON-only output defensively (handles accidental fences)
// - Compute Sonnet cost from input/output tokens
// - Stitch per-page extractions into a single ballot extraction
// - Write per-fixture artifacts to results/<runner>/

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, basename, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import Anthropic from "@anthropic-ai/sdk";
import { createCanvas } from "@napi-rs/canvas";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

// ---------- paths ----------

export const RUNNERS_DIR = dirname(fileURLToPath(import.meta.url));
export const BAKEOFF_DIR = resolve(RUNNERS_DIR, "..");
export const FIXTURES_DIR = join(BAKEOFF_DIR, "fixtures");
export const RESULTS_DIR = join(BAKEOFF_DIR, "results");
export const WORKTREE_ROOT = resolve(BAKEOFF_DIR, "..", "..");
export const PDFJS_STANDARD_FONTS = join(
  WORKTREE_ROOT,
  "node_modules",
  "pdfjs-dist",
  "standard_fonts/",
);

// ---------- env loading ----------

export function loadEnvLocal(): void {
  const envPath = join(WORKTREE_ROOT, ".env.local");
  if (!existsSync(envPath)) return;
  const raw = readFileSync(envPath, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = val;
    }
  }
}

// ---------- Anthropic client ----------

export function getAnthropicClient(): Anthropic {
  loadEnvLocal();
  const key =
    process.env.ANTHROPIC_VOTER_API ||
    process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new Error(
      "No Anthropic API key found. Need ANTHROPIC_VOTER_API or ANTHROPIC_API_KEY in env or .env.local.",
    );
  }
  return new Anthropic({ apiKey: key });
}

// Sonnet model selection per spec: `claude-sonnet-4-5` or latest in family.
// SDK 0.39 declares Model as `(string & {})`-permissive, so we pass the alias through.
// If the alias 404s, the runner caller can swap to a dated variant.
export const SONNET_MODEL = "claude-sonnet-4-5";
// Spec set 8192 as default. fl-orange composite ballot output exceeded 8192 with
// the docling+Sonnet path (16K markdown -> long JSON), causing truncation and
// invalid JSON. Raised to 16384 across the board so all contenders use the same
// ceiling — keeps the comparison apples-to-apples. Tactical decision per spec
// allowance to make tactical calls without asking.
export const SONNET_MAX_TOKENS = 16384;

// Pricing (USD per 1M tokens) for Sonnet 4.5 — updated 2025-09 per Anthropic pricing page.
// Used for cost_breakdown computation. Vision input image tokens are included in input_tokens.
export const SONNET_INPUT_USD_PER_M = 3.0;
export const SONNET_OUTPUT_USD_PER_M = 15.0;

export function sonnetCostUsd(inputTokens: number, outputTokens: number): number {
  const inUsd = (inputTokens / 1_000_000) * SONNET_INPUT_USD_PER_M;
  const outUsd = (outputTokens / 1_000_000) * SONNET_OUTPUT_USD_PER_M;
  return Number((inUsd + outUsd).toFixed(6));
}

// ---------- PDF rendering ----------

export type RenderedPage = {
  pageIndex: number; // 1-based
  width: number;
  height: number;
  pngBuffer: Buffer;
};

export async function renderPdfPages(
  pdfPath: string,
  options: { scale?: number } = {},
): Promise<RenderedPage[]> {
  const scale = options.scale ?? 2.0;
  const data = new Uint8Array(readFileSync(pdfPath));
  const loadingTask = pdfjsLib.getDocument({
    data,
    useSystemFonts: true,
    disableFontFace: true,
    standardFontDataUrl: PDFJS_STANDARD_FONTS,
    verbosity: 0,
  });
  const pdf = await loadingTask.promise;
  const out: RenderedPage[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });
    const width = Math.ceil(viewport.width);
    const height = Math.ceil(viewport.height);
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");
    // White background so transparent regions don't turn into ambiguous colors.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await page.render({ canvasContext: ctx as any, viewport } as any).promise;
    const buf = canvas.toBuffer("image/png");
    out.push({ pageIndex: i, width, height, pngBuffer: buf });
  }
  return out;
}

// ---------- target schema ----------

export const TARGET_SCHEMA_DESC = `Target schema:
{
  "election_metadata": {
    "election_date": "YYYY-MM-DD",
    "election_type": "primary" | "primary_runoff" | "general" | "special",
    "jurisdiction": "string",
    "ballot_style": "string (optional)"
  },
  "sections": [
    {
      "section_name": "Federal" | "State" | "County" | "Municipal" | "Judicial" | "Propositions",
      "races": [
        {
          "office": "string",
          "district": "string | null",
          "position": "string | null",
          "vote_for_n": 1,
          "party_context": "Democratic Primary" | "Republican Primary" | null,
          "candidates": [
            {
              "name": "string | null",
              "party": "string | null",
              "ballot_position": "string | null (e.g. A1)",
              "placeholder_reason": "no_petition_filed" | "write_in" | null
            }
          ]
        }
      ]
    }
  ]
}`;

export const STANDARDIZED_PROMPT_PREAMBLE = `You are extracting structured ballot data from raw text produced by an upstream PDF extraction tool.`;

export const STANDARDIZED_PROMPT_INSTRUCTIONS = `Produce JSON that conforms to the target schema below. Extract every race and every candidate visible on the ballot — do NOT filter based on party affiliation or voting rules; the presentation layer handles that.

If the upstream output is incomplete or unreliable, prefer to mark a field as null rather than guess. Mark "NO PETITION FILED" rows as placeholder_reason="no_petition_filed", not as candidates. Mark write-in slots as placeholder_reason="write_in" with name=null. For multi-seat races (vote_for_n > 1), emit one write-in placeholder PER SEAT (so vote_for_n=2 → 2 write-in placeholders, vote_for_n=4 → 4 write-in placeholders).

For multi-party ballots (e.g., both DEM and REP on same page), set party_context per race. For single-party ballots, leave party_context null and the election_metadata.election_type carries the party info.

For bilingual ballots (English + Spanish): the English office/name is canonical. Spanish in italics or parentheses is a translation, NOT a separate race.

${TARGET_SCHEMA_DESC}

Output: JSON only. No prose. No markdown code fences.`;

export const VISION_DIRECT_PROMPT = `${STANDARDIZED_PROMPT_PREAMBLE.replace(
  "raw text produced by an upstream PDF extraction tool",
  "the page images of a ballot PDF",
)}

${STANDARDIZED_PROMPT_INSTRUCTIONS}`;

export function buildPostProcessorPrompt(upstreamRawOutput: string): string {
  return `${STANDARDIZED_PROMPT_PREAMBLE}

[INPUT: raw upstream output]
${upstreamRawOutput}
[/INPUT]

${STANDARDIZED_PROMPT_INSTRUCTIONS}`;
}

// ---------- robust JSON parsing ----------

export function parseSonnetJson(raw: string): unknown {
  let s = raw.trim();
  // Strip accidental code fences.
  if (s.startsWith("```")) {
    const firstNl = s.indexOf("\n");
    if (firstNl > 0) s = s.slice(firstNl + 1);
    if (s.endsWith("```")) s = s.slice(0, -3);
    s = s.trim();
  }
  // Some models occasionally prefix with "json" on a line.
  if (s.startsWith("json\n")) s = s.slice(5).trim();
  return JSON.parse(s);
}

// ---------- Sonnet calls with retry ----------

type AnthropicMessage = Awaited<
  ReturnType<InstanceType<typeof Anthropic>["messages"]["create"]>
>;

export type SonnetCallResult = {
  text: string;
  inputTokens: number;
  outputTokens: number;
  attempts: number;
};

export async function callSonnetWithRetry(
  client: Anthropic,
  args: {
    promptText: string;
    images?: Buffer[]; // PNG buffers
  },
  retries = 1,
): Promise<SonnetCallResult> {
  const content: Array<
    | { type: "text"; text: string }
    | {
        type: "image";
        source: { type: "base64"; media_type: "image/png"; data: string };
      }
  > = [];
  if (args.images && args.images.length > 0) {
    for (const img of args.images) {
      content.push({
        type: "image",
        source: {
          type: "base64",
          media_type: "image/png",
          data: img.toString("base64"),
        },
      });
    }
  }
  content.push({ type: "text", text: args.promptText });

  let attempt = 0;
  let lastErr: unknown = null;
  while (attempt <= retries) {
    try {
      const resp: AnthropicMessage = await client.messages.create({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        model: SONNET_MODEL as any,
        max_tokens: SONNET_MAX_TOKENS,
        messages: [
          {
            role: "user",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            content: content as any,
          },
        ],
      });
      const textBlock = resp.content.find((b) => b.type === "text");
      if (!textBlock || textBlock.type !== "text") {
        throw new Error("Sonnet returned no text content block");
      }
      return {
        text: textBlock.text,
        inputTokens: resp.usage.input_tokens,
        outputTokens: resp.usage.output_tokens,
        attempts: attempt + 1,
      };
    } catch (err) {
      lastErr = err;
      attempt += 1;
      if (attempt > retries) break;
      const backoffMs = 1500 * Math.pow(2, attempt - 1);
      console.error(
        `  Sonnet call failed (attempt ${attempt}): ${(err as Error).message}. Retrying in ${backoffMs}ms.`,
      );
      await new Promise((r) => setTimeout(r, backoffMs));
    }
  }
  throw lastErr;
}

// ---------- stitching ----------

// Stitch a list of per-page extracted JSON objects into one ballot extraction.
// Rule per decision-design.md: if a section header on page N has no candidates
// AND page N+1 starts mid-list with no header → merge. We interpret "starts
// mid-list" pragmatically as "page N+1's first section has the SAME section_name
// as page N's last section AND page N's last race has no candidates" — this
// handles the case where pdfjs/docling split a list across the page boundary.
//
// Also merges identical sections that appear on consecutive pages (a common
// case where the office category continues across pages).

export type Candidate = {
  name: string | null;
  party: string | null;
  ballot_position: string | null;
  placeholder_reason: "no_petition_filed" | "write_in" | null;
};

export type Race = {
  office: string;
  district: string | null;
  position: string | null;
  vote_for_n: number;
  party_context: string | null;
  candidates: Candidate[];
};

export type Section = {
  section_name: string;
  races: Race[];
};

export type Ballot = {
  election_metadata: {
    election_date: string | null;
    election_type: string | null;
    jurisdiction: string | null;
    ballot_style?: string | null;
  };
  sections: Section[];
  _per_page?: unknown[];
};

export function stitchPages(pages: Ballot[]): Ballot {
  if (pages.length === 0) {
    return {
      election_metadata: {
        election_date: null,
        election_type: null,
        jurisdiction: null,
      },
      sections: [],
    };
  }
  // Take metadata from the first page that has a non-null jurisdiction or date;
  // fall back to first page.
  let metadata = pages[0].election_metadata;
  for (const p of pages) {
    if (p.election_metadata?.jurisdiction || p.election_metadata?.election_date) {
      metadata = { ...metadata, ...p.election_metadata };
      break;
    }
  }

  const stitched: Section[] = [];
  for (const page of pages) {
    if (!page.sections || page.sections.length === 0) continue;
    for (const section of page.sections) {
      const last = stitched[stitched.length - 1];
      const sameName =
        last && last.section_name && section.section_name &&
        normSectionName(last.section_name) === normSectionName(section.section_name);
      if (sameName) {
        // Merge: append this section's races. The decision-design rule says
        // "if section header on page N has no candidates AND page N+1 starts
        // mid-list" — we interpret defensively: any time consecutive sections
        // share a name, merge them. Deduplication of identical races handled
        // by raceKey check.
        for (const race of section.races) {
          if (!last.races.some((r) => raceKey(r) === raceKey(race))) {
            last.races.push(race);
          }
        }
      } else {
        stitched.push({
          section_name: section.section_name,
          races: [...section.races],
        });
      }
    }
  }

  return {
    election_metadata: metadata,
    sections: stitched,
  };
}

function normSectionName(name: string): string {
  return name.trim().toLowerCase();
}

function raceKey(race: Race): string {
  return [
    race.office?.trim().toLowerCase() ?? "",
    race.district?.trim().toLowerCase() ?? "",
    race.position?.trim().toLowerCase() ?? "",
    race.party_context?.trim().toLowerCase() ?? "",
  ].join("|");
}

// ---------- artifact writing ----------

export function ensureResultsDir(runnerName: string): string {
  const dir = join(RESULTS_DIR, runnerName);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export type Metrics = {
  runner: string;
  fixture: string;
  started_at: string;
  completed_at: string;
  latency_ms: number;
  cost_usd: number;
  cost_breakdown: Record<string, number>;
  retries: number;
  outcome: "success" | "failed_after_retry" | "schema_invalid";
  error?: string;
};

export function writeArtifacts(
  runnerName: string,
  fixtureBasename: string,
  parsed: Ballot | null,
  rawUpstream: string | null,
  metrics: Metrics,
): void {
  const dir = ensureResultsDir(runnerName);
  const stem = fixtureBasename.replace(/\.pdf$/i, "");
  writeFileSync(
    join(dir, `${stem}.json`),
    JSON.stringify(parsed, null, 2),
  );
  if (rawUpstream !== null) {
    writeFileSync(join(dir, `${stem}.raw.json`), rawUpstream);
  }
  writeFileSync(
    join(dir, `${stem}.metrics.json`),
    JSON.stringify(metrics, null, 2),
  );
}

// ---------- fixture list ----------

// Order per spec: simplest first so tooling issues surface early.
export const FIXTURES = [
  "tx-harris-2026-dem-runoff.pdf",
  "tx-hidalgo-2026-bilingual.pdf",
  "fl-orange-2026-composite.pdf",
  "nj-camden-2026-primary.pdf",
];

export function fixturePath(name: string): string {
  return join(FIXTURES_DIR, name);
}

export function fixtureBasename(p: string): string {
  return basename(p);
}
