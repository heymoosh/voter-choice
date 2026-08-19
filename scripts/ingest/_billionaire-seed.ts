/**
 * scripts/ingest/_billionaire-seed.ts
 *
 * A hand-verified seed list of US billionaires (net worth $1B+, US citizens
 * or otherwise able to legally donate to US federal campaigns) for matching
 * against FEC itemized-contribution records in billionaire-donor-match.ts.
 *
 * NOT comprehensive. There is no free, structured, redistributable dataset
 * covering all ~800 US billionaires — Forbes' full list is proprietary and
 * not bulk-scrapable, and Wikipedia's "The World's Billionaires" article only
 * carries a top-10 summary table for the current year. Each entry below was
 * verified individually against a live source (Wikipedia infobox or
 * forbes.com/profile, see sourceUrl) rather than written from memory, biased
 * toward the wealthiest Americans plus known major political megadonors
 * (2026-cycle reporting) since those are the population most likely to
 * actually appear in FEC data. Expanding this list is a normal code change —
 * add an entry, cite a source, done.
 *
 * Matching design (see billionaire-donor-match.ts):
 * - Name match is the floor: FEC's NAME field is "LAST, FIRST ..."; a hit
 *   requires an exact lastName + first-token match against one of an entry's
 *   nameVariants (plural to handle compound surnames / different filing
 *   conventions, e.g. "Laurene Powell Jobs").
 * - Employer field is a BOOSTING signal only, never a floor — FEC employer
 *   strings are erratic ("SELF", "RETIRED", the company name, blank) and a
 *   billionaire's own state can be imperfect (multiple residences), so
 *   neither is required to confirm a match. See scoreMatchConfidence.
 */

export interface NameVariant {
  lastName: string;
  firstNames: string[];
}

export interface BillionaireSeedEntry {
  /** Stable slug, e.g. "elon-musk". */
  key: string;
  /** Canonical display name. */
  name: string;
  nameVariants: NameVariant[];
  netWorthUsd: string;
  asOf: string;
  sourceOfWealth: string;
  citizenship: string;
  sourceUrl: string;
  /** Derived from sourceOfWealth — see deriveEmployerKeywords. */
  employerKeywords: string[];
}

type RawEntry = Omit<BillionaireSeedEntry, "employerKeywords" | "key"> & {
  key?: string;
};

const KEYWORD_STOPWORDS = new Set([
  "and",
  "the",
  "inc",
  "llc",
  "corp",
  "corporation",
  "company",
  "co",
  "group",
  "holdings",
  "management",
  "capital",
  "international",
  "enterprises",
  "fund",
  "partners",
  "ventures",
  "associates",
  "industries",
  "technologies",
  "systems",
]);

export function deriveEmployerKeywords(sourceOfWealth: string): string[] {
  const tokens = sourceOfWealth
    .toLowerCase()
    .split(/[^a-z0-9]+/u)
    .filter((t) => t.length >= 3 && !KEYWORD_STOPWORDS.has(t));
  return [...new Set(tokens)];
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/gu, "")
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "");
}

function entry(raw: RawEntry): BillionaireSeedEntry {
  return {
    key: raw.key ?? slugify(raw.name),
    ...raw,
    employerKeywords: deriveEmployerKeywords(raw.sourceOfWealth),
  };
}

/**
 * Batch-verified 2026-08-19 by 4 parallel research passes against Wikipedia
 * infoboxes / forbes.com profiles. Candidates that couldn't be confirmed at
 * the $1B+ bar with a real source (e.g. Alex Soros, Timothy Mellon, Ben
 * Horowitz, both Mercers, Linda McMahon, Foster Friess) were dropped rather
 * than guessed.
 */
export const BILLIONAIRE_SEED: readonly BillionaireSeedEntry[] = [
  entry({
    name: "Elon Musk",
    nameVariants: [{ lastName: "MUSK", firstNames: ["ELON"] }],
    netWorthUsd: "$864B",
    asOf: "2026",
    sourceOfWealth: "Tesla, SpaceX",
    citizenship: "US (also South Africa, Canada)",
    sourceUrl: "https://en.wikipedia.org/wiki/Elon_Musk",
  }),
  entry({
    name: "Larry Ellison",
    nameVariants: [{ lastName: "ELLISON", firstNames: ["LARRY", "LAWRENCE"] }],
    netWorthUsd: "$202B",
    asOf: "2026",
    sourceOfWealth: "Oracle Corporation",
    citizenship: "United States",
    sourceUrl: "https://en.wikipedia.org/wiki/Larry_Ellison",
  }),
  entry({
    name: "Mark Zuckerberg",
    nameVariants: [{ lastName: "ZUCKERBERG", firstNames: ["MARK"] }],
    netWorthUsd: "$220B",
    asOf: "2025",
    sourceOfWealth: "Meta Platforms (Facebook)",
    citizenship: "United States",
    sourceUrl: "https://en.wikipedia.org/wiki/Mark_Zuckerberg",
  }),
  entry({
    name: "Jeff Bezos",
    nameVariants: [{ lastName: "BEZOS", firstNames: ["JEFF", "JEFFREY"] }],
    netWorthUsd: "$284B",
    asOf: "2026",
    sourceOfWealth: "Amazon",
    citizenship: "United States",
    sourceUrl: "https://en.wikipedia.org/wiki/Jeff_Bezos",
  }),
  entry({
    name: "Larry Page",
    nameVariants: [{ lastName: "PAGE", firstNames: ["LARRY", "LAWRENCE"] }],
    netWorthUsd: "$334.1B",
    asOf: "2026",
    sourceOfWealth: "Google, Alphabet",
    citizenship: "United States",
    sourceUrl: "https://en.wikipedia.org/wiki/Larry_Page",
  }),
  entry({
    name: "Sergey Brin",
    nameVariants: [{ lastName: "BRIN", firstNames: ["SERGEY", "SERGE"] }],
    netWorthUsd: "$264.9B",
    asOf: "2026",
    sourceOfWealth: "Google, Alphabet",
    citizenship: "United States",
    sourceUrl: "https://en.wikipedia.org/wiki/Sergey_Brin",
  }),
  entry({
    name: "Steve Ballmer",
    nameVariants: [{ lastName: "BALLMER", firstNames: ["STEVE", "STEVEN"] }],
    netWorthUsd: "$136B",
    asOf: "2025",
    sourceOfWealth: "Microsoft",
    citizenship: "United States",
    sourceUrl: "https://en.wikipedia.org/wiki/Steve_Ballmer",
  }),
  entry({
    name: "Jensen Huang",
    nameVariants: [{ lastName: "HUANG", firstNames: ["JENSEN"] }],
    netWorthUsd: "$200B+",
    asOf: "2026",
    sourceOfWealth: "Nvidia",
    citizenship: "United States (dual Taiwanese/American)",
    sourceUrl: "https://en.wikipedia.org/wiki/Jensen_Huang",
  }),
  entry({
    name: "Warren Buffett",
    nameVariants: [{ lastName: "BUFFETT", firstNames: ["WARREN"] }],
    netWorthUsd: "$148.9B",
    asOf: "2026",
    sourceOfWealth: "Berkshire Hathaway",
    citizenship: "United States",
    sourceUrl: "https://en.wikipedia.org/wiki/Warren_Buffett",
  }),
  entry({
    name: "Michael Dell",
    nameVariants: [{ lastName: "DELL", firstNames: ["MICHAEL"] }],
    netWorthUsd: "$212.8B",
    asOf: "2026",
    sourceOfWealth: "Dell Technologies",
    citizenship: "United States",
    sourceUrl: "https://en.wikipedia.org/wiki/Michael_Dell",
  }),
  entry({
    name: "Rob Walton",
    nameVariants: [{ lastName: "WALTON", firstNames: ["ROB", "ROBSON"] }],
    netWorthUsd: "$145.1B",
    asOf: "2026",
    sourceOfWealth: "Walmart (heir)",
    citizenship: "United States",
    sourceUrl: "https://en.wikipedia.org/wiki/Rob_Walton",
  }),
  entry({
    name: "Jim Walton",
    nameVariants: [{ lastName: "WALTON", firstNames: ["JIM", "JAMES"] }],
    netWorthUsd: "$142.4B",
    asOf: "2026",
    sourceOfWealth: "Walmart (heir)",
    citizenship: "United States",
    sourceUrl: "https://en.wikipedia.org/wiki/Jim_Walton",
  }),
  entry({
    name: "Michael Bloomberg",
    nameVariants: [{ lastName: "BLOOMBERG", firstNames: ["MICHAEL"] }],
    netWorthUsd: "$109.4B",
    asOf: "2026",
    sourceOfWealth: "Bloomberg L.P.",
    citizenship: "United States",
    sourceUrl: "https://en.wikipedia.org/wiki/Michael_Bloomberg",
  }),
  entry({
    name: "Bill Gates",
    nameVariants: [{ lastName: "GATES", firstNames: ["BILL", "WILLIAM"] }],
    netWorthUsd: "$106.5B",
    asOf: "2026",
    sourceOfWealth: "Microsoft",
    citizenship: "United States",
    sourceUrl: "https://en.wikipedia.org/wiki/Bill_Gates",
  }),
  entry({
    name: "Alice Walton",
    nameVariants: [{ lastName: "WALTON", firstNames: ["ALICE"] }],
    netWorthUsd: "$116B",
    asOf: "2025",
    sourceOfWealth: "Walmart (heir)",
    citizenship: "United States",
    sourceUrl: "https://en.wikipedia.org/wiki/Alice_Walton",
  }),
  entry({
    name: "Julia Koch",
    nameVariants: [{ lastName: "KOCH", firstNames: ["JULIA"] }],
    netWorthUsd: "$74.2B",
    asOf: "2025",
    sourceOfWealth: "Koch Industries (inherited)",
    citizenship: "United States",
    sourceUrl: "https://en.wikipedia.org/wiki/Julia_Koch",
  }),
  entry({
    name: "Charles Koch",
    nameVariants: [{ lastName: "KOCH", firstNames: ["CHARLES"] }],
    netWorthUsd: "$71.4B",
    asOf: "2025",
    sourceOfWealth: "Koch Industries",
    citizenship: "United States",
    sourceUrl: "https://en.wikipedia.org/wiki/Charles_Koch",
  }),
  entry({
    name: "Thomas Peterffy",
    nameVariants: [{ lastName: "PETERFFY", firstNames: ["THOMAS"] }],
    netWorthUsd: "$109B",
    asOf: "2025",
    sourceOfWealth: "Interactive Brokers",
    citizenship: "American (Hungarian-born, naturalized US citizen)",
    sourceUrl: "https://en.wikipedia.org/wiki/Thomas_Peterffy",
  }),
  entry({
    name: "Jeff Yass",
    nameVariants: [{ lastName: "YASS", firstNames: ["JEFF", "JEFFREY"] }],
    netWorthUsd: "$65B",
    asOf: "2025",
    sourceOfWealth: "Susquehanna International Group",
    citizenship: "American",
    sourceUrl: "https://en.wikipedia.org/wiki/Jeff_Yass",
  }),
  entry({
    name: "Stephen A. Schwarzman",
    nameVariants: [
      { lastName: "SCHWARZMAN", firstNames: ["STEPHEN", "STEVE"] },
    ],
    netWorthUsd: "$50B",
    asOf: "2026",
    sourceOfWealth: "Blackstone Inc.",
    citizenship: "American",
    sourceUrl: "https://en.wikipedia.org/wiki/Stephen_A._Schwarzman",
  }),
  entry({
    name: "Kenneth C. Griffin",
    nameVariants: [{ lastName: "GRIFFIN", firstNames: ["KENNETH", "KEN"] }],
    netWorthUsd: "$51.2B",
    asOf: "2026",
    sourceOfWealth: "Citadel / Citadel Securities",
    citizenship: "American",
    sourceUrl: "https://en.wikipedia.org/wiki/Kenneth_C._Griffin",
  }),
  entry({
    name: "Jacqueline Mars",
    nameVariants: [{ lastName: "MARS", firstNames: ["JACQUELINE"] }],
    netWorthUsd: "$46.6B",
    asOf: "2023",
    sourceOfWealth: "Mars, Incorporated",
    citizenship: "American",
    sourceUrl: "https://en.wikipedia.org/wiki/Jacqueline_Mars",
  }),
  entry({
    name: "John Franklyn Mars",
    nameVariants: [{ lastName: "MARS", firstNames: ["JOHN"] }],
    netWorthUsd: "$44.6B",
    asOf: "2025",
    sourceOfWealth: "Mars, Incorporated",
    citizenship: "American",
    sourceUrl: "https://en.wikipedia.org/wiki/John_Franklyn_Mars",
  }),
  entry({
    name: "Lukas Walton",
    nameVariants: [{ lastName: "WALTON", firstNames: ["LUKAS"] }],
    netWorthUsd: "$41.5B",
    asOf: "2025",
    sourceOfWealth: "Walmart (inheritance)",
    citizenship: "American",
    sourceUrl: "https://en.wikipedia.org/wiki/Lukas_Walton",
  }),
  entry({
    name: "Miriam Adelson",
    nameVariants: [{ lastName: "ADELSON", firstNames: ["MIRIAM"] }],
    netWorthUsd: "$34.4B",
    asOf: "2026",
    sourceOfWealth: "Las Vegas Sands",
    citizenship: "American (Israeli-American)",
    sourceUrl: "https://www.forbes.com/profile/miriam-adelson/",
  }),
  entry({
    name: "George Soros",
    nameVariants: [{ lastName: "SOROS", firstNames: ["GEORGE"] }],
    netWorthUsd: "$7.2B",
    asOf: "2025",
    sourceOfWealth: "Soros Fund Management",
    citizenship: "American (dual Hungarian-American)",
    sourceUrl: "https://en.wikipedia.org/wiki/George_Soros",
  }),
  entry({
    name: "Reid Hoffman",
    nameVariants: [{ lastName: "HOFFMAN", firstNames: ["REID"] }],
    netWorthUsd: "$2.7B",
    asOf: "2026",
    sourceOfWealth: "LinkedIn, Greylock Partners",
    citizenship: "American",
    sourceUrl: "https://en.wikipedia.org/wiki/Reid_Hoffman",
  }),
  entry({
    name: "Vivek Ramaswamy",
    nameVariants: [{ lastName: "RAMASWAMY", firstNames: ["VIVEK"] }],
    netWorthUsd: "$3B",
    asOf: "2026",
    sourceOfWealth: "Roivant Sciences, Strive Asset Management",
    citizenship: "American",
    sourceUrl: "https://en.wikipedia.org/wiki/Vivek_Ramaswamy",
  }),
  entry({
    name: "Kelcy Warren",
    nameVariants: [{ lastName: "WARREN", firstNames: ["KELCY"] }],
    netWorthUsd: "$9.3B",
    asOf: "2026",
    sourceOfWealth: "Energy Transfer",
    citizenship: "American",
    sourceUrl: "https://www.forbes.com/profile/kelcy-warren/",
  }),
  entry({
    name: "Richard Uihlein",
    nameVariants: [
      { lastName: "UIHLEIN", firstNames: ["RICHARD", "RICH", "DICK"] },
    ],
    netWorthUsd: "$7.7B",
    asOf: "2026",
    sourceOfWealth: "Uline",
    citizenship: "American",
    sourceUrl: "https://www.forbes.com/profile/richard-uihlein/",
  }),
  entry({
    name: "Elizabeth Uihlein",
    nameVariants: [{ lastName: "UIHLEIN", firstNames: ["ELIZABETH", "LIZ"] }],
    netWorthUsd: "$7.7B",
    asOf: "2026",
    sourceOfWealth: "Uline",
    citizenship: "American",
    sourceUrl: "https://www.forbes.com/profile/elizabeth-uihlein/",
  }),
  entry({
    name: "Peter Thiel",
    nameVariants: [{ lastName: "THIEL", firstNames: ["PETER"] }],
    netWorthUsd: "$32B",
    asOf: "2026",
    sourceOfWealth: "PayPal, Palantir, Founders Fund",
    citizenship: "American (also German, New Zealand citizenship)",
    sourceUrl: "https://en.wikipedia.org/wiki/Peter_Thiel",
  }),
  entry({
    name: "Ronald Lauder",
    nameVariants: [{ lastName: "LAUDER", firstNames: ["RONALD", "RON"] }],
    netWorthUsd: "$4.7B",
    asOf: "2025",
    sourceOfWealth: "Estée Lauder Companies",
    citizenship: "American",
    sourceUrl: "https://en.wikipedia.org/wiki/Ronald_Lauder",
  }),
  entry({
    name: "J.B. Pritzker",
    nameVariants: [{ lastName: "PRITZKER", firstNames: ["JB", "JAY"] }],
    netWorthUsd: "$3.9B",
    asOf: "2025",
    sourceOfWealth: "Hyatt Hotels / Pritzker Group Private Capital",
    citizenship: "American",
    sourceUrl: "https://en.wikipedia.org/wiki/J.B._Pritzker",
  }),
  entry({
    name: "Tom Steyer",
    nameVariants: [{ lastName: "STEYER", firstNames: ["TOM", "THOMAS"] }],
    netWorthUsd: "$2.4B",
    asOf: "2026",
    sourceOfWealth: "Farallon Capital (hedge fund)",
    citizenship: "American",
    sourceUrl: "https://en.wikipedia.org/wiki/Tom_Steyer",
  }),
  entry({
    name: "Marc Andreessen",
    nameVariants: [{ lastName: "ANDREESSEN", firstNames: ["MARC"] }],
    netWorthUsd: "$1.9B",
    asOf: "2026",
    sourceOfWealth: "Andreessen Horowitz (venture capital); Netscape, Opsware",
    citizenship: "American",
    sourceUrl: "https://en.wikipedia.org/wiki/Marc_Andreessen",
  }),
  entry({
    name: "Diane Hendricks",
    nameVariants: [{ lastName: "HENDRICKS", firstNames: ["DIANE"] }],
    netWorthUsd: "$21.9B",
    asOf: "2024",
    sourceOfWealth: "ABC Supply (co-founder/chair)",
    citizenship: "American",
    sourceUrl: "https://en.wikipedia.org/wiki/Diane_Hendricks",
  }),
  entry({
    name: "Joe Ricketts",
    nameVariants: [{ lastName: "RICKETTS", firstNames: ["JOE", "JOSEPH"] }],
    netWorthUsd: "$4.1B",
    asOf: "2024",
    sourceOfWealth: "TD Ameritrade (founder)",
    citizenship: "American",
    sourceUrl: "https://en.wikipedia.org/wiki/Joe_Ricketts",
  }),
  entry({
    name: "Rupert Murdoch",
    nameVariants: [{ lastName: "MURDOCH", firstNames: ["RUPERT"] }],
    netWorthUsd: "$24.1B",
    asOf: "2026",
    sourceOfWealth: "News Corp / Fox (newspapers, TV network)",
    citizenship: "American (naturalized 1985)",
    sourceUrl: "https://www.forbes.com/profile/rupert-murdoch/",
  }),
  entry({
    name: "Dustin Moskovitz",
    nameVariants: [{ lastName: "MOSKOVITZ", firstNames: ["DUSTIN"] }],
    netWorthUsd: "$10.2B",
    asOf: "2026",
    sourceOfWealth: "Facebook (co-founder), Asana (co-founder)",
    citizenship: "American",
    sourceUrl: "https://en.wikipedia.org/wiki/Dustin_Moskovitz",
  }),
  entry({
    name: "Laurene Powell Jobs",
    nameVariants: [
      { lastName: "POWELL JOBS", firstNames: ["LAURENE"] },
      { lastName: "JOBS", firstNames: ["LAURENE"] },
      { lastName: "POWELL", firstNames: ["LAURENE"] },
    ],
    netWorthUsd: "$11.9B",
    asOf: "2025",
    sourceOfWealth:
      "Apple / Disney shares inherited from Steve Jobs' estate; Emerson Collective",
    citizenship: "American",
    sourceUrl: "https://en.wikipedia.org/wiki/Laurene_Powell_Jobs",
  }),
  entry({
    name: "Reed Hastings",
    nameVariants: [{ lastName: "HASTINGS", firstNames: ["REED"] }],
    netWorthUsd: "$6.6B",
    asOf: "2025",
    sourceOfWealth: "Netflix (co-founder)",
    citizenship: "American",
    sourceUrl: "https://en.wikipedia.org/wiki/Reed_Hastings",
  }),
  entry({
    name: "Carl Icahn",
    nameVariants: [{ lastName: "ICAHN", firstNames: ["CARL"] }],
    netWorthUsd: "$3.7B",
    asOf: "2026",
    sourceOfWealth: "Icahn Enterprises",
    citizenship: "American",
    sourceUrl: "https://www.forbes.com/profile/carl-icahn/",
  }),
  entry({
    name: "David Tepper",
    nameVariants: [{ lastName: "TEPPER", firstNames: ["DAVID"] }],
    netWorthUsd: "$20.6B",
    asOf: "2024",
    sourceOfWealth: "Appaloosa Management (hedge fund founder)",
    citizenship: "American",
    sourceUrl: "https://en.wikipedia.org/wiki/David_Tepper",
  }),
  entry({
    name: "Philip Anschutz",
    nameVariants: [{ lastName: "ANSCHUTZ", firstNames: ["PHILIP", "PHIL"] }],
    netWorthUsd: "$16.9B",
    asOf: "2025",
    sourceOfWealth:
      "The Anschutz Corporation (energy, railroads, real estate, sports, entertainment)",
    citizenship: "American",
    sourceUrl: "https://en.wikipedia.org/wiki/Philip_Anschutz",
  }),
  entry({
    name: "Harold Hamm",
    nameVariants: [{ lastName: "HAMM", firstNames: ["HAROLD"] }],
    netWorthUsd: "$20.1B",
    asOf: "2026",
    sourceOfWealth: "Continental Resources (oil & gas)",
    citizenship: "United States",
    sourceUrl: "https://www.forbes.com/profile/harold-hamm/",
  }),
  entry({
    name: "Paul Singer",
    nameVariants: [{ lastName: "SINGER", firstNames: ["PAUL"] }],
    netWorthUsd: "$6.7B",
    asOf: "2026",
    sourceOfWealth: "Elliott Management (hedge fund)",
    citizenship: "United States",
    sourceUrl: "https://www.forbes.com/profile/paul-singer/",
  }),
  entry({
    name: "Leon Black",
    nameVariants: [{ lastName: "BLACK", firstNames: ["LEON"] }],
    netWorthUsd: "$14.6B",
    asOf: "2026",
    sourceOfWealth: "Apollo Global Management (private equity)",
    citizenship: "United States",
    sourceUrl: "https://www.forbes.com/profile/leon-black/",
  }),
  entry({
    name: "Stephen Ross",
    nameVariants: [{ lastName: "ROSS", firstNames: ["STEPHEN", "STEVE"] }],
    netWorthUsd: "$17B",
    asOf: "2026",
    sourceOfWealth: "Related Companies (real estate)",
    citizenship: "United States",
    sourceUrl: "https://www.forbes.com/profile/stephen-ross/",
  }),
  entry({
    name: "Phil Knight",
    nameVariants: [{ lastName: "KNIGHT", firstNames: ["PHIL", "PHILIP"] }],
    netWorthUsd: "$26.6B",
    asOf: "2026",
    sourceOfWealth: "Nike",
    citizenship: "United States",
    sourceUrl: "https://www.forbes.com/profile/phil-knight/",
  }),
  entry({
    name: "Marc Benioff",
    nameVariants: [{ lastName: "BENIOFF", firstNames: ["MARC"] }],
    netWorthUsd: "$8.2B",
    asOf: "2026",
    sourceOfWealth: "Salesforce",
    citizenship: "United States",
    sourceUrl: "https://www.forbes.com/profile/marc-benioff/",
  }),
  entry({
    name: "Vinod Khosla",
    nameVariants: [{ lastName: "KHOSLA", firstNames: ["VINOD"] }],
    netWorthUsd: "$13.5B",
    asOf: "2026",
    sourceOfWealth: "Sun Microsystems / Khosla Ventures (venture capital)",
    citizenship: "United States",
    sourceUrl: "https://www.forbes.com/profile/vinod-khosla/",
  }),
  entry({
    name: "John Doerr",
    nameVariants: [{ lastName: "DOERR", firstNames: ["JOHN"] }],
    netWorthUsd: "$22.5B",
    asOf: "2026",
    sourceOfWealth: "Kleiner Perkins (venture capital)",
    citizenship: "United States",
    sourceUrl: "https://www.forbes.com/profile/john-doerr/",
  }),
  entry({
    name: "Eric Schmidt",
    nameVariants: [{ lastName: "SCHMIDT", firstNames: ["ERIC"] }],
    netWorthUsd: "$38.4B",
    asOf: "2026",
    sourceOfWealth: "Google",
    citizenship: "United States",
    sourceUrl: "https://www.forbes.com/profile/eric-schmidt/",
  }),
  entry({
    name: "MacKenzie Scott",
    nameVariants: [{ lastName: "SCOTT", firstNames: ["MACKENZIE"] }],
    netWorthUsd: "$33.1B",
    asOf: "2026",
    sourceOfWealth: "Amazon",
    citizenship: "United States",
    sourceUrl: "https://www.forbes.com/profile/mackenzie-scott/",
  }),
  entry({
    name: "Sheryl Sandberg",
    nameVariants: [{ lastName: "SANDBERG", firstNames: ["SHERYL"] }],
    netWorthUsd: "$2.3B",
    asOf: "2026",
    sourceOfWealth: "Meta/Facebook",
    citizenship: "United States",
    sourceUrl: "https://www.forbes.com/profile/sheryl-sandberg/",
  }),
  entry({
    name: "Micky Arison",
    nameVariants: [{ lastName: "ARISON", firstNames: ["MICKY", "MICKEY"] }],
    netWorthUsd: "$9.7B",
    asOf: "2026",
    sourceOfWealth: "Carnival Corporation (cruise lines)",
    citizenship: "United States (Israeli-American, US citizen)",
    sourceUrl: "https://www.forbes.com/profile/micky-arison/",
  }),
  entry({
    name: "Vince McMahon",
    nameVariants: [{ lastName: "MCMAHON", firstNames: ["VINCE", "VINCENT"] }],
    netWorthUsd: "$3.5B",
    asOf: "2026",
    sourceOfWealth: "WWE / entertainment",
    citizenship: "United States",
    sourceUrl: "https://www.forbes.com/profile/vincent-mcmahon/",
  }),
  entry({
    name: "Dan Cathy",
    nameVariants: [{ lastName: "CATHY", firstNames: ["DAN", "DANIEL"] }],
    netWorthUsd: "$12B",
    asOf: "2026",
    sourceOfWealth: "Chick-fil-A",
    citizenship: "United States",
    sourceUrl: "https://www.forbes.com/profile/dan-cathy/",
  }),
] as const;

export function normalizeFecName(
  rawName: string,
): { lastName: string; firstToken: string } | null {
  const parts = rawName.split(",");
  const last = (parts[0] ?? "").trim().toUpperCase();
  const rest = (parts[1] ?? "").trim().toUpperCase();
  const firstToken = (rest.split(/\s+/u)[0] ?? "").replace(/[.,]/gu, "");
  if (!last || !firstToken) return null;
  return { lastName: last, firstToken };
}

export type BillionaireIndex = ReadonlyMap<
  string,
  readonly BillionaireSeedEntry[]
>;

export function buildBillionaireIndex(
  entries: readonly BillionaireSeedEntry[] = BILLIONAIRE_SEED,
): BillionaireIndex {
  const index = new Map<string, BillionaireSeedEntry[]>();
  for (const seedEntry of entries) {
    for (const variant of seedEntry.nameVariants) {
      for (const first of variant.firstNames) {
        const key = `${variant.lastName}|${first}`;
        const list = index.get(key) ?? [];
        list.push(seedEntry);
        index.set(key, list);
      }
    }
  }
  return index;
}

/** Matches by exact lastName + first-token. Returns [] on no hit. */
export function matchBillionaire(
  index: BillionaireIndex,
  rawFecName: string,
): readonly BillionaireSeedEntry[] {
  const normalized = normalizeFecName(rawFecName);
  if (!normalized) return [];
  return index.get(`${normalized.lastName}|${normalized.firstToken}`) ?? [];
}

export type MatchConfidence = "high" | "medium" | "low";

/**
 * Employer strings that neither confirm nor contradict a name match — no
 * industry signal either way. Mirrors NON_EMPLOYER_VALUES in
 * federal-sectors-bulk.ts plus a few investor/philanthropy placeholders
 * billionaires themselves commonly file under.
 */
const GENERIC_EMPLOYER_VALUES = new Set([
  "",
  "SELF",
  "SELF-EMPLOYED",
  "SELF EMPLOYED",
  "RETIRED",
  "NOT EMPLOYED",
  "UNEMPLOYED",
  "NONE",
  "N/A",
  "NA",
  "INFORMATION REQUESTED",
  "INFORMATION REQUESTED PER BEST EFFORTS",
  "HOMEMAKER",
  "INVESTOR",
  "PRIVATE INVESTOR",
  "PHILANTHROPIST",
  "PHILANTHROPY",
  "OWNER",
  "BUSINESSMAN",
  "BUSINESSWOMAN",
  "EXECUTIVE",
]);

export interface MatchConfidenceResult {
  confidence: MatchConfidence;
  signals: string;
}

/**
 * Employer is a BOOSTING signal, never a floor (see module header). A name
 * match with a blank/generic employer is "medium" — not corroborated, but
 * not contradicted either. A name match whose employer names something
 * else entirely is "low" — most likely a different person with the same
 * name — but is still recorded (never silently dropped) so a human reviewer
 * can see the near-miss.
 */
export function scoreMatchConfidence(
  billionaire: BillionaireSeedEntry,
  employerRaw: string,
): MatchConfidenceResult {
  const employer = employerRaw.trim().toUpperCase();
  if (!employer || GENERIC_EMPLOYER_VALUES.has(employer)) {
    return {
      confidence: "medium",
      signals: "name match; employer field blank/generic, not contradicted",
    };
  }
  const employerLower = employer.toLowerCase();
  const hit = billionaire.employerKeywords.find((kw) =>
    employerLower.includes(kw),
  );
  if (hit) {
    return {
      confidence: "high",
      signals: `name match; employer "${employerRaw}" corroborates via "${hit}"`,
    };
  }
  return {
    confidence: "low",
    signals: `name match only; employer "${employerRaw}" does not corroborate — possible different person with the same name`,
  };
}
