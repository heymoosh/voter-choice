// Voter ID requirements index
// Detailed JSON files exist for states with full data.
// All other states have basic data here.

export interface VoterIdInfo {
  state: string;
  voterIdRequired: boolean;
  idType: "strict-photo" | "photo" | "non-photo" | "none";
  acceptedIds: string[];
  exceptions: string;
  provisionalBallot: boolean;
  provisionalBallotRules: string;
  phonesAtPolls: boolean;
  phonesAtPollsDetail: string;
  sourceUrl: string;
  lastVerified: string;
}

// Minimal fallback data for all states. Full JSON files override these for TX, CA, NH.
const VOTER_ID_DATA: Record<string, VoterIdInfo> = {
  AL: {
    state: "AL",
    voterIdRequired: true,
    idType: "strict-photo",
    acceptedIds: [
      "Alabama driver's license or non-driver ID",
      "Alabama photo voter ID card",
      "US passport",
      "Military ID",
      "Student ID from Alabama public college/university",
    ],
    exceptions:
      "Voters without ID can cast a provisional ballot and verify identity within days.",
    provisionalBallot: true,
    provisionalBallotRules:
      "Present acceptable ID within 2 days of the election.",
    phonesAtPolls: false,
    phonesAtPollsDetail: "Recording devices prohibited in polling place.",
    sourceUrl: "https://www.sos.alabama.gov/alabama-votes/voter/voter-id-laws",
    lastVerified: "2026-04-03",
  },
  AK: {
    state: "AK",
    voterIdRequired: true,
    idType: "non-photo",
    acceptedIds: [
      "Alaska driver's license or ID",
      "US passport",
      "Voter ID card",
      "Military ID",
    ],
    exceptions:
      "If name and signature match voter rolls, ID may not be required.",
    provisionalBallot: true,
    provisionalBallotRules:
      "Provisional ballots verified by election officials.",
    phonesAtPolls: true,
    phonesAtPollsDetail: "Phones allowed; ballot photography restricted.",
    sourceUrl: "https://www.elections.alaska.gov/voters/voter-id/",
    lastVerified: "2026-04-03",
  },
  AZ: {
    state: "AZ",
    voterIdRequired: true,
    idType: "photo",
    acceptedIds: [
      "Arizona driver's license or ID",
      "US passport",
      "Tribal enrollment card",
      "Military ID",
    ],
    exceptions:
      "Voters may present two non-photo documents showing name and address as an alternative.",
    provisionalBallot: true,
    provisionalBallotRules:
      "Provisional ballot available; voters have 5 business days to provide ID.",
    phonesAtPolls: true,
    phonesAtPollsDetail:
      "Phones allowed but photography of ballots is prohibited.",
    sourceUrl: "https://azsos.gov/elections/voters/voter-id",
    lastVerified: "2026-04-03",
  },
  AR: {
    state: "AR",
    voterIdRequired: true,
    idType: "photo",
    acceptedIds: [
      "Arkansas driver's license",
      "US passport",
      "Military ID",
      "Student ID from Arkansas school",
      "Concealed handgun license",
    ],
    exceptions:
      "Voters without ID can cast a provisional ballot and verify identity within 3 days.",
    provisionalBallot: true,
    provisionalBallotRules: "Provide ID within 3 business days.",
    phonesAtPolls: false,
    phonesAtPollsDetail: "Phones prohibited inside polling area.",
    sourceUrl:
      "https://www.sos.arkansas.gov/elections/voter-information/voter-id/",
    lastVerified: "2026-04-03",
  },
  CO: {
    state: "CO",
    voterIdRequired: true,
    idType: "non-photo",
    acceptedIds: [
      "Colorado driver's license",
      "US passport",
      "Utility bill",
      "Bank statement",
      "Government document with name and address",
    ],
    exceptions:
      "Wide range of documents qualify. Mail-in voting does not require ID.",
    provisionalBallot: true,
    provisionalBallotRules:
      "Provisional ballots verified by signature comparison.",
    phonesAtPolls: true,
    phonesAtPollsDetail: "Phones permitted; no ballot photography.",
    sourceUrl: "https://www.coloradosos.gov/voter/pages/pub/voter_id.xhtml",
    lastVerified: "2026-04-03",
  },
  CT: {
    state: "CT",
    voterIdRequired: false,
    idType: "none",
    acceptedIds: [],
    exceptions: "First-time voters who registered by mail must show ID.",
    provisionalBallot: true,
    provisionalBallotRules:
      "Provisional ballot available if issues arise at polls.",
    phonesAtPolls: true,
    phonesAtPollsDetail: "Phones allowed; recording restrictions apply.",
    sourceUrl: "https://portal.ct.gov/SOTS/Election-Services/Voter-Information",
    lastVerified: "2026-04-03",
  },
  DE: {
    state: "DE",
    voterIdRequired: false,
    idType: "none",
    acceptedIds: [],
    exceptions: "First-time voters may be asked for ID.",
    provisionalBallot: true,
    provisionalBallotRules: "Provisional ballots counted after verification.",
    phonesAtPolls: true,
    phonesAtPollsDetail: "Phones permitted; ballot secrecy must be maintained.",
    sourceUrl: "https://elections.delaware.gov/voter/votereg.shtml",
    lastVerified: "2026-04-03",
  },
  DC: {
    state: "DC",
    voterIdRequired: false,
    idType: "none",
    acceptedIds: [],
    exceptions:
      "No photo ID required. Statement of your name may be sufficient.",
    provisionalBallot: true,
    provisionalBallotRules:
      "Provisional ballot if registration cannot be confirmed.",
    phonesAtPolls: true,
    phonesAtPollsDetail: "Phones permitted; no interfering with other voters.",
    sourceUrl:
      "https://www.dcboe.org/Voters/Voting-Accessibility/Voter-ID-Requirements",
    lastVerified: "2026-04-03",
  },
  FL: {
    state: "FL",
    voterIdRequired: true,
    idType: "photo",
    acceptedIds: [
      "Florida driver's license",
      "Florida ID card",
      "US passport",
      "Military ID",
      "Student ID from Florida school",
      "Neighborhood association ID",
      "Retirement center ID",
      "Public assistance ID",
    ],
    exceptions:
      "Voters without ID may cast a provisional ballot and must sign an affidavit.",
    provisionalBallot: true,
    provisionalBallotRules:
      "Provisional ballot counted after signature verification.",
    phonesAtPolls: false,
    phonesAtPollsDetail:
      "Phones must be silenced; use in voting booth is prohibited.",
    sourceUrl:
      "https://dos.myflorida.com/elections/for-voters/voter-registration/photo-id-requirement/",
    lastVerified: "2026-04-03",
  },
  GA: {
    state: "GA",
    voterIdRequired: true,
    idType: "strict-photo",
    acceptedIds: [
      "Georgia driver's license",
      "Georgia ID card",
      "US passport",
      "Military ID",
      "Student ID from Georgia public school",
      "Tribal ID",
    ],
    exceptions:
      "Voters who do not have acceptable ID may cast a provisional ballot and provide ID by the deadline.",
    provisionalBallot: true,
    provisionalBallotRules:
      "Provide acceptable ID by the 3rd day after the election.",
    phonesAtPolls: false,
    phonesAtPollsDetail:
      "Cell phones prohibited in voting lines and at voting booths.",
    sourceUrl: "https://georgia.gov/voter-identification-requirements",
    lastVerified: "2026-04-03",
  },
  HI: {
    state: "HI",
    voterIdRequired: false,
    idType: "none",
    acceptedIds: [],
    exceptions:
      "Hawaii uses mail-in voting by default. In-person voters may show ID.",
    provisionalBallot: true,
    provisionalBallotRules: "Provisional ballot available.",
    phonesAtPolls: true,
    phonesAtPollsDetail: "Phones permitted; no interference with other voters.",
    sourceUrl: "https://elections.hawaii.gov/voters/",
    lastVerified: "2026-04-03",
  },
  ID: {
    state: "ID",
    voterIdRequired: true,
    idType: "photo",
    acceptedIds: [
      "Idaho driver's license",
      "Idaho ID card",
      "US passport",
      "Military ID",
      "Student ID from Idaho school",
      "Tribal ID",
    ],
    exceptions:
      "Voters without photo ID can sign a poll book Personal Identification Affidavit.",
    provisionalBallot: true,
    provisionalBallotRules: "Affidavit allows same-day voting.",
    phonesAtPolls: true,
    phonesAtPollsDetail: "Phones permitted outside voting booth.",
    sourceUrl: "https://sos.idaho.gov/elect/voter/votinfo.html",
    lastVerified: "2026-04-03",
  },
  IL: {
    state: "IL",
    voterIdRequired: false,
    idType: "none",
    acceptedIds: [],
    exceptions: "First-time voters who registered by mail must show ID.",
    provisionalBallot: true,
    provisionalBallotRules: "Provisional ballot counted after verification.",
    phonesAtPolls: true,
    phonesAtPollsDetail: "Phones allowed; ballot photography prohibited.",
    sourceUrl:
      "https://www.elections.il.gov/electionoperations/voterregistration.aspx",
    lastVerified: "2026-04-03",
  },
  IN: {
    state: "IN",
    voterIdRequired: true,
    idType: "photo",
    acceptedIds: [
      "Indiana driver's license",
      "Indiana ID card",
      "US military ID",
      "US passport",
    ],
    exceptions:
      "Voters who sign an affidavit stating they cannot obtain ID due to religious beliefs may vote without ID.",
    provisionalBallot: true,
    provisionalBallotRules:
      "Provisional ballot; bring valid ID within 10 days.",
    phonesAtPolls: false,
    phonesAtPollsDetail: "Cell phones prohibited in polling booths.",
    sourceUrl: "https://www.in.gov/sos/elections/voter-information/photo-id/",
    lastVerified: "2026-04-03",
  },
  IA: {
    state: "IA",
    voterIdRequired: true,
    idType: "photo",
    acceptedIds: [
      "Iowa driver's license",
      "Iowa non-operator ID",
      "US passport",
      "Military ID",
      "Iowa voter ID card",
    ],
    exceptions:
      "Voters without ID may request a voter ID card from the county auditor for free.",
    provisionalBallot: true,
    provisionalBallotRules:
      "Provisional ballot; address issues with county by the following Monday.",
    phonesAtPolls: false,
    phonesAtPollsDetail: "Cell phones prohibited in voting booth.",
    sourceUrl: "https://sos.iowa.gov/elections/voterinformation/voterid.html",
    lastVerified: "2026-04-03",
  },
  KS: {
    state: "KS",
    voterIdRequired: true,
    idType: "photo",
    acceptedIds: [
      "Kansas driver's license",
      "Kansas ID card",
      "US passport",
      "Military ID",
      "Student ID from Kansas college",
    ],
    exceptions:
      "Voters 65+ may use any expired photo ID. Voters without ID can sign a Declaration of Religious Objection.",
    provisionalBallot: true,
    provisionalBallotRules:
      "Provisional ballot; submit ID to county election office by the closing of business on Friday after the election.",
    phonesAtPolls: true,
    phonesAtPollsDetail: "Phones permitted; no recording in polling place.",
    sourceUrl: "https://sos.ks.gov/elections/voter-id.html",
    lastVerified: "2026-04-03",
  },
  KY: {
    state: "KY",
    voterIdRequired: true,
    idType: "photo",
    acceptedIds: [
      "Kentucky driver's license",
      "Kentucky ID card",
      "US passport",
      "Military ID",
      "Social security card plus another ID",
    ],
    exceptions:
      "Voters who do not have acceptable photo ID may present other forms of identification at the discretion of election officials.",
    provisionalBallot: true,
    provisionalBallotRules:
      "Provisional ballot available; verify with county clerk within days.",
    phonesAtPolls: false,
    phonesAtPollsDetail: "Cell phones not permitted in voting booth.",
    sourceUrl: "https://elect.ky.gov/Voters/Pages/Photo-ID.aspx",
    lastVerified: "2026-04-03",
  },
  LA: {
    state: "LA",
    voterIdRequired: true,
    idType: "photo",
    acceptedIds: [
      "Louisiana driver's license",
      "Louisiana ID card",
      "US passport",
      "Military ID",
      "Louisiana concealed handgun permit",
    ],
    exceptions:
      "Voters without photo ID may use a signed affidavit to cast a provisional ballot.",
    provisionalBallot: true,
    provisionalBallotRules:
      "Provisional ballot; verify by 4:30 PM on the 5th day after election.",
    phonesAtPolls: false,
    phonesAtPollsDetail: "Phones prohibited in polling place.",
    sourceUrl:
      "https://www.sos.la.gov/ElectionsAndVoting/Vote/VoterIDRequirements/Pages/default.aspx",
    lastVerified: "2026-04-03",
  },
  ME: {
    state: "ME",
    voterIdRequired: false,
    idType: "none",
    acceptedIds: [],
    exceptions: "No ID required. Voters are checked against voter rolls.",
    provisionalBallot: false,
    provisionalBallotRules:
      "Challenged ballots are available if eligibility is disputed.",
    phonesAtPolls: true,
    phonesAtPollsDetail: "Phones permitted; no recording in voting booths.",
    sourceUrl: "https://www.maine.gov/sos/cec/elec/voter-info/",
    lastVerified: "2026-04-03",
  },
  MD: {
    state: "MD",
    voterIdRequired: false,
    idType: "none",
    acceptedIds: [],
    exceptions: "First-time voters who registered by mail may be asked for ID.",
    provisionalBallot: true,
    provisionalBallotRules: "Provisional ballot counted after verification.",
    phonesAtPolls: true,
    phonesAtPollsDetail:
      "Phones permitted but use is restricted to not interfere with other voters.",
    sourceUrl: "https://voterservices.elections.maryland.gov/VoterInformation",
    lastVerified: "2026-04-03",
  },
  MA: {
    state: "MA",
    voterIdRequired: false,
    idType: "none",
    acceptedIds: [],
    exceptions:
      "First-time voters who did not register in person may be asked for ID.",
    provisionalBallot: true,
    provisionalBallotRules: "Provisional (provisional) ballot available.",
    phonesAtPolls: true,
    phonesAtPollsDetail:
      "Phones permitted in polling place; photography of ballots is prohibited.",
    sourceUrl:
      "https://www.sec.state.ma.us/ele/elevoterregistration/voterregistrationidx.htm",
    lastVerified: "2026-04-03",
  },
  MI: {
    state: "MI",
    voterIdRequired: true,
    idType: "photo",
    acceptedIds: [
      "Michigan driver's license",
      "Michigan state ID",
      "US passport",
      "Military ID",
      "Student ID",
    ],
    exceptions:
      "Voters without acceptable ID can sign an affidavit at the polls and their ballot will be processed.",
    provisionalBallot: false,
    provisionalBallotRules:
      "Signing an affidavit allows voting; ballot is processed normally.",
    phonesAtPolls: true,
    phonesAtPollsDetail:
      "Cell phone use is permitted; photography of ballots is prohibited.",
    sourceUrl: "https://mvic.sos.state.mi.us/Voter/Index",
    lastVerified: "2026-04-03",
  },
  MN: {
    state: "MN",
    voterIdRequired: false,
    idType: "none",
    acceptedIds: [],
    exceptions:
      "Voters can vouch for each other. Vouching allows same-day registration.",
    provisionalBallot: false,
    provisionalBallotRules:
      "Same-day registration allows most eligible voters to vote.",
    phonesAtPolls: true,
    phonesAtPollsDetail: "Phones permitted; no recording of ballots.",
    sourceUrl: "https://www.sos.state.mn.us/elections-voting/ways-to-vote/",
    lastVerified: "2026-04-03",
  },
  MS: {
    state: "MS",
    voterIdRequired: true,
    idType: "strict-photo",
    acceptedIds: [
      "Mississippi driver's license",
      "Mississippi voter ID card",
      "US passport",
      "Government employee ID",
      "Military ID",
      "Student ID from Mississippi school",
    ],
    exceptions: "Religious objection exemption available via affidavit.",
    provisionalBallot: true,
    provisionalBallotRules:
      "Provisional ballot; verify with circuit clerk within 5 days.",
    phonesAtPolls: false,
    phonesAtPollsDetail: "Cell phones prohibited in voting booths.",
    sourceUrl: "https://www.sos.ms.gov/elections-voting/voter-id",
    lastVerified: "2026-04-03",
  },
  MO: {
    state: "MO",
    voterIdRequired: true,
    idType: "photo",
    acceptedIds: [
      "Missouri driver's license",
      "Missouri non-driver ID",
      "US passport",
      "Military ID",
      "Missouri concealed carry permit",
    ],
    exceptions:
      "Voters without photo ID may sign an affidavit and cast a provisional ballot.",
    provisionalBallot: true,
    provisionalBallotRules:
      "Provisional ballot; contact election authority to resolve.",
    phonesAtPolls: false,
    phonesAtPollsDetail: "Cell phones prohibited in voting booth.",
    sourceUrl: "https://sos.mo.gov/elections/goVoteMissouri/whatsneeded.asp",
    lastVerified: "2026-04-03",
  },
  MT: {
    state: "MT",
    voterIdRequired: true,
    idType: "photo",
    acceptedIds: [
      "Montana driver's license",
      "Montana ID card",
      "US passport",
      "Military ID",
      "Student ID from Montana school",
      "Tribal ID",
    ],
    exceptions: "Voters without photo ID can cast a provisional ballot.",
    provisionalBallot: true,
    provisionalBallotRules:
      "Provisional ballot processed if identity is verified.",
    phonesAtPolls: true,
    phonesAtPollsDetail: "Phones permitted; no electioneering.",
    sourceUrl: "https://sosmt.gov/elections/voter-information/voter-id/",
    lastVerified: "2026-04-03",
  },
  NE: {
    state: "NE",
    voterIdRequired: true,
    idType: "photo",
    acceptedIds: [
      "Nebraska driver's license",
      "Nebraska state ID",
      "US passport",
      "Military ID",
      "Nebraska student ID",
    ],
    exceptions:
      "Voters without ID may sign an affidavit to cast a provisional ballot.",
    provisionalBallot: true,
    provisionalBallotRules:
      "Present ID at county election office before canvass.",
    phonesAtPolls: false,
    phonesAtPollsDetail: "Cell phones must be turned off inside polling place.",
    sourceUrl: "https://sos.nebraska.gov/elections/voter-information",
    lastVerified: "2026-04-03",
  },
  NV: {
    state: "NV",
    voterIdRequired: false,
    idType: "none",
    acceptedIds: [],
    exceptions:
      "Nevada uses primarily mail-in ballots. In-person voters sign poll books.",
    provisionalBallot: true,
    provisionalBallotRules:
      "Provisional ballot available if eligibility is uncertain.",
    phonesAtPolls: true,
    phonesAtPollsDetail: "Phones permitted; no recording inside voting booths.",
    sourceUrl: "https://www.nvsos.gov/sos/elections/voters",
    lastVerified: "2026-04-03",
  },
  NJ: {
    state: "NJ",
    voterIdRequired: false,
    idType: "none",
    acceptedIds: [],
    exceptions: "First-time voters who registered by mail must provide ID.",
    provisionalBallot: true,
    provisionalBallotRules: "Provisional ballot counted after verification.",
    phonesAtPolls: true,
    phonesAtPollsDetail: "Phones permitted outside voting area.",
    sourceUrl: "https://www.nj.gov/state/elections/voter-registration.shtml",
    lastVerified: "2026-04-03",
  },
  NM: {
    state: "NM",
    voterIdRequired: false,
    idType: "none",
    acceptedIds: [],
    exceptions:
      "Voters provide their name, address, and year of birth. ID is not required.",
    provisionalBallot: true,
    provisionalBallotRules: "Provisional ballot available if issues arise.",
    phonesAtPolls: true,
    phonesAtPollsDetail:
      "Phones permitted; no electioneering inside polling place.",
    sourceUrl: "https://www.sos.nm.gov/voter-information/",
    lastVerified: "2026-04-03",
  },
  NY: {
    state: "NY",
    voterIdRequired: false,
    idType: "none",
    acceptedIds: [],
    exceptions:
      "First-time voters who registered by mail must provide ID. A wide range of documents qualify.",
    provisionalBallot: true,
    provisionalBallotRules:
      "Affidavit ballot available; will be counted if eligible.",
    phonesAtPolls: true,
    phonesAtPollsDetail:
      "Phones permitted outside voting booth; no photography of ballot.",
    sourceUrl: "https://www.elections.ny.gov/VotingID.html",
    lastVerified: "2026-04-03",
  },
  NC: {
    state: "NC",
    voterIdRequired: true,
    idType: "photo",
    acceptedIds: [
      "North Carolina driver's license",
      "North Carolina voter photo ID",
      "US passport",
      "Military ID",
      "Student ID from NC school",
    ],
    exceptions:
      "Voters without acceptable ID can cast a provisional ballot and submit a Reasonable Impediment Declaration.",
    provisionalBallot: true,
    provisionalBallotRules:
      "Submit Reasonable Impediment Declaration by 5PM the day after the election.",
    phonesAtPolls: false,
    phonesAtPollsDetail: "Cell phones prohibited inside voting enclosure.",
    sourceUrl: "https://www.ncsbe.gov/voting/voter-id",
    lastVerified: "2026-04-03",
  },
  ND: {
    state: "ND",
    voterIdRequired: true,
    idType: "strict-photo",
    acceptedIds: [
      "North Dakota driver's license",
      "North Dakota non-driver ID",
      "Tribal ID with name, address and date of birth",
      "Long-term care ID",
    ],
    exceptions:
      "No exceptions for lack of ID — voters must present qualifying ID to vote.",
    provisionalBallot: false,
    provisionalBallotRules:
      "North Dakota does not use provisional ballots. Voters must present ID.",
    phonesAtPolls: true,
    phonesAtPollsDetail: "Phones permitted but use is restricted.",
    sourceUrl: "https://vip.sos.nd.gov/PortalList.aspx",
    lastVerified: "2026-04-03",
  },
  OH: {
    state: "OH",
    voterIdRequired: true,
    idType: "photo",
    acceptedIds: [
      "Ohio driver's license",
      "Ohio ID card",
      "Military ID",
      "US passport",
      "Ohio photo debit card or credit card",
    ],
    exceptions:
      "Voters without photo ID may present a current utility bill, bank statement, or government document, or cast a provisional ballot.",
    provisionalBallot: true,
    provisionalBallotRules:
      "Provisional ballot; submit last 4 digits of SSN or supporting document by 7 days after election.",
    phonesAtPolls: false,
    phonesAtPollsDetail: "Cell phones prohibited inside voting area.",
    sourceUrl: "https://www.ohiosos.gov/elections/voters/id-requirements/",
    lastVerified: "2026-04-03",
  },
  OK: {
    state: "OK",
    voterIdRequired: true,
    idType: "photo",
    acceptedIds: [
      "Oklahoma driver's license",
      "Oklahoma ID card",
      "US passport",
      "Military ID",
      "Indian Nation tribal ID",
    ],
    exceptions:
      "Voters without acceptable photo ID can cast a provisional ballot and provide ID within 7 days.",
    provisionalBallot: true,
    provisionalBallotRules:
      "Present ID to county election board within 7 days of the election.",
    phonesAtPolls: false,
    phonesAtPollsDetail:
      "Cell phones must be off and stored in pocket or purse.",
    sourceUrl: "https://www.ok.gov/elections/Voter_Registration/Voter_ID/",
    lastVerified: "2026-04-03",
  },
  OR: {
    state: "OR",
    voterIdRequired: false,
    idType: "none",
    acceptedIds: [],
    exceptions:
      "Oregon is a vote-by-mail state. No ID required to receive or return a ballot.",
    provisionalBallot: true,
    provisionalBallotRules:
      "Provisional ballot if returning in person to ballot drop box or voting center.",
    phonesAtPolls: true,
    phonesAtPollsDetail:
      "Phones are allowed as Oregon voting is primarily by mail.",
    sourceUrl: "https://sos.oregon.gov/voting-2",
    lastVerified: "2026-04-03",
  },
  PA: {
    state: "PA",
    voterIdRequired: false,
    idType: "none",
    acceptedIds: [],
    exceptions:
      "First-time voters must show ID. Many documents qualify including utility bills, bank statements, and government documents.",
    provisionalBallot: true,
    provisionalBallotRules:
      "Provisional ballot available if ID is an issue; verify by 6 days after election.",
    phonesAtPolls: true,
    phonesAtPollsDetail: "Phones permitted; no recording inside voting booth.",
    sourceUrl: "https://www.vote.pa.gov/Voting-in-PA/Pages/Voter-ID.aspx",
    lastVerified: "2026-04-03",
  },
  RI: {
    state: "RI",
    voterIdRequired: true,
    idType: "photo",
    acceptedIds: [
      "Rhode Island driver's license",
      "Rhode Island ID card",
      "US passport",
      "Military ID",
      "Student ID from Rhode Island school",
    ],
    exceptions:
      "Voters without photo ID may cast a challenged ballot and provide ID within days.",
    provisionalBallot: true,
    provisionalBallotRules: "Challenged ballot; provide ID within 7 days.",
    phonesAtPolls: true,
    phonesAtPollsDetail: "Phones permitted; no photography of marked ballots.",
    sourceUrl: "https://vote.ri.gov/voters/voter-id",
    lastVerified: "2026-04-03",
  },
  SC: {
    state: "SC",
    voterIdRequired: true,
    idType: "photo",
    acceptedIds: [
      "South Carolina driver's license",
      "South Carolina ID card",
      "US passport",
      "Military ID",
      "SC voter registration card with photo",
    ],
    exceptions:
      "Voters with religious objections to being photographed may sign an affidavit and vote.",
    provisionalBallot: true,
    provisionalBallotRules:
      "Provisional ballot; verify with county board within 10 days.",
    phonesAtPolls: false,
    phonesAtPollsDetail: "Cell phones prohibited in voting area.",
    sourceUrl: "https://www.scvotes.gov/voters/voter-id",
    lastVerified: "2026-04-03",
  },
  SD: {
    state: "SD",
    voterIdRequired: true,
    idType: "photo",
    acceptedIds: [
      "South Dakota driver's license",
      "South Dakota ID card",
      "US passport",
      "Military ID",
      "Tribal ID",
    ],
    exceptions:
      "Voters without acceptable photo ID may sign a poll book affidavit to vote.",
    provisionalBallot: true,
    provisionalBallotRules: "Provisional ballot if issues arise.",
    phonesAtPolls: true,
    phonesAtPollsDetail: "Phones permitted; no recording of other voters.",
    sourceUrl:
      "https://sdsos.gov/elections-voting/voting/voter-registration-information/photo-id-faqs.aspx",
    lastVerified: "2026-04-03",
  },
  TN: {
    state: "TN",
    voterIdRequired: true,
    idType: "strict-photo",
    acceptedIds: [
      "Tennessee driver's license",
      "Tennessee photo ID card",
      "US passport",
      "US military ID",
      "Tennessee concealed carry permit",
    ],
    exceptions:
      "No exceptions except for religious objections (affidavit required).",
    provisionalBallot: true,
    provisionalBallotRules: "Provisional ballot; provide ID within 2 days.",
    phonesAtPolls: false,
    phonesAtPollsDetail: "Cell phones prohibited inside voting area.",
    sourceUrl: "https://sos.tn.gov/voter-id",
    lastVerified: "2026-04-03",
  },
  UT: {
    state: "UT",
    voterIdRequired: true,
    idType: "non-photo",
    acceptedIds: [
      "Utah driver's license",
      "US passport",
      "Military ID",
      "Any government document with name and address",
    ],
    exceptions:
      "Non-photo documents like utility bills and bank statements are accepted.",
    provisionalBallot: true,
    provisionalBallotRules: "Provisional ballot available.",
    phonesAtPolls: true,
    phonesAtPollsDetail: "Phones allowed; no recording of ballots.",
    sourceUrl: "https://elections.utah.gov/voter-information/",
    lastVerified: "2026-04-03",
  },
  VT: {
    state: "VT",
    voterIdRequired: false,
    idType: "none",
    acceptedIds: [],
    exceptions:
      "Voters sign an application at the polls confirming their eligibility.",
    provisionalBallot: false,
    provisionalBallotRules:
      "Limited provisional procedures; voters sign eligibility affidavit.",
    phonesAtPolls: true,
    phonesAtPollsDetail: "Phones permitted; use with discretion.",
    sourceUrl: "https://sos.vermont.gov/elections/voters/",
    lastVerified: "2026-04-03",
  },
  VA: {
    state: "VA",
    voterIdRequired: true,
    idType: "photo",
    acceptedIds: [
      "Virginia driver's license",
      "Virginia DMV-issued ID",
      "US passport",
      "Military ID",
      "Student ID from Virginia school",
      "Employer-issued ID",
      "Tribal ID",
    ],
    exceptions:
      "Voters without acceptable ID can sign a provisional ballot envelope. The ballot is counted after signature verification.",
    provisionalBallot: true,
    provisionalBallotRules:
      "Provisional ballot counted after signature verification within days.",
    phonesAtPolls: false,
    phonesAtPollsDetail:
      "Cell phones must be silenced; no use in voting booth.",
    sourceUrl:
      "https://www.elections.virginia.gov/registration/photo-ids-required-to-vote/",
    lastVerified: "2026-04-03",
  },
  WA: {
    state: "WA",
    voterIdRequired: false,
    idType: "none",
    acceptedIds: [],
    exceptions: "Washington is a vote-by-mail state. No ID required.",
    provisionalBallot: true,
    provisionalBallotRules: "Provisional ballot available if voting in person.",
    phonesAtPolls: true,
    phonesAtPollsDetail:
      "Phones allowed as Washington voting is primarily by mail.",
    sourceUrl: "https://www.sos.wa.gov/elections/voters/",
    lastVerified: "2026-04-03",
  },
  WV: {
    state: "WV",
    voterIdRequired: true,
    idType: "non-photo",
    acceptedIds: [
      "West Virginia driver's license",
      "US passport",
      "Military ID",
      "Utility bill",
      "Bank statement",
      "Government document with name and address",
    ],
    exceptions:
      "Non-photo documents accepted. Students may use out-of-state ID along with proof of enrollment.",
    provisionalBallot: true,
    provisionalBallotRules: "Provisional ballot; verify with county clerk.",
    phonesAtPolls: false,
    phonesAtPollsDetail: "Cell phones prohibited in polling area.",
    sourceUrl: "https://sos.wv.gov/elections/Pages/VoterRegistrationInfo.aspx",
    lastVerified: "2026-04-03",
  },
  WI: {
    state: "WI",
    voterIdRequired: true,
    idType: "photo",
    acceptedIds: [
      "Wisconsin driver's license",
      "Wisconsin ID card",
      "Military ID",
      "US passport",
      "Student ID from Wisconsin school",
      "Tribal ID",
    ],
    exceptions:
      "Photo ID must be current (not expired more than 2 years for most IDs) and include the voter's signature.",
    provisionalBallot: true,
    provisionalBallotRules:
      "Provisional ballot; provide ID by 8PM on Election Day or by deadline.",
    phonesAtPolls: true,
    phonesAtPollsDetail:
      "Phones permitted in polling place but not inside voting booth.",
    sourceUrl: "https://myvote.wi.gov/en-us/photo-id",
    lastVerified: "2026-04-03",
  },
  WY: {
    state: "WY",
    voterIdRequired: true,
    idType: "photo",
    acceptedIds: [
      "Wyoming driver's license",
      "Wyoming ID card",
      "US passport",
      "Military ID",
      "Student ID from Wyoming school",
      "Tribal ID",
    ],
    exceptions:
      "If voter does not have ID, they can sign an affidavit at the polls.",
    provisionalBallot: true,
    provisionalBallotRules:
      "Provisional ballot available if eligibility is in question.",
    phonesAtPolls: true,
    phonesAtPollsDetail:
      "Phones permitted; no interference with voting process.",
    sourceUrl: "https://sos.wyo.gov/elections/voters.aspx",
    lastVerified: "2026-04-03",
  },
  TX: {
    state: "TX",
    voterIdRequired: true,
    idType: "strict-photo",
    acceptedIds: [
      "Texas driver's license or ID card",
      "Texas Election Identification Certificate (EIC)",
      "Texas personal ID card issued by DPS",
      "US military ID card with photo",
      "US citizenship certificate with photo",
      "US passport (book or card)",
      "Texas license to carry a handgun",
    ],
    exceptions:
      "Voters without acceptable ID can sign a Reasonable Impediment Declaration and present alternative ID.",
    provisionalBallot: true,
    provisionalBallotRules: "Provide ID within 6 calendar days.",
    phonesAtPolls: false,
    phonesAtPollsDetail:
      "Texas law prohibits wireless communication devices in the voting room.",
    sourceUrl: "https://www.sos.texas.gov/elections/voter/photo-id.shtml",
    lastVerified: "2026-04-03",
  },
  CA: {
    state: "CA",
    voterIdRequired: false,
    idType: "none",
    acceptedIds: [],
    exceptions: "First-time voters who registered by mail may be asked for ID.",
    provisionalBallot: true,
    provisionalBallotRules: "Provisional ballot available.",
    phonesAtPolls: true,
    phonesAtPollsDetail: "Phones allowed but no ballot photography.",
    sourceUrl: "https://www.sos.ca.gov/elections/voter-registration/",
    lastVerified: "2026-04-03",
  },
  NH: {
    state: "NH",
    voterIdRequired: true,
    idType: "photo",
    acceptedIds: [
      "New Hampshire driver's license",
      "US passport",
      "Military ID",
      "Student ID from NH school",
      "Government-issued photo ID",
    ],
    exceptions:
      "Voters without qualifying ID may sign an affidavit of identity.",
    provisionalBallot: true,
    provisionalBallotRules: "Challenged ballot; pending verification.",
    phonesAtPolls: true,
    phonesAtPollsDetail:
      "Phones permitted but recording marked ballots is prohibited.",
    sourceUrl: "https://www.sos.nh.gov/elections/voters/id-requirements",
    lastVerified: "2026-04-03",
  },
};

export function getVoterIdInfo(stateCode: string): VoterIdInfo | null {
  return VOTER_ID_DATA[stateCode.toUpperCase()] ?? null;
}

export function getAllStateCodes(): string[] {
  return Object.keys(VOTER_ID_DATA);
}
