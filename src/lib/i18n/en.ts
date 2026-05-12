import type { Translations } from "./types";

export const en: Translations = {
  hero: {
    headline: "Know What You're Voting For",
    subtitle:
      "Enter your zip code to get a customized AI ballot research prompt. Paste it into any free AI chatbot — Claude, ChatGPT, Gemini, or Grok — and get a personalized walkthrough of every race and issue on your ballot.",
    chatbotLabel: "Open",
  },
  zipForm: {
    label: "Enter your zip code",
    placeholder: "e.g. 73301",
    submitButton: "Look Up My Ballot",
  },
  errors: {
    emptyZip: "Please enter a zip code",
    invalidZip: "Please enter a valid 5-digit zip code",
    zipNotFound: {
      heading: "Zip code not found",
      message:
        "We don’t have data for this zip code yet. We’re working on adding all U.S. zip codes.",
      linkText: "Find your state election website",
    },
    multiState:
      "This zip code spans multiple states. Which state are you voting in?",
    deadlinesPassed:
      "Registration deadlines for this election have passed. You may still be able to register on Election Day in some states.",
    noElections: (state: string) =>
      `No upcoming elections found for ${state}. Check your state election website for updates.`,
    loadFailed: "Failed to load state data. Please try again.",
  },
  stateInfo: {
    title: "Your Election Info",
    election: "Election",
    electionDate: "Date",
    registrationDeadlines: "Registration deadlines",
    online: "Online",
    byMail: "By mail",
    inPerson: "In person",
    postmark: "postmark date",
    received: "received date",
    earlyVoting: "Early voting",
    earlyVotingFrom: "from",
    earlyVotingThrough: "through",
    earlyVotingNotAvailable: "Not available — absentee voting only",
    voterId: "Voter ID",
    voterIdRequired: "Required",
    voterIdNotRequired: "Not required",
    acceptedIds: "Accepted IDs",
    phonesAtPolls: "Phones at polls",
    sampleBallot: "Sample ballot",
    countyOffice: "County election office",
    noUpcomingElection:
      "No upcoming elections found — check your state election website for updates.",
  },
  deadline: {
    passed: "Passed",
    daysLeft: (n: number) => `${n} day${n === 1 ? "" : "s"} left`,
    today: "Due today",
  },
  prompt: {
    instructions:
      "Copy this prompt and paste it into any free AI chatbot to start researching your ballot.",
    copyButton: "Copy to Clipboard",
    copiedButton: "Copied!",
    fallbackInstructions:
      "Select all the text above (Ctrl+A or Cmd+A) and copy it manually.",
  },
  tips: {
    heading: "Tips for your conversation",
    item1:
      "You can say “I don’t know” or “I’m not sure where I stand” — the AI will explain more and help you figure it out.",
    item2:
      "You can ask it to research something for you (e.g., “Can you look up this candidate’s voting record?”).",
    item3:
      "You can ask questions anytime (“What does this position actually do?” or “Why does this matter?”).",
    item4:
      "At the end, the AI will give you a summary you can print and take to the polls.",
    chatbotNote:
      "These tips apply whether you use Claude, ChatGPT, Gemini, Grok, or any other AI chatbot.",
  },
  footer: {
    shareHeading: "Share this tool",
    shareText:
      "Know someone who wants to vote informed? Share this page with friends, family, or your community. It works for any state and any election.",
    attribution:
      "Created by a person using AI tools, because everyone deserves to know what they’re actually voting for.",
  },
  stateSelector: {
    prompt:
      "This zip code spans multiple states. Which state are you voting in?",
  },
  loading: "Looking up your election info…",
  accessibility: {
    skipToContent: "Skip to main content",
    languageChanged: "Language changed to English",
    loadingElectionInfo: "Loading election information",
  },
  languageToggle: {
    label: "Language",
    switchToEnglish: "Switch to English",
    switchToSpanish: "Switch to Spanish",
    switchToVietnamese: "Switch to Vietnamese",
    switchToChinese: "Switch to Chinese",
    switchToArabic: "Switch to Arabic",
  },
  liveData: {
    pollingLocation: "Polling Location",
    ballotContests: "Ballot Contests",
    candidateDetail: {
      viewRecord: "View voting record",
      votingRecord: "Voting Record",
      topDonors: "Top Donors",
      endorsements: "Endorsements",
    },
    loading: "Loading election data...",
    attribution:
      "Election data from Google Civic Information and live web search via Anthropic.",
    lastUpdated: "Updated",
    errors: {
      apiPartial:
        "Some election data is temporarily unavailable. The information shown is current.",
      apiFull:
        "We're having trouble loading live election data. Here's what we know about voting in your state.",
    },
  },
  phase5: {
    chat: {
      ctaButton: "Research My Ballot with AI",
      privacyNotice:
        "Your conversation stays in your browser only — we don't store it. If you close or refresh this page, your conversation will be lost. Download your ballot and voter profile before leaving.",
      inputPlaceholder: "Type your message...",
      sendButton: "Send",
      budgetNotice70:
        "Free AI chat may be limited later this month. You can always use the copy-paste option.",
      budgetNotice90:
        "Free AI chat is running low this month. Consider using the copy-paste option for an uninterrupted experience.",
      chatDisabledMessage:
        "Our free AI chat has reached its monthly limit. You can still research your ballot — copy the prompt below and paste it into any free AI chatbot (Claude, ChatGPT, Gemini, Grok).",
      sessionLimitMessage:
        "To keep this tool free for everyone, we limit sessions per day. You can continue your research by copying the prompt below.",
      loadingMessage: "Thinking...",
    },
    ballot: {
      sectionHeading: "Build My Ballot",
      pasteAreaLabel: "Paste your AI ballot output here",
      pasteInstructions:
        "After your AI conversation, copy the 'MY BALLOT' section and paste it here to generate your downloadable ballot.",
      parseErrorMessage:
        "We couldn't read that format. Try copying just the 'MY BALLOT' section from your AI conversation, or enter your choices manually below.",
      manualEntryHeading: "Enter Ballot Choices Manually",
      manualAddRaceButton: "Add Race",
      downloadButton: "Download / Print My Ballot",
      previewHeading: "Ballot Preview",
      disclaimer:
        "This is your personal reference, not an official ballot. Verify all information at your state election office.",
    },
    profile: {
      uploadLabel: "Returning voter? Upload your voter profile",
      uploadPrivacyNotice:
        "Your profile is used for this session only and is not stored on our servers.",
      confirmationMessage:
        "Voter profile loaded. This will be included in your AI conversation.",
      downloadButton: "Download My Voter Profile",
      downloadNote:
        "Save this file somewhere you'll find it before the next election. When you come back, upload it so you don't have to start from scratch.",
      sizeError: "File is too large. Voter profiles must be under 10KB.",
      typeError: "Please upload a .txt file.",
    },
    alignment: {
      strongLabel: "Strong alignment",
      mixedLabel: "Mixed alignment",
      weakLabel: "Weak alignment",
      expandButton: "Expand breakdown",
      collapseButton: "Collapse breakdown",
      parseError:
        "Alignment scores couldn't be generated for this response — try asking the AI to score the candidates again.",
      overallLabel: "Alignment",
    },
  },
  phase6: {
    issueRanking: {
      heading: "Rank Your Priorities",
      subheading:
        "Drag the issues below into your preferred order — most important at the top. This helps personalize your ballot research.",
      skipButton: "Skip — research without priorities",
      confirmButton: "These are my priorities",
      ariaGrabbed: "Grabbed. Use arrow keys to reorder, Space to drop.",
      ariaDropped: (position: number, total: number) =>
        `Dropped. Now at position ${position} of ${total}.`,
    },
    concernDisambiguation: {
      heading: "Anything else on your mind?",
      placeholder:
        "e.g. 'I rent and can’t afford housing in my city,' or 'my kid has Type 1 diabetes'",
      submitButton: "Map to issues",
      skipButton: "Skip — just use my rankings",
      confirmButton: "Confirm and continue",
      editButton: "Edit my response",
      weHeard: "We heard:",
      mappingTo: "Mapping to issues we track:",
      noMatchesFound:
        "No specific issues detected. You can add issues manually or skip.",
    },
    polisOverlay: {
      countyLabel: "Of voters in your county who ranked their issues",
      privacyNotice:
        "When you rank an issue, we anonymously add to a county-level count that other voters can see. We never store your zip code, your ranking sequence, or anything else — just ‘+1 in [county] for [issue].’",
    },
  },
};
