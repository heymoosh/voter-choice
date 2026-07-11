"use client";

import dynamic from "next/dynamic";

// Experience flag (build-time inlined): NEXT_PUBLIC_BALLOT_ENABLED === "true"
// serves the legacy ballot-centric experience (civic contests + ballot
// upload + PDF extraction) exactly as before; anything else serves the
// congress-assessment experience (address → delegation → assess). One
// codebase — the legacy app is parked behind the flag for Phase 3 reuse,
// never deleted. Both mount client-only (ssr: false): they read
// localStorage / window at render, exactly as the prototypes ran.
const BALLOT_ENABLED = process.env.NEXT_PUBLIC_BALLOT_ENABLED === "true";

const App = BALLOT_ENABLED
  ? dynamic(() => import("../prototype/VoterChoiceApp"), { ssr: false })
  : dynamic(() => import("../prototype/redesign/App2"), { ssr: false });

export default function Home() {
  return (
    <div id="root" className={BALLOT_ENABLED ? undefined : "bf-app"}>
      <App />
    </div>
  );
}
