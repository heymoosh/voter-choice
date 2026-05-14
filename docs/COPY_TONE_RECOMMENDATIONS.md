# Voter Choice — English Copy Rewrite (brand-cleanup pass)

**Scope:** `src/lib/translations.ts`, `en.landing.*` keys only. Spanish is a separate pass.
**Brand name:** Voter Choice (display name changes from "Civic Research").
**Audience:** Any US voter (product is TX-only for now, expanding later). Copy stays national in framing.
**Stake-forward line:** One, placed in the hero.

---

## Diagnosis (what was wrong with the original)

Running the old copy against the Voice Guide, here's what triggered:

- **Scaffolding announcements.** "The Modern Archivist's approach to democracy" announces a frame before saying anything.
- **Rule-of-three overuse.** "Unbiased data, locally curated, and strictly anonymous." / "No accounts, no cookies, just the facts." / "Your Ballot, Your Research, Your Privacy." Three of these in the hero alone.
- **Overused verbs/adjectives.** _Empowering, transforms, navigate, non-partisan_ (as constant refrain), _high-fidelity, seamlessly-adjacent_ phrasing.
- **Generic SaaS filler.** "Empowering your vote through neutral, data-driven insights. Our platform transforms complex legislative data into clear, non-partisan research." This is boilerplate. It could be about anything.
- **Fake social proof.** "Join thousands of informed citizens."
- **Role-play framing.** "Engage the Archivist," "Encrypted Data Manifest," "Ballot Archivist." The reader never agreed to a role-play.
- **Marketing-sketchy privacy language.** "Our unique encryption protocol allows you to save progress locally" reads like a crypto pitch, not reassurance.
- **Therapist cushion.** "Don't be surprised at the door."
- **Graceful dismount.** The mission statement in quote marks, written to be engraved.
- **Mission as category, not specific.** Opens with "We believe democracy thrives when…" instead of something concrete.

The register is also wrong. This is a tool a parent uses between meetings. The current copy is a reading-room interface.

---

## The rewrite (drop-in values for `en.landing.*`)

Short, functional, no em dashes, no signposting. The hero carries the one stake-forward line.

```
brandName: "Voter Choice"

heroHeadline: "Know what's on your ballot before you walk in."
heroSubtext: "Most of the policy that affects your daily life is decided in elections most people skip. Enter your address to see every race and ask questions in plain English. Nothing saved, no account."

trustNoData: "Nothing saved."
trustNoAccounts: "No account."
trustPrivate: "No tracking."

returningBadge: "Been here before?"
returningHeadline: "Pick up where you left off."
returningSubtext: "If you saved a profile last time, drop it in. We'll reload your research so you're not starting over."
returningNote: "We don't store anything on our servers. Your file lives on your device. That's the whole system."
returningUploadTitle: "Upload your profile"
returningUploadHint: "Drop your .txt file here."
returningSelectFile: "Choose file"
returningDragDrop: "or drag and drop"

resourcePollingTitle: "Where to vote"
resourcePollingDesc: "Find your polling place and early voting sites."
resourcePollingCta: "See locations"
resourceDatesTitle: "Key dates"
resourceDatesDesc: "Registration deadlines, early voting, and Election Day."
resourceIdTitle: "What to bring"
resourceIdDesc: "The IDs your state accepts, and what to do if you don't have one."

howItWorksTitle: "How it works"
howItWorksSubtext: "Three steps. A few minutes. No account."

step1Title: "Enter your address"
step1Desc: "We'll pull the exact races on your ballot."
step2Title: "Ask anything"
step2Desc: "Candidates, propositions, voting records, donors. Plain questions, plain answers."
step3Title: "Take it with you"
step3Desc: "Download a one-page summary for the polling booth. Most polls don't allow phones."

ctaHeadline: "Ready?"
ctaSubtext: "Enter your address. See your ballot. That's the whole thing."
ctaButton: "See my ballot"

missionTitle: "Why this exists"
missionQuote: "Voting shouldn't require a subscription, an account, or a research degree. Voter Choice is free, runs locally, and asks nothing of you. Walk in knowing what you're looking at."

footerTagline: "Free and non-partisan. Built for voters."
footerResources: "Resources"
footerLegal: "Legal"
footerConnect: "Contact"
footerBallotData: "Ballot data"
footerSourceCode: "Source code"
footerSupport: "Support"
```

---

## Other copy that lives in `PageContent.tsx` (not in translations)

These are hardcoded strings in the JSX. They need updates too:

**Chat example bubble (Step 2 visual, line ~466):**

- Current label: `"Ballot Archivist"` / `"Archivista Electoral"`
- Change to: `"Voter Choice"` (both languages, or drop the label entirely — the speech bubble is clear without it)

**Chat example response text (line ~472):**

- Current: _"Your ballot includes 14 state constitutional amendment propositions. Let me walk you through each one, starting with Proposition 1 on property tax relief..."_
- _"Let me walk you through"_ is a scaffolding announcement. Suggest:
  _"Your ballot has 14 state constitutional amendments. Want to start with Prop 1 (property tax relief), or jump to one you've seen in the news?"_

**Step 1 visual caption (line ~424):**

- Current: `"Harris County · Houston, TX"`
- Fine as-is for the mockup. Keep.

---

## Key changes (so the pattern is clear)

1. **Killed the archivist frame everywhere.** No manifest, no archivist, no curated, no high-fidelity. The tool is a tool.
2. **Replaced category openings with specifics.** Hero now drops you into the race situation, not the product posture. Mission now states the plain problem, not the philosophical frame.
3. **Stake-forward line lives in the hero subtext.** _"Most of the policy that affects your daily life is decided in elections most people skip."_ That's true, national, non-partisan, and gives the page a spine. No em dashes.
4. **Removed every rule-of-three except one** (mission: _"subscription, an account, or a research degree"_ — used once, for effect, which is fine).
5. **Microcopy got functional.** "Locate Now" → "See locations." "Take Action" → "Take it with you." Card labels are what the user is looking for, not abstractions.
6. **Privacy language got plainer.** The "unique encryption protocol" line is gone. In its place: _"Your file lives on your device. That's the whole system."_
7. **CTA got Muxin energy.** "Ready?" + "Enter your address. See your ballot. That's the whole thing." Calm, matter-of-fact, no "Join thousands."

---

## One thing to confirm before I edit `translations.ts`

- **Returning user section UX question** (not a voice question): the current flow implies users _have_ a `.txt` profile from a previous session. Is that feature actually shipping in the first Texas launch, or is this section aspirational? If it's not shipping yet, consider hiding this whole section until it works. Copy that describes a feature users can't use is worse than missing copy.

Say the word and I'll apply these to `translations.ts` directly. Spanish stays queued for a separate pass (flag if you want me to do it this session or hand off to a new one depending on context budget).
