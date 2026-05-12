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
};
