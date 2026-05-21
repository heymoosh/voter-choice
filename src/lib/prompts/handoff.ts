export interface HandoffInput {
  addressCityState: string;
  electionLabel: string;
  electionDate: string;
  ballotType: string;
  themesRanked: string;
  decidedJson: string;
  remainingList: string;
  notableQuotes: string;
}

export function buildHandoffPrompt(input: HandoffInput): string {
  return `Produce a session handoff the user can paste into ANY AI chatbot to
keep going. Use ONLY the data in <state>. Don't invent. Use the
user's language for priorities.

<state>
  Location:   ${input.addressCityState}
  Election:   ${input.electionLabel}, ${input.electionDate}
  Ballot:     ${input.ballotType}      # DEM-runoff, general, etc.
  Priorities: ${input.themesRanked}
  Decided:    ${input.decidedJson}
  Remaining:  ${input.remainingList}
  Statements: ${input.notableQuotes}
</state>

Output a single plain-text block, no prose around it, in this shape:

  CONTEXT: [one sentence: city, state, election]
  DATE: [election date]
  PRIORITIES (ranked):
    1. [theme]
    2. [theme]
  DECIDED (don't relitigate):
    · [race] → [pick] — "[user's why]"
  REMAINING:
    · [race]

  Continue from where I left off. Brief.
  Ask the same kinds of questions I would. Don't lecture.

Max 400 words. No formatting beyond this block.`;
}
