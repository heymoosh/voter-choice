/**
 * scripts/ingest/or-orestar-donors.ts
 *
 * Oregon ORESTAR campaign finance ingest.
 * Fetches 2024 contribution data for Oregon state legislative candidates
 * from ORESTAR (Oregon Elections Reporting System) public portal.
 *
 * Requires a visible browser (headless: false) because the ORESTAR WAF
 * blocks headless/XHR requests. Opens a browser window — do not interact
 * with it while the script is running.
 *
 * Usage:
 *   DATABASE_URL=<neon> npx tsx scripts/ingest/or-orestar-donors.ts [--dry-run]
 *
 * Idempotency: upserts on (candidate_id, election_cycle, bucket_label).
 */

import { chromium, type Browser, type Page } from "playwright";
import { sql } from "drizzle-orm";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { requireDb } from "../../db/client";
import { candidates, donorAggregates } from "../../db/schema";
import {
  mapEmployerToBucket,
  bucketIndividualByAmount,
  type DonorBucketLabel,
} from "./_bucket-mapping";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SOURCE = "or_orestar_bulk";
const SOURCE_URL =
  "https://secure.sos.state.or.us/orestar/gotoPublicTransactionSearch.do";
const ELECTION_CYCLE = "2024";
const ORESTAR_BASE = "https://secure.sos.state.or.us/orestar";
// OR campaigns fundraise throughout the 2-year election cycle (2023+2024 for 2024 races)
const VALID_YEARS = new Set(["2023", "2024"]);

// ---------------------------------------------------------------------------
// 2024 General Election OR legislative committees
// Extracted from ORESTAR Committees/Filers by Election → 2024 General Election
// ---------------------------------------------------------------------------

// 2024 General Election committees (State Representative + State Senator)
// Extracted from ORESTAR Committees/Filers by Election → 2024, Candidate Committee (All)
const OR_2024_COMMITTEES = [
  // State Representatives
  { sooRsn: "99856", raw: "Akers, RaymondCommittee To Elect Raymond Akers", type: "State Representative, 57th DistrictRepublican" },
  { sooRsn: "98721", raw: "Al-AbdRabbuh, SamiSami For Oregon", type: "State Representative, 16th DistrictDemocrat" },
  { sooRsn: "100636", raw: "Andersen, HFriends of Tom Andersen", type: "State Representative, 19th DistrictDemocrat" },
  { sooRsn: "103361", raw: "Boice, CourtCourt Boice for Oregon", type: "State Representative, 1st DistrictRepublican" },
  { sooRsn: "100900", raw: "Boshart Davis, ShellyFriends of Shelly Boshart Davis", type: "State Representative, 15th DistrictRepublican" },
  { sooRsn: "100720", raw: "Bowman, BenjaminFriends of Ben Bowman", type: "State Representative, 25th DistrictDemocrat" },
  { sooRsn: "98935", raw: "Bunch, MattFriends of Matt Bunch", type: "State Representative, 51st DistrictRepublican" },
  { sooRsn: "100841", raw: "Caballero, LiliaCommittee to Elect Lilia Caballero", type: "State Representative, 6th DistrictDemocrat" },
  { sooRsn: "99957", raw: "Canning, DoyleCanning for Oregon", type: "State Representative, 8th DistrictDemocrat" },
  { sooRsn: "101818", raw: "Cate, JamiFriends of Jami Cate", type: "State Representative, 11th DistrictRepublican" },
  { sooRsn: "100832", raw: "Chaichi, FarrahChaichi for Oregon", type: "State Representative, 35th DistrictDemocrat" },
  { sooRsn: "101032", raw: "Chambers, KevinFriends of Kevin Scott Chambers", type: "State Representative, 20th DistrictRepublican" },
  { sooRsn: "100624", raw: "Chasm, RichardFriends of Richard Chasm", type: "State Representative, 4th DistrictDemocrat" },
  { sooRsn: "100634", raw: "Chotzen, WillyFriends of Willy Chotzen", type: "State Representative, 46th DistrictDemocrat" },
  { sooRsn: "100999", raw: "Chummar, ShawnFriends of Shawn Chummar", type: "State Representative, 36th DistrictRepublican" },
  { sooRsn: "99607", raw: "Clairmont, TimTim Clairmont for Oregon", type: "State Representative, 33rd DistrictDemocrat" },
  { sooRsn: "100191", raw: "Conrad, CharlieCommittee to Elect Charlie Conrad", type: "State Representative, 12th DistrictRepublican" },
  { sooRsn: "102590", raw: "Cramer, TracyFriends of Tracy Cramer for District 22", type: "State Representative, 22nd DistrictRepublican" },
  { sooRsn: "100944", raw: "Davis, AndrewAndy Davis for Oregon", type: "State Representative, 32nd DistrictDemocrat" },
  { sooRsn: "98902", raw: "Dexter, MaxineMaxine for Oregon", type: "State Representative, 33rd DistrictDemocrat" },
  { sooRsn: "100503", raw: "Diehl, EdwinEd Diehl for Oregon", type: "State Representative, 17th DistrictRepublican" },
  { sooRsn: "100778", raw: "Dobson, AprilCommittee to Elect April Dobson", type: "State Representative, 39th DistrictDemocrat" },
  { sooRsn: "102606", raw: "Dow, KaryssaKaryssa Dow for Oregon", type: "State Representative, 18th DistrictDemocrat" },
  { sooRsn: "101288", raw: "Drazan, ChristineFriends of Christine Drazan", type: "State Representative, 51st DistrictRepublican" },
  { sooRsn: "101037", raw: "Edtl, BenjaminBen Edtl for the People", type: "State Representative, 37th DistrictRepublican" },
  { sooRsn: "100811", raw: "Elmer, LucettaCommittee to Elect Lucetta Elmer", type: "State Representative, 24th DistrictRepublican" },
  { sooRsn: "101582", raw: "Emmons, MichelleEmmons for Oregon", type: "State Representative, 12th DistrictDemocrat" },
  { sooRsn: "100603", raw: "Evans, PaulFriends of Paul Evans", type: "State Representative, 20th DistrictDemocrat" },
  { sooRsn: "100721", raw: "Fahey, JulianneFriends of Julie Fahey", type: "State Representative, 14th DistrictDemocrat" },
  { sooRsn: "100891", raw: "Fragala, LisaFriends of Lisa Fragala", type: "State Representative, 8th DistrictDemocrat" },
  { sooRsn: "99890", raw: "Gaither, GlennGlenn Gaither Candidate", type: "State Representative, 32nd DistrictRepublican" },
  { sooRsn: "100609", raw: "Gamba, MarkMark Gamba for Oregon", type: "State Representative, 41st DistrictDemocrat" },
  { sooRsn: "100610", raw: "Gomberg, DavidGomberg for State Rep", type: "State Representative, 10th DistrictDemocrat" },
  { sooRsn: "98693", raw: "Goodwin, JosephJoseph Goodwin", type: "State Representative, 59th DistrictRepublican" },
  { sooRsn: "100727", raw: "Grayber, DaciaDacia for Oregon", type: "State Representative, 28th DistrictDemocrat" },
  { sooRsn: "100087", raw: "Green, KatherineFriends of Katherine Green", type: "State Representative, 5th DistrictRepublican" },
  { sooRsn: "100280", raw: "Gutierrez, JordanJordan For State Representative", type: "State Representative, 31st DistrictDemocrat" },
  { sooRsn: "103150", raw: "Harbick, DarinHarbick for Oregon", type: "State Representative, 12th DistrictRepublican" },
  { sooRsn: "100611", raw: "Hartman, AnnessaAnnessa Hartman for Oregon", type: "State Representative, 40th DistrictDemocrat" },
  { sooRsn: "100736", raw: "Helfrich, JeffFriends of Jeff Helfrich", type: "State Representative, 52nd DistrictRepublican" },
  { sooRsn: "100829", raw: "Helm, KennethKen Helm for Oregon", type: "State Representative, 27th DistrictDemocrat" },
  { sooRsn: "99201", raw: "Hennrich, Mary LouMary Lou Gets Results", type: "State Representative, 46th DistrictDemocrat" },
  { sooRsn: "98030", raw: "Holm, JohnCommittee To elect John Holm", type: "State Representative, 6th DistrictDemocrat" },
  { sooRsn: "100839", raw: "Hudson, ZacharyElect Zach Hudson", type: "State Representative, 49th DistrictDemocrat" },
  { sooRsn: "101068", raw: "Iverson, VikkiFriends of Vikki", type: "State Representative, 59th DistrictRepublican" },
  { sooRsn: "100812", raw: "Javadi, CyrusCyrus for Oregon", type: "State Representative, 32nd DistrictRepublican" },
  { sooRsn: "101019", raw: "Kropf, JasonJason for Bend", type: "State Representative, 54th DistrictDemocrat" },
  { sooRsn: "99181", raw: "Laity, LoganLaity for Community", type: "State Representative, 32nd DistrictDemocrat" },
  { sooRsn: "91986", raw: "Lawrence-Spence, AkashaAkasha for The People", type: "State Representative, 36th DistrictDemocrat" },
  { sooRsn: "97796", raw: "Layda, DrewFriends of Drew A. Layda", type: "State Representative, 31st DistrictRepublican" },
  { sooRsn: "100108", raw: "LeMaster, TimothyBring Back Portland", type: "State Representative, 43rd DistrictRepublican" },
  { sooRsn: "101316", raw: "Leslie, ElizabethLeslieforOregon", type: "State Representative, 40th DistrictRepublican" },
  { sooRsn: "100875", raw: "Levy, BobbyFriends of Bobby Levy", type: "State Representative, 58th DistrictRepublican" },
  { sooRsn: "102981", raw: "Levy, EmersonFriends of Em Levy", type: "State Representative, 53rd DistrictDemocrat" },
  { sooRsn: "100874", raw: "Lewis, RickCommittee to Elect Rick Lewis", type: "State Representative, 18th DistrictRepublican" },
  { sooRsn: "100827", raw: "Lively, JohnFriends of John Lively", type: "State Representative, 7th DistrictDemocrat" },
  { sooRsn: "103678", raw: "Lopez, KeriFriends of Keri Lopez", type: "State Representative, 53rd DistrictRepublican" },
  { sooRsn: "103075", raw: "Mannix, KevinMannix for Oregon PAC", type: "State Representative, 21st DistrictRepublican" },
  { sooRsn: "100835", raw: "Marsh, PamCommittee to Elect Pam Marsh", type: "State Representative, 5th DistrictDemocrat" },
  { sooRsn: "100910", raw: "Martin, DanielFriends of Daniel Martin", type: "State Representative, 35th DistrictRepublican" },
  { sooRsn: "100789", raw: "Masterman, JohnFriends of John Masterman", type: "State Representative, 48th DistrictRepublican" },
  { sooRsn: "100742", raw: "McDonald, SarahSarah 4 OR House", type: "State Representative, 16th DistrictDemocrat" },
  { sooRsn: "101104", raw: "McIntire, EmilyFriends of Emily McIntire", type: "State Representative, 56th DistrictRepublican" },
  { sooRsn: "100621", raw: "McLain, SusanFriends of Susan McLain", type: "State Representative, 29th DistrictDemocrat" },
  { sooRsn: "98515", raw: "Morgan, LilyFriends of Lily Morgan", type: "State Representative, 3rd DistrictRepublican" },
  { sooRsn: "100427", raw: "Morrison, AndrewAndrew Morrison for Oregon", type: "State Representative, 48th DistrictRepublican" },
  { sooRsn: "100612", raw: "Munoz, LeslyLesly Munoz for Oregon", type: "State Representative, 22nd DistrictDemocrat" },
  { sooRsn: "103253", raw: "Nathanson, NancyFriends of Nancy Nathanson", type: "State Representative, 13th DistrictDemocrat" },
  { sooRsn: "100684", raw: "Nelson, TravisFriends of Travis Nelson", type: "State Representative, 44th DistrictDemocrat" },
  { sooRsn: "101290", raw: "Neron, CourtneyFriends of Courtney Neron", type: "State Representative, 26th DistrictDemocrat" },
  { sooRsn: "100613", raw: "Nguyen, DanielFriends of Daniel Nguyen", type: "State Representative, 38th DistrictDemocrat" },
  { sooRsn: "100614", raw: "Nguyen, HoaFriends of Hoa", type: "State Representative, 48th DistrictDemocrat" },
  { sooRsn: "100628", raw: "Nosse, RobFriends of Rob Nosse", type: "State Representative, 42nd DistrictDemocrat" },
  { sooRsn: "100554", raw: "Osborne, VirgleFriends of Virgle Osborne", type: "State Representative, 2nd DistrictRepublican" },
  { sooRsn: "101418", raw: "Owens, MarkMark Owens for Oregon", type: "State Representative, 60th DistrictRepublican" },
  { sooRsn: "100615", raw: "Pham, HaiFriends of Hai Pham", type: "State Representative, 36th DistrictDemocrat" },
  { sooRsn: "101416", raw: "Reiner, AimeeAimee Reiner and Friends", type: "State Representative, 39th DistrictRepublican" },
  { sooRsn: "100730", raw: "Reschke, E WernerWerner for Oregon", type: "State Representative, 55th DistrictRepublican" },
  { sooRsn: "101069", raw: "Reynolds, LisaFriends of Lisa Reynolds", type: "State Representative, 34th DistrictDemocrat" },
  { sooRsn: "100608", raw: "Ruiz, RicardoRicki for Oregon", type: "State Representative, 50th DistrictDemocrat" },
  { sooRsn: "100616", raw: "Sanchez, TawnaTawna Sanchez for Oregon", type: "State Representative, 43rd DistrictDemocrat" },
  { sooRsn: "100810", raw: "Scharf, AnnaFriends of Anna Scharf", type: "State Representative, 23rd DistrictRepublican" },
  { sooRsn: "100929", raw: "Skarlatos, AlekAlek for Oregon", type: "State Representative, 4th DistrictRepublican" },
  { sooRsn: "100520", raw: "Smith, GregoryCommittee to Re-Elect Greg Smith", type: "State Representative, 57th DistrictRepublican" },
  { sooRsn: "100780", raw: "Sosa, NathanNathan Sosa for Oregon", type: "State Representative, 30th DistrictDemocrat" },
  { sooRsn: "102249", raw: "Stapleton, VirginiaElect Virginia Stapleton", type: "State Representative, 21st DistrictDemocrat" },
  { sooRsn: "98720", raw: "Struthers, AndrewCommittee to Elect Struthers", type: "State Representative, 16th DistrictDemocrat" },
  { sooRsn: "103564", raw: "Tran, ThuyFriends of Thuy Tran", type: "State Representative, 45th DistrictDemocrat" },
  { sooRsn: "100655", raw: "Valderrama, AndreaFriends of Andrea Valderrama", type: "State Representative, 47th DistrictDemocrat" },
  { sooRsn: "100703", raw: "Virnig, TerrenceTerrence Virnig Dist 15", type: "State Representative, 15th DistrictDemocrat" },
  { sooRsn: "100842", raw: "Walden Poublon, NickTeam NWP", type: "State Representative, 52nd DistrictDemocrat" },
  { sooRsn: "101075", raw: "Wallan, KimberlyFriends of Kim Wallan", type: "State Representative, 6th DistrictRepublican" },
  { sooRsn: "100618", raw: "Walters, JuliannaFriends of Jules Walters", type: "State Representative, 37th DistrictDemocrat" },
  { sooRsn: "100786", raw: "Warren, AugustAugust Warren for HD2", type: "State Representative, 2nd DistrictDemocrat" },
  { sooRsn: "98617", raw: "WATKINS, DUSTINCommittee to Elect Dustin Watkins", type: "State Representative, 3rd DistrictDemocrat" },
  { sooRsn: "103156", raw: "Wright, GeraldFriends of Boomer Wright", type: "State Representative, 9th DistrictRepublican" },
  { sooRsn: "101158", raw: "Wright, KrissKriss Wright for Oregon", type: "State Representative, 23rd DistrictDemocrat" },
  { sooRsn: "98230", raw: "Yunker, DwayneYunker for State Representative", type: "State Representative, 3rd DistrictRepublican" },
  { sooRsn: "100032", raw: "Zimmerman, CaseyCasey For Oregon", type: "State Representative, 35th DistrictDemocrat" },
  // State Senators
  { sooRsn: "98692", raw: "Anderson, DickDick Anderson for Oregon", type: "State Senator, 5th DistrictRepublican" },
  { sooRsn: "100801", raw: "Ashland, MikeMike Ashland for Senate", type: "State Senator, 9th DistrictDemocrat" },
  { sooRsn: "100649", raw: "Beaudreau, JoFriends of Jo Beaudreau", type: "State Senator, 5th DistrictDemocrat" },
  { sooRsn: "100648", raw: "Broadman, AnthonyTeam Broadman", type: "State Senator, 27th DistrictDemocrat" },
  { sooRsn: "100834", raw: "Campos, WlnsveyCampos for Oregon", type: "State Senator, 18th DistrictDemocrat" },
  { sooRsn: "97970", raw: "Doherty, JimFriends of Jim Doherty", type: "State Senator, 29th DistrictRepublican" },
  { sooRsn: "100652", raw: "Frederick, LewFriends of Lew Frederick", type: "State Senator, 22nd DistrictDemocrat" },
  { sooRsn: "101565", raw: "Girod, FredFriends of Fred Girod", type: "State Senator, 9th DistrictRepublican" },
  { sooRsn: "100399", raw: "Goodwin, ChristineChristine Goodwin for Oregon", type: "State Senator, 2nd DistrictRepublican" },
  { sooRsn: "98852", raw: "Gorsek, ChristopherFriends of Chris Gorsek", type: "State Senator, 25th DistrictDemocrat" },
  { sooRsn: "103301", raw: "Gutierrez, JordanJordan For State Senate", type: "State Senator, 16th DistrictDemocrat" },
  { sooRsn: "96028", raw: "Heard, DallasHeard Leadership PAC", type: "State Senator, 1st DistrictRepublican" },
  { sooRsn: "99993", raw: "Henslee, DavidElect Dave Henslee", type: "State Senator, 28th DistrictRepublican" },
  { sooRsn: "96861", raw: "Huwe, AndyHuwe For Us", type: "State Senator, 29th DistrictRepublican" },
  { sooRsn: "97794", raw: "Knopp, TimTim Knopp for State Senate", type: "State Senator, 27th DistrictRepublican" },
  { sooRsn: "99474", raw: "Lieber, KateKate Lieber for State Senate", type: "State Senator, 14th DistrictDemocrat" },
  { sooRsn: "98506", raw: "Linthicum, DennisCommittee to Elect Dennis Linthicum", type: "State Senator, 28th DistrictRepublican" },
  { sooRsn: "100729", raw: "Linthicum, DianeLinthicum for Oregon", type: "State Senator, 28th DistrictRepublican" },
  { sooRsn: "100161", raw: "Love, RaymondRaymond Love for State Senate", type: "State Senator, 25th DistrictRepublican" },
  { sooRsn: "103152", raw: "McLane, MikeMike McLane for Oregon", type: "State Senator, 30th DistrictRepublican" },
  { sooRsn: "103153", raw: "Nash, ToddFriends of Todd Nash", type: "State Senator, 29th DistrictRepublican" },
  { sooRsn: "98901", raw: "Parker, RyanRyan for Senate District 5", type: "State Senator, 5th DistrictDemocrat" },
  { sooRsn: "103233", raw: "Pham, KatherineFriends of Khanh Pham", type: "State Senator, 23rd DistrictDemocrat" },
  { sooRsn: "100980", raw: "Pierson, BrianFriends of Brian E. Pierson", type: "State Senator, 18th DistrictRepublican" },
  { sooRsn: "99479", raw: "Robinson, ArtArt Robinson for Oregon Senate", type: "State Senator, 2nd DistrictRepublican" },
  { sooRsn: "100820", raw: "Robinson, NoahNoah Robinson for Oregon Senate", type: "State Senator, 2nd DistrictRepublican" },
  { sooRsn: "100516", raw: "Saperstein, MichaelMichael Saperstein for Senate", type: "State Senator, 22nd DistrictRepublican" },
  { sooRsn: "100902", raw: "Smith, David BrockFriends of David Brock Smith", type: "State Senator, 1st DistrictRepublican" },
  { sooRsn: "103155", raw: "Starr, BruceStarr Leadership Fund", type: "State Senator, 12th DistrictRepublican" },
  { sooRsn: "102524", raw: "Summers, MatthewSummers for Oregon", type: "State Senator, 27th DistrictRepublican" },
  { sooRsn: "100035", raw: "Taylor, KathleenKathleen Taylor for Oregon", type: "State Senator, 21st DistrictDemocrat" },
  { sooRsn: "100639", raw: "Thompson, TracyFriends of Tracy Thompson", type: "State Senator, 2nd DistrictDemocrat" },
  { sooRsn: "99305", raw: "Vaughn, ToddFriends of Todd Vaughn", type: "State Senator, 1st DistrictRepublican" },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DbCandidate {
  id: string;
  fullName: string;
  jurisdiction: string;
}

interface OrestarContrib {
  contributor: string;
  subType: string;
  amount: number;
}

interface CommitteeResult {
  sooRsn: string;
  lastName: string;
  firstInitial: string;
  chamber: "house" | "senate";
  contribs: OrestarContrib[];
}

// ---------------------------------------------------------------------------
// Name normalization
// ---------------------------------------------------------------------------

const SUFFIXES = new Set(["JR", "SR", "II", "III", "IV"]);

function norm(s: string): string {
  return s
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractLastName(fullName: string): string {
  const parts = norm(fullName).split(" ").filter(Boolean);
  for (let i = parts.length - 1; i >= 0; i--) {
    if (!SUFFIXES.has(parts[i] ?? "")) return parts[i] ?? "";
  }
  return parts[parts.length - 1] ?? "";
}

function extractFirstInitial(fullName: string): string {
  return norm(fullName).split(" ").filter(Boolean)[0]?.[0] ?? "";
}

/** Parse "Last, FirstCommitteeName" ORESTAR format */
function parseCandidateFromRaw(raw: string): { lastName: string; firstInitial: string } {
  const commaIdx = raw.indexOf(",");
  if (commaIdx < 0) {
    const first = norm(raw.split(/\s+/)[0] ?? "");
    return { lastName: first, firstInitial: "" };
  }
  const lastName = norm(raw.substring(0, commaIdx).trim());
  const rest = raw.substring(commaIdx + 1).trim();
  const firstInitial = norm(rest.split(/\s+/)[0] ?? "")[0] ?? "";
  return { lastName, firstInitial };
}

function chamberFromType(type: string): "house" | "senate" {
  return type.includes("State Senator") ? "senate" : "house";
}

// ---------------------------------------------------------------------------
// Bucket classification (ORESTAR has limited contributor metadata)
// ---------------------------------------------------------------------------

function classifyOrestarContributor(
  contributor: string,
  amount: number,
  subType: string,
): DonorBucketLabel {
  const upper = contributor.toUpperCase().trim();

  if (upper.startsWith("MISCELLANEOUS CASH CONTRIBUTIONS") ||
      upper.startsWith("MISCELLANEOUS IN-KIND") ||
      upper.startsWith("MISCELLANEOUS ACCOUNTS PAYABLE")) {
    return "Small individual donors (under $200)";
  }

  if (upper.includes("ACTBLUE") || upper.includes("WINRED") || upper.includes("FUNDRAISE.COM")) {
    return "Small individual donors (under $200)";
  }

  // Committee/PAC: has numeric ID in parens, e.g. "(306)"
  if (/\(\d+\)/.test(contributor)) {
    const bucketFromName = mapEmployerToBucket(contributor);
    if (bucketFromName) return bucketFromName;
    const nameUpper = contributor.toUpperCase();
    if (nameUpper.includes("DEMOCRATIC") || nameUpper.includes("REPUBLICAN") ||
        nameUpper.includes("PARTY") || nameUpper.includes("CENTRAL COMMITTEE") ||
        nameUpper.includes("DEMOCRATIC CAUCUS") || nameUpper.includes("REPUBLICAN CAUCUS")) {
      return "Party committees";
    }
    return "Other";
  }

  // Try industry mapping on the name
  const bucketFromName = mapEmployerToBucket(contributor);
  if (bucketFromName && bucketFromName !== "Other" && bucketFromName !== "Self-funded") {
    return bucketFromName;
  }

  // Individual contributor
  return bucketIndividualByAmount(amount);
}

// ---------------------------------------------------------------------------
// Per-committee data collection using Playwright page navigation
// ---------------------------------------------------------------------------

async function getCommitteeId(page: Page, sooRsn: string, csrf: string): Promise<string | null> {
  await page.goto(
    `${ORESTAR_BASE}/sooDetail.do?sooRsn=${sooRsn}&OWASP_CSRFTOKEN=${csrf}`,
    { waitUntil: "load", timeout: 20000 },
  );
  return page.evaluate(() => {
    const links = Array.from(document.querySelectorAll("a[href]")) as HTMLAnchorElement[];
    for (const l of links) {
      const m = l.href.match(/filerId=(\d+)/);
      if (m?.[1]) return m[1];
    }
    return null;
  });
}

interface ParsedPage {
  contribs: OrestarContrib[];
  /** true if a row with year < 2023 was seen — safe to stop paginating */
  foundPreCycle: boolean;
  rowCount: number;
}

/** Extract transaction rows from the current page via DOM queries. */
async function extractPageRows(page: Page, validYears: Set<string>): Promise<ParsedPage> {
  return page.evaluate((years: string[]) => {
    const validSet = new Set(years);
    const contribs: Array<{ contributor: string; subType: string; amount: number }> = [];
    let foundPreCycle = false;
    let rowCount = 0;

    // Use document-level querySelectorAll to get each <tr> exactly once
    // (table.querySelectorAll would include nested table rows, causing duplicates)
    {
      const rows = Array.from(document.querySelectorAll("tr"));
      for (const row of rows) {
        const cells = Array.from(row.querySelectorAll("td")).map((td) =>
          (td.textContent ?? "").replace(/\s+/g, " ").trim(),
        );
        if (cells.length < 7) continue;
        // Data rows: cell[1] is a date MM/DD/YYYY, cell[6] starts with $
        const dateCell = cells[1] ?? "";
        const amountCell = cells[6] ?? "";
        if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dateCell)) continue;
        if (!amountCell.startsWith("$")) continue;
        rowCount++;
        const year = dateCell.split("/")[2] ?? "";
        if (year && parseInt(year, 10) < 2023) {
          foundPreCycle = true;
          continue;
        }
        if (!validSet.has(year)) continue;
        const subType = cells[5] ?? "";
        if (!subType.includes("Contribution")) continue;
        const amount = parseFloat(amountCell.replace(/[$,]/g, ""));
        if (!isFinite(amount) || amount <= 0) continue;
        const contributor = cells[4] ?? "";
        contribs.push({ contributor, subType, amount });
      }
    } // end block (single querySelectorAll pass)
    return { contribs, foundPreCycle, rowCount };
  }, [...validYears]);
}

async function getCommitteeContribs(
  page: Page,
  committeeId: string,
  csrf: string,
): Promise<OrestarContrib[]> {
  const allContribs: OrestarContrib[] = [];
  let pageIdx = 0;
  let keepGoing = true;
  let firstPageRowCount = 0;
  let totalRecords = 0;

  while (keepGoing) {
    const url =
      pageIdx === 0
        ? `${ORESTAR_BASE}/cneSearch.do?cneSearchButtonName=search&cneSearchFilerCommitteeId=${committeeId}&OWASP_CSRFTOKEN=${csrf}`
        : `${ORESTAR_BASE}/gotoPublicTransactionSearchResults.do?cneSearchButtonName=next&cneSearchFilerCommitteeId=${committeeId}&cneSearchContributorTxtSearchType=C&cneSearchFilerCommitteeTxtSearchType=C&cneSearchPageIdx=${pageIdx}&OWASP_CSRFTOKEN=${csrf}`;

    await page.goto(url, { waitUntil: "load", timeout: 20000 });

    const { contribs: contribsOnPage, foundPreCycle, rowCount } = await extractPageRows(
      page,
      VALID_YEARS,
    );
    allContribs.push(...contribsOnPage);

    // Stop immediately once we see a pre-2023 row (ORESTAR is newest-first)
    if (foundPreCycle) {
      keepGoing = false;
    } else if (pageIdx === 0) {
      // Extract total record count from page text
      const totalText = await page.evaluate(() => {
        const tds = Array.from(document.querySelectorAll("td"));
        for (const td of tds) {
          const m = td.textContent?.match(/(\d+) records found/);
          if (m?.[1]) return m[1];
        }
        return "0";
      });
      totalRecords = parseInt(totalText ?? "0", 10);
      firstPageRowCount = rowCount;
      if (firstPageRowCount >= totalRecords || totalRecords === 0) keepGoing = false;
    } else {
      if (rowCount === 0) keepGoing = false;
      if (firstPageRowCount > 0) {
        const fetched = pageIdx * firstPageRowCount + rowCount;
        if (fetched >= totalRecords) keepGoing = false;
      }
    }

    pageIdx++;
    if (pageIdx > 100) {
      console.warn(`[or-orestar] committeeId=${committeeId} reached page limit`);
      keepGoing = false;
    }
  }

  return allContribs;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const isDryRun = process.argv.includes("--dry-run");

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  console.log("[or-orestar] establishing ORESTAR session...");
  // Visit home page first to satisfy WAF JS challenge
  await page.goto(`${ORESTAR_BASE}/`, { waitUntil: "load", timeout: 30000 });
  await page.waitForTimeout(1500);

  await page.goto(
    `${ORESTAR_BASE}/gotoPublicTransactionSearch.do`,
    { waitUntil: "load", timeout: 30000 },
  );
  await page.waitForTimeout(1000);

  // Extract CSRF token from any navigation link
  const csrf = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll("a[href]")) as HTMLAnchorElement[];
    for (const l of links) {
      const m = l.href.match(/OWASP_CSRFTOKEN=([A-Z0-9-]+)/);
      if (m?.[1]) return m[1];
    }
    return null;
  });

  if (!csrf) {
    console.error("[or-orestar] could not extract CSRF token — aborting");
    await browser.close();
    process.exitCode = 1;
    return;
  }

  console.log(`[or-orestar] CSRF: ${csrf.substring(0, 8)}... collecting ${OR_2024_COMMITTEES.length} committees`);

  const results: CommitteeResult[] = [];

  for (let i = 0; i < OR_2024_COMMITTEES.length; i++) {
    const committee = OR_2024_COMMITTEES[i]!;
    const { lastName, firstInitial } = parseCandidateFromRaw(committee.raw);
    const chamber = chamberFromType(committee.type);

    process.stdout.write(`[or-orestar] [${i + 1}/${OR_2024_COMMITTEES.length}] ${committee.raw.split(",")[0]}... `);

    try {
      const committeeId = await getCommitteeId(page, committee.sooRsn, csrf);
      if (!committeeId) {
        console.log("no committeeId");
        continue;
      }

      const contribs = await getCommitteeContribs(page, committeeId, csrf);
      const count2024 = contribs.length;
      console.log(`${count2024} contributions`);

      results.push({ sooRsn: committee.sooRsn, lastName, firstInitial, chamber, contribs });
    } catch (e) {
      console.log(`error: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  await browser.close();

  // Load DB candidates for OR
  const db = requireDb();

  const orHouse = (await db
    .select()
    .from(candidates)
    .where(sql`${candidates.jurisdiction} = 'state-OR-house'`)) as DbCandidate[];
  const orSenate = (await db
    .select()
    .from(candidates)
    .where(sql`${candidates.jurisdiction} = 'state-OR-senate'`)) as DbCandidate[];

  console.log(`[or-orestar] DB: house=${orHouse.length} senate=${orSenate.length}`);

  const houseIdx = new Map<string, DbCandidate[]>();
  const senateIdx = new Map<string, DbCandidate[]>();

  for (const c of orHouse) {
    const last = extractLastName(c.fullName);
    if (!last) continue;
    const arr = houseIdx.get(last) ?? [];
    arr.push(c);
    houseIdx.set(last, arr);
  }
  for (const c of orSenate) {
    const last = extractLastName(c.fullName);
    if (!last) continue;
    const arr = senateIdx.get(last) ?? [];
    arr.push(c);
    senateIdx.set(last, arr);
  }

  // Aggregate
  const agg = new Map<string, number>();
  let totalContribs = 0;
  let totalSkipped = 0;

  for (const result of results) {
    const { lastName, firstInitial, chamber, contribs } = result;
    const idx = chamber === "house" ? houseIdx : senateIdx;
    const dbCandidates = idx.get(lastName);
    if (!dbCandidates || dbCandidates.length === 0) {
      totalSkipped += contribs.length;
      continue;
    }

    let dbMatch: DbCandidate;
    if (dbCandidates.length === 1) {
      dbMatch = dbCandidates[0]!;
    } else {
      dbMatch =
        dbCandidates.find((c) => extractFirstInitial(c.fullName) === firstInitial) ??
        dbCandidates[0]!;
    }

    for (const contrib of contribs) {
      const bucket = classifyOrestarContributor(contrib.contributor, contrib.amount, contrib.subType);
      const aggKey = `${dbMatch.id}|${ELECTION_CYCLE}|${bucket}`;
      agg.set(aggKey, (agg.get(aggKey) ?? 0) + contrib.amount);
      totalContribs++;
    }
  }

  const matchedCandidates = new Set(
    [...agg.keys()].map((k) => k.substring(0, k.indexOf("|"))),
  );

  console.log(
    `[or-orestar] contribs_processed=${totalContribs} skipped=${totalSkipped} ` +
      `candidates_matched=${matchedCandidates.size} rows_to_upsert=${agg.size}`,
  );

  if (isDryRun) {
    const sample = [...agg.entries()].slice(0, 5);
    for (const [key, amt] of sample) {
      const [cid, , bucket] = key.split("|");
      console.log(`[or-orestar] [dry-run] candidate=${cid} bucket=${bucket} amount=${amt.toFixed(2)}`);
    }
    return;
  }

  let upserted = 0;
  for (const [aggKey, amount] of agg) {
    const firstPipe = aggKey.indexOf("|");
    const secondPipe = aggKey.indexOf("|", firstPipe + 1);
    const candidateId = aggKey.substring(0, firstPipe);
    const cycle = aggKey.substring(firstPipe + 1, secondPipe);
    const bucketLabel = aggKey.substring(secondPipe + 1) as DonorBucketLabel;

    await db
      .insert(donorAggregates)
      .values({
        candidateId,
        electionCycle: cycle,
        bucketLabel,
        amountTotal: amount.toFixed(2),
        source: SOURCE,
        sourceUrl: SOURCE_URL,
        rawMetadata: {},
        insertedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [
          donorAggregates.candidateId,
          donorAggregates.electionCycle,
          donorAggregates.bucketLabel,
        ],
        set: {
          amountTotal: sql`excluded.amount_total`,
          source: sql`excluded.source`,
          sourceUrl: sql`excluded.source_url`,
          rawMetadata: sql`excluded.raw_metadata`,
          insertedAt: sql`excluded.inserted_at`,
        },
      });
    upserted++;
  }

  console.log(`[or-orestar] done upserted=${upserted}`);
}

function isCliExecution(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === pathToFileURL(resolve(entry)).href;
}

if (isCliExecution()) {
  main().catch((e) => {
    console.error("[or-orestar] error:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  });
}
