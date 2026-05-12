/**
 * Translations interface — the shared shape for all language dictionaries.
 * Every key must be present in both en.ts and es.ts for compile-time coverage.
 */
export interface Translations {
  hero: {
    headline: string;
    subtitle: string;
    chatbotLabel: string;
  };
  zipForm: {
    label: string;
    placeholder: string;
    submitButton: string;
  };
  errors: {
    emptyZip: string;
    invalidZip: string;
    zipNotFound: {
      heading: string;
      message: string;
      linkText: string;
    };
    multiState: string;
    deadlinesPassed: string;
    noElections: (state: string) => string;
    loadFailed: string;
  };
  stateInfo: {
    title: string;
    election: string;
    electionDate: string;
    registrationDeadlines: string;
    online: string;
    byMail: string;
    inPerson: string;
    postmark: string;
    received: string;
    earlyVoting: string;
    earlyVotingFrom: string;
    earlyVotingThrough: string;
    earlyVotingNotAvailable: string;
    voterId: string;
    voterIdRequired: string;
    voterIdNotRequired: string;
    acceptedIds: string;
    phonesAtPolls: string;
    sampleBallot: string;
    countyOffice: string;
    noUpcomingElection: string;
  };
  deadline: {
    passed: string;
    daysLeft: (n: number) => string;
    today: string;
  };
  prompt: {
    instructions: string;
    copyButton: string;
    copiedButton: string;
    fallbackInstructions: string;
  };
  tips: {
    heading: string;
    item1: string;
    item2: string;
    item3: string;
    item4: string;
    chatbotNote: string;
  };
  footer: {
    shareHeading: string;
    shareText: string;
    attribution: string;
  };
  stateSelector: {
    prompt: string;
  };
  loading: string;
  accessibility: {
    skipToContent: string;
    languageChanged: string;
    loadingElectionInfo: string;
  };
  languageToggle: {
    label: string;
    switchToEnglish: string;
    switchToSpanish: string;
  };
  liveData?: {
    pollingLocation?: string;
    ballotContests?: string;
    candidateDetail?: {
      viewRecord?: string;
      votingRecord?: string;
      topDonors?: string;
      endorsements?: string;
    };
    loading?: string;
    attribution?: string;
    lastUpdated?: string;
    errors?: {
      apiPartial?: string;
      apiFull?: string;
    };
  };
}

export type Locale = "en" | "es";
