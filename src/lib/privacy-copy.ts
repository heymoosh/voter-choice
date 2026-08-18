/* Shared source of truth for the one sentence that must never drift between
   /privacy (src/app/privacy/page.tsx) and the in-app PrivacyPage
   (src/prototype/VoterChoiceApp.tsx). The two pages otherwise carry
   independent, differently-toned prose (formal legal copy vs. plain-language
   product copy) and different JSX tag conventions (<strong> vs <b>), so only
   this one legally load-bearing line is centralized — forcing the rest into
   a shared module would fight each page's existing style for no drift
   benefit. */
export const NEVER_SELL_STATEMENT =
  "We never sell your data. Not to advertisers, not to data brokers, not to anyone. We also never share it for tracking.";
