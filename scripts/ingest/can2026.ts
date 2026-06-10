/**
 * scripts/ingest/can2026.ts
 *
 * CAN2026 enrichment ingest — Constitutional Accountability Now
 * (can2026.org, Paul Zurav LLC). Spec: docs/CAN2026_ENRICHMENT_SCHEMA.md.
 *
 * ⚠️  TERMS-OF-USE GATE: do NOT run this against the live site in production
 *     until Muxin has confirmed CAN's terms permit programmatic ingest with
 *     the maintainer (doc §6.7). Local development uses `--file <saved.html>`.
 *
 * Pipeline (doc §0 + §7):
 *  1. Fetch https://can2026.org/2026-elections (or read --file). The whole
 *     site content graph lives in one ~1.9MB HTML-entity-encoded
 *     `<astro-island props="…">` attribute — take the LARGEST props blob.
 *  2. SNAPSHOT FIRST: gzip+base64 the decoded payload, sha256 checksum, and
 *     create the can_ingest_runs row BEFORE parsing. A parser failure must
 *     never lose the snapshot. Retention: keep raw_payload_gzip on the latest
 *     5 runs; null it out on older runs.
 *  3. Parse the decoded payload: TWO `var CARDS` datasets (Senate first —
 *     marker "the race profile for that Senate seat"; House — marker
 *     "its House race profile"), `var BILLS` (10-bill dictionary), and
 *     `var BTN_COLORS`. Fields are CSS classes / table columns / tag labels
 *     inside pre-rendered HTML — parsed with a small hand-rolled tag scanner,
 *     no DOM dependency. Normalization: vote-y/vote-yea → "yea",
 *     vote-n/vote-nay → "nay", vote-na → "na". `tag-safer` is overloaded
 *     (rating "Safe R" vs party label "Republican") — disambiguated by the
 *     chip's TEXT, not its class. Verbatim `*_raw` strings are stored
 *     alongside every normalized value; raw_html fragments on can_races.
 *  4. Drift gate (doc §7): datasets !== 2 or BILLS missing → hard abort
 *     BEFORE writing parsed rows (the snapshot row stays). Key-vote /
 *     donor-trail / rating counts outside ±20% of the May 2026 snapshot →
 *     WARN only.
 *  5. Upserts with deterministic keys (can_races id "<state>-<chamber>
 *     [-<district>]"); all other can_* rows are snapshot-scoped
 *     (delete+insert for this snapshot_date) — idempotent re-runs.
 *  6. Crosswalk pass: can_candidates → our candidates by (normalized name +
 *     state + office) — exact matches only; ambiguous/no match is logged to
 *     stdout for review and left unmatched. NEVER auto-merge fuzzy matches.
 *     can_bill_narratives → our bills by bill number ("H.R. 5376"), exact-ish
 *     only. Key votes link to our votes only when BOTH ends matched.
 *
 * Usage:
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/can2026.ts
 *   ... can2026.ts --file ./snapshots/2026-elections.html   # local HTML
 *   ... can2026.ts --dry-run                                # parse + report only
 *   ... can2026.ts --url https://staging.example/2026-elections
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";
import { createHash, randomUUID } from "node:crypto";
import { desc, eq, inArray, sql } from "drizzle-orm";
import { requireDb, type DbClient } from "../../db/client";
import {
  bills,
  candidates,
  canAnnotations,
  canBillNarratives,
  canCandidateKeyVotes,
  canCandidates,
  canCitations,
  canDonorSectors,
  canDonorTrails,
  canFinanceMetrics,
  canIngestRuns,
  canIssuePacContributions,
  canRaceRatings,
  canRaces,
  votes,
} from "../../db/schema";
import {
  cleanCandidateName,
  stateFromCandidateName,
} from "../../src/lib/server/alignment";

// ---------------------------------------------------------------------------
// Constants / types
// ---------------------------------------------------------------------------

const DEFAULT_SOURCE_URL = "https://can2026.org/2026-elections";
const KEEP_RUNS = 5;

/** Dataset markers (doc §0). */
const SENATE_MARKER = "the race profile for that Senate seat";
const HOUSE_MARKER = "its House race profile";

/** Doc §7 expectations (May 22, 2026 snapshot) with ±20% soft tolerance. */
export const DRIFT_EXPECTATIONS = {
  datasets: 2,
  keyVotes: 1160,
  donorTrails: 167,
  ratings: 404,
  tolerancePct: 20,
} as const;

type Fetcher = typeof fetch;

export type Can2026Config = {
  sourceUrl: string;
  filePath: string | null;
  dryRun: boolean;
};

export type ParsedRating = {
  rater: string;
  raterType: "forecaster" | "pollster" | "can_own";
  rating: string;
  ratingRaw: string;
};

export type ParsedKeyVote = {
  billLabel: string;
  dataBillKey: string | null;
  voteCast: string | null;
  voteCastRaw: string | null;
  voteDateRaw: string | null;
  voteDate: string | null;
  context: string | null;
  proceduralNote: string | null;
  source: string | null;
};

export type ParsedSector = {
  sectorLabelRaw: string;
  sectorLabel: string | null;
  amount: number;
};

export type ParsedDonorTrail = {
  cycleWindow: string;
  totalRaised: number | null;
  cashOnHand: number | null;
  cashOnHandAsOf: string | null;
  pacSharePct: number | null;
  note: string | null;
  dataStatus: string;
  sectors: ParsedSector[];
};

export type ParsedFinanceMetric = {
  metricLabelRaw: string;
  amount: number | null;
  asOfDate: string | null;
};

export type ParsedIssuePac = {
  pacName: string;
  pacCategory: string | null;
  amount: number | null;
  windowType: "career" | "cycle";
  cycleWindow: string | null;
  confirmed: boolean;
  note: string | null;
};

export type ParsedAnnotation = {
  annotationType: string;
  body: string;
  disclaimer: string | null;
};

export type ParsedCitation = {
  sourceOrg: string;
  fecCommitteeId: string | null;
  citationUrl: string | null;
  citationDate: string | null;
  rawText: string;
};

export type ParsedCandidate = {
  canName: string;
  party: string | null;
  state: string;
  recordType: "ballot_2026" | "current_member_not_on_ballot";
  incumbentStatus: string | null;
  nextElectionYear: number | null;
  primaryResultPct: number | null;
  narrativeSummary: string | null;
  dataStatus: string;
  keyVotes: ParsedKeyVote[];
  donorTrail: ParsedDonorTrail | null;
  financeMetrics: ParsedFinanceMetric[];
  issuePacs: ParsedIssuePac[];
  annotations: ParsedAnnotation[];
  citations: ParsedCitation[];
};

export type ParsedRace = {
  id: string;
  state: string;
  chamber: "house" | "senate";
  district: string | null;
  senateClass: string | null;
  raceSummary: string | null;
  raceStatus: string;
  isOpenSeat: boolean;
  canOwnRating: string | null;
  canOwnRatingRaw: string | null;
  overallStateRating: string | null;
  flags: string[] | null;
  retirementContext: string | null;
  electoralBaseline: string | null;
  electionDate: string | null;
  primaryDate: string | null;
  primaryResults: { name: string; party: string | null; pct: number }[] | null;
  rawHtml: string;
  ratings: ParsedRating[];
  candidates: ParsedCandidate[];
  annotations: ParsedAnnotation[];
  citations: ParsedCitation[];
};

export type ParsedBill = {
  canKey: string;
  title: string;
  billType: string | null;
  narrative: string | null;
  proceduralNote: string | null;
};

export type ParsedPayload = {
  contentUpdatedLabel: string | null;
  templateVersion: string | null;
  btnColors: Record<string, string>;
  bills: ParsedBill[];
  races: ParsedRace[];
  datasetCount: number;
  stats: {
    senateRaces: number;
    houseRaces: number;
    pendingProfiles: number;
    candidates: number;
    keyVotes: number;
    ratings: number;
    donorTrails: number;
    donorSectors: number;
    financeMetrics: number;
    issuePacs: number;
    billNarratives: number;
    annotations: number;
    citations: number;
  };
};

/** Hard upstream-format drift (doc §7) — abort before writing parsed rows. */
export class Can2026DriftError extends Error {
  readonly code = "CAN2026_DRIFT" as const;
  constructor(message: string) {
    super(message);
    this.name = "Can2026DriftError";
  }
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export function resolveConfig(
  env: NodeJS.ProcessEnv = process.env,
  argv: string[] = process.argv,
): Can2026Config {
  const fileFlag = argv.indexOf("--file");
  const urlFlag = argv.indexOf("--url");
  return {
    sourceUrl:
      (urlFlag >= 0 ? argv[urlFlag + 1] : null) ??
      env.CAN2026_SOURCE_URL ??
      DEFAULT_SOURCE_URL,
    filePath: fileFlag >= 0 ? (argv[fileFlag + 1] ?? null) : null,
    dryRun: argv.includes("--dry-run"),
  };
}

// ---------------------------------------------------------------------------
// Generic helpers (exported for tests)
// ---------------------------------------------------------------------------

/** Minimal HTML-entity decoder: &amp; &lt; &gt; &quot; &#39; + numeric. */
export function decodeEntities(s: string): string {
  return s.replace(
    /&(amp|lt|gt|quot|#39|apos|#x[0-9a-fA-F]+|#\d+);/g,
    (_, ent: string) => {
      switch (ent) {
        case "amp":
          return "&";
        case "lt":
          return "<";
        case "gt":
          return ">";
        case "quot":
          return '"';
        case "apos":
        case "#39":
          return "'";
        default: {
          const code = ent.startsWith("#x")
            ? parseInt(ent.slice(2), 16)
            : parseInt(ent.slice(1), 10);
          return Number.isFinite(code)
            ? String.fromCodePoint(code)
            : `&${ent};`;
        }
      }
    },
  );
}

/** The astro-island props blob holding the site graph is the LARGEST
 *  `props="…"` attribute in the page (doc §0). Returns it decoded. */
export function extractLargestProps(html: string): string {
  let best: string | null = null;
  const re = /props="([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    if (best === null || m[1].length > best.length) best = m[1];
  }
  if (best === null) {
    throw new Error('no astro-island props="…" attribute found in HTML');
  }
  return decodeEntities(best);
}

export function sha256Hex(s: string): string {
  return createHash("sha256").update(s, "utf8").digest("hex");
}

export function gzipBase64(s: string): string {
  return gzipSync(Buffer.from(s, "utf8")).toString("base64");
}

const MONTHS: Record<string, string> = {
  jan: "01",
  feb: "02",
  mar: "03",
  apr: "04",
  may: "05",
  jun: "06",
  jul: "07",
  aug: "08",
  sep: "09",
  oct: "10",
  nov: "11",
  dec: "12",
};

/** "Aug. 7, 2022" / "March 31, 2026" / "2026-05-21" → ISO date; month-only
 *  ("Jul. 2017") or prose ("No floor vote yet") → null. */
export function parseDateLoose(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = raw.trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return s;
  const m = s.match(/^([A-Za-z]+)\.?\s+(\d{1,2}),?\s+(\d{4})$/);
  if (!m) return null;
  const mon = MONTHS[m[1].slice(0, 3).toLowerCase()];
  if (!mon) return null;
  return `${m[3]}-${mon}-${m[2].padStart(2, "0")}`;
}

/** "$11.88M" / "1,866,426" / "~$9.67M" → number (USD); null when unparsable. */
export function parseMoney(raw: string | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  const m = String(raw)
    .replace(/[,$\s~]/g, "")
    .match(/^(\d+(?:\.\d+)?)([MKB])?$/i);
  if (!m) return null;
  const mult =
    m[2]?.toLowerCase() === "b"
      ? 1e9
      : m[2]?.toLowerCase() === "m"
        ? 1e6
        : m[2]?.toLowerCase() === "k"
          ? 1e3
          : 1;
  return Math.round(parseFloat(m[1]) * mult * 100) / 100;
}

// ---------------------------------------------------------------------------
// Tiny tag scanner (no DOM dependency)
// ---------------------------------------------------------------------------

export type TagBlock = {
  attrs: string;
  inner: string;
  outer: string;
  start: number;
};

/** Balanced same-tag scanner. Returns every <tag …>…</tag> block (including
 *  nested ones). Good enough for pre-rendered builder HTML; not a parser. */
export function findTagBlocks(html: string, tag: string): TagBlock[] {
  const out: TagBlock[] = [];
  const openRe = new RegExp(`<${tag}(\\s[^>]*)?>`, "gi");
  const anyRe = new RegExp(`<${tag}(?:\\s[^>]*)?>|</${tag}>`, "gi");
  let m: RegExpExecArray | null;
  while ((m = openRe.exec(html))) {
    if (m[0].endsWith("/>")) continue; // self-closing — no inner
    const attrs = m[1] ?? "";
    const innerStart = m.index + m[0].length;
    anyRe.lastIndex = innerStart;
    let depth = 1;
    let close = -1;
    let t: RegExpExecArray | null;
    while ((t = anyRe.exec(html))) {
      if (t[0][1] === "/") {
        depth -= 1;
        if (depth === 0) {
          close = t.index;
          break;
        }
      } else if (!t[0].endsWith("/>")) {
        depth += 1;
      }
    }
    if (close < 0) continue; // unbalanced — skip
    out.push({
      attrs,
      inner: html.slice(innerStart, close),
      outer: html.slice(m.index, close + tag.length + 3),
      start: m.index,
    });
  }
  return out;
}

export function classOf(attrs: string): string {
  const m = attrs.match(/class\s*=\s*"([^"]*)"/i);
  return m ? m[1] : "";
}

export function attrOf(attrs: string, name: string): string | null {
  const m = attrs.match(new RegExp(`${name}\\s*=\\s*"([^"]*)"`, "i"));
  return m ? m[1] : null;
}

/** Drop tags, decode entities, collapse whitespace. */
export function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function blocksWithClass(
  html: string,
  tags: string[],
  classToken: string,
): TagBlock[] {
  const re = new RegExp(`(^|\\s)${classToken}(\\s|$)`);
  return tags
    .flatMap((t) => findTagBlocks(html, t))
    .filter((b) => re.test(classOf(b.attrs)));
}

// ---------------------------------------------------------------------------
// Payload-level extraction: CARDS datasets, BILLS, BTN_COLORS
// ---------------------------------------------------------------------------

/** Pull every CARDS["XX"] = `…HTML…` assignment from a JS segment. */
export function extractCardAssignments(segment: string): Map<string, string> {
  const map = new Map<string, string>();
  const re = /CARDS\[\s*["']([A-Z]{2})["']\s*\]\s*=\s*`/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(segment))) {
    const start = re.lastIndex;
    let i = start;
    while (i < segment.length) {
      if (segment[i] === "\\") {
        i += 2;
        continue;
      }
      if (segment[i] === "`") break;
      i += 1;
    }
    map.set(m[1], segment.slice(start, i).replace(/\\([`$\\])/g, "$1"));
    re.lastIndex = i + 1;
  }
  return map;
}

export type CardsDataset = {
  chamber: "house" | "senate";
  cards: Map<string, string>;
};

/** Split the decoded payload into its `var CARDS` datasets and resolve each
 *  one's chamber by proximity to the doc §0 marker texts (Senate first when
 *  markers are missing). */
export function splitCardsDatasets(decoded: string): {
  datasets: CardsDataset[];
  datasetCount: number;
} {
  const positions: number[] = [];
  const re = /var\s+CARDS\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(decoded))) positions.push(m.index);

  const senateIdx = decoded.indexOf(SENATE_MARKER);
  const houseIdx = decoded.indexOf(HOUSE_MARKER);

  const datasets: CardsDataset[] = positions.map((pos, i) => {
    const segment = decoded.slice(pos, positions[i + 1] ?? decoded.length);
    let chamber: "house" | "senate";
    if (senateIdx >= 0 && houseIdx >= 0) {
      chamber =
        Math.abs(pos - senateIdx) <= Math.abs(pos - houseIdx)
          ? "senate"
          : "house";
    } else {
      if (positions.length > 1) {
        console.warn(
          "[can2026] WARN: dataset markers not found — falling back to order (Senate first)",
        );
      }
      chamber = i === 0 ? "senate" : "house";
    }
    return { chamber, cards: extractCardAssignments(segment) };
  });
  return { datasets, datasetCount: positions.length };
}

/** Balanced-brace object-literal scan, aware of '…' "…" `…` strings. */
function extractObjectBody(src: string, openBrace: number): string | null {
  let depth = 0;
  let quote: string | null = null;
  for (let i = openBrace; i < src.length; i += 1) {
    const ch = src[i];
    if (quote) {
      if (ch === "\\") i += 1;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") quote = ch;
    else if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return src.slice(openBrace + 1, i);
    }
  }
  return null;
}

/** Split an object body on top-level commas (string/brace aware). */
function splitTopLevelEntries(body: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let last = 0;
  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i];
    if (quote) {
      if (ch === "\\") i += 1;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") quote = ch;
    else if (ch === "{" || ch === "[" || ch === "(") depth += 1;
    else if (ch === "}" || ch === "]" || ch === ")") depth -= 1;
    else if (ch === "," && depth === 0) {
      out.push(body.slice(last, i));
      last = i + 1;
    }
  }
  out.push(body.slice(last));
  return out.map((e) => e.trim()).filter(Boolean);
}

function stringLiteralContents(v: string): string[] {
  const out: string[] = [];
  const re = /"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(v))) out.push(m[1] ?? m[2] ?? m[3] ?? "");
  return out;
}

export function inferBillType(title: string): string {
  if (/nomination|justice|judge/i.test(title)) return "nomination";
  if (/impeachment/i.test(title)) return "impeachment";
  if (
    /\b(?:H|S)\.?\s*(?:J|Con)?\.?\s*Res\b/i.test(title) ||
    /resolution/i.test(title)
  )
    return "resolution";
  return "legislation";
}

/** Parse `var BILLS = {…}` — the 10-bill curated dictionary. null when the
 *  payload has no BILLS object (hard drift). */
export function parseBills(decoded: string): ParsedBill[] | null {
  const at = decoded.search(/var\s+BILLS\s*=\s*\{/);
  if (at < 0) return null;
  const open = decoded.indexOf("{", at);
  const body = extractObjectBody(decoded, open);
  if (body === null) return null;
  const out: ParsedBill[] = [];
  for (const entry of splitTopLevelEntries(body)) {
    const keyMatch = entry.match(/^\s*["']?([\w-]+)["']?\s*:/);
    if (!keyMatch) continue;
    const value = entry.slice(entry.indexOf(":") + 1);
    const titleField = value.match(
      /title\s*:\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|`((?:[^`\\]|\\.)*)`)/,
    );
    const strings = stringLiteralContents(value);
    const joined = strings.length ? strings.join(" ") : value;
    const text = stripTags(joined);
    const heading =
      joined.match(/<h[2-5][^>]*>([\s\S]*?)<\/h[2-5]>/i) ??
      joined.match(/<strong[^>]*>([\s\S]*?)<\/strong>/i);
    const title =
      (titleField &&
        stripTags(titleField[1] ?? titleField[2] ?? titleField[3] ?? "")) ||
      (heading && stripTags(heading[1])) ||
      text.split(/(?<=\.)\s|What it did:/)[0].trim();
    const narrative = text.match(
      /What it did:\s*([\s\S]*?)(?=\s*Procedural note:|$)/i,
    );
    const procedural = text.match(/Procedural note:?\s*([\s\S]*)$/i);
    out.push({
      canKey: keyMatch[1],
      title: title || keyMatch[1],
      billType: inferBillType(title || ""),
      narrative: narrative ? narrative[1].trim() || null : null,
      proceduralNote: procedural ? procedural[1].trim() || null : null,
    });
  }
  return out;
}

export function parseBtnColors(decoded: string): Record<string, string> {
  const at = decoded.search(/var\s+BTN_COLORS\s*=\s*\{/);
  if (at < 0) return {};
  const open = decoded.indexOf("{", at);
  const body = extractObjectBody(decoded, open);
  if (body === null) return {};
  const out: Record<string, string> = {};
  const re = /["']?([A-Z]{2})["']?\s*:\s*["'](#[0-9a-fA-F]{3,8})["']/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) out[m[1]] = m[2];
  return out;
}

// ---------------------------------------------------------------------------
// Normalizers
// ---------------------------------------------------------------------------

/** Race-rating label → normalized value ("Solid R" → "safe_r"). */
export function normalizeRating(raw: string): string {
  const s = raw
    .toLowerCase()
    .replace(/[^a-z]+/g, " ")
    .trim();
  if (/^toss\s*up$/.test(s)) return "toss_up";
  const m = s.match(
    /^(lean|likely|safe|solid)\s+(r|rep|republican|d|dem|democrat|democratic)$/,
  );
  if (!m) return s.replace(/\s+/g, "_") || raw.toLowerCase();
  const level = m[1] === "solid" ? "safe" : m[1];
  const party = m[2].startsWith("r") ? "r" : "d";
  return `${level}_${party}`;
}

export function normalizeRater(raw: string): string {
  if (/cook/i.test(raw)) return "cook";
  if (/sabato/i.test(raw)) return "sabato";
  if (/inside/i.test(raw)) return "inside_elections";
  if (/270/i.test(raw)) return "270towin";
  return raw.toLowerCase().replace(/\s+/g, "_");
}

/** vote-y/vote-yea → "yea"; vote-n/vote-nay → "nay"; vote-na → "na"; raw
 *  "N/A …" qualifiers always win (doc §0/§3.10). */
export function normalizeVoteCast(
  voteClass: string | null,
  raw: string | null,
): string | null {
  if (raw && /^n\/?a\b/i.test(raw.trim())) return "na";
  switch (voteClass) {
    case "yea":
    case "y":
      return "yea";
    case "nay":
    case "n":
      return "nay";
    case "na":
      return "na";
    case "present":
      return "present";
    case "nv":
    case "not-voting":
    case "not_voting":
      return "not_voting";
    default:
      break;
  }
  const word = raw?.trim().split(/[\s(]/)[0].toLowerCase() ?? "";
  if (word === "yea" || word === "aye") return "yea";
  if (word === "nay" || word === "no") return "nay";
  if (word === "present") return "present";
  return raw ? null : null;
}

/** "Securities and Investment" → "Securities & Investment" (light-touch). */
export function normalizeSectorLabel(raw: string): string {
  return raw
    .replace(/\s+and\s+/gi, " & ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Deterministic can_races key: "<state>-<chamber>[-<district>]". */
export function deriveRaceId(
  state: string,
  chamber: "house" | "senate",
  district: string | null,
): string {
  return district === null
    ? `${state}-${chamber}`
    : `${state}-${chamber}-${district}`;
}

// ---------------------------------------------------------------------------
// Chip classification (the tag-safer overload, doc §0)
// ---------------------------------------------------------------------------

const RATING_TEXT_RE =
  /^(?:toss[\s-]?up|(?:lean|likely|safe|solid)\s+(?:r|d|rep\.?|dem\.?|republican|democrat))$/i;
const PARTY_TEXT_RE = /^(republican|democrat(?:ic)?|independent)$/i;

const FLAG_LABELS: Record<string, string> = {
  "committee power": "committee_power",
  "watch list": "watch_list",
  redistricted: "redistricted",
  "money network": "money_network",
  "fairshake watch": "fairshake_watch",
  "crypto funded": "crypto_funded",
  "leadership pac flow": "leadership_pac_flow",
  "tier 3 outside spending": "tier3_outside_spending",
  "special election": "special_election",
};

export type Chip = {
  cls: string;
  text: string;
  kind: "rating" | "party" | "flag" | "other";
};

/** Classify a tag-* chip by its TEXT (classes like tag-safer are overloaded:
 *  "Safe R" = rating, "Republican" = party label). */
export function classifyChip(cls: string, text: string): Chip {
  const t = text.trim();
  if (RATING_TEXT_RE.test(t)) return { cls, text: t, kind: "rating" };
  if (PARTY_TEXT_RE.test(t)) return { cls, text: t, kind: "party" };
  if (FLAG_LABELS[t.toLowerCase()]) return { cls, text: t, kind: "flag" };
  return { cls, text: t, kind: "other" };
}

function extractChips(html: string): Chip[] {
  const out: Chip[] = [];
  const re =
    /<span([^>]*class="[^"]*\btag-[a-z0-9-]+\b[^"]*"[^>]*)>([\s\S]*?)<\/span>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    out.push(classifyChip(classOf(m[1]), stripTags(m[2])));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Prose extractors
// ---------------------------------------------------------------------------

const RATING_WORD =
  "(?:Toss[\\s-]?Up|(?:Lean|Likely|Safe|Solid)\\s+(?:R|D|Rep\\.?|Dem\\.?|Republican|Democrat))";

/** Forecaster ratings cited as prose: "Cook: Lean R | Sabato: Likely R". */
export function parseForecasterRatings(text: string): ParsedRating[] {
  const out: ParsedRating[] = [];
  const re = new RegExp(
    `(Cook(?:\\s+Political(?:\\s+Report)?)?|Sabato(?:['’]s\\s+Crystal\\s+Ball)?|Inside\\s+Elections|270toWin)\\s*[:=\\u2013-]?\\s*(${RATING_WORD})`,
    "gi",
  );
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    out.push({
      rater: normalizeRater(m[1]),
      raterType: "forecaster",
      rating: normalizeRating(m[2]),
      ratingRaw: m[2],
    });
  }
  return out;
}

export function parseAnnotations(html: string): ParsedAnnotation[] {
  const out: ParsedAnnotation[] = [];
  const seen = new Set<string>();
  const push = (
    annotationType: string,
    body: string,
    disclaimer: string | null = null,
  ) => {
    const b = body.trim();
    if (!b) return;
    const key = `${annotationType}|${b}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ annotationType, body: b, disclaimer });
  };
  const blocks = [
    ...findTagBlocks(html, "div"),
    ...findTagBlocks(html, "p"),
    ...findTagBlocks(html, "section"),
  ];
  for (const b of blocks) {
    const cls = classOf(b.attrs);
    const text = stripTags(b.inner);
    if (/\bdata-gap\b/.test(cls) || /^DATA GAP\b/i.test(text)) {
      push("data_gap", text.replace(/^DATA GAP:?\s*/i, ""));
    } else if (/\brace-notes\b/.test(cls) || /^RACE NOTES\b/i.test(text)) {
      push("race_notes", text.replace(/^RACE NOTES:?\s*/i, ""));
    } else if (
      /\bcorrelation\b/.test(cls) ||
      /^OBSERVABLE CORRELATION\b/i.test(text)
    ) {
      const d = text.match(/[^.]*\bnot\s+(?:evidence|proof)\b[^.]*\.?/i);
      push(
        "observable_correlation",
        text.replace(/^OBSERVABLE CORRELATION:?\s*/i, ""),
        d ? d[0].trim() : null,
      );
    } else if (/^What we know\b/i.test(text)) {
      push("pending_what_we_know", text.replace(/^What we know:?\s*/i, ""));
    } else if (/^(?:What is pending|Still pending)\b/i.test(text)) {
      push(
        "pending_what_is_pending",
        text.replace(/^(?:What is pending|Still pending):?\s*/i, ""),
      );
    } else if (/^ETA\b/i.test(text)) {
      push("pending_eta", text.replace(/^ETA:?\s*/i, ""));
    }
  }
  return out;
}

export function buildCitation(raw: string): ParsedCitation | null {
  const rawText = raw.trim();
  if (!rawText || rawText === "--") return null;
  const fec = rawText.match(/\bC\d{8}\b/);
  const url = rawText.match(/https?:\/\/[^\s|]+/);
  const dateM = rawText.match(/\b[A-Z][a-z]{2,8}\.?\s+\d{1,2},?\s+\d{4}\b/);
  let org = rawText
    .replace(/\([^)]*\)/g, " ")
    .replace(/https?:\/\/[^\s|]+/g, " ");
  if (dateM) org = org.replace(dateM[0], " ");
  org = org.replace(/\s+/g, " ").trim() || rawText;
  return {
    sourceOrg: org,
    fecCommitteeId: fec ? fec[0] : null,
    citationUrl: url ? url[0] : null,
    citationDate: dateM ? parseDateLoose(dateM[0]) : null,
    rawText,
  };
}

/** Per-card pipe-delimited source-boxes ("A | B (C00835959) | NPR May 21, 2026"). */
export function parseCitations(html: string): ParsedCitation[] {
  const out: ParsedCitation[] = [];
  for (const block of blocksWithClass(html, ["div", "p"], "source-box")) {
    const text = stripTags(block.inner).replace(/^Sources?:?\s*/i, "");
    for (const piece of text.split("|")) {
      const c = buildCitation(piece);
      if (c) out.push(c);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Card parsing
// ---------------------------------------------------------------------------

const VOTE_CLASS_RE = /\bvote-(yea|nay|not[-_]?voting|nv|na|n|y|present)\b/i;

function parseKeyVoteRow(rowHtml: string): ParsedKeyVote | null {
  if (/<th[\s>]/i.test(rowHtml)) return null;
  const cells = findTagBlocks(rowHtml, "td");
  if (cells.length < 2) return null;
  const voteIdx = cells.findIndex(
    (c) => VOTE_CLASS_RE.test(classOf(c.attrs)) || VOTE_CLASS_RE.test(c.inner),
  );
  if (voteIdx < 0) return null;
  const voteCell = cells[voteIdx];
  const clsMatch =
    classOf(voteCell.attrs).match(VOTE_CLASS_RE) ??
    voteCell.inner.match(VOTE_CLASS_RE);
  const voteCastRaw = stripTags(voteCell.inner) || null;
  const billLabel = stripTags(cells[0].inner);
  if (!billLabel) return null;
  const keyM = rowHtml.match(/data-bill\s*=\s*"([\w-]+)"/i);
  const dateCell = cells[voteIdx + 1]
    ? stripTags(cells[voteIdx + 1].inner)
    : null;
  const contextCell = cells[voteIdx + 2]
    ? stripTags(cells[voteIdx + 2].inner)
    : null;
  const sourceCell = cells[voteIdx + 3]
    ? stripTags(cells[voteIdx + 3].inner)
    : null;
  // Procedural meaning hides in the vote qualifier ("Yea (procedural)") or in
  // the context prose ("Live Pair", "motion to table — tactical maneuver").
  const qualifier = voteCastRaw?.match(/\(([^)]+)\)/);
  const contextProcedural = contextCell?.match(
    /\b(live pair[^.]*|motion to table[^.]*)/i,
  );
  return {
    billLabel,
    dataBillKey: keyM ? keyM[1] : null,
    voteCast: normalizeVoteCast(
      clsMatch ? clsMatch[1].toLowerCase() : null,
      voteCastRaw,
    ),
    voteCastRaw,
    voteDateRaw: dateCell || null,
    voteDate: parseDateLoose(dateCell),
    context: contextCell || null,
    proceduralNote: qualifier
      ? qualifier[1].trim()
      : contextProcedural
        ? contextProcedural[1].trim()
        : null,
    source: sourceCell || null,
  };
}

function parseKeyVotes(blockHtml: string): ParsedKeyVote[] {
  const out: ParsedKeyVote[] = [];
  for (const table of findTagBlocks(blockHtml, "table")) {
    const headText = stripTags(table.inner.slice(0, 600));
    const isKeyVotes =
      /\bkey-votes\b/.test(classOf(table.attrs)) ||
      (/\bvote\b/i.test(headText) && VOTE_CLASS_RE.test(table.inner));
    if (!isKeyVotes) continue;
    for (const row of findTagBlocks(table.inner, "tr")) {
      const kv = parseKeyVoteRow(row.outer);
      if (kv) out.push(kv);
    }
  }
  return out;
}

function parseDonorSectors(trailHtml: string): ParsedSector[] {
  const out: ParsedSector[] = [];
  for (const list of blocksWithClass(
    trailHtml,
    ["ul", "ol", "table", "div"],
    "donor-sectors",
  )) {
    const items = [
      ...findTagBlocks(list.inner, "li"),
      ...findTagBlocks(list.inner, "tr"),
    ];
    for (const item of items) {
      const text = stripTags(item.inner);
      const m = text.match(/^(.+?)\s*\$\s*([\d,]+(?:\.\d+)?)$/);
      if (!m) continue;
      const amount = parseMoney(m[2]);
      if (amount === null) continue;
      out.push({
        sectorLabelRaw: m[1].trim(),
        sectorLabel: normalizeSectorLabel(m[1]),
        amount,
      });
    }
  }
  return out;
}

export function parseDonorTrail(blockHtml: string): ParsedDonorTrail | null {
  const at = blockHtml.search(/Donor[\s-]Trail/i);
  if (at < 0) return null;
  const trailHtml = blockHtml.slice(at);
  const text = stripTags(trailHtml);
  const windowM = text.match(/\b(20\d{2})\s*[–—-]\s*(20\d{2})\b/);
  const cycleWindow = windowM
    ? `${windowM[1]}-${windowM[2]}`
    : /data pending/i.test(text)
      ? "data pending"
      : "unspecified";
  const total = text.match(
    /Total raised:?\s*~?\$\s*(\d[\d,]*(?:\.\d+)?\s*[MKB]?)\b/i,
  );
  const cash = text.match(
    /Cash on hand:?\s*~?\$\s*(\d[\d,]*(?:\.\d+)?\s*[MKB]?)(?:\s*\(([^)]+)\))?/i,
  );
  const pac = text.match(/PAC(?:\s+share)?:?\s*~?\s*(\d+(?:\.\d+)?)\s*%/i);
  const noteBlock = blocksWithClass(trailHtml, ["p", "div"], "donor-note")[0];
  return {
    cycleWindow,
    totalRaised: total ? parseMoney(total[1]) : null,
    cashOnHand: cash ? parseMoney(cash[1]) : null,
    cashOnHandAsOf: cash && cash[2] ? parseDateLoose(cash[2]) : null,
    pacSharePct: pac ? parseFloat(pac[1]) : null,
    note: noteBlock ? stripTags(noteBlock.inner) : null,
    dataStatus: /\bproxy\b/i.test(text)
      ? "proxy"
      : /\bpending\b/i.test(text)
        ? "pending"
        : "complete",
    sectors: parseDonorSectors(trailHtml),
  };
}

function parseFinanceMetrics(blockHtml: string): ParsedFinanceMetric[] {
  const out: ParsedFinanceMetric[] = [];
  for (const table of findTagBlocks(blockHtml, "table")) {
    if (!/FEC\s+Metric/i.test(stripTags(table.inner.slice(0, 400)))) continue;
    for (const row of findTagBlocks(table.inner, "tr")) {
      if (/<th[\s>]/i.test(row.outer)) continue;
      const cells = findTagBlocks(row.inner, "td");
      if (cells.length < 2) continue;
      const label = stripTags(cells[0].inner);
      if (!label) continue;
      const asOf = label.match(/as of ([^)]+)\)/i);
      out.push({
        metricLabelRaw: label,
        amount: parseMoney(stripTags(cells[1].inner).replace(/^\$/, "")),
        asOfDate: asOf ? parseDateLoose(asOf[1]) : null,
      });
    }
  }
  return out;
}

/** Structured issue-PAC facts lifted from the donor-note prose when cleanly
 *  extractable (doc §3.8). The prose itself always stays on the trail note. */
export function parseIssuePacs(
  text: string,
  cycleWindow: string | null,
): ParsedIssuePac[] {
  const out = new Map<string, ParsedIssuePac>();
  const add = (p: ParsedIssuePac) => {
    const key = `${p.pacName}|${p.windowType}|${p.cycleWindow ?? ""}`;
    if (!out.has(key)) out.set(key, p);
  };
  const aipac = text.match(/AIPAC[^.;]*?\$\s*(\d[\d,]*(?:\.\d+)?\s*[MK]?)\b/i);
  if (aipac) {
    const career = /career/i.test(aipac[0]);
    add({
      pacName: "AIPAC",
      pacCategory: "pro_israel",
      amount: parseMoney(aipac[1]),
      windowType: career ? "career" : "cycle",
      cycleWindow: career ? null : cycleWindow,
      confirmed: true,
      note: aipac[0].trim(),
    });
  }
  const fairshake = text.match(
    /Fairshake[^.;]*?\$\s*(\d[\d,]*(?:\.\d+)?\s*[MK]?)\b/i,
  );
  if (fairshake && !/^no\b/i.test(fairshake[0])) {
    add({
      pacName: "Fairshake",
      pacCategory: "crypto",
      amount: parseMoney(fairshake[1]),
      windowType: "cycle",
      cycleWindow,
      confirmed: true,
      note: fairshake[0].trim(),
    });
  }
  const negative = text.match(
    /\bNo\b[^.;]*?(Fairshake|AIPAC|crypto)[^.;]*?\bconfirmed\b[^.;]*/i,
  );
  if (negative) {
    const term = negative[1].toLowerCase();
    const yearM = negative[0].match(/\b20\d{2}\b/);
    add({
      pacName: term === "crypto" ? "Fairshake" : negative[1],
      pacCategory: term === "aipac" ? "pro_israel" : "crypto",
      amount: null,
      windowType: "cycle",
      cycleWindow: yearM ? yearM[0] : cycleWindow,
      confirmed: false,
      note: negative[0].trim(),
    });
  }
  return [...out.values()];
}

const MEMBER_BLOCK_CLASS_RE =
  /(^|\s)(member-card|member|candidate-card|member-panel)(\s|$)/;

function parseMemberCard(
  blockHtml: string,
  state: string,
  racePending: boolean,
): ParsedCandidate {
  const heading =
    findTagBlocks(blockHtml, "h3")[0] ?? findTagBlocks(blockHtml, "h4")[0];
  const canName = heading ? stripTags(heading.inner) : "Unknown";
  const text = stripTags(blockHtml);
  const partyM =
    canName.match(/[([]\s*([RDI])\b/) ?? text.match(/\(\s*([RDI])\s*[,)–-]/);
  const chips = extractChips(blockHtml);
  const partyChip = chips.find((c) => c.kind === "party");
  const party = partyM
    ? partyM[1]
    : partyChip
      ? partyChip.text[0].toUpperCase()
      : null;

  const nextElection = text.match(/next election:?\s*(2028|2030)\b/i);
  const recordType: ParsedCandidate["recordType"] =
    nextElection || /not on the 2026 ballot/i.test(text)
      ? "current_member_not_on_ballot"
      : "ballot_2026";

  const incumbentStatus =
    recordType === "current_member_not_on_ballot"
      ? "current_not_on_ballot"
      : /appointed/i.test(text)
        ? "incumbent_appointed"
        : /primary challenger/i.test(text)
          ? "primary_challenger"
          : /open[\s-]seat nominee/i.test(text)
            ? "open_seat_nominee"
            : /retiring/i.test(text)
              ? "retiring"
              : /\bincumbent\b/i.test(text)
                ? "incumbent"
                : /\bchallenger\b/i.test(text)
                  ? "challenger"
                  : null;

  const primaryPct = text.match(
    /(?:won (?:the )?primary with|Primary result:?)\s*(\d+(?:\.\d+)?)\s*%/i,
  );
  const bio = blocksWithClass(blockHtml, ["p", "div"], "bio")[0];
  const donorTrail = parseDonorTrail(blockHtml);
  const pacSource = `${donorTrail?.note ?? ""} ${text}`;
  return {
    canName,
    party,
    state,
    recordType,
    incumbentStatus,
    nextElectionYear: nextElection ? parseInt(nextElection[1], 10) : null,
    primaryResultPct: primaryPct ? parseFloat(primaryPct[1]) : null,
    narrativeSummary: bio ? stripTags(bio.inner) : null,
    dataStatus: racePending
      ? "profile_pending"
      : /profile pending/i.test(text)
        ? "profile_pending"
        : /\bproxy\b/i.test(text)
          ? "proxy"
          : /data pending/i.test(text)
            ? "pending"
            : "complete",
    keyVotes: parseKeyVotes(blockHtml),
    donorTrail,
    financeMetrics: parseFinanceMetrics(blockHtml),
    issuePacs: donorTrail
      ? parseIssuePacs(pacSource, donorTrail.cycleWindow)
      : [],
    annotations: parseAnnotations(blockHtml),
    citations: parseCitations(blockHtml),
  };
}

function detectRaceStatus(fullText: string, html: string): string {
  if (
    /\bpending-profile\b/.test(html) ||
    /profile (?:is )?(?:in development|pending)/i.test(fullText) ||
    /profiles? in development/i.test(fullText)
  ) {
    return "pending_profile";
  }
  if (/special election/i.test(fullText)) return "special_election";
  if (/\brunoff\b/i.test(fullText)) return "runoff";
  if (/open seat/i.test(fullText)) return "open_seat";
  return "general";
}

function parsePrimaryResults(
  html: string,
): { name: string; party: string | null; pct: number }[] | null {
  const table = blocksWithClass(html, ["table"], "primary-results")[0];
  if (!table) return null;
  const rows: { name: string; party: string | null; pct: number }[] = [];
  for (const row of findTagBlocks(table.inner, "tr")) {
    if (/<th[\s>]/i.test(row.outer)) continue;
    const cells = findTagBlocks(row.inner, "td").map((c) => stripTags(c.inner));
    if (cells.length < 2) continue;
    const pct = parseFloat(cells[cells.length - 1].replace("%", ""));
    if (!Number.isFinite(pct)) continue;
    rows.push({
      name: cells[0],
      party: cells.length > 2 ? cells[1] || null : null,
      pct,
    });
  }
  return rows.length ? rows : null;
}

function parseOverallStateRating(
  html: string,
  fullText: string,
): string | null {
  const block = blocksWithClass(html, ["div", "span", "p"], "state-rating")[0];
  if (block) return stripTags(block.inner) || null;
  // Pending-profile headers are pipe-delimited:
  // "Delaware — 1 seat | Safe Democrat | Harris +13 (2024)"
  for (const seg of fullText.split("|").map((s) => s.trim())) {
    if (
      /^(?:Safe|Likely|Lean|Toss[\s-]?Up|Solid|Pending)\b/i.test(seg) ||
      /^[DR]\s*(?:--|–|—)\s*20\d{2}$/.test(seg)
    ) {
      return seg;
    }
  }
  return null;
}

export function parseRaceFragment(
  state: string,
  chamber: "house" | "senate",
  district: string | null,
  html: string,
): ParsedRace {
  const memberBlocks = findTagBlocks(html, "div").filter((b) =>
    MEMBER_BLOCK_CLASS_RE.test(classOf(b.attrs)),
  );
  let remainder = html;
  for (const b of memberBlocks) remainder = remainder.replace(b.outer, " ");

  const fullText = stripTags(html);
  const remainderText = stripTags(remainder);
  const raceStatus = detectRaceStatus(fullText, html);
  const pending = raceStatus === "pending_profile";

  const chips = extractChips(remainder);
  const ratingChip = chips.find((c) => c.kind === "rating") ?? null;
  const ratings: ParsedRating[] = parseForecasterRatings(remainderText);
  if (ratingChip) {
    ratings.push({
      rater: "can_own",
      raterType: "can_own",
      rating: normalizeRating(ratingChip.text),
      ratingRaw: ratingChip.text,
    });
  }

  const flagSet = new Set<string>();
  if (chamber === "house") {
    for (const c of chips) {
      const f = FLAG_LABELS[c.text.toLowerCase()];
      if (f) flagSet.add(f);
    }
  }

  const summaryBlock = blocksWithClass(
    html,
    ["div", "p", "h2"],
    "race-summary",
  )[0];
  const retirement = fullText.match(
    /([A-Z][\w.'’-]*(?:\s+[\w.'’-]+){0,3}\s+not seeking re-?election[^.<]*)/,
  );
  const baseline = fullText.match(
    /((?:Harris|Trump|Biden)\s*\+\d+\s*\(\d{4}\)|(?:Harris|Trump|Biden)\s+won by \d+ points?)/i,
  );
  const senateClass =
    chamber === "senate"
      ? (fullText.match(/\bClass\s+(III|II|I)\b/)?.[1] ?? null)
      : null;
  const primaryDate = fullText.match(
    /Primary(?: date)?:\s*([A-Z][a-z]+\.?\s+\d{1,2},?\s+\d{4})/i,
  );
  const electionDate = fullText.match(
    /Election(?: Day| date)?:\s*([A-Z][a-z]+\.?\s+\d{1,2},?\s+\d{4})/i,
  );

  return {
    id: deriveRaceId(state, chamber, district),
    state,
    chamber,
    district,
    senateClass,
    raceSummary: summaryBlock ? stripTags(summaryBlock.inner) : null,
    raceStatus,
    isOpenSeat: /open seat/i.test(fullText),
    canOwnRating: ratingChip ? normalizeRating(ratingChip.text) : null,
    canOwnRatingRaw: ratingChip ? ratingChip.text : null,
    overallStateRating: parseOverallStateRating(html, fullText),
    flags: flagSet.size ? [...flagSet] : null,
    retirementContext: retirement ? retirement[1].trim() : null,
    electoralBaseline: baseline ? baseline[1].trim() : null,
    electionDate: electionDate ? parseDateLoose(electionDate[1]) : null,
    primaryDate: primaryDate ? parseDateLoose(primaryDate[1]) : null,
    primaryResults: parsePrimaryResults(html),
    rawHtml: html,
    ratings,
    candidates: memberBlocks.map((b) =>
      parseMemberCard(b.inner, state, pending),
    ),
    annotations: parseAnnotations(remainder),
    citations: parseCitations(remainder),
  };
}

/** One CARDS[state] fragment → one race (senate) or N district races (house;
 *  district sub-sections carry data-district, else at-large "00"). */
export function parseStateCard(
  state: string,
  cardHtml: string,
  chamber: "house" | "senate",
): ParsedRace[] {
  if (chamber === "house") {
    const sections = findTagBlocks(cardHtml, "section").filter((b) =>
      attrOf(b.attrs, "data-district"),
    );
    if (sections.length) {
      return sections.map((s) =>
        parseRaceFragment(
          state,
          "house",
          (attrOf(s.attrs, "data-district") ?? "0").padStart(2, "0"),
          s.outer,
        ),
      );
    }
    return [parseRaceFragment(state, "house", "00", cardHtml)];
  }
  return [parseRaceFragment(state, "senate", null, cardHtml)];
}

// ---------------------------------------------------------------------------
// Full payload parse + drift gate
// ---------------------------------------------------------------------------

export function extractContentUpdatedLabel(decoded: string): string | null {
  const m = decoded.match(/Updated\s+[A-Z][a-z]+\.?\s+\d{1,2},?\s+\d{4}/);
  return m ? m[0] : null;
}

export function extractTemplateVersion(decoded: string): string | null {
  const t = decoded.match(/"template"\s*:\s*"([^"]+)"/);
  if (!t) return decoded.includes("aigenerated") ? "aigenerated" : null;
  const v = decoded.match(
    /"(?:templateVersion|template_version|builderVersion)"\s*:\s*"?v?(\d+)"?/,
  );
  return v ? `${t[1]} v${v[1]}` : t[1];
}

/** Parse the decoded payload. Throws Can2026DriftError on hard drift
 *  (datasets !== 2, BILLS missing) so the caller aborts BEFORE row writes —
 *  the snapshot row must already exist by then. */
export function parsePayload(decoded: string): ParsedPayload {
  const { datasets, datasetCount } = splitCardsDatasets(decoded);
  if (datasetCount !== DRIFT_EXPECTATIONS.datasets) {
    throw new Can2026DriftError(
      `expected ${DRIFT_EXPECTATIONS.datasets} \`var CARDS\` datasets (Senate + House), found ${datasetCount} — upstream template rebuilt? Re-run the exhaustive field parse (doc §7) before trusting this ingester.`,
    );
  }
  const billsParsed = parseBills(decoded);
  if (billsParsed === null) {
    throw new Can2026DriftError(
      "`var BILLS` dictionary missing from payload — upstream template rebuilt? (doc §7)",
    );
  }
  const btnColors = parseBtnColors(decoded);

  const races: ParsedRace[] = [];
  for (const ds of datasets) {
    for (const [state, cardHtml] of ds.cards) {
      races.push(...parseStateCard(state, cardHtml, ds.chamber));
    }
  }

  const allCandidates = races.flatMap((r) => r.candidates);
  const trails = allCandidates
    .map((c) => c.donorTrail)
    .filter((t): t is ParsedDonorTrail => t !== null);
  const stats: ParsedPayload["stats"] = {
    senateRaces: races.filter((r) => r.chamber === "senate").length,
    houseRaces: races.filter((r) => r.chamber === "house").length,
    pendingProfiles: races.filter((r) => r.raceStatus === "pending_profile")
      .length,
    candidates: allCandidates.length,
    keyVotes: allCandidates.reduce((n, c) => n + c.keyVotes.length, 0),
    ratings: races.reduce((n, r) => n + r.ratings.length, 0),
    donorTrails: trails.length,
    donorSectors: trails.reduce((n, t) => n + t.sectors.length, 0),
    financeMetrics: allCandidates.reduce(
      (n, c) => n + c.financeMetrics.length,
      0,
    ),
    issuePacs: allCandidates.reduce((n, c) => n + c.issuePacs.length, 0),
    billNarratives: billsParsed.length,
    annotations:
      races.reduce((n, r) => n + r.annotations.length, 0) +
      allCandidates.reduce((n, c) => n + c.annotations.length, 0),
    citations:
      races.reduce((n, r) => n + r.citations.length, 0) +
      allCandidates.reduce((n, c) => n + c.citations.length, 0),
  };

  return {
    contentUpdatedLabel: extractContentUpdatedLabel(decoded),
    templateVersion: extractTemplateVersion(decoded),
    btnColors,
    bills: billsParsed,
    races,
    datasetCount,
    stats,
  };
}

/** Soft-drift warnings against the doc §7 May-2026 counts (±20%). */
export function checkSoftDrift(stats: ParsedPayload["stats"]): string[] {
  const warnings: string[] = [];
  const band = (expected: number): [number, number] => [
    Math.round(expected * (1 - DRIFT_EXPECTATIONS.tolerancePct / 100)),
    Math.round(expected * (1 + DRIFT_EXPECTATIONS.tolerancePct / 100)),
  ];
  const checks: [string, number, number][] = [
    ["key votes", stats.keyVotes, DRIFT_EXPECTATIONS.keyVotes],
    ["donor trails", stats.donorTrails, DRIFT_EXPECTATIONS.donorTrails],
    ["race ratings", stats.ratings, DRIFT_EXPECTATIONS.ratings],
  ];
  for (const [label, actual, expected] of checks) {
    const [lo, hi] = band(expected);
    if (actual < lo || actual > hi) {
      warnings.push(
        `${label} count ${actual} outside expected ${expected} ±${DRIFT_EXPECTATIONS.tolerancePct}% [${lo}–${hi}]`,
      );
    }
  }
  return warnings;
}

// ---------------------------------------------------------------------------
// Crosswalk (exact-only; NEVER auto-merge fuzzy matches)
// ---------------------------------------------------------------------------

export type OurCandidate = {
  id: string;
  fullName: string;
  state: string | null;
  office: string | null;
  jurisdiction?: string | null;
};

/** CAN prints "Tom Cotton (R-AR)" / "Sen. Tom Cotton [R-AR]"; reduce to a
 *  lowercase bare name via the shared cleanCandidateName. */
export function normalizeNameForMatch(name: string): string {
  const stripped = name.replace(/\s*\(\s*[RDI](?:\b[^)]*)?\)\s*$/i, "");
  return cleanCandidateName(stripped).toLowerCase();
}

export function buildOurCandidateIndex(
  rows: OurCandidate[],
): Map<string, OurCandidate[]> {
  const index = new Map<string, OurCandidate[]>();
  for (const row of rows) {
    const name = cleanCandidateName(row.fullName).toLowerCase();
    const state = row.state ?? stateFromCandidateName(row.fullName);
    const office =
      row.office ??
      (row.jurisdiction === "federal-senate"
        ? "senate"
        : row.jurisdiction === "federal-house"
          ? "house"
          : null);
    if (!name || !state || !office) continue;
    const key = `${name}|${state}|${office}`;
    const list = index.get(key);
    if (list) list.push(row);
    else index.set(key, [row]);
  }
  return index;
}

export type CrosswalkResult = {
  ourCandidateId: string | null;
  matchMethod: "exact_name_jurisdiction" | "unmatched";
  matchConfidence: string | null;
  reviewLog: string | null;
};

export function crosswalkCandidate(
  can: { canName: string; state: string; office: "house" | "senate" },
  index: Map<string, OurCandidate[]>,
): CrosswalkResult {
  const name = normalizeNameForMatch(can.canName);
  const key = `${name}|${can.state}|${can.office}`;
  const matches = index.get(key) ?? [];
  if (matches.length === 1) {
    return {
      ourCandidateId: matches[0].id,
      matchMethod: "exact_name_jurisdiction",
      matchConfidence: "1.000",
      reviewLog: null,
    };
  }
  return {
    ourCandidateId: null,
    matchMethod: "unmatched",
    matchConfidence: null,
    reviewLog:
      matches.length > 1
        ? `AMBIGUOUS "${can.canName}" (${can.state}, ${can.office}) → ${matches
            .map((m) => m.id)
            .join(", ")} — left unmatched, review manually`
        : `UNMATCHED "${can.canName}" (${can.state}, ${can.office}) — no exact name+jurisdiction match`,
  };
}

/** "Inflation Reduction Act (H.R. 5376)" → "hr5376"; "S. 2073" → "s2073". */
export function extractBillNumber(label: string): string | null {
  const m = label.match(
    /\b(H\.?\s*J\.?\s*Res\.?|S\.?\s*J\.?\s*Res\.?|H\.?\s*Con\.?\s*Res\.?|S\.?\s*Con\.?\s*Res\.?|H\.?\s*Res\.?|S\.?\s*Res\.?|H\.?\s*R\.?|S\.?)\s*(\d+)\b/i,
  );
  if (!m) return null;
  return `${m[1].replace(/[.\s]/g, "").toLowerCase()}${m[2]}`;
}

export function buildOurBillIndex(
  rows: { id: string; title: string }[],
): Map<string, string[]> {
  const index = new Map<string, string[]>();
  for (const row of rows) {
    const fromId = row.id.match(
      /(?:^|-)(hr|hjres|hres|hconres|s|sjres|sres|sconres)(\d+)-\d+$/i,
    );
    const norm = fromId
      ? `${fromId[1].toLowerCase()}${fromId[2]}`
      : extractBillNumber(row.title);
    if (!norm) continue;
    const list = index.get(norm);
    if (list) list.push(row.id);
    else index.set(norm, [row.id]);
  }
  return index;
}

export function crosswalkBill(
  titleOrLabel: string,
  index: Map<string, string[]>,
): { ourBillId: string | null; matchMethod: "exact" | "unmatched" } {
  const norm = extractBillNumber(titleOrLabel);
  const matches = norm ? (index.get(norm) ?? []) : [];
  if (matches.length === 1) {
    return { ourBillId: matches[0], matchMethod: "exact" };
  }
  return { ourBillId: null, matchMethod: "unmatched" };
}

// ---------------------------------------------------------------------------
// DB phases
// ---------------------------------------------------------------------------

async function loadOurCandidates(db: DbClient): Promise<OurCandidate[]> {
  return await db
    .select({
      id: candidates.id,
      fullName: candidates.fullName,
      state: candidates.state,
      office: candidates.office,
      jurisdiction: candidates.jurisdiction,
    })
    .from(candidates)
    .where(
      sql`${candidates.office} IN ('house','senate') OR ${candidates.jurisdiction} IN ('federal-house','federal-senate')`,
    );
}

async function loadOurFederalBills(
  db: DbClient,
): Promise<{ id: string; title: string }[]> {
  return await db
    .select({ id: bills.id, title: bills.title })
    .from(bills)
    .where(
      sql`${bills.source} = 'govtrack' OR ${bills.jurisdiction} ILIKE 'federal%'`,
    );
}

/** Snapshot retention: keep raw_payload_gzip on the latest KEEP_RUNS runs. */
async function pruneIngestRuns(db: DbClient): Promise<number> {
  const runs = await db
    .select({ id: canIngestRuns.id })
    .from(canIngestRuns)
    .orderBy(desc(canIngestRuns.fetchedAt));
  const stale = runs.slice(KEEP_RUNS).map((r) => r.id);
  if (stale.length) {
    await db
      .update(canIngestRuns)
      .set({ rawPayloadGzip: null })
      .where(inArray(canIngestRuns.id, stale));
  }
  return stale.length;
}

/** Snapshot-scoped replace: delete this snapshot_date's rows (child→parent)
 *  so a re-run of the same snapshot is idempotent. Older snapshots stay (the
 *  rating time-series). can_races upserts by deterministic id instead. */
async function deleteSnapshotRows(db: DbClient, snap: string): Promise<void> {
  await db.delete(canCitations).where(eq(canCitations.snapshotDate, snap));
  await db.delete(canAnnotations).where(eq(canAnnotations.snapshotDate, snap));
  await db
    .delete(canCandidateKeyVotes)
    .where(eq(canCandidateKeyVotes.snapshotDate, snap));
  await db
    .delete(canFinanceMetrics)
    .where(eq(canFinanceMetrics.snapshotDate, snap));
  await db
    .delete(canIssuePacContributions)
    .where(eq(canIssuePacContributions.snapshotDate, snap));
  await db
    .delete(canDonorSectors)
    .where(
      inArray(
        canDonorSectors.donorTrailId,
        db
          .select({ id: canDonorTrails.id })
          .from(canDonorTrails)
          .where(eq(canDonorTrails.snapshotDate, snap)),
      ),
    );
  await db.delete(canDonorTrails).where(eq(canDonorTrails.snapshotDate, snap));
  await db
    .delete(canBillNarratives)
    .where(eq(canBillNarratives.snapshotDate, snap));
  await db.delete(canCandidates).where(eq(canCandidates.snapshotDate, snap));
  await db.delete(canRaceRatings).where(eq(canRaceRatings.snapshotDate, snap));
}

const money = (n: number | null): string | null =>
  n === null ? null : n.toFixed(2);

type IngestCounts = {
  datasets: number;
  races: number;
  ratings: number;
  candidates: number;
  keyVotes: number;
  donorTrails: number;
  donorSectors: number;
  financeMetrics: number;
  issuePacs: number;
  billNarratives: number;
  annotations: number;
  citations: number;
  candidatesMatched: number;
  candidatesUnmatched: number;
  billsMatched: number;
  billsUnmatched: number;
  votesLinked: number;
  prunedSnapshots: number;
};

// eslint-disable-next-line complexity
async function writeParsedRows(
  db: DbClient,
  parsed: ParsedPayload,
  ctx: { snapshotDate: string; sourceUrl: string },
  counts: IngestCounts,
): Promise<void> {
  const { snapshotDate, sourceUrl } = ctx;

  // Crosswalk inputs
  const ourCandIndex = buildOurCandidateIndex(await loadOurCandidates(db));
  const ourBillIndex = buildOurBillIndex(await loadOurFederalBills(db));

  await deleteSnapshotRows(db, snapshotDate);

  // --- can_races (upsert by deterministic id) ------------------------------
  const raceRows = parsed.races.map((r) => ({
    id: r.id,
    state: r.state,
    chamber: r.chamber,
    district: r.district,
    senateClass: r.senateClass,
    raceSummary: r.raceSummary,
    raceStatus: r.raceStatus,
    isOpenSeat: r.isOpenSeat,
    canOwnRating: r.canOwnRating,
    canOwnRatingRaw: r.canOwnRatingRaw,
    overallStateRating: r.overallStateRating,
    flags: r.flags,
    retirementContext: r.retirementContext,
    electoralBaseline: r.electoralBaseline,
    electionDate: r.electionDate,
    primaryDate: r.primaryDate,
    primaryResults: r.primaryResults,
    buttonColorHex: parsed.btnColors[r.state] ?? null,
    snapshotDate,
    sourceUrl,
    rawHtml: r.rawHtml,
  }));
  for (let i = 0; i < raceRows.length; i += 20) {
    await db
      .insert(canRaces)
      .values(raceRows.slice(i, i + 20))
      .onConflictDoUpdate({
        target: canRaces.id,
        set: {
          state: sql`excluded.state`,
          chamber: sql`excluded.chamber`,
          district: sql`excluded.district`,
          senateClass: sql`excluded.senate_class`,
          raceSummary: sql`excluded.race_summary`,
          raceStatus: sql`excluded.race_status`,
          isOpenSeat: sql`excluded.is_open_seat`,
          canOwnRating: sql`excluded.can_own_rating`,
          canOwnRatingRaw: sql`excluded.can_own_rating_raw`,
          overallStateRating: sql`excluded.overall_state_rating`,
          flags: sql`excluded.flags`,
          retirementContext: sql`excluded.retirement_context`,
          electoralBaseline: sql`excluded.electoral_baseline`,
          electionDate: sql`excluded.election_date`,
          primaryDate: sql`excluded.primary_date`,
          primaryResults: sql`excluded.primary_results`,
          buttonColorHex: sql`excluded.button_color_hex`,
          snapshotDate: sql`excluded.snapshot_date`,
          sourceUrl: sql`excluded.source_url`,
          rawHtml: sql`excluded.raw_html`,
        },
      });
  }
  counts.races = raceRows.length;

  // --- can_bill_narratives (+ bill crosswalk) ------------------------------
  const narrativeIdByKey = new Map<string, string>();
  const narrativeRows = parsed.bills.map((b) => {
    const id = randomUUID();
    narrativeIdByKey.set(b.canKey, id);
    const xwalk = crosswalkBill(b.title, ourBillIndex);
    if (xwalk.ourBillId) counts.billsMatched += 1;
    else {
      counts.billsUnmatched += 1;
      console.log(
        `[can2026] bill crosswalk UNMATCHED: "${b.title}" (key=${b.canKey})`,
      );
    }
    return {
      id,
      canKey: b.canKey,
      title: b.title,
      billType: b.billType,
      narrative: b.narrative,
      proceduralNote: b.proceduralNote,
      ourBillId: xwalk.ourBillId,
      matchMethod: xwalk.matchMethod,
      snapshotDate,
      sourceUrl,
    };
  });
  if (narrativeRows.length)
    await db.insert(canBillNarratives).values(narrativeRows);
  counts.billNarratives = narrativeRows.length;

  // --- per-race children ----------------------------------------------------
  type AnyRow = Record<string, unknown>;
  const ratingRows: AnyRow[] = [];
  const candidateRows: AnyRow[] = [];
  const trailRows: AnyRow[] = [];
  const sectorRows: AnyRow[] = [];
  const metricRows: AnyRow[] = [];
  const pacRows: AnyRow[] = [];
  const keyVoteRows: AnyRow[] = [];
  const annotationRows: AnyRow[] = [];
  const citationRows: AnyRow[] = [];
  const pendingVoteLinks: {
    rowIndex: number;
    ourCandidateId: string;
    ourBillId: string;
  }[] = [];

  for (const race of parsed.races) {
    const seenRaters = new Set<string>();
    for (const rating of race.ratings) {
      if (seenRaters.has(rating.rater)) continue;
      seenRaters.add(rating.rater);
      ratingRows.push({
        raceId: race.id,
        rater: rating.rater,
        raterType: rating.raterType,
        rating: rating.rating,
        ratingRaw: rating.ratingRaw,
        snapshotDate,
        sourceUrl,
      });
    }
    for (const ann of race.annotations) {
      annotationRows.push({
        entityType: "race",
        entityId: race.id,
        annotationType: ann.annotationType,
        body: ann.body,
        disclaimer: ann.disclaimer,
        snapshotDate,
        sourceUrl,
      });
    }
    for (const cit of race.citations) {
      citationRows.push({
        entityType: "race",
        entityId: race.id,
        sourceOrg: cit.sourceOrg,
        fecCommitteeId: cit.fecCommitteeId,
        citationUrl: cit.citationUrl,
        citationDate: cit.citationDate,
        rawText: cit.rawText,
        snapshotDate,
      });
    }

    for (const cand of race.candidates) {
      const candId = randomUUID();
      const xwalk = crosswalkCandidate(
        { canName: cand.canName, state: cand.state, office: race.chamber },
        ourCandIndex,
      );
      if (xwalk.reviewLog) {
        counts.candidatesUnmatched += 1;
        console.log(`[can2026] crosswalk ${xwalk.reviewLog}`);
      } else {
        counts.candidatesMatched += 1;
      }
      candidateRows.push({
        id: candId,
        // Sitting members not on the 2026 ballot are tied to the state, not
        // the race (doc §3.4).
        raceId:
          cand.recordType === "current_member_not_on_ballot" ? null : race.id,
        recordType: cand.recordType,
        canName: cand.canName,
        party: cand.party,
        state: cand.state,
        incumbentStatus: cand.incumbentStatus,
        nextElectionYear: cand.nextElectionYear,
        primaryResultPct:
          cand.primaryResultPct === null
            ? null
            : cand.primaryResultPct.toFixed(2),
        narrativeSummary: cand.narrativeSummary,
        dataStatus: cand.dataStatus,
        ourCandidateId: xwalk.ourCandidateId,
        matchMethod: xwalk.matchMethod,
        matchConfidence: xwalk.matchConfidence,
        snapshotDate,
        sourceUrl,
      });

      if (cand.donorTrail) {
        const trailId = randomUUID();
        const t = cand.donorTrail;
        trailRows.push({
          id: trailId,
          canCandidateId: candId,
          cycleWindow: t.cycleWindow,
          totalRaised: money(t.totalRaised),
          cashOnHand: money(t.cashOnHand),
          cashOnHandAsOf: t.cashOnHandAsOf,
          pacSharePct: t.pacSharePct === null ? null : t.pacSharePct.toFixed(2),
          note: t.note,
          dataStatus: t.dataStatus,
          snapshotDate,
          sourceUrl,
        });
        t.sectors.forEach((s, i) => {
          sectorRows.push({
            donorTrailId: trailId,
            sectorLabelRaw: s.sectorLabelRaw,
            sectorLabel: s.sectorLabel,
            amount: s.amount.toFixed(2),
            rankInTrail: String(i + 1),
          });
        });
      }
      for (const metric of cand.financeMetrics) {
        metricRows.push({
          canCandidateId: candId,
          metricLabelRaw: metric.metricLabelRaw,
          metricLabel: null,
          amount: money(metric.amount),
          asOfDate: metric.asOfDate,
          snapshotDate,
          sourceUrl,
        });
      }
      for (const pac of cand.issuePacs) {
        pacRows.push({
          canCandidateId: candId,
          pacName: pac.pacName,
          pacCategory: pac.pacCategory,
          amount: money(pac.amount),
          windowType: pac.windowType,
          cycleWindow: pac.cycleWindow,
          confirmed: pac.confirmed,
          note: pac.note,
          snapshotDate,
          sourceUrl,
        });
      }
      for (const kv of cand.keyVotes) {
        const kvId = randomUUID();
        const billXwalk = crosswalkBill(kv.billLabel, ourBillIndex);
        if (xwalk.ourCandidateId && billXwalk.ourBillId) {
          pendingVoteLinks.push({
            rowIndex: keyVoteRows.length,
            ourCandidateId: xwalk.ourCandidateId,
            ourBillId: billXwalk.ourBillId,
          });
        }
        keyVoteRows.push({
          id: kvId,
          canCandidateId: candId,
          billLabel: kv.billLabel,
          dataBillKey: kv.dataBillKey,
          billNarrativeId: kv.dataBillKey
            ? (narrativeIdByKey.get(kv.dataBillKey) ?? null)
            : null,
          voteCast: kv.voteCast,
          voteCastRaw: kv.voteCastRaw,
          voteDateRaw: kv.voteDateRaw,
          voteDate: kv.voteDate,
          context: kv.context,
          proceduralNote: kv.proceduralNote,
          source: kv.source,
          ourVoteId: null as string | null,
          snapshotDate,
          sourceUrl,
        });
        if (kv.source && kv.source !== "--") {
          const cit = buildCitation(kv.source);
          if (cit) {
            citationRows.push({
              entityType: "key_vote",
              entityId: kvId,
              sourceOrg: cit.sourceOrg,
              fecCommitteeId: cit.fecCommitteeId,
              citationUrl: cit.citationUrl,
              citationDate: cit.citationDate,
              rawText: cit.rawText,
              snapshotDate,
            });
          }
        }
      }
      for (const ann of cand.annotations) {
        annotationRows.push({
          entityType: "candidate",
          entityId: candId,
          annotationType: ann.annotationType,
          body: ann.body,
          disclaimer: ann.disclaimer,
          snapshotDate,
          sourceUrl,
        });
      }
      for (const cit of cand.citations) {
        citationRows.push({
          entityType: "candidate",
          entityId: candId,
          sourceOrg: cit.sourceOrg,
          fecCommitteeId: cit.fecCommitteeId,
          citationUrl: cit.citationUrl,
          citationDate: cit.citationDate,
          rawText: cit.rawText,
          snapshotDate,
        });
      }
    }
  }

  // --- our_vote_id linkage: only when BOTH ends crosswalked exactly --------
  if (pendingVoteLinks.length) {
    const candIds = [...new Set(pendingVoteLinks.map((l) => l.ourCandidateId))];
    const voteRows = await db
      .select({
        id: votes.id,
        billId: votes.billId,
        candidateId: votes.candidateId,
      })
      .from(votes)
      .where(inArray(votes.candidateId, candIds));
    const voteByPair = new Map(
      voteRows.map((v) => [`${v.billId}|${v.candidateId}`, v.id]),
    );
    for (const link of pendingVoteLinks) {
      const voteId = voteByPair.get(`${link.ourBillId}|${link.ourCandidateId}`);
      if (voteId) {
        keyVoteRows[link.rowIndex].ourVoteId = voteId;
        counts.votesLinked += 1;
      }
    }
  }

  const insertChunked = async (
    table:
      | typeof canRaceRatings
      | typeof canCandidates
      | typeof canDonorTrails
      | typeof canDonorSectors
      | typeof canFinanceMetrics
      | typeof canIssuePacContributions
      | typeof canCandidateKeyVotes
      | typeof canAnnotations
      | typeof canCitations,
    rows: AnyRow[],
    chunk = 100,
  ) => {
    for (let i = 0; i < rows.length; i += chunk) {
      await db.insert(table).values(rows.slice(i, i + chunk) as never);
    }
  };

  await insertChunked(canRaceRatings, ratingRows);
  await insertChunked(canCandidates, candidateRows);
  await insertChunked(canDonorTrails, trailRows);
  await insertChunked(canDonorSectors, sectorRows);
  await insertChunked(canFinanceMetrics, metricRows);
  await insertChunked(canIssuePacContributions, pacRows);
  await insertChunked(canCandidateKeyVotes, keyVoteRows);
  await insertChunked(canAnnotations, annotationRows);
  await insertChunked(canCitations, citationRows);

  counts.ratings = ratingRows.length;
  counts.candidates = candidateRows.length;
  counts.donorTrails = trailRows.length;
  counts.donorSectors = sectorRows.length;
  counts.financeMetrics = metricRows.length;
  counts.issuePacs = pacRows.length;
  counts.keyVotes = keyVoteRows.length;
  counts.annotations = annotationRows.length;
  counts.citations = citationRows.length;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function loadSourceHtml(
  config: Can2026Config,
  fetcher: Fetcher,
): Promise<string> {
  if (config.filePath) {
    console.log(`[can2026] reading local file ${config.filePath}`);
    return readFileSync(resolve(config.filePath), "utf8");
  }
  console.log(`[can2026] fetching ${config.sourceUrl}`);
  const res = await fetcher(config.sourceUrl, {
    headers: { "user-agent": "voter-choice-ingest/1.0 (can2026 enrichment)" },
  });
  if (!res.ok) {
    throw new Error(`fetch ${config.sourceUrl} → HTTP ${res.status}`);
  }
  return await res.text();
}

export async function ingestCan2026({
  db = null,
  fetcher = fetch,
  env = process.env,
  argv = process.argv,
}: {
  db?: DbClient | null;
  fetcher?: Fetcher;
  env?: NodeJS.ProcessEnv;
  argv?: string[];
} = {}): Promise<IngestCounts> {
  const config = resolveConfig(env, argv);
  console.log(
    `[can2026] starting dryRun=${config.dryRun} source=${config.filePath ?? config.sourceUrl}`,
  );
  if (!db) {
    if (env.DATABASE_URL) db = requireDb();
    else if (!config.dryRun) db = requireDb(); // throws DatabaseNotConfiguredError
  }

  const counts: IngestCounts = {
    datasets: 0,
    races: 0,
    ratings: 0,
    candidates: 0,
    keyVotes: 0,
    donorTrails: 0,
    donorSectors: 0,
    financeMetrics: 0,
    issuePacs: 0,
    billNarratives: 0,
    annotations: 0,
    citations: 0,
    candidatesMatched: 0,
    candidatesUnmatched: 0,
    billsMatched: 0,
    billsUnmatched: 0,
    votesLinked: 0,
    prunedSnapshots: 0,
  };

  const html = await loadSourceHtml(config, fetcher);
  const decoded = extractLargestProps(html);
  console.log(`[can2026] decoded props payload: ${decoded.length} chars`);

  // ---- SNAPSHOT FIRST (before any parsing; doc decision 2026-06-10) -------
  const contentChecksum = sha256Hex(decoded);
  const rawPayloadGzip = gzipBase64(decoded);
  const contentUpdatedLabel = extractContentUpdatedLabel(decoded);
  const snapshotDate =
    parseDateLoose(contentUpdatedLabel?.replace(/^Updated\s+/, "") ?? null) ??
    new Date().toISOString().slice(0, 10);
  const templateVersion = extractTemplateVersion(decoded);
  console.log(
    `[can2026] snapshot date=${snapshotDate} label=${contentUpdatedLabel ?? "n/a"} checksum=${contentChecksum.slice(0, 12)}… gzip=${rawPayloadGzip.length}b64`,
  );

  let runId: string | null = null;
  if (!config.dryRun && db) {
    runId = randomUUID();
    await db.insert(canIngestRuns).values({
      id: runId,
      sourceUrl: config.filePath
        ? `${config.sourceUrl} (local file: ${config.filePath})`
        : config.sourceUrl,
      contentUpdatedLabel,
      snapshotDate,
      templateVersion,
      contentChecksum,
      rawPayloadGzip,
    });
    counts.prunedSnapshots = await pruneIngestRuns(db);
    console.log(
      `[can2026] snapshot row ${runId} created; pruned ${counts.prunedSnapshots} old payload(s)`,
    );
  } else {
    console.log("[can2026] DRY RUN — snapshot row not written");
  }

  // ---- Parse (hard drift aborts here; snapshot row already persisted) -----
  let parsed: ParsedPayload;
  try {
    parsed = parsePayload(decoded);
  } catch (err) {
    if (runId && db) {
      await db
        .update(canIngestRuns)
        .set({ notes: `parse failed: ${String(err)}` })
        .where(eq(canIngestRuns.id, runId));
    }
    throw err;
  }
  counts.datasets = parsed.datasetCount;

  for (const warning of checkSoftDrift(parsed.stats)) {
    console.warn(`[can2026] WARN drift: ${warning}`);
  }

  const sourceUrl = config.sourceUrl;
  if (!config.dryRun && db) {
    await writeParsedRows(db, parsed, { snapshotDate, sourceUrl }, counts);
    if (runId) {
      await db
        .update(canIngestRuns)
        .set({ rowsParsed: { ...parsed.stats, ...counts } })
        .where(eq(canIngestRuns.id, runId));
    }
  } else {
    Object.assign(counts, {
      races: parsed.races.length,
      ratings: parsed.stats.ratings,
      candidates: parsed.stats.candidates,
      keyVotes: parsed.stats.keyVotes,
      donorTrails: parsed.stats.donorTrails,
      donorSectors: parsed.stats.donorSectors,
      financeMetrics: parsed.stats.financeMetrics,
      issuePacs: parsed.stats.issuePacs,
      billNarratives: parsed.stats.billNarratives,
      annotations: parsed.stats.annotations,
      citations: parsed.stats.citations,
    });
  }

  console.log(
    `[can2026] done datasets=${counts.datasets} races=${counts.races} ` +
      `(senate=${parsed.stats.senateRaces} house=${parsed.stats.houseRaces} pending=${parsed.stats.pendingProfiles}) ` +
      `candidates=${counts.candidates} keyVotes=${counts.keyVotes} ratings=${counts.ratings} ` +
      `donorTrails=${counts.donorTrails} sectors=${counts.donorSectors} financeMetrics=${counts.financeMetrics} ` +
      `issuePacs=${counts.issuePacs} bills=${counts.billNarratives} annotations=${counts.annotations} ` +
      `citations=${counts.citations} | crosswalk matched=${counts.candidatesMatched} ` +
      `unmatched=${counts.candidatesUnmatched} billsMatched=${counts.billsMatched} votesLinked=${counts.votesLinked}` +
      (config.dryRun ? " (DRY RUN — no writes)" : ""),
  );
  return counts;
}

const isMain =
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isMain) {
  ingestCan2026().catch((err) => {
    console.error("[can2026] fatal:", err);
    process.exit(1);
  });
}
