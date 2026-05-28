"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "../lib/i18n";
import { useResearchMode } from "../lib/researchMode";
import { translations } from "../lib/translations";
import { Navigation } from "../components/Navigation";
import { ResumeNudge } from "../components/ResumeNudge";
import { HowItWorksWalkthrough } from "../components/HowItWorksWalkthrough";
import { ProfileResumeModal } from "../components/ProfileResumeModal";
import { SettingsPanel } from "../components/SettingsPanel";

interface PageContentProps {
  children?: React.ReactNode;
  /**
   * PR A2 fix — server-derived `PROMPT_FLEET_V2` boolean threaded from
   * page.tsx. Production has the flag on, so the prototype-spec landing
   * is the user-visible surface. The CI "flag off — legacy specs" job
   * runs without the env var, expecting the legacy chrome (3-col footer
   * with Privacy + Terms, returning-voter upload, How-it-works 01/02/03,
   * etc.). Default `false` keeps the legacy path the safe choice for any
   * caller that hasn't been updated yet.
   *
   * The Spanish locale ALWAYS renders the legacy landing — the prototype
   * landing is EN-only (Spanish copy work for the prototype is deferred).
   */
  promptFleetV2Enabled?: boolean;
}

/* ── Inline SVG icons (no icon library needed) ── */

function ShieldIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      width="18"
      height="18"
      aria-hidden="true"
    >
      <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z" />
    </svg>
  );
}

function PersonOffIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      width="18"
      height="18"
      aria-hidden="true"
    >
      <path d="M8.65 5.82a3.999 3.999 0 015.53 5.53L8.65 5.82zM20 17.17c-.02-1.1-.63-2.11-1.61-2.62a9.16 9.16 0 00-4.48-1.16L20 19.48v-2.31zM2.39 1.73L1.11 3l3.09 3.09A4 4 0 0012 10c0 .36-.05.71-.15 1.04l2.09 2.09c-1.07-.35-2.2-.53-3.39-.53-2.74 0-5.02 1.15-6 2.85-.3.51-.5 1.06-.5 1.65v2.1h13.17l2.3 2.3 1.27-1.27L2.39 1.73z" />
    </svg>
  );
}

function LockIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      width="18"
      height="18"
      aria-hidden="true"
    >
      <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zM9 8V6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9z" />
    </svg>
  );
}

function PinDropIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      width="28"
      height="28"
      aria-hidden="true"
    >
      <path d="M18 8c0-3.31-2.69-6-6-6S6 4.69 6 8c0 4.5 6 11 6 11s6-6.5 6-11zm-8 0c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zM5 20v2h14v-2H5z" />
    </svg>
  );
}

function ForumIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      width="28"
      height="28"
      aria-hidden="true"
    >
      <path d="M21 6h-2v9H6v2c0 .55.45 1 1 1h11l4 4V7c0-.55-.45-1-1-1zm-4 6V3c0-.55-.45-1-1-1H3c-.55 0-1 .45-1 1v14l4-4h10c.55 0 1-.45 1-1z" />
    </svg>
  );
}

function TaskAltIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      width="28"
      height="28"
      aria-hidden="true"
    >
      <path d="M22 5.18L10.59 16.6l-4.24-4.24 1.41-1.41 2.83 2.83 10-10L22 5.18zM12 20c-4.41 0-8-3.59-8-8s3.59-8 8-8c1.57 0 3.04.46 4.28 1.25l1.45-1.45A10.02 10.02 0 0012 2C6.48 2 2 6.48 2 12s4.48 10 10 10c2.76 0 5.26-1.12 7.07-2.93l-1.42-1.42A7.94 7.94 0 0112 20z" />
    </svg>
  );
}

function UploadFileIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      width="36"
      height="36"
      aria-hidden="true"
    >
      <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11zM8 15.01l1.41 1.41L11 14.84V19h2v-4.16l1.59 1.59L16 15.01 12.01 11 8 15.01z" />
    </svg>
  );
}

function ArrowForwardIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      width="16"
      height="16"
      aria-hidden="true"
    >
      <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8-8-8z" />
    </svg>
  );
}

function CalendarIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      width="28"
      height="28"
      aria-hidden="true"
    >
      <path d="M20 3h-1V1h-2v2H7V1H5v2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 18H4V8h16v13z" />
    </svg>
  );
}

function BalanceIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      width="48"
      height="48"
      aria-hidden="true"
    >
      <path d="M6.5 10h-2v7h2v-7zm6 0h-2v7h2v-7zm8.5 9H2v2h19v-2zm-2.5-9h-2v7h2v-7zM11.5 1L2 6v2h19V6l-9.5-5z" />
    </svg>
  );
}

function CheckCircleIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      width="16"
      height="16"
      aria-hidden="true"
    >
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
    </svg>
  );
}

/* ── EN prototype-spec shell (PR A2, flag-on EN only) ──
   Mirrors LandingView in docs/design-source-of-truth/2026-redesign/
   prototype/prototype-views.jsx for the cold-open (isResearch=false)
   landing surface. Once `isResearch` flips (BallotToolClient enters the
   research path), this same component drops the hero / stat-stack /
   hp-foot chrome and renders the children fullscreen for the workspace.

   The 5 legacy sections (returning-user upload, resource cards, How-it-
   works steps, green CTA banner, mission statement) are intentionally
   removed under PR A2.

   CRITICAL invariant — children stay at a fixed JSX position. We render
   one `<div id="main-content">` wrapping the children regardless of
   `isResearch`; only siblings (eyebrow, h1, lede, stat-stack, hp-foot)
   come and go. This preserves BallotToolClient's React state across the
   landing→research transition. Pre-PR-A2 PageContent kept this invariant
   via a single function; PR A2's original split into `EnglishLanding` +
   `ResearchSurface` broke it — the children-prop moved tree position on
   the flip, BallotToolClient unmounted, `setResearch(false)` fired in
   cleanup, and the funnel deadlocked back on the landing. See
   `cold-open.spec.ts:184` / `workspace.spec.ts:141` for the e2e signal. */
const WORKSPACE_STATE_KEY = "voter-choice:workspace:state:v1";

function EnglishShell({ children }: { children?: React.ReactNode }) {
  const { isResearch, setResearch } = useResearchMode();

  // Read the persisted workspace draft from localStorage for ResumeNudge.
  // The PersistedWorkspaceState shape is { decisions: Decision[], lockedThemes?:
  // Theme[], raceCount?: number }. ResumeNudge.SavedSession expects { decisions?:
  // Record<string, unknown>, issues?: unknown[] }. We bridge by converting the
  // decisions array to a keyed object (raceId -> decision) and forwarding
  // raceCount as the "of Y" denominator (BallotToolClient writes it alongside
  // decisions; it's a sibling across the page seam so we can't read its `races`).
  const [savedSession, setSavedSession] = useState<{
    decisions?: Record<string, unknown>;
    issues?: unknown[];
    address?: string;
    raceCount?: number;
  } | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(WORKSPACE_STATE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        decisions?: { raceId: string; [k: string]: unknown }[];
        lockedThemes?: unknown[];
        raceCount?: number;
      };
      const decisionsRecord: Record<string, unknown> = {};
      for (const d of parsed.decisions ?? []) {
        if (d.raceId) decisionsRecord[d.raceId] = d;
      }
      setSavedSession({
        decisions: decisionsRecord,
        issues: parsed.lockedThemes ?? [],
        raceCount:
          typeof parsed.raceCount === "number" ? parsed.raceCount : undefined,
      });
    } catch {
      // Corrupt persistence — ResumeNudge returns null when hasDraft is false.
    }
  }, []);

  return (
    <>
      {!isResearch && (
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-14 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-on-primary focus:rounded-sm"
        >
          Skip to main content
        </a>
      )}
      <Navigation current="home" onOpenSettings={() => setSettingsOpen(true)} />

      {/* Outer section — stable React node across landing↔research flip.
          The CRITICAL invariant: the inner left-column div (which wraps
          {children}) sits at a fixed JSX position regardless of
          `isResearch`. Hero chrome (eyebrow, h1, lede) and the right-
          column stat-stack are conditional *siblings* of {children},
          not parents. Pre-PR-A2 PageContent guarded this same invariant
          via a single function; PR A2's original split into separate
          EnglishLanding / ResearchSurface components broke it — the
          children prop moved tree position on the flip, BallotToolClient
          unmounted, `setResearch(false)` fired in cleanup, and the
          funnel deadlocked back on the landing. See cold-open.spec.ts:
          184 / workspace.spec.ts:141 for the e2e signal. */}
      <section
        className={
          isResearch
            ? "flex-1 flex flex-col overflow-hidden"
            : "px-4 md:px-14 pt-12 md:pt-20 pb-10 md:pb-14 max-w-[1280px] mx-auto grid gap-10 md:gap-16 md:grid-cols-[1.05fr_0.95fr] items-center"
        }
        aria-labelledby={isResearch ? undefined : "hero-heading"}
      >
        {/* Left column on the landing surface; takes the full width in
            research mode. The {children} slot lives INSIDE this div so
            its parent React node never changes across the flip.

            PR D Fix 1 — `min-w-0` on the grid item. Without it the
            grid's default `min-width: auto = min-content` lets the
            H1's max-content (≈563px) force the auto column wider than
            a 375px viewport, creating horizontal scroll. With
            `min-w-0` the column collapses to the grid container's
            width and the H1 wraps. */}
        <div
          id="main-content"
          className={
            isResearch ? "flex-1 flex flex-col overflow-hidden" : "min-w-0"
          }
        >
          {!isResearch && (
            <>
              <div className="inline-flex items-center gap-[10px] font-mono text-[11px] uppercase tracking-[0.14em] text-civic mb-[22px]">
                <span aria-hidden="true" className="text-vote-red">
                  ★
                </span>
                <span>November 3, 2026 · America&apos;s 250th election</span>
              </div>
              <h1
                id="hero-heading"
                className="font-serif font-semibold text-[44px] md:text-[76px] leading-[0.96] tracking-[-0.025em] text-ink mb-[22px] text-balance"
              >
                Hold Congress to its{" "}
                {/* PR C — Civic-mood highlighter-strike on `record.` per
                    prototype.css line 1508 `body[data-mood="civic"] .hp-hero
                    h1 em { color: var(--ink); background: linear-gradient(
                    transparent 62%, var(--civic-soft) 62%); padding: 0 2px; }`
                    The highlight bg provides the chromatic contrast — text
                    stays ink so the strike reads as marker-pen emphasis. */}
                <em className="italic text-ink bg-[linear-gradient(transparent_62%,var(--civic-soft)_62%)] px-0.5">
                  record.
                </em>
              </h1>
              <p className="font-serif text-[18px] md:text-[20px] leading-[1.45] text-ink-2 mb-8 md:mb-8 max-w-[520px] text-pretty">
                All 435 House seats and 34 Senate seats are on the ballot.
                Before you vote, see how your incumbents actually voted — and
                who paid for the campaign.
              </p>
            </>
          )}
          {/* {children} — STABLE position. The wrapper above keeps the same
              React node across the isResearch flip; the className above
              toggles for the two layouts. Conditional siblings (hero block
              just above, stat-stack just below) can move freely without
              touching this. */}
          <div
            className={isResearch ? "flex-1 flex flex-col" : "max-w-[560px]"}
          >
            {children}
          </div>

          {/* ResumeNudge — shown below the address card when localStorage has a
              prior draft. Returns null automatically when there's nothing to resume.
              totalRaces reads the raceCount BallotToolClient persists alongside its
              decisions (sibling across the page seam, so we read it from localStorage
              rather than props). onResume flips ResearchMode on, which re-renders the
              workspace surface where BallotToolClient rehydrates from the same key. */}
          {!isResearch && savedSession && (
            <ResumeNudge
              saved={savedSession}
              totalRaces={savedSession.raceCount ?? 0}
              onResume={() => setResearch(true)}
              onStartOver={() => {
                if (typeof window !== "undefined") {
                  window.localStorage.removeItem(WORKSPACE_STATE_KEY);
                }
                setSavedSession(null);
              }}
            />
          )}
        </div>

        {/* Right column — 2-row stat-stack. Sibling of the left column,
            conditionally rendered. PR D Fix 1 — `min-w-0` mirrors the
            left column. The 58px serif stat numbers ("6") have a tiny
            min-content but a wider max-content; the explicit `min-w-0`
            guarantees the column never asks for more than the grid
            container offers on mobile. */}
        {!isResearch && (
          <aside
            aria-label="Why this matters"
            className="md:border-l md:border-rule md:pl-9 flex flex-col gap-[18px] min-w-0"
          >
            <div className="flex flex-col">
              <div className="font-serif font-semibold text-[58px] leading-none tracking-[-0.02em] text-ink">
                6
                <small className="font-serif text-[28px] text-ink-2 ml-1 font-semibold">
                  hrs / day
                </small>
              </div>
              <div className="mt-2 text-[13.5px] leading-[1.4] text-ink-2 max-w-[340px]">
                average time a member of Congress spends fundraising, per
                training materials shown to incoming freshmen.
              </div>
              <div className="mt-1.5 font-mono text-[10.5px] uppercase tracking-[0.1em] text-ink-3">
                Source · Issue One, 2024 · CBS 60 Minutes
              </div>
            </div>
            <div className="flex flex-col">
              <div className="font-serif font-semibold text-[58px] leading-none tracking-[-0.02em] text-vote-red">
                94
                <small className="font-serif text-[28px] text-ink-2 ml-1 font-semibold">
                  %
                </small>
              </div>
              <div className="mt-2 text-[13.5px] leading-[1.4] text-ink-2 max-w-[340px]">
                of House incumbents who ran for re-election in 2024 won. Without
                a record check, every November is a coin flip.
              </div>
              <div className="mt-1.5 font-mono text-[10.5px] uppercase tracking-[0.1em] text-ink-3">
                Source · OpenSecrets · FEC filings
              </div>
            </div>
          </aside>
        )}
      </section>

      {/* HowItWorksWalkthrough — three-step explainer per prototype HomeView line 94 */}
      {!isResearch && <HowItWorksWalkthrough />}

      {!isResearch && (
        <footer
          role="contentinfo"
          className="px-4 md:px-14 py-9 border-t border-rule grid gap-9 md:grid-cols-[1fr_auto_auto] items-center text-[13px] text-ink-3 max-w-[1280px] mx-auto mt-16"
        >
          <div className="font-serif font-semibold text-[15px] text-ink">
            Voter Choice
          </div>
          <ul className="list-none m-0 p-0 flex gap-5">
            <li>
              <a
                href="#ballot-data"
                className="hover:text-ink transition-colors"
              >
                Ballot data
              </a>
            </li>
            <li>
              <a
                href="#methodology"
                className="hover:text-ink transition-colors"
              >
                Methodology
              </a>
            </li>
            <li>
              <a href="/privacy" className="hover:text-ink transition-colors">
                Privacy
              </a>
            </li>
            <li>
              <a href="#support" className="hover:text-ink transition-colors">
                Support
              </a>
            </li>
          </ul>
          <div>© 2026 · Gray Bird LLC</div>
        </footer>
      )}

      {/* SettingsPanel — opened from the Navigation gear on the landing surface.
          Self-contained: language toggle and BYOK live inside the panel; the Data
          section's Reset clears the persisted workspace draft and Resume hands off
          to ProfileResumeModal. onExportProfile is omitted (no live ballot session
          exists on the landing surface — export is wired inside the workspace). */}
      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onResetAll={() => {
          if (typeof window !== "undefined") {
            window.localStorage.removeItem(WORKSPACE_STATE_KEY);
          }
          setSavedSession(null);
        }}
        onResumeProfile={() => {
          setSettingsOpen(false);
          setProfileModalOpen(true);
        }}
        onNavigatePrivacy={() => window.open("/privacy", "_blank")}
        onNavigateMethodology={() => window.open("/methodology", "_blank")}
        onNavigateAbout={() => window.open("/about", "_blank")}
      />

      {/* ProfileResumeModal — wired at EnglishShell level per prototype HomeView.
          Opened from SettingsPanel's Resume action (and from the trigger link
          inside BallotToolClient, which manages its own instance). onResume here
          closes the modal; the actual profile rehydration happens inside the
          workspace where the parsed profile reaches BallotToolClient state. */}
      <ProfileResumeModal
        open={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        onResume={() => setProfileModalOpen(false)}
      />
    </>
  );
}

/* ── Legacy landing (flag-off OR Spanish) ──
   PR A2 fix — restored verbatim from the pre-PR-A2 PageContent. The
   prototype landing IS the production EN surface (Vercel has
   PROMPT_FLEET_V2 on), but the legacy CI matrix runs `npm run e2e`
   without the env var and asserts on the legacy chrome (returning-voter
   upload, 3-col footer with Privacy + Terms, How-it-works 01/02/03,
   mission statement, etc.). The same component also covers the ES
   locale path — the legacy translations carry both EN and ES copy via
   `translations[lang]`, so this single function preserves the shape
   for every non-prototype surface.

   `isResearch` keeps the in-research header treatment exactly as it
   was pre-PR-A2: a "RESEARCH | RESOURCES" tabs bar (under flag-off /
   ES) instead of the prototype AppNav. The flag-on EN research path
   short-circuits to AppNav above via `ResearchSurface`.

   Complexity intentionally high — the legacy markup hand-built six
   distinct sections and the single-function shape is the lowest-risk
   restore. Refactoring into smaller sub-components is deferred. */
// eslint-disable-next-line complexity
function LegacyLanding({ children }: { children?: React.ReactNode }) {
  const { lang } = useLanguage();
  const { isResearch } = useResearchMode();
  const t = translations[lang];

  return (
    <>
      {/* Skip to main content link */}
      {!isResearch && (
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-14 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-on-primary focus:rounded-sm"
        >
          {t.a11y.skipToContent}
        </a>
      )}

      {/* Header — adapts to mode */}
      <header
        className={
          isResearch
            ? "flex justify-between items-center px-4 md:px-6 py-3 md:py-4 w-full bg-surface-low tracking-tight sticky top-0 z-50"
            : "flex justify-between items-center px-6 py-5 w-full bg-paper border-b border-rule-2"
        }
      >
        <div className="flex items-center gap-4 md:gap-8">
          <span
            className={
              isResearch
                ? "text-xl md:text-2xl font-black text-primary"
                : "font-serif text-[19px] font-semibold tracking-[-0.01em] text-ink"
            }
          >
            {t.landing.brandName}
          </span>
          {isResearch && (
            <nav className="hidden md:flex gap-6 items-center h-full">
              <span className="text-primary font-bold border-b-2 border-primary py-1">
                {t.research.navResearch}
              </span>
              <span className="text-on-surface-muted py-1">
                {t.research.navResources}
              </span>
            </nav>
          )}
        </div>
      </header>

      {/* Children wrapper — ALWAYS at this tree position to preserve React state */}
      <div
        id="main-content"
        className={isResearch ? "flex-1 flex flex-col overflow-hidden" : ""}
      >
        {!isResearch && (
          <section
            className="relative px-4 md:px-6 pt-10 md:pt-20 pb-12 md:pb-14 max-w-3xl"
            aria-labelledby="hero-heading"
          >
            <h1
              id="hero-heading"
              className="font-serif text-4xl md:text-[3.5rem] font-semibold leading-[1.02] tracking-[-0.025em] text-ink mb-5 md:mb-6 text-balance"
            >
              {t.landing.heroHeadline}
            </h1>
            <p className="font-serif text-lg md:text-xl text-ink-2 mb-8 md:mb-10 leading-[1.45] max-w-[520px]">
              {t.landing.heroSubtext}
            </p>
          </section>
        )}

        {children}

        {!isResearch && (
          <section className="px-4 md:px-6 max-w-3xl pb-12 md:pb-20">
            {/* Trust Signals */}
            <div className="flex flex-wrap gap-4 md:gap-6 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-2">
              <div className="flex items-center gap-2">
                <ShieldIcon className="text-civic" />
                {t.landing.trustNoData}
              </div>
              <div className="flex items-center gap-2">
                <PersonOffIcon className="text-civic" />
                {t.landing.trustNoAccounts}
              </div>
              <div className="flex items-center gap-2">
                <LockIcon className="text-civic" />
                {t.landing.trustPrivate}
              </div>
            </div>
            <p className="text-[11px] text-ink-3 mt-4 leading-relaxed italic">
              * Bipartisan Policy Center / OpenSecrets research. Members of
              Congress report spending 30–70% of their time in DC on
              fundraising-related activities.
            </p>
          </section>
        )}
      </div>

      {!isResearch && (
        <>
          <main>
            {/* ── 2. Returning User (Profile Upload) ── */}
            <section className="bg-paper-2 py-10 md:py-16 px-4 md:px-6 border-y border-rule-2">
              <div className="max-w-3xl space-y-4 md:space-y-6">
                <span className="inline-block px-4 py-1 bg-civic-soft text-civic-2 rounded-full font-mono text-[10px] font-semibold uppercase tracking-[0.14em]">
                  {t.landing.returningBadge}
                </span>
                <h2 className="font-serif text-2xl md:text-3xl font-semibold tracking-[-0.015em] text-ink leading-tight">
                  {t.landing.returningHeadline}
                </h2>
                <p className="text-base text-ink-2 leading-relaxed">
                  {/* NEEDS-KEY: landing.returningSubtext is now (decided, total) => string.
                      LegacyLanding has no session data, so call with 0, 0 to yield
                      a valid string from the function-valued key. */}
                  {t.landing.returningSubtext(0, 0)}
                </p>
                <p className="text-sm text-ink-3 leading-relaxed italic">
                  {t.landing.returningNote}
                </p>
                <div className="bg-paper p-5 md:p-8 border border-rule rounded-[10px] mt-6 md:mt-8 shadow-[0_1px_0_var(--rule-2),0_10px_30px_-20px_oklch(0.18_0.018_240/0.12)]">
                  <h3 className="font-serif text-xl font-semibold text-ink mb-3 tracking-[-0.005em]">
                    {t.landing.returningUploadTitle}
                  </h3>
                  <p className="text-ink-2 mb-6 text-sm leading-relaxed">
                    {t.landing.returningUploadHint}
                  </p>
                  <div className="border-2 border-dashed border-rule p-8 flex flex-col items-center justify-center gap-4 hover:border-civic hover:bg-civic-soft/30 transition-all cursor-pointer group rounded-lg">
                    <UploadFileIcon className="text-ink-3 group-hover:text-civic transition-colors" />
                    <div className="text-center">
                      <span className="block font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink group-hover:text-civic transition-colors">
                        {t.landing.returningSelectFile}
                      </span>
                      <span className="text-[10px] text-ink-3 mt-1">
                        {t.landing.returningDragDrop}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ── 3. Resource Cards ── */}
            <section className="px-4 md:px-6 py-8 md:py-12 max-w-3xl space-y-4">
              {/* Polling Places */}
              <div className="bg-paper-2 border border-rule rounded-[10px] p-5 md:p-8 flex flex-col justify-between min-h-[160px] md:min-h-[200px] shadow-[0_1px_0_var(--rule-2),0_10px_30px_-20px_oklch(0.18_0.018_240/0.12)]">
                <div>
                  <h3 className="font-serif text-xl font-semibold text-ink mb-3 tracking-[-0.005em]">
                    {t.landing.resourcePollingTitle}
                  </h3>
                  <p className="text-sm text-ink-2 leading-relaxed">
                    {t.landing.resourcePollingDesc}
                  </p>
                </div>
                <div className="mt-6">
                  <button
                    className="text-civic font-mono text-[11px] font-semibold uppercase tracking-[0.14em] flex items-center gap-2 group hover:text-civic-2 transition-colors"
                    onClick={() =>
                      document
                        .getElementById("main-content")
                        ?.scrollIntoView({ behavior: "smooth" })
                    }
                  >
                    {t.landing.resourcePollingCta}
                    <ArrowForwardIcon className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>

              {/* Election Dates */}
              <div className="bg-civic p-5 md:p-8 text-paper-2 min-h-[140px] md:min-h-[160px] flex flex-col justify-between rounded-[10px]">
                <CalendarIcon className="text-paper-2 mb-4" />
                <div>
                  <h3 className="font-serif text-xl font-semibold mb-2 tracking-[-0.005em]">
                    {t.landing.resourceDatesTitle}
                  </h3>
                  <p className="opacity-90 text-xs leading-relaxed">
                    {t.landing.resourceDatesDesc}
                  </p>
                </div>
              </div>

              {/* ID Rules */}
              <div className="bg-paper-2 border border-rule rounded-[10px] p-5 md:p-8">
                <h3 className="font-mono text-[11px] font-semibold mb-3 uppercase tracking-[0.14em] text-civic">
                  {t.landing.resourceIdTitle}
                </h3>
                <p className="text-sm text-ink-2 leading-relaxed">
                  {t.landing.resourceIdDesc}
                </p>
              </div>
            </section>

            {/* ── 4. How it Works ── */}
            <section className="bg-paper pt-10 md:pt-20">
              <div className="px-4 md:px-6 mb-8 md:mb-12 max-w-3xl">
                <h2 className="font-serif text-3xl md:text-5xl font-semibold tracking-[-0.025em] text-ink leading-[1.02] mb-4 text-balance">
                  {t.landing.howItWorksTitle}
                </h2>
                <p className="font-serif text-lg text-ink-2 leading-[1.45]">
                  {t.landing.howItWorksSubtext}
                </p>
              </div>

              {/* Step 1 */}
              <section className="bg-paper-2 px-4 md:px-6 py-8 md:py-12 border-y border-rule-2">
                <div className="max-w-3xl">
                  <div className="flex items-center gap-4 mb-6">
                    <span className="font-serif italic text-5xl md:text-6xl font-semibold text-civic leading-none tracking-[-0.02em]">
                      01
                    </span>
                    <div className="bg-civic-soft p-3 rounded-full">
                      <PinDropIcon className="text-civic" />
                    </div>
                  </div>
                  <div className="mb-8">
                    <h3 className="font-serif font-semibold text-2xl text-ink mb-2 tracking-[-0.005em]">
                      {t.landing.step1Title}
                    </h3>
                    <p className="text-base text-ink-2 leading-relaxed">
                      {t.landing.step1Desc}
                    </p>
                  </div>
                  {/* Visual: mini zip input mockup */}
                  <div className="bg-paper p-6 border border-rule rounded-[10px] max-w-sm shadow-[0_1px_0_var(--rule-2),0_10px_30px_-20px_oklch(0.18_0.018_240/0.12)]">
                    <div className="flex gap-2">
                      <div className="w-full bg-paper-2 border-0 border-b-2 border-civic p-3 font-serif font-semibold text-xl text-ink">
                        77001
                      </div>
                      <div className="bg-civic text-paper-2 px-5 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] flex items-center justify-center rounded-lg">
                        <svg
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          width="20"
                          height="20"
                          aria-hidden="true"
                        >
                          <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                        </svg>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                      <svg
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        width="14"
                        height="14"
                        className="text-civic"
                        aria-hidden="true"
                      >
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                      </svg>
                      <span className="font-mono text-[10px] font-semibold text-civic uppercase tracking-[0.14em]">
                        Your County &middot; Your State
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Step 2 */}
              <section className="bg-paper px-4 md:px-6 py-8 md:py-12">
                <div className="max-w-3xl">
                  <div className="flex items-center gap-4 mb-6">
                    <span className="font-serif italic text-5xl md:text-6xl font-semibold text-civic leading-none tracking-[-0.02em]">
                      02
                    </span>
                    <div className="bg-civic-soft p-3 rounded-full">
                      <ForumIcon className="text-civic" />
                    </div>
                  </div>
                  <div className="mb-8">
                    <h3 className="font-serif font-semibold text-2xl text-ink mb-2 tracking-[-0.005em]">
                      {t.landing.step2Title}
                    </h3>
                    <p className="text-base text-ink-2 leading-relaxed">
                      {t.landing.step2Desc}
                    </p>
                  </div>
                  {/* Visual: chat bubble snippet */}
                  <div className="space-y-4 max-w-sm mx-auto">
                    <div className="flex justify-end">
                      <div className="bg-ink text-paper px-4 py-3 rounded-[14px] rounded-br-[4px]">
                        <p className="text-sm leading-relaxed">
                          {lang === "en"
                            ? "“What propositions are on my ballot?”"
                            : "“¿Qué proposiciones están en mi boleta?”"}
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-start">
                      <div className="bg-paper-2 border border-rule px-4 py-4 rounded-[14px] rounded-tl-[4px]">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-3">
                            Voter Choice &middot; AI
                          </span>
                        </div>
                        <p className="text-sm text-ink leading-relaxed">
                          {lang === "en"
                            ? "Your ballot has 14 state constitutional amendments. Want to start with Prop 1 (property tax relief), or jump to one you’ve seen in the news?"
                            : "Tu boleta tiene 14 enmiendas constitucionales estatales. ¿Quieres empezar con la Proposición 1 (alivio de impuestos a la propiedad), o saltar a una que hayas visto en las noticias?"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Step 3 */}
              <section className="bg-paper-2 px-4 md:px-6 py-8 md:py-12 border-y border-rule-2">
                <div className="max-w-3xl">
                  <div className="flex items-center gap-4 mb-6">
                    <span className="font-serif italic text-5xl md:text-6xl font-semibold text-civic leading-none tracking-[-0.02em]">
                      03
                    </span>
                    <div className="bg-civic-soft p-3 rounded-full">
                      <TaskAltIcon className="text-civic" />
                    </div>
                  </div>
                  <div className="mb-8">
                    <h3 className="font-serif font-semibold text-2xl text-ink mb-2 tracking-[-0.005em]">
                      {t.landing.step3Title}
                    </h3>
                    <p className="text-base text-ink-2 leading-relaxed">
                      {t.landing.step3Desc}
                    </p>
                  </div>
                  {/* Visual: mini ballot mockup */}
                  <div className="relative max-w-xs mx-auto pb-8">
                    <div className="bg-paper p-5 border border-rule rounded-[10px] -rotate-2 shadow-[0_1px_0_var(--rule),0_30px_60px_-30px_oklch(0.18_0.018_240/0.18)]">
                      <div className="border-b-2 border-ink pb-3 mb-3">
                        <div className="flex justify-between items-start">
                          <span className="font-serif text-lg font-semibold tracking-[-0.01em] text-ink">
                            Voter Choice
                          </span>
                          <span className="font-mono text-[10px] font-semibold text-ink-3 uppercase tracking-[0.14em]">
                            2026
                          </span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center border-b border-dotted border-rule pb-2">
                          <span className="font-serif text-sm font-semibold text-ink">
                            Governor
                          </span>
                          <CheckCircleIcon className="text-civic" />
                        </div>
                        <div className="flex justify-between items-center border-b border-dotted border-rule pb-2">
                          <span className="font-serif text-sm font-semibold text-ink">
                            State Senate
                          </span>
                          <CheckCircleIcon className="text-civic" />
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="font-serif text-sm font-semibold text-ink">
                            Prop 1
                          </span>
                          <CheckCircleIcon className="text-civic" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Ready to choose CTA */}
              <section className="px-4 md:px-6 py-12 md:py-20 text-center bg-civic text-paper-2 mt-8 md:mt-12">
                <h2 className="font-serif text-3xl md:text-4xl font-semibold mb-4 tracking-[-0.025em] text-balance">
                  {t.landing.ctaHeadline}
                </h2>
                <p className="opacity-90 mb-8 max-w-md mx-auto text-base leading-relaxed">
                  {t.landing.ctaSubtext}
                </p>
                <button
                  className="bg-paper-2 text-civic px-12 py-4 font-mono text-[12px] font-semibold uppercase tracking-[0.14em] rounded-lg hover:bg-paper transition-colors"
                  onClick={() =>
                    document
                      .getElementById("main-content")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  {t.landing.ctaButton}
                </button>
              </section>
            </section>

            {/* ── 5. Mission Statement ── */}
            <section className="py-14 md:py-24 px-4 md:px-6 bg-paper">
              <div className="max-w-4xl mx-auto text-center">
                <BalanceIcon className="text-civic mx-auto mb-6 md:mb-8" />
                <h2 className="font-serif text-3xl md:text-4xl font-semibold text-ink mb-6 md:mb-8 tracking-[-0.025em] text-balance">
                  {t.landing.missionTitle}
                </h2>
                <p className="font-serif text-xl leading-[1.45] text-ink-2 italic max-w-2xl mx-auto">
                  {t.landing.missionQuote}
                </p>
                <div className="mt-12 h-px w-24 bg-civic mx-auto" />
              </div>
            </section>
          </main>

          {/* ── 6. Footer ── */}
          <footer
            role="contentinfo"
            className="bg-paper-2 py-10 md:py-16 px-4 md:px-6 border-t border-rule"
          >
            <div className="max-w-7xl mx-auto flex flex-col gap-10">
              <div className="max-w-xs">
                <div className="font-serif text-xl font-semibold text-ink mb-4 tracking-[-0.01em]">
                  {t.landing.brandName}
                </div>
                <p className="text-sm text-ink-2 leading-relaxed">
                  {t.landing.footerTagline} &copy; {new Date().getFullYear()}.
                </p>
                <p className="text-xs text-ink-3 mt-3">{t.footer.copyright}</p>
                <p className="text-xs text-ink-3 mt-1 font-mono tracking-[0.02em]">
                  {t.footer.dataLastUpdated("2026-04-12")}
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-8">
                <div>
                  <h4 className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3 mb-4">
                    {t.landing.footerResources}
                  </h4>
                  <ul className="space-y-2 text-sm text-ink-2">
                    <li>
                      <button
                        className="hover:text-civic transition-colors"
                        onClick={() =>
                          document
                            .getElementById("main-content")
                            ?.scrollIntoView({ behavior: "smooth" })
                        }
                      >
                        {t.landing.footerBallotData}
                      </button>
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3 mb-4">
                    {t.landing.footerLegal}
                  </h4>
                  <ul className="space-y-2 text-sm text-ink-2">
                    <li>
                      <a
                        href="/privacy"
                        className="hover:text-civic transition-colors"
                      >
                        {t.footer.privacyPolicy}
                      </a>
                    </li>
                    <li>
                      <a
                        href="/terms"
                        className="hover:text-civic transition-colors"
                      >
                        {t.footer.termsOfUse}
                      </a>
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3 mb-4">
                    {t.landing.footerConnect}
                  </h4>
                  <ul className="space-y-2 text-sm text-ink-2">
                    <li>
                      <span>{t.landing.footerSupport}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </footer>
        </>
      )}
    </>
  );
}

export function PageContent({
  children,
  promptFleetV2Enabled = false,
}: PageContentProps) {
  const { lang } = useLanguage();

  // PR A2 fix — the prototype landing + AppNav ship ONLY when the new
  // flag is on AND the locale is English. Every other surface (flag-off
  // EN — CI legacy specs — and any ES locale) routes through LegacyLanding
  // to preserve the pre-PR-A2 chrome.
  //
  // Critical: do NOT branch on `isResearch` here at the PageContent
  // boundary. The flag-on EN path's landing→research transition lives
  // inside `EnglishShell`, which keeps `{children}` at a fixed JSX
  // position across the flip. Branching here would unmount/remount
  // BallotToolClient (its `result` state resets to "idle", the cleanup
  // effect fires `setResearch(false)`, and the funnel deadlocks back on
  // the landing — see cold-open.spec.ts:184 / workspace.spec.ts:141).
  const prototypeShellActive = promptFleetV2Enabled && lang === "en";

  if (prototypeShellActive) {
    return <EnglishShell>{children}</EnglishShell>;
  }

  return <LegacyLanding>{children}</LegacyLanding>;
}
