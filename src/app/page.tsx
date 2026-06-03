"use client";

import dynamic from "next/dynamic";

// The app IS the prototype. `prototype/VoterChoiceApp` is the verbatim
// prototype front-end (its own state machine + views + components + CSS).
// It reads localStorage / window at render, so it mounts client-only
// (ssr: false) — exactly as the prototype ran in the browser. The data
// seams inside it (RACES, getRacePatternsForRace, mockAIReply, geocode)
// get replaced with real API calls in the backend-wiring phase.
const VoterChoiceApp = dynamic(() => import("../prototype/VoterChoiceApp"), {
  ssr: false,
});

export default function Home() {
  return (
    <div id="root">
      <VoterChoiceApp />
    </div>
  );
}
