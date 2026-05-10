export type Language = "en" | "es";

export interface Translations {
  hero: {
    title: string;
    subtitle1: string;
    subtitle2: string;
    worksWith: string;
  };
  zipForm: {
    label: string;
    placeholder: string;
    submit: string;
    privacy: string;
  };
  loading: string;
  errors: {
    empty: string;
    invalid: string;
    notFound: string;
    noElection: (stateName: string) => string;
    multiState: string;
  };
  stateInfo: {
    election: string;
    electionType: string;
    registrationDeadlines: string;
    earlyVoting: string;
    voterId: string;
    voterIdRequired: string;
    voterIdNotRequired: string;
    phonesAtPolls: string;
    sampleBallot: string;
    countyElectionOffice: string;
    earlyVotingNotAvailable: string;
    deadlinePassed: string;
    deadlineStatus: (days: number) => string;
    registrationDeadlinePassed: string;
  };
  stateSelector: {
    prompt: string;
    selectButton: string;
  };
  promptOutput: {
    title: string;
    instructions: string;
    copyButton: string;
    copiedButton: string;
    ownAiHeading: string;
    ownAiBody: string;
  };
  tips: {
    title: string;
    tip1: string;
    tip2: string;
    tip3: string;
    tip4: string;
    disclaimer: string;
  };
  footer: {
    share: string;
    createdBy: string;
    basedOn: string;
    promptLink: string;
    privacyPolicy: string;
    termsOfUse: string;
    dataLastUpdated: (date: string) => string;
    copyright: string;
  };
  polling: {
    addressLabel: string;
    addressPlaceholder: string;
    lookUpButton: string;
    skipLink: string;
    loadingLocations: string;
    pollingPlace: string;
    earlyVoteSites: string;
    getDirections: string;
    hours: string;
    fallbackMessage: string;
    fallbackLink: string;
    noLocationsFound: string;
    privacyNote: string;
    findYourPrecinct: string;
    enterAddressLabel: string;
    searchButton: string;
    privacyBadge: string;
    primaryRecommendation: string;
    electionDayLabel: string;
    earlyVotingLabel: string;
    addToCalendar: string;
    addToCalendarFull: string;
    directions: string;
    alternativeLocations: string;
    adaAccessible: string;
    pollDataNote: string;
    countyFallbackTitle: string;
    countyFallbackBody: string;
    countyFallbackLink: string;
    noAddressYet: string;
  };
  budget: {
    notice: string;
    softClose: string;
    exhausted: string;
    resetNote: string;
  };
  handoff: {
    header: string;
    ballotSoFar: string;
    voterProfile: string;
    continueHeader: string;
    copyContinuation: string;
    copied: string;
    downloadProfile: string;
    continueOn: string;
    clientFallbackHeader: string;
    clientFallbackBody: string;
    usageAlert: string;
    budgetReached: string;
    budgetExplanation: string;
    resetIn: (days: number) => string;
    continueSession: string;
    continueBody: string;
    sessionData: string;
    copyHandoff: string;
    partialBallot: string;
    continueAnalysisOn: string;
  };
  ballot: {
    downloadBallot: string;
    downloadProfile: string;
    printReminder: string;
    buildBallot: string;
    pasteLabel: string;
    pastePlaceholder: string;
    generatePrintable: string;
    manualEntry: string;
    manualEntryDesc: string;
    raceName: string;
    candidateName: string;
    addRace: string;
    addProposition: string;
    propNumber: string;
    propVote: string;
    generateFromManual: string;
    preview: string;
    printBallot: string;
    closePrint: string;
  };
  profile: {
    uploadLabel: string;
    uploadButton: string;
    uploadAccept: string;
    uploadTooLarge: string;
    uploadInvalidType: string;
    uploadConfirmation: (date: string) => string;
    uploadGeneric: string;
    includeInPrompt: string;
  };
  rateLimit: {
    sessionLimit: string;
    ipLimit: string;
    messageCount: (current: number, max: number) => string;
  };
  landing: {
    brandName: string;
    heroHeadline: string;
    heroSubtext: string;
    trustNoData: string;
    trustNoAccounts: string;
    trustPrivate: string;
    returningBadge: string;
    returningHeadline: string;
    returningSubtext: string;
    returningNote: string;
    returningUploadTitle: string;
    returningUploadHint: string;
    returningSelectFile: string;
    returningDragDrop: string;
    resourcePollingTitle: string;
    resourcePollingDesc: string;
    resourcePollingCta: string;
    resourceDatesTitle: string;
    resourceDatesDesc: string;
    resourceIdTitle: string;
    resourceIdDesc: string;
    howItWorksTitle: string;
    howItWorksSubtext: string;
    step1Title: string;
    step1Desc: string;
    step2Title: string;
    step2Desc: string;
    step3Title: string;
    step3Desc: string;
    ctaHeadline: string;
    ctaSubtext: string;
    ctaButton: string;
    missionTitle: string;
    missionQuote: string;
    footerTagline: string;
    footerResources: string;
    footerLegal: string;
    footerConnect: string;
    footerBallotData: string;
    footerSourceCode: string;
    footerSupport: string;
  };
  research: {
    sidebarTitle: string;
    sidebarSubtitle: string;
    navResearch: string;
    navResources: string;
    tabDates: string;
    tabId: string;
    tabPolling: string;
    tabBallot: string;
    checkRegistration: string;
    deepSearchLabel: string;
    deepSearchPlaceholder: string;
    nonPartisanNotice: string;
    runoffGateTitle: (stateName: string) => string;
    runoffGateBody: string;
    runoffGateRule: (stateName: string) => string;
    runoffGateOptionDemPrimary: string;
    runoffGateOptionRepPrimary: string;
    runoffGateOptionDemRunoff: string;
    runoffGateOptionRepRunoff: string;
    runoffGateOptionUnsure: string;
    runoffGateContinue: string;
    finishLater: string;
    finishLaterPrompt: string;
    // ValuesTagSelector keys
    valuesTagSelectorTitle: string;
    valuesTagSelectorInstruction: string;
    valuesTagSelectorSubmit: string;
    valuesTagSelectorSkip: string;
    valuesTagSelectorSubmitting: string;
    valuesTagSelectorSubmitted: string;
    valuesTagSelectorRankedHeading: string;
    valuesTagSelectorFreeTextPlaceholder: string;
    valuesTagSelectorFreeTextAdd: string;
    valuesTagSelectorReorderHint: string;
    valuesTagSelectorEmpty: string;
    valuesTagSelectorAtCap: string;
    valuesTagSelectorRemoveLabel: string;
    valuesTagSelectorRankBadge: (rank: number) => string;
    // RacePatterns keys
    racePatternsRevealButton: string;
    racePatternsPickPrefix: string;
    racePatternsSkip: string;
    racePatternsSubmitting: string;
    racePatternsLockedIn: string;
    racePatternsSkipped: string;
    racePatternsValuesHighlightLabel: string;
    racePatternsEndorsementsHeading: string;
    racePatternsRetrospectiveHeading: string;
    racePatternsSourcesHeading: string;
    racePatternsKeyVotesUnit: string;
    racePatternsAlignmentHeading: string;
    racePatternsAlignmentChallenger: string;
    racePatternsAlignmentUnavailablePrefix: string;
    racePatternsEndorsementsUnavailablePrefix: string;
    racePatternsRetrospectiveUnavailablePrefix: string;
    racePatternsCoalitionHeading: string;
    racePatternsCoalitionUnavailablePrefix: string;
    racePatternsSeeDonors: string;
    racePatternsDonorMethodologyNote: string;
    racePatternsEndorsementPartisan: string;
    racePatternsEndorsementNonpartisan: string;
    racePatternsEndorsementMixed: string;
    racePatternsDisclaimer: string;
    tabCloseWarningBanner: string;
    pdfScannedError: string;
    pdfLoadError: string;
    // ConcernInterpretation keys
    concernInterpretationHeading: string;
    concernInterpretationSubhead: string;
    concernInterpretationConfirm: string;
    concernInterpretationSubmitting: string;
    concernInterpretationSubmitted: string;
    concernInterpretationEdit: string;
    concernInterpretationRemove: string;
    concernInterpretationOffTopic: string;
    concernInterpretationDisambiguatePrompt: string;
    concernInterpretationConfirmPerEntry: string;
    // AlignmentScoreBanner + AlignmentDrilldown
    alignmentScoreBannerHeading: string;
    alignmentScoreOfVotes: (kept: number, total: number) => string;
    alignmentScoreThinRecord: (total: number) => string;
    alignmentScoreUnavailablePrefix: string;
    alignmentScoreYourSide: string;
    alignmentScoreDrillDownLabel: string;
    alignmentScoreDrillDownClose: string;
    alignmentScoreVotedWith: string;
    alignmentScoreVotedAgainst: string;
    alignmentDrilldownHeading: (
      kept: number,
      total: number,
      issueLabel: string,
    ) => string;
    alignmentDrilldownDisclaimer: string;
    // PrivacyCallout
    privacyCalloutP1: string;
    privacyCalloutP2: string;
    privacyCalloutP3: string;
    privacyCalloutCompactHeadline: string;
    privacyCalloutCompactExpand: string;
    privacyCalloutCompactCollapse: string;
    // PolisOverlay
    polisOverlayLoading: string;
    polisOverlayLockedHeading: (scopeName: string) => string;
    polisOverlayUnlockCounter: (n: number) => string;
    polisOverlayHeading: (scopeName: string) => string;
    polisOverlayShapeFraming: string;
    polisOverlayYouLabel: string;
    polisOverlayNoYouCaption: string;
    polisOverlayConsensusHeading: string;
    polisOverlayConsensusSubtitle: string;
    polisOverlaySampleFooter: (sampleSize: number, scopeName: string) => string;
  };
  portfolio: {
    badge: string;
    electionLabel: string;
    title: string;
    subtitle: string;
    printBallot: string;
    primaryAction: string;
    profileManifest: string;
    profileFilename: string;
    profileSize: string;
    profileDescription: string;
    downloadProfile: string;
    privacyProtocol: string;
    privacyDetail: string;
    votingDestination: string;
    earlyVotingSchedule: string;
    getDirections: string;
    addToCalendar: string;
    selectedCandidates: string;
    selectionsCount: (n: number) => string;
    ballotMeasures: string;
    decisionsCount: (n: number) => string;
    civicIntegrityTitle: string;
    civicIntegrityBody: string;
    shareTemplate: string;
    readyToVote: string;
    readyToVoteBody: string;
    backToChat: string;
    pollingDataNote: string;
  };
  voterId: {
    stateLabel: (stateName: string) => string;
    headline: string;
    introText: (stateName: string) => string;
    warningTitle: string;
    acceptedTitle: string;
    idRequiredText: string;
    idNotRequiredText: string;
    idFallbackTitle: string;
    idFallbackBody: string;
    noIdTitle: string;
    noIdText: string;
    ridLabel: string;
    supportingDocsTitle: string;
    downloadDeclaration: string;
    footerNotice: string;
    phonesTitle: string;
  };
  timeline: {
    officialBadge: string;
    headlinePrefix: string;
    headlineItalic: string;
    introText: string;
    registrationDeadline: string;
    strictDeadline: string;
    earlyVotingBegins: string;
    periodStarts: string;
    mailBallotDeadline: string;
    actionRequired: string;
    earlyVotingEnds: string;
    electionDay: string;
    pollsOpen: string;
    electionDayDescription: string;
    findPrecinct: string;
    quickAccess: string;
    voterIdGuide: string;
    sampleBallot: string;
    pollingMap: string;
    statusUpcoming: string;
    statusActive: string;
    statusImminent: string;
    statusPassed: string;
  };
  a11y: {
    skipToContent: string;
    languageToggleLabel: string;
  };
  common: {
    online: string;
    byMail: string;
    inPerson: string;
    registrationStatus: string;
    earlyVotingOpen: string;
    showLess: string;
    showFullPrompt: string;
    copyFallback: string;
    electionDayEvent: string;
  };
}

const en: Translations = {
  hero: {
    title: "Free AI Ballot Research Tool",
    subtitle1:
      "Enter your zip code to get a customized AI ballot research prompt. Paste it into any free AI chatbot to research what\u2019s on your ballot \u2014 candidates, propositions, and local races.",
    subtitle2:
      "The AI conversation happens in your own chatbot session. This tool does not store any data or run an AI.",
    worksWith: "Works with:",
  },
  zipForm: {
    label: "Enter your address",
    placeholder: "e.g. 123 Main St, Houston, TX 77057",
    submit: "Find My Ballot Info",
    privacy:
      "Privacy: your address may be sent to Google Places/Civic to find your ballot and polling places. We do not store it or send it to the AI chat, so we do not have a combined record of where you live and what you say.",
  },
  loading: "Loading...",
  errors: {
    empty: "Please enter your address",
    invalid:
      "Please include your 5-digit zip code (e.g. 123 Main St, Houston, TX 77057)",
    notFound:
      "We don\u2019t have data for this zip code yet. We\u2019re working on adding all U.S. zip codes.",
    noElection: (stateName: string) =>
      `No upcoming elections found for ${stateName}. Check the ${stateName} election website for updates.`,
    multiState:
      "This zip code spans multiple states. Which state are you voting in?",
  },
  stateInfo: {
    election: "Election",
    electionType: "Election type",
    registrationDeadlines: "Voter Registration Deadlines",
    earlyVoting: "Early Voting",
    voterId: "Voter ID",
    voterIdRequired: "Required. Accepted IDs:",
    voterIdNotRequired: "Not required",
    phonesAtPolls: "Phones at Polls",
    sampleBallot: "Sample ballot",
    countyElectionOffice: "County election office",
    earlyVotingNotAvailable: "Not available \u2014 absentee voting only",
    deadlinePassed: "Passed",
    deadlineStatus: (days: number) => `${days} days left`,
    registrationDeadlinePassed:
      "Registration deadlines for this election have passed. Check your registration status.",
  },
  stateSelector: {
    prompt:
      "This zip code spans multiple states. Which state are you voting in?",
    selectButton: "Select",
  },
  promptOutput: {
    title: "Your Ballot Research Prompt",
    instructions:
      "Copy this prompt and paste it into any free AI chatbot to start your ballot research.",
    copyButton: "Copy to Clipboard",
    copiedButton: "Copied!",
    ownAiHeading: "Prefer to Use Your Own AI?",
    ownAiBody:
      "Copy this research prompt and paste it into any free AI chatbot to continue your ballot research.",
  },
  tips: {
    title: "Tips for using the prompt",
    tip1: 'You can say "I don\u2019t know" or "I\u2019m not sure where I stand" \u2014 the AI will explain more and help you figure it out.',
    tip2: 'You can ask it to research something for you ("Can you look up this candidate\u2019s voting record?").',
    tip3: 'You can ask questions anytime ("What does this position actually do?" or "Why does this matter?").',
    tip4: "You\u2019re not taking a test. You\u2019re having a conversation. The AI works with you.",
    disclaimer:
      "Important: AI can make mistakes. This is a research starting point. Verify important information with official sources.",
  },
  footer: {
    share:
      "Share this tool with friends, family, or your community. It works for any U.S. state and any election.",
    createdBy: "Created by a human using AI tools.",
    basedOn: "Based on the",
    promptLink: "Free AI Ballot Research Prompt",
    privacyPolicy: "Privacy Policy",
    termsOfUse: "Terms of Use",
    dataLastUpdated: (date: string) => `Data last updated: ${date}`,
    copyright: "\u00a9 2026 Grey Bird LLC. All Rights Reserved.",
  },
  polling: {
    addressLabel: "Enter your full street address for polling location",
    addressPlaceholder: "e.g. 123 Main St, Houston, TX 77001",
    lookUpButton: "Look up my polling place",
    skipLink: "Skip \u2014 I\u2019ll find it myself",
    loadingLocations: "Looking up your polling place\u2026",
    pollingPlace: "Your Polling Place",
    earlyVoteSites: "Early Vote Sites",
    getDirections: "Get Directions",
    hours: "Hours",
    fallbackMessage:
      "We couldn\u2019t find your polling location automatically.",
    fallbackLink: "Find your polling place on your county election website",
    noLocationsFound: "No polling locations found for this address.",
    privacyNote:
      "Your address is sent to Google\u2019s Civic API to find your polling place. We don\u2019t store it.",
    findYourPrecinct: "Find Your Precinct.",
    enterAddressLabel: "Enter Zip Code or Address",
    searchButton: "Search",
    privacyBadge:
      "Privacy: this address goes to Google Civic for polling lookup. It is not stored by us or sent to Anthropic.",
    primaryRecommendation: "Primary Recommendation",
    electionDayLabel: "Election Day",
    earlyVotingLabel: "Early Voting",
    addToCalendar: "Add to Calendar",
    addToCalendarFull: "Add to Calendar (Incl. Address & Hours)",
    directions: "Directions",
    alternativeLocations: "Alternative Locations",
    adaAccessible: "ADA Accessible",
    pollDataNote:
      "Poll data from Google Civic Information API. Verify with your county election office.",
    countyFallbackTitle: "Find Your Polling Place",
    countyFallbackBody:
      "Enter your address above to find your polling location, or visit your county election website.",
    countyFallbackLink: "Visit County Election Website",
    noAddressYet:
      "Enter your address above to find your assigned polling location and early vote sites.",
  },
  budget: {
    notice:
      "Free AI chat may be limited later this month. You can always copy the prompt to use in your own chatbot.",
    softClose:
      "Our AI chat is at capacity this month, but you can still research your ballot.",
    exhausted:
      "Our free AI chat has reached its monthly limit. Copy the prompt below and paste it into any free AI chatbot to continue your research.",
    resetNote: "Chat resets at the start of each month.",
  },
  handoff: {
    header: "Here\u2019s everything we\u2019ve worked on so far",
    ballotSoFar: "Your Ballot So Far",
    voterProfile: "Your Voter Profile",
    continueHeader: "Continue Where You Left Off",
    copyContinuation: "Copy Continuation Prompt",
    copied: "Copied!",
    downloadProfile: "Download Voter Profile",
    continueOn: "Continue your research on",
    clientFallbackHeader: "Your session so far",
    clientFallbackBody:
      "We\u2019ve packaged your conversation so you can continue in any AI chatbot.",
    usageAlert: "Usage Alert",
    budgetReached: "Monthly Chat Budget Reached",
    budgetExplanation:
      "Your local compute allocation has been exhausted for this period. Research continues via our external protocols.",
    resetIn: (days: number) => `Reset in ${days} days`,
    continueSession: "Continue Your Session",
    continueBody:
      "We\u2019ve reached our community budget for today, but your progress is saved. Use these tools to finish your research in any other AI.",
    sessionData: "Session Handoff Data",
    copyHandoff: "Copy Handoff to Clipboard",
    partialBallot: "Partial Ballot",
    continueAnalysisOn: "Continue Analysis On",
  },
  ballot: {
    downloadBallot: "Download My Ballot",
    downloadProfile: "Download My Voter Profile",
    printReminder:
      "Many states ban phones inside the voting room. Print this or write it down.",
    buildBallot: "Build My Ballot",
    pasteLabel: "Paste the ballot output from your AI chatbot",
    pastePlaceholder: "Paste the MY BALLOT section here\u2026",
    generatePrintable: "Generate Printable Ballot",
    manualEntry: "Or enter your choices manually",
    manualEntryDesc:
      "Add each race and your chosen candidate, then generate a printable ballot.",
    raceName: "Race",
    candidateName: "Your pick",
    addRace: "Add race",
    addProposition: "Add proposition",
    propNumber: "Prop #",
    propVote: "YES / NO",
    generateFromManual: "Generate Printable Ballot",
    preview: "Ballot Preview",
    printBallot: "Print Ballot",
    closePrint: "Close",
  },
  profile: {
    uploadLabel: "Returning voter? Upload your voter profile",
    uploadButton: "Upload Profile (.txt)",
    uploadAccept: "Accepts .txt files only, max 10KB",
    uploadTooLarge: "File is too large. Maximum size is 10KB.",
    uploadInvalidType: "Please upload a .txt file.",
    uploadConfirmation: (date: string) =>
      `Welcome back! I found your profile from ${date}.`,
    uploadGeneric: "Welcome back! Your voter profile has been loaded.",
    includeInPrompt:
      "Privacy: your profile stays in this browser until you use chat or copy the prompt. Built-in chat sends it to Anthropic as context.",
  },
  rateLimit: {
    sessionLimit:
      "You\u2019ve reached the session message limit. Copy the continuation prompt below to keep going in any free AI chatbot.",
    ipLimit:
      "To keep this tool free for everyone, we limit sessions per day. Copy the prompt below to continue your research.",
    messageCount: (current: number, max: number) => `${current}/${max}`,
  },
  landing: {
    brandName: "Voter Choice",
    heroHeadline: "Know what\u2019s on your ballot before you walk in.",
    heroSubtext:
      "Most of the policy that affects your daily life is decided in elections most people skip. Enter your address to see every race and ask questions in plain English. Nothing saved, no account.",
    trustNoData: "Nothing saved.",
    trustNoAccounts: "No account.",
    trustPrivate: "No tracking.",
    returningBadge: "Been here before?",
    returningHeadline: "Pick up where you left off.",
    returningSubtext:
      "If you saved a profile last time, drop it in. We\u2019ll reload your research so you\u2019re not starting over.",
    returningNote:
      "We don\u2019t store anything on our servers. Your file lives on your device. That\u2019s the whole system.",
    returningUploadTitle: "Upload your profile",
    returningUploadHint: "Drop your .txt file here.",
    returningSelectFile: "Choose file",
    returningDragDrop: "or drag and drop",
    resourcePollingTitle: "Where to vote",
    resourcePollingDesc: "Find your polling place and early voting sites.",
    resourcePollingCta: "See locations",
    resourceDatesTitle: "Key dates",
    resourceDatesDesc:
      "Registration deadlines, early voting, and Election Day.",
    resourceIdTitle: "What to bring",
    resourceIdDesc:
      "The IDs your state accepts, and what to do if you don\u2019t have one.",
    howItWorksTitle: "How it works",
    howItWorksSubtext: "Three steps. A few minutes. No account.",
    step1Title: "Enter your address",
    step1Desc: "We\u2019ll pull the exact races on your ballot.",
    step2Title: "Ask anything",
    step2Desc:
      "Candidates, propositions, voting records, donors. Plain questions, plain answers.",
    step3Title: "Take it with you",
    step3Desc:
      "Download a one-page summary for the polling booth. Most polls don\u2019t allow phones.",
    ctaHeadline: "Ready?",
    ctaSubtext:
      "Enter your address. See your ballot. That\u2019s the whole thing.",
    ctaButton: "See my ballot",
    missionTitle: "Why this exists",
    missionQuote:
      "Voting shouldn\u2019t require a subscription, an account, or a research degree. Voter Choice is free, runs locally, and asks nothing of you. Walk in knowing what you\u2019re looking at.",
    footerTagline: "Free and non-partisan. Built for voters.",
    footerResources: "Resources",
    footerLegal: "Legal",
    footerConnect: "Contact",
    footerBallotData: "Ballot data",
    footerSourceCode: "Source code",
    footerSupport: "Support",
  },
  research: {
    sidebarTitle: "Election Guide",
    sidebarSubtitle: "Local Civic Utility",
    navResearch: "Research",
    navResources: "Resources",
    tabDates: "Dates",
    tabId: "ID Requirements",
    tabPolling: "Polling Places",
    tabBallot: "Sample Ballot",
    checkRegistration: "Check Registration",
    deepSearchLabel: "Ask a question",
    deepSearchPlaceholder:
      "Ask about candidate history, voting records, or ballot measures...",
    nonPartisanNotice:
      "Verified Non-Partisan Database \u2022 Educational Use Only",
    runoffGateTitle: (stateName: string) =>
      `Before we start: ${stateName} runoff ballot check`,
    runoffGateBody:
      "We need one quick answer before starting research so the app only sends the right ballot context to the AI.",
    runoffGateRule: (stateName: string) =>
      `${stateName} rule: if you voted in one party's primary earlier this year, you can only vote in that same party's runoff. If you did not vote in the primary, you may choose either party's runoff.`,
    runoffGateOptionDemPrimary: "I voted in the Democratic primary.",
    runoffGateOptionRepPrimary: "I voted in the Republican primary.",
    runoffGateOptionDemRunoff:
      "I did not vote in the primary. Show me the Democratic runoff.",
    runoffGateOptionRepRunoff:
      "I did not vote in the primary. Show me the Republican runoff.",
    runoffGateOptionUnsure:
      "I'm not sure. Help me figure out which runoff applies.",
    runoffGateContinue: "Continue to research",
    finishLater: "Finish this later",
    finishLaterPrompt:
      "I need to leave. Please generate my full SESSION HANDOFF block right now so I can save it and resume from this exact point later. Include every decision I've logged, every race we've covered, every race remaining, my issue priorities, my voter profile so far, and the next question you would have asked. Be exhaustive — I will literally paste this back into a new session to continue.",
    // ValuesTagSelector
    valuesTagSelectorTitle: "What issues matter most to you?",
    valuesTagSelectorInstruction:
      "Pick up to 3 priorities — chips, your own words, or both.",
    valuesTagSelectorSubmit: "Apply my priorities",
    valuesTagSelectorSkip: "Skip — no preference",
    valuesTagSelectorSubmitting: "Sending…",
    valuesTagSelectorSubmitted: "Priorities applied",
    valuesTagSelectorRankedHeading: "Your ranked priorities",
    valuesTagSelectorFreeTextPlaceholder:
      "Add your own (e.g., 'healthcare costs')",
    valuesTagSelectorFreeTextAdd: "Add",
    valuesTagSelectorReorderHint: "Drag to reorder. Most important on top.",
    valuesTagSelectorEmpty: "Pick a chip or type a concern below to begin.",
    valuesTagSelectorAtCap: "Up to 3 priorities. Remove one to add another.",
    valuesTagSelectorRemoveLabel: "Remove",
    valuesTagSelectorRankBadge: (rank: number) => `#${rank}`,
    // RacePatterns
    racePatternsRevealButton: "Reveal candidates",
    racePatternsPickPrefix: "Pick",
    racePatternsSkip: "Skip this race",
    racePatternsSubmitting: "Sending…",
    racePatternsLockedIn: "Locked in:",
    racePatternsSkipped: "Skipped",
    racePatternsValuesHighlightLabel: "Highlighted for your values:",
    racePatternsEndorsementsHeading: "Endorsements",
    racePatternsRetrospectiveHeading: "Track record",
    racePatternsSourcesHeading: "Sources",
    racePatternsKeyVotesUnit: "key votes",
    racePatternsAlignmentHeading: "Voted in line with platform",
    racePatternsAlignmentChallenger: "Challenger — no voting record yet",
    racePatternsAlignmentUnavailablePrefix: "Record unavailable —",
    racePatternsEndorsementsUnavailablePrefix: "Endorsement data unavailable —",
    racePatternsRetrospectiveUnavailablePrefix: "Track record unavailable —",
    racePatternsCoalitionHeading: "Donor coalition",
    racePatternsCoalitionUnavailablePrefix: "Donor data unavailable —",
    racePatternsSeeDonors: "See individual donors",
    racePatternsDonorMethodologyNote:
      "% by total contribution amount · Small donor = under $200 per donation",
    racePatternsEndorsementPartisan: "Partisan",
    racePatternsEndorsementNonpartisan: "Nonpartisan",
    racePatternsEndorsementMixed: "Mixed",
    racePatternsDisclaimer:
      "AI can make mistakes. Tap any score to see the contributing votes and verify the sources.",
    tabCloseWarningBanner: `We save anonymous counts only — never who said what. Get your summary before closing the tab; without it, your in-progress research is gone.`,
    pdfScannedError: `This PDF appears to be scanned and can’t be auto-extracted. Open it, copy the text, and paste it here instead.`,
    pdfLoadError: `We couldn’t load the PDF reader right now. Please try again in a moment, or open the PDF, copy the text, and paste it here.`,
    // ConcernInterpretation
    concernInterpretationHeading: "Did we get this right?",
    concernInterpretationSubhead:
      "We interpreted your concerns. Confirm, edit, or remove anything that doesn't match.",
    concernInterpretationConfirm: "Confirm and continue",
    concernInterpretationSubmitting: "Confirming...",
    concernInterpretationSubmitted: "Concerns confirmed",
    concernInterpretationEdit: "Edit",
    concernInterpretationRemove: "Remove",
    concernInterpretationOffTopic:
      "This doesn't look like a ballot-relevant concern. Remove or rephrase.",
    concernInterpretationDisambiguatePrompt:
      "Which of these best matches your view?",
    concernInterpretationConfirmPerEntry: "Looks right",
    // AlignmentScoreBanner + AlignmentDrilldown
    alignmentScoreBannerHeading: "Voted with you on...",
    alignmentScoreOfVotes: (kept: number, total: number) =>
      `${kept} of ${total} votes`,
    alignmentScoreThinRecord: (total: number) =>
      `Based on ${total} ${total === 1 ? "vote" : "votes"}`,
    alignmentScoreUnavailablePrefix: "Voting record not available —",
    alignmentScoreYourSide: "Your side:",
    alignmentScoreDrillDownLabel: "See contributing votes",
    alignmentScoreDrillDownClose: "Close",
    alignmentScoreVotedWith: "Voted with",
    alignmentScoreVotedAgainst: "Voted against",
    alignmentDrilldownHeading: (
      kept: number,
      total: number,
      issueLabel: string,
    ) => `Why ${kept} of ${total} on ${issueLabel}?`,
    alignmentDrilldownDisclaimer:
      "AI can make mistakes. Click any source to verify.",
    // PrivacyCallout
    privacyCalloutP1:
      "No accounts. No tracking. No persistent storage on your device. We count what people care about — never who said what.",
    privacyCalloutP2:
      "When you finish your session, we add to running totals for your county and primary. There is no record anywhere that says “this voter answered X.” There are only counts.",
    privacyCalloutP3:
      "Even with a subpoena, we couldn’t tell anyone your answers. The records don’t exist to compel.",
    privacyCalloutCompactHeadline:
      "We save anonymous counts only — never who said what.",
    privacyCalloutCompactExpand: "Read more",
    privacyCalloutCompactCollapse: "Show less",
    // PolisOverlay
    polisOverlayLoading: "Loading the shape of your county…",
    polisOverlayLockedHeading: (scopeName: string) =>
      `This view unlocks once enough ${scopeName} voters have used the tool.`,
    polisOverlayUnlockCounter: (n: number) => `About ${n} more to go.`,
    polisOverlayHeading: (scopeName: string) =>
      `How ${scopeName} voters are sorting themselves.`,
    polisOverlayShapeFraming:
      "This is the shape of your county, not a record of who voted.",
    polisOverlayYouLabel: "you",
    polisOverlayNoYouCaption:
      "You didn’t state priorities, so we don’t have a position for you on this map. Here’s the broader pattern.",
    polisOverlayConsensusHeading: "Top shared priorities across primaries",
    polisOverlayConsensusSubtitle:
      "Shared priority means voters across primaries flagged this issue. They may still disagree on the policy answer.",
    polisOverlaySampleFooter: (sampleSize: number, scopeName: string) =>
      `Based on ${sampleSize} ${scopeName} sessions through this tool.`,
  },
  portfolio: {
    badge: "Verified Research",
    electionLabel: "Election",
    title: "Your Research Portfolio",
    subtitle:
      "Review your curated selections. These materials are prepared for your personal reference when you head to the polls.",
    printBallot: "Print My Ballot",
    primaryAction: "Primary Action",
    profileManifest: "Encrypted Data Manifest",
    profileFilename: "voter_profile.txt",
    profileSize: "TXT Format",
    profileDescription:
      "Download this file to your device. You can upload it next election to skip the basic research and pick up right where you left off.",
    downloadProfile: "Download Profile (.txt)",
    privacyProtocol: "Privacy Protocol:",
    privacyDetail:
      "Prints and downloads are generated locally on your device. Built-in chat responses are processed by Anthropic, but this saved file is not uploaded by us.",
    votingDestination: "Your Voting Destination",
    earlyVotingSchedule: "Early Voting Schedule",
    getDirections: "Get Directions",
    addToCalendar: "Add to Calendar",
    selectedCandidates: "Selected Candidates",
    selectionsCount: (n: number) => `${n} Selection${n === 1 ? "" : "s"}`,
    ballotMeasures: "Ballot Measures",
    decisionsCount: (n: number) => `${n} Decision${n === 1 ? "" : "s"}`,
    civicIntegrityTitle: "Civic Integrity Notice",
    civicIntegrityBody:
      "This research profile is for personal use and is not an official ballot. Ensure your registration is active before Election Day.",
    shareTemplate: "Share Research Template",
    readyToVote: "Ready to Vote?",
    readyToVoteBody:
      "Print your 1-page ballot summary now. Remember, many polling locations do not allow phones.",
    backToChat: "Back to Research",
    pollingDataNote:
      "Poll data from Google Civic Information API. Verify with your county election office.",
  },
  voterId: {
    stateLabel: (stateName: string) => `State of ${stateName} Election Laws`,
    headline: "ID Requirements",
    introText: (stateName: string) =>
      `To vote in person in ${stateName}, you must present an acceptable form of photo identification or follow specific procedures if you do not possess one.`,
    warningTitle: "Critical Expiration Rule",
    acceptedTitle: "Accepted Photo IDs",
    idRequiredText: "Photo ID is required to vote in person.",
    idNotRequiredText:
      "Photo ID is not required to vote in person in this state.",
    idFallbackTitle: "Voter ID Rules",
    idFallbackBody:
      "Your state’s voter ID rules — check with your state election office for the current accepted ID list.",
    noIdTitle: "No ID? No Problem",
    noIdText:
      "If a voter does not possess one of the acceptable forms of photo ID and cannot reasonably obtain one, they may still vote by signing a",
    ridLabel: "Reasonable Impediment Declaration",
    supportingDocsTitle: "Supporting Documents",
    downloadDeclaration: "Download Declaration Form (PDF)",
    footerNotice: "Non-partisan educational resource.",
    phonesTitle: "Phones at Polls",
  },
  timeline: {
    officialBadge: "Official Voter Guide",
    headlinePrefix: "The",
    headlineItalic: "Election Roadmap.",
    introText:
      "Essential dates for the upcoming municipal and school board elections. Tap any date for detailed requirements and instructions.",
    registrationDeadline: "Voter Registration Deadline",
    strictDeadline: "Strict Deadline",
    earlyVotingBegins: "Early Voting Begins",
    periodStarts: "Period Starts",
    mailBallotDeadline: "Mail Ballot Application Deadline",
    actionRequired: "Action Required",
    earlyVotingEnds: "Early Voting Ends",
    electionDay: "Election Day",
    pollsOpen: "Polls Open 7am \u2013 7pm",
    electionDayDescription:
      "The culmination of the local civic process. Ensure you have your Photo ID ready and know your precinct polling place.",
    findPrecinct: "Find Your Precinct",
    quickAccess: "Quick Access Resources",
    voterIdGuide: "Voter ID Guide",
    sampleBallot: "Sample Ballot",
    pollingMap: "Polling Map",
    statusUpcoming: "Upcoming",
    statusActive: "Active Now",
    statusImminent: "Soon",
    statusPassed: "Passed",
  },
  a11y: {
    skipToContent: "Skip to main content",
    languageToggleLabel: "Switch to Spanish",
  },
  common: {
    online: "Online",
    byMail: "By mail",
    inPerson: "In person",
    registrationStatus: "your registration status",
    earlyVotingOpen: "Early Voting Open",
    showLess: "Show less",
    showFullPrompt: "Show full prompt",
    copyFallback: "Press Ctrl+C / Cmd+C to copy",
    electionDayEvent: "Election Day",
  },
};

const es: Translations = {
  hero: {
    title: "Herramienta Gratuita de Investigaci\u00f3n Electoral con IA",
    subtitle1:
      "Ingresa tu c\u00f3digo postal para obtener un mensaje personalizado de investigaci\u00f3n electoral. P\u00e9galo en cualquier chatbot de IA gratuito para investigar tu boleta \u2014 candidatos, proposiciones y elecciones locales.",
    subtitle2:
      "La conversaci\u00f3n con la IA ocurre en tu propia sesi\u00f3n de chatbot. Esta herramienta no almacena ning\u00fan dato ni ejecuta una IA.",
    worksWith: "Funciona con:",
  },
  zipForm: {
    label: "Ingresa tu direcci\u00f3n",
    placeholder: "ej. 123 Main St, Houston, TX 77057",
    submit: "Buscar mi informaci\u00f3n electoral",
    privacy:
      "Privacidad: tu direcci\u00f3n puede enviarse a Google Places/Civic para encontrar tu boleta y casillas. No la almacenamos ni la enviamos al chat de IA, as\u00ed que no tenemos un registro combinado de d\u00f3nde vives y lo que dices.",
  },
  loading: "Cargando...",
  errors: {
    empty: "Por favor ingresa tu direcci\u00f3n",
    invalid:
      "Por favor incluye tu c\u00f3digo postal de 5 d\u00edgitos (ej. 123 Main St, Houston, TX 77057)",
    notFound:
      "A\u00fan no tenemos datos para este c\u00f3digo postal. Estamos trabajando para agregar todos los c\u00f3digos postales de EE. UU.",
    noElection: (stateName: string) =>
      `No se encontraron elecciones pr\u00f3ximas para ${stateName}. Consulta el sitio web electoral de ${stateName} para m\u00e1s informaci\u00f3n.`,
    multiState:
      "Este c\u00f3digo postal abarca varios estados. \u00bfEn qu\u00e9 estado vas a votar?",
  },
  stateInfo: {
    election: "Elecci\u00f3n",
    electionType: "Tipo de elecci\u00f3n",
    registrationDeadlines: "Fechas l\u00edmite de registro de votantes",
    earlyVoting: "Votaci\u00f3n anticipada",
    voterId: "Identificaci\u00f3n para votar",
    voterIdRequired: "Requerida. IDs aceptadas:",
    voterIdNotRequired: "No requerida",
    phonesAtPolls: "Tel\u00e9fonos en las casillas",
    sampleBallot: "Boleta de muestra",
    countyElectionOffice: "Oficina electoral del condado",
    earlyVotingNotAvailable:
      "No disponible \u2014 solo votaci\u00f3n en ausencia",
    deadlinePassed: "Pasado",
    deadlineStatus: (days: number) => `Quedan ${days} d\u00edas`,
    registrationDeadlinePassed:
      "Las fechas l\u00edmite de registro para esta elecci\u00f3n ya pasaron. Verifica tu estado de registro.",
  },
  stateSelector: {
    prompt:
      "Este c\u00f3digo postal abarca varios estados. \u00bfEn qu\u00e9 estado vas a votar?",
    selectButton: "Seleccionar",
  },
  promptOutput: {
    title: "Tu mensaje de investigaci\u00f3n electoral",
    instructions:
      "Copia este mensaje y p\u00e9galo en cualquier chatbot de IA gratuito para comenzar tu investigaci\u00f3n electoral.",
    copyButton: "Copiar al portapapeles",
    copiedButton: "\u00a1Copiado!",
    ownAiHeading: "\u00bfPrefieres usar tu propia IA?",
    ownAiBody:
      "Copia este mensaje de investigaci\u00f3n y p\u00e9galo en cualquier chatbot de IA gratuito para continuar tu investigaci\u00f3n electoral.",
  },
  tips: {
    title: "Consejos para usar el mensaje",
    tip1: 'Puedes decir "No s\u00e9" o "No estoy seguro/a de d\u00f3nde estoy parado/a" \u2014 la IA explicar\u00e1 m\u00e1s y te ayudar\u00e1 a entender.',
    tip2: 'Puedes pedirle que investigue algo por ti ("¿Puedes buscar el historial de votaci\u00f3n de este candidato?").',
    tip3: 'Puedes hacer preguntas en cualquier momento ("¿Qu\u00e9 hace exactamente este cargo?" o "¿Por qu\u00e9 importa esto?").',
    tip4: "No est\u00e1s tomando un examen. Est\u00e1s teniendo una conversaci\u00f3n. La IA trabaja contigo.",
    disclaimer:
      "Importante: La IA puede cometer errores. Este es un punto de partida para tu investigaci\u00f3n. Verifica la informaci\u00f3n importante con fuentes oficiales.",
  },
  footer: {
    share:
      "Comparte esta herramienta con amigos, familia o tu comunidad. Funciona para cualquier estado de EE. UU. y cualquier elecci\u00f3n.",
    createdBy: "Creado por una persona usando herramientas de IA",
    basedOn: "Basado en el",
    promptLink: "Mensaje Gratuito de Investigaci\u00f3n Electoral con IA",
    privacyPolicy: "Pol\u00edtica de Privacidad",
    termsOfUse: "T\u00e9rminos de Uso",
    dataLastUpdated: (date: string) => `Datos actualizados: ${date}`,
    copyright: "\u00a9 2026 Grey Bird LLC. Todos los derechos reservados.",
  },
  polling: {
    addressLabel:
      "Ingresa tu direcci\u00f3n completa para encontrar tu casilla",
    addressPlaceholder: "ej. 123 Main St, Houston, TX 77001",
    lookUpButton: "Buscar mi casilla electoral",
    skipLink: "Omitir \u2014 la buscar\u00e9 yo mismo/a",
    loadingLocations: "Buscando tu casilla electoral\u2026",
    pollingPlace: "Tu casilla electoral",
    earlyVoteSites: "Sitios de votaci\u00f3n anticipada",
    getDirections: "C\u00f3mo llegar",
    hours: "Horario",
    fallbackMessage: "No pudimos encontrar tu casilla autom\u00e1ticamente.",
    fallbackLink: "Busca tu casilla en el sitio web electoral de tu condado",
    noLocationsFound: "No se encontraron casillas para esta direcci\u00f3n.",
    privacyNote:
      "Tu direcci\u00f3n se env\u00eda a la API de Google Civic para encontrar tu casilla. No la almacenamos.",
    findYourPrecinct: "Encuentra Tu Casilla.",
    enterAddressLabel: "Ingresa C\u00f3digo Postal o Direcci\u00f3n",
    searchButton: "Buscar",
    privacyBadge:
      "Privacidad: esta direcci\u00f3n va a Google Civic para buscar casillas. No la almacenamos ni la enviamos a Anthropic.",
    primaryRecommendation: "Recomendaci\u00f3n Principal",
    electionDayLabel: "D\u00eda de Elecci\u00f3n",
    earlyVotingLabel: "Votaci\u00f3n Anticipada",
    addToCalendar: "Agregar al Calendario",
    addToCalendarFull: "Agregar al Calendario (Incl. Direcci\u00f3n y Horario)",
    directions: "Direcciones",
    alternativeLocations: "Ubicaciones Alternativas",
    adaAccessible: "Accesible ADA",
    pollDataNote:
      "Datos de casillas de la API de Google Civic Information. Verifica con la oficina electoral de tu condado.",
    countyFallbackTitle: "Encuentra Tu Casilla Electoral",
    countyFallbackBody:
      "Ingresa tu direcci\u00f3n arriba para encontrar tu casilla, o visita el sitio web electoral de tu condado.",
    countyFallbackLink: "Visitar Sitio Web Electoral del Condado",
    noAddressYet:
      "Ingresa tu direcci\u00f3n arriba para encontrar tu casilla electoral asignada y sitios de votaci\u00f3n anticipada.",
  },
  budget: {
    notice:
      "El chat gratuito con IA puede ser limitado m\u00e1s adelante este mes. Siempre puedes copiar el mensaje para usarlo en tu propio chatbot.",
    softClose:
      "Nuestro chat con IA est\u00e1 al m\u00e1ximo este mes, pero a\u00fan puedes investigar tu boleta.",
    exhausted:
      "Nuestro chat gratuito con IA ha alcanzado su l\u00edmite mensual. Copia el mensaje a continuaci\u00f3n y p\u00e9galo en cualquier chatbot de IA gratuito para continuar tu investigaci\u00f3n.",
    resetNote: "El chat se reinicia al inicio de cada mes.",
  },
  handoff: {
    header: "Aqu\u00ed est\u00e1 todo en lo que hemos trabajado hasta ahora",
    ballotSoFar: "Tu boleta hasta ahora",
    voterProfile: "Tu perfil de votante",
    continueHeader: "Contin\u00faa donde lo dejaste",
    copyContinuation: "Copiar mensaje de continuaci\u00f3n",
    copied: "\u00a1Copiado!",
    downloadProfile: "Descargar perfil de votante",
    continueOn: "Contin\u00faa tu investigaci\u00f3n en",
    clientFallbackHeader: "Tu sesi\u00f3n hasta ahora",
    clientFallbackBody:
      "Hemos empaquetado tu conversaci\u00f3n para que puedas continuar en cualquier chatbot de IA.",
    usageAlert: "Alerta de Uso",
    budgetReached: "Presupuesto Mensual de Chat Alcanzado",
    budgetExplanation:
      "Tu asignaci\u00f3n de c\u00f3mputo local se ha agotado para este per\u00edodo. La investigaci\u00f3n contin\u00faa a trav\u00e9s de nuestros protocolos externos.",
    resetIn: (days: number) => `Se reinicia en ${days} d\u00edas`,
    continueSession: "Contin\u00faa Tu Sesi\u00f3n",
    continueBody:
      "Hemos alcanzado nuestro presupuesto comunitario por hoy, pero tu progreso est\u00e1 guardado. Usa estas herramientas para terminar tu investigaci\u00f3n en cualquier otra IA.",
    sessionData: "Datos de Traspaso de Sesi\u00f3n",
    copyHandoff: "Copiar Traspaso al Portapapeles",
    partialBallot: "Boleta Parcial",
    continueAnalysisOn: "Continuar An\u00e1lisis En",
  },
  ballot: {
    downloadBallot: "Descargar mi boleta",
    downloadProfile: "Descargar mi perfil de votante",
    printReminder:
      "Muchos estados proh\u00edben tel\u00e9fonos dentro de la sala de votaci\u00f3n. Imprime esto o escr\u00edbelo.",
    buildBallot: "Construir mi boleta",
    pasteLabel: "Pega el resultado de la boleta de tu chatbot de IA",
    pastePlaceholder: "Pega la secci\u00f3n MI BOLETA aqu\u00ed\u2026",
    generatePrintable: "Generar boleta imprimible",
    manualEntry: "O ingresa tus elecciones manualmente",
    manualEntryDesc:
      "Agrega cada contienda y tu candidato elegido, luego genera una boleta imprimible.",
    raceName: "Contienda",
    candidateName: "Tu elecci\u00f3n",
    addRace: "Agregar contienda",
    addProposition: "Agregar proposici\u00f3n",
    propNumber: "Prop #",
    propVote: "S\u00cd / NO",
    generateFromManual: "Generar boleta imprimible",
    preview: "Vista previa de la boleta",
    printBallot: "Imprimir boleta",
    closePrint: "Cerrar",
  },
  profile: {
    uploadLabel: "\u00bfVotante que regresa? Sube tu perfil de votante",
    uploadButton: "Subir perfil (.txt)",
    uploadAccept: "Solo archivos .txt, m\u00e1ximo 10KB",
    uploadTooLarge:
      "El archivo es demasiado grande. El tama\u00f1o m\u00e1ximo es 10KB.",
    uploadInvalidType: "Por favor sube un archivo .txt.",
    uploadConfirmation: (date: string) =>
      `\u00a1Bienvenido/a de vuelta! Encontr\u00e9 tu perfil de ${date}.`,
    uploadGeneric:
      "\u00a1Bienvenido/a de vuelta! Tu perfil de votante ha sido cargado.",
    includeInPrompt:
      "Privacidad: tu perfil permanece en este navegador hasta que uses el chat o copies el mensaje. El chat integrado lo env\u00eda a Anthropic como contexto.",
  },
  rateLimit: {
    sessionLimit:
      "Has alcanzado el l\u00edmite de mensajes de la sesi\u00f3n. Copia el mensaje de continuaci\u00f3n a continuaci\u00f3n para seguir en cualquier chatbot de IA gratuito.",
    ipLimit:
      "Para mantener esta herramienta gratuita para todos, limitamos las sesiones por d\u00eda. Copia el mensaje a continuaci\u00f3n para continuar tu investigaci\u00f3n.",
    messageCount: (current: number, max: number) => `${current}/${max}`,
  },
  landing: {
    brandName: "Civic Research",
    heroHeadline: "Tu Boleta, Tu Investigaci\u00f3n, Tu Privacidad.",
    heroSubtext:
      "El enfoque del Archivista Moderno hacia la democracia. Datos imparciales, curados localmente, y estrictamente an\u00f3nimos. Sin cuentas, sin cookies, solo los hechos.",
    trustNoData: "Sin datos almacenados.",
    trustNoAccounts: "Sin cuentas.",
    trustPrivate: "100% privado.",
    returningBadge: "Eficiencia",
    returningHeadline:
      "\u00bfUsuario que regresa? Impulsa tu Boleta Personalizada.",
    returningSubtext:
      "Si tienes un Perfil de Votante de una sesi\u00f3n anterior, s\u00fabelo a continuaci\u00f3n para comenzar r\u00e1pidamente con tu boleta.",
    returningNote:
      "Nota: NO almacenamos ning\u00fan dato. Nuestro protocolo \u00fanico de encriptaci\u00f3n te permite guardar tu progreso localmente. Cuando regreses, simplemente recarga tu archivo.",
    returningUploadTitle: "Sube tu Perfil de Votante",
    returningUploadHint:
      "Arrastra y suelta tu archivo de perfil de votante .txt aqu\u00ed.",
    returningSelectFile: "Seleccionar Archivo",
    returningDragDrop: "o arrastra y suelta aqu\u00ed",
    resourcePollingTitle: "Casillas Electorales",
    resourcePollingDesc:
      "Encuentra tu casilla m\u00e1s cercana y los sitios de votaci\u00f3n anticipada para la pr\u00f3xima elecci\u00f3n. Sin rastreo.",
    resourcePollingCta: "Localizar Ahora",
    resourceDatesTitle: "Fechas Electorales",
    resourceDatesDesc:
      "Consulta fechas l\u00edmite de registro, horarios de votaci\u00f3n anticipada y fechas clave de tu elecci\u00f3n.",
    resourceIdTitle: "Reglas de ID",
    resourceIdDesc:
      "Desglose detallado de los requisitos de identificaci\u00f3n espec\u00edficos de tu estado. No te sorprendas en la puerta.",
    howItWorksTitle: "C\u00f3mo Funciona",
    howItWorksSubtext:
      "Empoderando tu voto con informaci\u00f3n neutral y basada en datos. Nuestra plataforma transforma datos legislativos complejos en investigaci\u00f3n clara y no partidista.",
    step1Title: "Localiza tu Distrito",
    step1Desc:
      "Mapea instant\u00e1neamente tu c\u00f3digo postal a tu distrito electoral espec\u00edfico y candidatos.",
    step2Title: "Consulta al Archivista",
    step2Desc:
      "Pregunta lo que quieras sobre registros de votaci\u00f3n de candidatos, historial de donantes o impactos legislativos.",
    step3Title: "Toma Acci\u00f3n",
    step3Desc:
      "Descarga tu gu\u00eda personalizada de votante para llevar a la casilla electoral.",
    ctaHeadline: "\u00bfListo para elegir?",
    ctaSubtext:
      "\u00danete a miles de ciudadanos informados que usan Civic Research para orientaci\u00f3n no partidista.",
    ctaButton: "Comienza Ahora",
    missionTitle: "Declaraci\u00f3n de Misi\u00f3n",
    missionQuote:
      "\u201cCreemos que la democracia prospera cuando se eliminan las barreras a la informaci\u00f3n. Voter Choice fue creado para proporcionar una interfaz archiv\u00edstica de alta fidelidad para datos c\u00edvicos, asegurando que cada ciudadano tenga acceso a su boleta local sin el costo de su privacidad personal.\u201d",
    footerTagline:
      "Un archivo digital no partidista dedicado a la claridad c\u00edvica. Producido por Civic Research.",
    footerResources: "Recursos",
    footerLegal: "Legal",
    footerConnect: "Conectar",
    footerBallotData: "Datos Electorales",
    footerSourceCode: "C\u00f3digo Fuente",
    footerSupport: "Soporte",
  },
  research: {
    sidebarTitle: "Gu\u00eda Electoral",
    sidebarSubtitle: "Utilidad C\u00edvica Local",
    navResearch: "Investigaci\u00f3n",
    navResources: "Recursos",
    tabDates: "Fechas",
    tabId: "Requisitos de ID",
    tabPolling: "Casillas",
    tabBallot: "Boleta de Muestra",
    checkRegistration: "Verificar Registro",
    deepSearchLabel: "Haz una pregunta",
    deepSearchPlaceholder:
      "Pregunta sobre historial de candidatos, registros de votaci\u00f3n o medidas electorales...",
    nonPartisanNotice:
      "Base de Datos No Partidista Verificada \u2022 Solo Uso Educativo",
    runoffGateTitle: (stateName: string) =>
      `Antes de empezar: verificaci\u00f3n de boleta para desempate en ${stateName}`,
    runoffGateBody:
      "Necesitamos una respuesta r\u00e1pida antes de iniciar la investigaci\u00f3n para enviar al AI el contexto correcto de la boleta.",
    runoffGateRule: (stateName: string) =>
      `Regla de ${stateName}: si votaste en la primaria de un partido este a\u00f1o, solo puedes votar en el desempate de ese mismo partido. Si no votaste en la primaria, puedes elegir el desempate de cualquiera de los dos partidos.`,
    runoffGateOptionDemPrimary: "Vot\u00e9 en la primaria dem\u00f3crata.",
    runoffGateOptionRepPrimary: "Vot\u00e9 en la primaria republicana.",
    runoffGateOptionDemRunoff:
      "No vot\u00e9 en la primaria. Mu\u00e9strame el desempate dem\u00f3crata.",
    runoffGateOptionRepRunoff:
      "No vot\u00e9 en la primaria. Mu\u00e9strame el desempate republicano.",
    runoffGateOptionUnsure:
      "No estoy seguro/a. Ay\u00fadame a determinar qu\u00e9 desempate aplica.",
    runoffGateContinue: "Continuar a la investigaci\u00f3n",
    finishLater: "Continuar despu\u00e9s",
    finishLaterPrompt:
      "Tengo que irme. Por favor genera ahora mismo mi bloque completo de TRANSFERENCIA DE SESI\u00d3N DE VOTANTE para que pueda guardarlo y retomar exactamente desde este punto m\u00e1s tarde. Incluye cada decisi\u00f3n que he registrado, cada contienda que hemos cubierto, cada contienda que queda, mis prioridades de temas, mi perfil de votante hasta ahora y la siguiente pregunta que me ibas a hacer. S\u00e9 exhaustivo \u2014 literalmente voy a pegar esto en una nueva sesi\u00f3n para continuar.",
    // ValuesTagSelector — EN stubs (ES UI out of scope for this packet)
    valuesTagSelectorTitle: "What issues matter most to you?",
    valuesTagSelectorInstruction:
      "Pick up to 3 priorities — chips, your own words, or both.",
    valuesTagSelectorSubmit: "Apply my priorities",
    valuesTagSelectorSkip: "Skip — no preference",
    valuesTagSelectorSubmitting: "Sending…",
    valuesTagSelectorSubmitted: "Priorities applied",
    valuesTagSelectorRankedHeading: "Your ranked priorities",
    valuesTagSelectorFreeTextPlaceholder:
      "Add your own (e.g., 'healthcare costs')",
    valuesTagSelectorFreeTextAdd: "Add",
    valuesTagSelectorReorderHint: "Drag to reorder. Most important on top.",
    valuesTagSelectorEmpty: "Pick a chip or type a concern below to begin.",
    valuesTagSelectorAtCap: "Up to 3 priorities. Remove one to add another.",
    valuesTagSelectorRemoveLabel: "Remove",
    valuesTagSelectorRankBadge: (rank: number) => `#${rank}`,
    // RacePatterns — EN stubs (ES UI out of scope for this packet)
    racePatternsRevealButton: "Reveal candidates",
    racePatternsPickPrefix: "Pick",
    racePatternsSkip: "Skip this race",
    racePatternsSubmitting: "Sending…",
    racePatternsLockedIn: "Locked in:",
    racePatternsSkipped: "Skipped",
    racePatternsValuesHighlightLabel: "Highlighted for your values:",
    racePatternsEndorsementsHeading: "Endorsements",
    racePatternsRetrospectiveHeading: "Track record",
    racePatternsSourcesHeading: "Sources",
    racePatternsKeyVotesUnit: "key votes",
    racePatternsAlignmentHeading: "Voted in line with platform",
    racePatternsAlignmentChallenger: "Challenger — no voting record yet",
    racePatternsAlignmentUnavailablePrefix: "Record unavailable —",
    racePatternsEndorsementsUnavailablePrefix: "Endorsement data unavailable —",
    racePatternsRetrospectiveUnavailablePrefix: "Track record unavailable —",
    racePatternsCoalitionHeading: "Donor coalition",
    racePatternsCoalitionUnavailablePrefix: "Donor data unavailable —",
    racePatternsSeeDonors: "See individual donors",
    racePatternsDonorMethodologyNote:
      "% by total contribution amount · Small donor = under $200 per donation",
    racePatternsEndorsementPartisan: "Partisan",
    racePatternsEndorsementNonpartisan: "Nonpartisan",
    racePatternsEndorsementMixed: "Mixed",
    racePatternsDisclaimer:
      "AI can make mistakes. Tap any score to see the contributing votes and verify the sources.",
    tabCloseWarningBanner: `We save anonymous counts only — never who said what. Get your summary before closing the tab; without it, your in-progress research is gone.`,
    pdfScannedError:
      "This PDF appears to be scanned and can’t be auto-extracted. Open it, copy the text, and paste it here instead.",
    pdfLoadError:
      "We couldn't load the PDF reader right now. Please try again in a moment, or open the PDF, copy the text, and paste it here.",
    // ConcernInterpretation — EN stubs (ES UI out of scope for this packet)
    concernInterpretationHeading: "Did we get this right?",
    concernInterpretationSubhead:
      "We interpreted your concerns. Confirm, edit, or remove anything that doesn’t match.",
    concernInterpretationConfirm: "Confirm and continue",
    concernInterpretationSubmitting: "Confirming...",
    concernInterpretationSubmitted: "Concerns confirmed",
    concernInterpretationEdit: "Edit",
    concernInterpretationRemove: "Remove",
    concernInterpretationOffTopic:
      "This doesn’t look like a ballot-relevant concern. Remove or rephrase.",
    concernInterpretationDisambiguatePrompt:
      "Which of these best matches your view?",
    concernInterpretationConfirmPerEntry: "Looks right",
    // AlignmentScoreBanner + AlignmentDrilldown \u2014 EN stubs (ES UI out of scope for this packet)
    alignmentScoreBannerHeading: "Voted with you on...",
    alignmentScoreOfVotes: (kept: number, total: number) =>
      `${kept} of ${total} votes`,
    alignmentScoreThinRecord: (total: number) =>
      `Based on ${total} ${total === 1 ? "vote" : "votes"}`,
    alignmentScoreUnavailablePrefix: "Voting record not available \u2014",
    alignmentScoreYourSide: "Your side:",
    alignmentScoreDrillDownLabel: "See contributing votes",
    alignmentScoreDrillDownClose: "Close",
    alignmentScoreVotedWith: "Voted with",
    alignmentScoreVotedAgainst: "Voted against",
    alignmentDrilldownHeading: (
      kept: number,
      total: number,
      issueLabel: string,
    ) => `Why ${kept} of ${total} on ${issueLabel}?`,
    alignmentDrilldownDisclaimer:
      "AI can make mistakes. Click any source to verify.",
    // PrivacyCallout \u2014 EN stubs (ES translation held back per packet)
    privacyCalloutP1:
      "No accounts. No tracking. No persistent storage on your device. We count what people care about \u2014 never who said what.",
    privacyCalloutP2:
      "When you finish your session, we add to running totals for your county and primary. There is no record anywhere that says \u201cthis voter answered X.\u201d There are only counts.",
    privacyCalloutP3:
      "Even with a subpoena, we couldn\u2019t tell anyone your answers. The records don\u2019t exist to compel.",
    privacyCalloutCompactHeadline:
      "We save anonymous counts only \u2014 never who said what.",
    privacyCalloutCompactExpand: "Read more",
    privacyCalloutCompactCollapse: "Show less",
    // PolisOverlay \u2014 EN stubs (ES translation held back per packet)
    polisOverlayLoading: "Loading the shape of your county\u2026",
    polisOverlayLockedHeading: (scopeName: string) =>
      `This view unlocks once enough ${scopeName} voters have used the tool.`,
    polisOverlayUnlockCounter: (n: number) => `About ${n} more to go.`,
    polisOverlayHeading: (scopeName: string) =>
      `How ${scopeName} voters are sorting themselves.`,
    polisOverlayShapeFraming:
      "This is the shape of your county, not a record of who voted.",
    polisOverlayYouLabel: "you",
    polisOverlayNoYouCaption:
      "You didn\u2019t state priorities, so we don\u2019t have a position for you on this map. Here\u2019s the broader pattern.",
    polisOverlayConsensusHeading: "Top shared priorities across primaries",
    polisOverlayConsensusSubtitle:
      "Shared priority means voters across primaries flagged this issue. They may still disagree on the policy answer.",
    polisOverlaySampleFooter: (sampleSize: number, scopeName: string) =>
      `Based on ${sampleSize} ${scopeName} sessions through this tool.`,
  },
  portfolio: {
    badge: "Investigaci\u00f3n Verificada",
    electionLabel: "Elecci\u00f3n",
    title: "Tu Portafolio de Investigaci\u00f3n",
    subtitle:
      "Revisa tus selecciones curadas. Estos materiales est\u00e1n preparados para tu referencia personal cuando vayas a las casillas.",
    printBallot: "Imprimir Mi Boleta",
    primaryAction: "Acci\u00f3n Principal",
    profileManifest: "Manifiesto de Datos Encriptados",
    profileFilename: "perfil_votante.txt",
    profileSize: "Formato TXT",
    profileDescription:
      "Descarga este archivo a tu dispositivo. Puedes subirlo en la pr\u00f3xima elecci\u00f3n para saltarte la investigaci\u00f3n b\u00e1sica y continuar donde lo dejaste.",
    downloadProfile: "Descargar Perfil (.txt)",
    privacyProtocol: "Protocolo de Privacidad:",
    privacyDetail:
      "Las impresiones y descargas se generan localmente en tu dispositivo. Las respuestas del chat integrado son procesadas por Anthropic, pero este archivo guardado no lo subimos nosotros.",
    votingDestination: "Tu Destino de Votaci\u00f3n",
    earlyVotingSchedule: "Horario de Votaci\u00f3n Anticipada",
    getDirections: "C\u00f3mo Llegar",
    addToCalendar: "Agregar al Calendario",
    selectedCandidates: "Candidatos Seleccionados",
    selectionsCount: (n: number) =>
      `${n} Selecci${n === 1 ? "\u00f3n" : "ones"}`,
    ballotMeasures: "Medidas Electorales",
    decisionsCount: (n: number) => `${n} Decisi${n === 1 ? "\u00f3n" : "ones"}`,
    civicIntegrityTitle: "Aviso de Integridad C\u00edvica",
    civicIntegrityBody:
      "Este perfil de investigaci\u00f3n es para uso personal y no es una boleta oficial. Aseg\u00farate de que tu registro est\u00e9 activo antes del D\u00eda de la Elecci\u00f3n.",
    shareTemplate: "Compartir Plantilla de Investigaci\u00f3n",
    readyToVote: "\u00bfListo para Votar?",
    readyToVoteBody:
      "Imprime tu resumen de boleta de 1 p\u00e1gina ahora. Recuerda, muchas casillas no permiten tel\u00e9fonos.",
    backToChat: "Volver a la Investigaci\u00f3n",
    pollingDataNote:
      "Datos de casillas de la API de Google Civic Information. Verifica con tu oficina electoral del condado.",
  },
  voterId: {
    stateLabel: (stateName: string) =>
      `Leyes Electorales del Estado de ${stateName}`,
    headline: "Requisitos de ID",
    introText: (stateName: string) =>
      `Para votar en persona en ${stateName}, debes presentar una forma aceptable de identificaci\u00f3n con foto o seguir procedimientos espec\u00edficos si no posees una.`,
    warningTitle: "Regla Cr\u00edtica de Vencimiento",
    acceptedTitle: "IDs con Foto Aceptadas",
    idRequiredText:
      "Se requiere identificaci\u00f3n con foto para votar en persona.",
    idNotRequiredText:
      "No se requiere identificaci\u00f3n con foto para votar en persona en este estado.",
    idFallbackTitle: "Reglas de Identificaci\u00f3n para Votantes",
    idFallbackBody:
      "Las reglas de identificaci\u00f3n de tu estado \u2014 consulta con la oficina electoral estatal para la lista actual de IDs aceptadas.",
    noIdTitle: "\u00bfSin ID? \u00a1No hay problema!",
    noIdText:
      "Si un votante no posee una de las formas aceptables de identificaci\u00f3n con foto y no puede obtener una razonablemente, a\u00fan puede votar firmando una",
    ridLabel: "Declaraci\u00f3n de Impedimento Razonable",
    supportingDocsTitle: "Documentos de Apoyo",
    downloadDeclaration: "Descargar Formulario de Declaraci\u00f3n (PDF)",
    footerNotice: "Recurso educativo no partidista.",
    phonesTitle: "Tel\u00e9fonos en las Casillas",
  },
  timeline: {
    officialBadge: "Gu\u00eda Oficial del Votante",
    headlinePrefix: "La",
    headlineItalic: "Hoja de Ruta Electoral.",
    introText:
      "Fechas esenciales para las pr\u00f3ximas elecciones municipales y de juntas escolares. Toca cualquier fecha para requisitos e instrucciones detalladas.",
    registrationDeadline: "Fecha L\u00edmite de Registro de Votantes",
    strictDeadline: "Fecha L\u00edmite Estricta",
    earlyVotingBegins: "Comienza la Votaci\u00f3n Anticipada",
    periodStarts: "Inicia el Per\u00edodo",
    mailBallotDeadline: "Fecha L\u00edmite de Solicitud de Boleta por Correo",
    actionRequired: "Acci\u00f3n Requerida",
    earlyVotingEnds: "Termina la Votaci\u00f3n Anticipada",
    electionDay: "D\u00eda de la Elecci\u00f3n",
    pollsOpen: "Casillas Abiertas 7am \u2013 7pm",
    electionDayDescription:
      "La culminaci\u00f3n del proceso c\u00edvico local. Aseg\u00farate de tener tu identificaci\u00f3n con foto lista y conocer tu casilla de precinto.",
    findPrecinct: "Encuentra tu Casilla",
    quickAccess: "Recursos de Acceso R\u00e1pido",
    voterIdGuide: "Gu\u00eda de ID del Votante",
    sampleBallot: "Boleta de Muestra",
    pollingMap: "Mapa de Casillas",
    statusUpcoming: "Pr\u00f3ximo",
    statusActive: "Activo Ahora",
    statusImminent: "Pronto",
    statusPassed: "Pasado",
  },
  a11y: {
    skipToContent: "Ir al contenido principal",
    languageToggleLabel: "Cambiar a ingl\u00e9s",
  },
  common: {
    online: "En l\u00ednea",
    byMail: "Por correo",
    inPerson: "En persona",
    registrationStatus: "tu estado de registro",
    earlyVotingOpen: "Voto anticipado abierto",
    showLess: "Mostrar menos",
    showFullPrompt: "Mostrar todo",
    copyFallback: "Presiona Ctrl+C / Cmd+C para copiar",
    electionDayEvent: "D\u00eda de Elecci\u00f3n",
  },
};

export const translations: Record<Language, Translations> = { en, es };
