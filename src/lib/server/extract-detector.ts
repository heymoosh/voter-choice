/**
 * Detector for the `/api/extract-ballot` two-path pipeline.
 *
 * The cheap path runs pdfjs-dist text extraction first; if the resulting
 * text scores above a confidence floor on three heuristics, we trust it
 * and skip the Sonnet-vision call entirely. Otherwise we escalate to the
 * vision path.
 *
 * Heuristics (decision-design.md §"Detector requirements"):
 *  1. Dictionary ratio  — % of tokens recognized as English OR Spanish
 *     words. Garbled pdfjs output of broken text layers produces tokens
 *     like ")+&'% xz!?" with near-zero dictionary recognition.
 *  2. Ballot vocabulary — count of ballot-specific terms ("Vote for",
 *     "Senator", "Partido", etc.). A real ballot has ≥5; voter-education
 *     PDFs or generic forms do not.
 *  3. Proper-noun shape — count of capitalized 2+ word sequences. A
 *     ballot has 5+ candidates → 5+ proper-noun pairs.
 *
 * The thresholds are tunable at runtime via env vars so future-us can
 * adjust in Vercel without redeploying. Per the decision doc, threshold
 * tuning is a post-launch observability pass.
 */

import type { DetectorScore } from "./extract-types";

const DEFAULT_DICT_FLOOR = 0.6;
const DEFAULT_VOCAB_FLOOR = 5;
const DEFAULT_PROPER_NOUN_FLOOR = 5;

/**
 * Ballot-specific vocabulary that signals an actual ballot is present
 * (vs. voter-education PDFs, polling location flyers, or other civic
 * paperwork). The list is intentionally short — exhaustiveness is a
 * losing game for a fast heuristic. We bias toward office names that
 * appear on virtually every ballot.
 */
const BALLOT_VOCAB = [
  // English structural terms
  "vote for",
  "vote por",
  "ballot",
  "election",
  "primary",
  "general",
  "runoff",
  "write-in",
  "write in",
  "incumbent",
  // English office names — the canonical national set
  "senator",
  "senate",
  "president",
  "representative",
  "governor",
  "lieutenant governor",
  "attorney general",
  "secretary of state",
  "comptroller",
  "treasurer",
  "judge",
  "justice",
  "supreme court",
  "court of appeals",
  "school board",
  "trustee",
  "commissioner",
  "sheriff",
  "constable",
  "mayor",
  "alderman",
  "county judge",
  "district attorney",
  "county",
  "state",
  "federal",
  "ward",
  "precinct",
  "district",
  // Party context that virtually always appears
  "democratic",
  "republican",
  "democrat",
  "democratic primary",
  "republican primary",
  // Spanish (for bilingual ballots — TX Hidalgo, NJ counties, etc.)
  "partido",
  "demócrata",
  "republicano",
  "elección",
  "elecciones",
  "boleta",
  "boleta de muestra",
  "senador",
  "presidente",
  "gobernador",
  "representante",
  "juez",
  "junta",
  // Placeholder text from NJ-shape primaries
  "no petition filed",
];

/**
 * A small fixed dictionary used for the "% of tokens recognized" score.
 * We don't need a real English dictionary — just enough common words
 * that genuine extracted text scores well above garbled OCR salad. The
 * list is biased toward function words (the/and/of) which appear in
 * any English text, plus ballot-specific terms so real ballots score
 * even higher.
 *
 * If you're tempted to add more words: don't. The threshold is
 * deliberately permissive (0.6) so we don't need a comprehensive
 * dictionary — just a sanity check that we're looking at language,
 * not symbol soup.
 */
const DICTIONARY = new Set<string>(
  [
    // English function words
    "the",
    "and",
    "of",
    "to",
    "a",
    "in",
    "for",
    "is",
    "on",
    "that",
    "by",
    "this",
    "with",
    "i",
    "you",
    "it",
    "not",
    "or",
    "be",
    "are",
    "from",
    "at",
    "as",
    "your",
    "all",
    "have",
    "new",
    "more",
    "an",
    "was",
    "we",
    "will",
    "home",
    "can",
    "us",
    "about",
    "if",
    "page",
    "my",
    "has",
    "search",
    "free",
    "but",
    "our",
    "one",
    "other",
    "do",
    "no",
    "information",
    "time",
    "they",
    "site",
    "he",
    "up",
    "may",
    "what",
    "which",
    "their",
    "news",
    "out",
    "use",
    "any",
    "there",
    "see",
    "only",
    "so",
    "his",
    "when",
    "contact",
    "here",
    "business",
    "who",
    "web",
    "also",
    "now",
    "help",
    "get",
    "pm",
    "view",
    "online",
    "first",
    "am",
    "been",
    "would",
    "how",
    "were",
    "me",
    "some",
    "these",
    "click",
    "its",
    "like",
    "service",
    "than",
    "find",
    "price",
    "date",
    "back",
    "top",
    "people",
    "had",
    "list",
    "name",
    "just",
    "over",
    "year",
    "day",
    "into",
    "two",
    "next",
    "used",
    "go",
    "work",
    "last",
    "most",
    "products",
    "music",
    "buy",
    "data",
    "make",
    "them",
    "should",
    "product",
    "system",
    "post",
    "her",
    "city",
    "add",
    "policy",
    "number",
    "such",
    "please",
    "available",
    "copyright",
    "support",
    "message",
    "after",
    "best",
    "software",
    "then",
    "good",
    "video",
    "well",
    "where",
    "info",
    "rights",
    "public",
    "books",
    "high",
    "school",
    "through",
    "each",
    "links",
    "she",
    "review",
    "years",
    "order",
    "very",
    "privacy",
    "book",
    "items",
    "company",
    "read",
    "group",
    "sex",
    "need",
    "many",
    "user",
    "said",
    "does",
    "set",
    "under",
    "general",
    "research",
    "university",
    "january",
    "mail",
    "full",
    "map",
    "reviews",
    "program",
    "life",
    "know",
    "games",
    "way",
    "days",
    "management",
    "part",
    "could",
    "great",
    "united",
    "real",
    "item",
    "international",
    "center",
    "ebay",
    "must",
    "store",
    "travel",
    "comments",
    "made",
    "development",
    "report",
    "off",
    "member",
    "details",
    "line",
    "terms",
    "before",
    "hotels",
    "did",
    "send",
    "right",
    "type",
    "because",
    "local",
    "those",
    "using",
    "results",
    "office",
    "education",
    "national",
    "car",
    "design",
    "take",
    "posted",
    "internet",
    "address",
    "community",
    "within",
    "states",
    "area",
    "want",
    "phone",
    "shipping",
    "reserved",
    "subject",
    "between",
    "forum",
    "family",
    "long",
    "based",
    "code",
    "show",
    "even",
    "black",
    "check",
    "special",
    "prices",
    "website",
    "index",
    "being",
    "women",
    "much",
    "sign",
    "file",
    "link",
    "open",
    "today",
    "technology",
    "south",
    "case",
    "project",
    "same",
    "pages",
    "version",
    "section",
    "found",
    "sports",
    "house",
    "related",
    "security",
    "both",
    "county",
    "american",
    "photo",
    "game",
    "members",
    "power",
    "while",
    "care",
    "network",
    "down",
    "computer",
    "systems",
    "three",
    "total",
    "place",
    "end",
    "following",
    "download",
    "him",
    "without",
    "per",
    "access",
    "think",
    "north",
    "resources",
    "current",
    "posts",
    "big",
    "media",
    "law",
    "control",
    "water",
    "history",
    "pictures",
    "size",
    "art",
    "personal",
    "since",
    "including",
    "guide",
    "shop",
    "directory",
    "board",
    "location",
    "change",
    "white",
    "text",
    "small",
    "rating",
    "rate",
    "government",
    "children",
    "during",
    "usa",
    "return",
    "students",
    "v",
    "shopping",
    "account",
    "times",
    "sites",
    "level",
    "digital",
    "profile",
    "previous",
    "form",
    "events",
    "love",
    "old",
    "main",
    "call",
    "hotel",
    "network",
    "card",
    "below",
    "card",
    "list",
    "past",
    "size",
    "art",
    // Ballot-domain words (so real ballots score high even before vocab hits)
    "candidate",
    "candidates",
    "office",
    "ballot",
    "election",
    "elections",
    "vote",
    "voter",
    "voters",
    "voting",
    "polling",
    "precinct",
    "district",
    "districts",
    "senate",
    "senator",
    "house",
    "representative",
    "governor",
    "judge",
    "court",
    "county",
    "state",
    "federal",
    "primary",
    "general",
    "runoff",
    "write",
    "incumbent",
    "petition",
    "filed",
    "amendment",
    "amendments",
    "proposition",
    "propositions",
    "bond",
    "measure",
    "measures",
    "yes",
    "no",
    "for",
    "against",
    "approve",
    "reject",
    "shall",
    "thereof",
    "whereas",
    "section",
    "article",
    "republican",
    "democratic",
    "democrat",
    "party",
    // Spanish
    "el",
    "la",
    "los",
    "las",
    "de",
    "del",
    "y",
    "en",
    "para",
    "con",
    "por",
    "que",
    "un",
    "una",
    "se",
    "es",
    "su",
    "este",
    "esta",
    "votar",
    "voto",
    "boleta",
    "elección",
    "elecciones",
    "primaria",
    "demócrata",
    "republicano",
    "partido",
    "candidato",
    "candidatos",
    "candidata",
    "candidatas",
    "senador",
    "senadora",
    "representante",
    "gobernador",
    "gobernadora",
    "juez",
    "jueza",
    "junta",
    "consejo",
    "miembro",
    "miembros",
    "distrito",
    "estado",
    "condado",
    "federal",
    // Common candidate-name building blocks (not load-bearing but help
    // surnames squeak in if they show up as "tokens")
    "smith",
    "johnson",
    "williams",
    "brown",
    "jones",
    "garcia",
    "miller",
    "davis",
    "rodriguez",
    "martinez",
    "hernandez",
    "lopez",
    "gonzalez",
    "wilson",
    "anderson",
    "thomas",
    "taylor",
    "moore",
    "jackson",
    "martin",
    "lee",
    "perez",
    "thompson",
    "white",
    "harris",
    "sanchez",
    "clark",
    "ramirez",
    "lewis",
    "robinson",
    "walker",
    "young",
    "allen",
    "king",
    "wright",
    "scott",
    "torres",
    "nguyen",
    "hill",
    "flores",
    "green",
    "adams",
    "nelson",
    "baker",
    "hall",
    "rivera",
    "campbell",
    "mitchell",
    "carter",
    "roberts",
  ].map((w) => w.toLowerCase()),
);

/**
 * Tokenize a piece of text into lowercase word tokens (alphabetic +
 * non-ASCII letters for Spanish ñ/é/è etc.). Punctuation and digits
 * are stripped.
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-záéíóúñü]+/iu)
    .filter((t) => t.length >= 2);
}

/**
 * Score raw extracted text against the three detector heuristics.
 *
 * Pure function — does not consult environment variables; that happens
 * in `decideExtractionPath` so the score is reproducible for telemetry.
 */
export function scoreExtractedText(text: string): DetectorScore {
  const cleaned = text.trim();
  if (cleaned.length === 0) {
    return {
      dictionary_ratio: 0,
      ballot_vocab_hits: 0,
      proper_noun_count: 0,
      decision_reason: "empty input",
    };
  }

  const tokens = tokenize(cleaned);
  let recognized = 0;
  for (const token of tokens) {
    if (DICTIONARY.has(token)) recognized++;
  }
  const dictionary_ratio = tokens.length > 0 ? recognized / tokens.length : 0;

  // Vocab hits — case-insensitive substring count, but each phrase counted at
  // most a bounded number of times to avoid one word ("the") dominating.
  const lower = cleaned.toLowerCase();
  let vocabHits = 0;
  for (const phrase of BALLOT_VOCAB) {
    const re = new RegExp(phrase.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&"), "g");
    const matches = lower.match(re);
    if (matches) vocabHits += Math.min(matches.length, 3);
  }

  // Proper-noun shape: count of capitalized FIRST-WORD positions that
  // are followed by another capitalized word. We intentionally non-
  // greedy so "John Smith Maria Garcia" counts as 2 pairs, not 1
  // 4-word sequence — the detector goal is "how many candidate-name-
  // shaped pairs appear?", not "longest capitalized run."
  //
  // Counting first-positions: every match consumes exactly two tokens
  // (a capitalized first word + a capitalized follow word, with an
  // optional middle initial). Adjacent pairs without separation are
  // counted, which is fine — false positives here just keep the cheap
  // path enabled.
  const properNounRe =
    /\b[A-Z][a-zA-Z'.-]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-zA-Z'.-]+\b/g;
  let proper_noun_count = 0;
  let m: RegExpExecArray | null;
  const re = new RegExp(properNounRe);
  while ((m = re.exec(cleaned)) !== null) {
    proper_noun_count++;
    // Avoid infinite loop on zero-length matches (regex defends already
    // but be safe).
    if (m.index === re.lastIndex) re.lastIndex++;
  }

  return {
    dictionary_ratio,
    ballot_vocab_hits: vocabHits,
    proper_noun_count,
    decision_reason: "",
  };
}

interface FloorOverrides {
  dictFloor: number;
  vocabFloor: number;
  properNounFloor: number;
}

function readFloors(): FloorOverrides {
  return {
    dictFloor: parseFloat0to1(
      process.env.EXTRACTION_DETECTOR_DICT_FLOOR,
      DEFAULT_DICT_FLOOR,
    ),
    vocabFloor: parsePositiveInt(
      process.env.EXTRACTION_DETECTOR_VOCAB_FLOOR,
      DEFAULT_VOCAB_FLOOR,
    ),
    properNounFloor: parsePositiveInt(
      process.env.EXTRACTION_DETECTOR_PROPER_NOUN_FLOOR,
      DEFAULT_PROPER_NOUN_FLOOR,
    ),
  };
}

function parseFloat0to1(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0 || n > 1) return fallback;
  return n;
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) return fallback;
  return n;
}

export interface PathDecision {
  path: "pdfjs" | "vision";
  score: DetectorScore;
}

/**
 * Decide which extraction path to use given a detector score.
 *
 * Returns the path + a NEW score object with `decision_reason` filled in
 * so callers can log why the routing went the way it did.
 */
export function decideExtractionPath(score: DetectorScore): PathDecision {
  const { dictFloor, vocabFloor, properNounFloor } = readFloors();

  // Empty/zero scores → always escalate to vision. pdfjs gave us nothing
  // usable, so the cheap path can't possibly succeed.
  if (
    score.dictionary_ratio === 0 &&
    score.ballot_vocab_hits === 0 &&
    score.proper_noun_count === 0
  ) {
    return {
      path: "vision",
      score: {
        ...score,
        decision_reason: "pdfjs returned empty — escalating to vision",
      },
    };
  }

  const failures: string[] = [];
  if (score.dictionary_ratio < dictFloor) {
    failures.push(
      `dictionary ratio ${score.dictionary_ratio.toFixed(2)} < floor ${dictFloor}`,
    );
  }
  if (score.ballot_vocab_hits < vocabFloor) {
    failures.push(
      `ballot vocab hits ${score.ballot_vocab_hits} < floor ${vocabFloor}`,
    );
  }
  if (score.proper_noun_count < properNounFloor) {
    failures.push(
      `proper noun count ${score.proper_noun_count} < floor ${properNounFloor}`,
    );
  }

  if (failures.length === 0) {
    return {
      path: "pdfjs",
      score: {
        ...score,
        decision_reason: `all floors met (dict=${score.dictionary_ratio.toFixed(2)}, vocab=${score.ballot_vocab_hits}, proper=${score.proper_noun_count})`,
      },
    };
  }

  return {
    path: "vision",
    score: {
      ...score,
      decision_reason: `escalate: ${failures.join("; ")}`,
    },
  };
}
