/**
 * PartyGate — data-driven state party-eligibility gate (Phase 5).
 *
 * Renders the same shape every time, populated from a `StateRule` row in
 * the rules table. There is no state-name branching inside this file. If
 * you find yourself wanting to write `if (rule.state === "TX")`, you're
 * either (a) adding behavior that belongs in the rules table as a field,
 * or (b) building the wrong abstraction.
 *
 * Behaviors:
 *   - With `rule.options`: radio list + Continue button. Continue fires
 *     `onSelect({state, county, ballotTag, electionDate, electionLabel})`,
 *     except for options flagged `clarification:true` which fire
 *     `onClarificationStart(rule.state)` instead.
 *   - With `rule.unaffiliatedPath`: in addition to any `options`, surfaces
 *     a synthesized "I'm not registered with a party" radio. Selecting it
 *     reveals the unaffiliated panel (message + re-reg link + optional
 *     "skip to general" button that fires onSelect with ballotTag='GENERAL').
 *
 * See .ai/work-packets/redesign-phase-5-state-party-gates.md.
 */

import React, { useState } from "react";
import type { StateRule } from "../lib/state-rules/types";
import type { SerializableBallotContext } from "../lib/state-rules/ballot-context";

const UNAFFILIATED_OPTION_ID = "unaffiliated";

export interface PartyGateProps {
  /** The data-driven rule the gate renders. */
  rule: StateRule;
  /** Optional county (from civic lookup or zip-based fallback). */
  county?: string;
  /** ISO date (YYYY-MM-DD). */
  electionDate: string;
  /** Human-readable election label (e.g. "2026 Texas Primary Runoff"). */
  electionLabel?: string;
  /**
   * Fired when the user commits a selection. Receives the serialized
   * BallotContext that downstream chat calls inject into `<ballot_context>`.
   */
  onSelect: (selection: SerializableBallotContext) => void;
  /**
   * Fired for options flagged `clarification:true` (e.g. TX "I'm not sure").
   * The clarification flow is a placeholder in v1 — see packet's deferred
   * notes.
   */
  onClarificationStart?: (state: string) => void;
}

/** Stable id used for the synthesized unaffiliated row. */
function buildSelection(
  rule: StateRule,
  ballotTag: string,
  county: string | undefined,
  electionDate: string,
  electionLabel: string,
): SerializableBallotContext {
  return {
    state: rule.state,
    county,
    ballotTag,
    electionDate,
    electionLabel,
  };
}

export function PartyGate({
  rule,
  county,
  electionDate,
  electionLabel,
  onSelect,
  onClarificationStart,
}: PartyGateProps): React.JSX.Element {
  const baseOptions = rule.options ?? [];
  // Synthesize an "I'm not registered" row when the rule has an
  // unaffiliated path. This row is purely data-driven (id constant,
  // label below) so the component still doesn't branch on state name.
  const showsUnaffiliatedRow = !!rule.unaffiliatedPath;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedOption = baseOptions.find((o) => o.id === selectedId) ?? null;
  const isUnaffiliatedSelected = selectedId === UNAFFILIATED_OPTION_ID;
  const labelText = electionLabel ?? "this election";

  function handleContinue() {
    if (!selectedOption) return;
    if (selectedOption.clarification) {
      onClarificationStart?.(rule.state);
      return;
    }
    onSelect(
      buildSelection(
        rule,
        selectedOption.ballotTag,
        county,
        electionDate,
        labelText,
      ),
    );
  }

  // Clarification fallback — when the user picks a `clarification:true`
  // option (e.g. TX "I'm not sure") AND the parent hasn't wired the
  // AI-assisted clarification handler, give the voter a real next step.
  // Two presentations, in priority order:
  //   1. If the rule ships `externalResources`, render the SOS / county
  //      links + instructions so the voter can look themselves up.
  //   2. Otherwise, surface a polite "coming soon" placeholder so the
  //      Continue button doesn't silently no-op (legacy v1 behavior).
  // In both cases, Continue stays disabled — the voter still has to pick
  // a real named option once they know.
  const isClarificationSelected =
    !!selectedOption?.clarification && !onClarificationStart;
  const showClarificationExternal =
    isClarificationSelected && !!rule.externalResources;
  const showClarificationPlaceholder =
    isClarificationSelected && !rule.externalResources;

  function handleSkipToGeneral() {
    onSelect(buildSelection(rule, "GENERAL", county, electionDate, labelText));
  }

  return (
    <section
      data-testid="party-gate"
      className="bg-surface-lowest border-l-4 border-accent p-5 md:p-6"
    >
      <h2 className="font-black text-lg tracking-tight text-on-surface">
        Before we start: {rule.state} ballot check
      </h2>
      <p className="mt-2 text-sm text-on-surface-muted">
        Your eligibility depends on the rule below. We&rsquo;ll tailor the rest
        of the conversation to the ballot you&rsquo;re allowed to research.
      </p>

      {/* Statute box — citation + factual restatement + canonical link. */}
      <div className="mt-4 border border-outline-variant/40 bg-surface p-4 text-sm">
        <p
          data-testid="party-gate-statute-code"
          className="font-mono text-xs uppercase tracking-widest text-primary"
        >
          {rule.statute.url ? (
            <a
              href={rule.statute.url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              {rule.statute.code}
            </a>
          ) : (
            rule.statute.code
          )}
        </p>
        <p
          data-testid="party-gate-statute-text"
          className="mt-2 text-on-surface"
        >
          {rule.statute.text}
        </p>
      </div>

      {/* Options + (optional) unaffiliated row. */}
      <div className="mt-4 space-y-3" role="radiogroup">
        {baseOptions.map((option) => (
          <label
            key={option.id}
            className="flex items-start gap-3 bg-surface px-4 py-3 cursor-pointer"
          >
            <input
              type="radio"
              name="party-gate-choice"
              value={option.id}
              checked={selectedId === option.id}
              onChange={() => setSelectedId(option.id)}
              data-testid={`party-gate-option-${option.id}`}
              className="mt-1 h-4 w-4 accent-[var(--color-primary)]"
            />
            <span className="text-sm text-on-surface">{option.label}</span>
          </label>
        ))}
        {showsUnaffiliatedRow && (
          <label className="flex items-start gap-3 bg-surface px-4 py-3 cursor-pointer">
            <input
              type="radio"
              name="party-gate-choice"
              value={UNAFFILIATED_OPTION_ID}
              checked={isUnaffiliatedSelected}
              onChange={() => setSelectedId(UNAFFILIATED_OPTION_ID)}
              data-testid={`party-gate-option-${UNAFFILIATED_OPTION_ID}`}
              className="mt-1 h-4 w-4 accent-[var(--color-primary)]"
            />
            <span className="text-sm text-on-surface">
              I&rsquo;m not registered with a party.
            </span>
          </label>
        )}
      </div>

      {/* Unaffiliated panel — graceful "you cannot vote this primary" path. */}
      {isUnaffiliatedSelected && rule.unaffiliatedPath && (
        <div
          data-testid="party-gate-unaffiliated-panel"
          className="mt-4 border border-outline-variant/40 bg-surface-low p-4 text-sm"
        >
          <p className="text-on-surface">{rule.unaffiliatedPath.message}</p>
          <a
            href={rule.unaffiliatedPath.reregistrationUrl}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="party-gate-reregistration-link"
            className="mt-3 inline-block underline text-primary"
          >
            Register or update your party affiliation
          </a>
          {rule.unaffiliatedPath.canSkipToGeneral && (
            <div className="mt-4">
              <button
                type="button"
                onClick={handleSkipToGeneral}
                data-testid="party-gate-skip-to-general"
                className="bg-primary text-on-primary px-4 py-2 text-sm font-bold uppercase tracking-wide"
              >
                Skip the primary, show general-election context
              </button>
            </div>
          )}
        </div>
      )}

      {/* Clarification external-resources fallback — when the rule ships
          an externalResources block, give the voter a real next step
          (SOS lookup + county elections links) instead of a dead end. */}
      {showClarificationExternal && rule.externalResources && (
        <div
          data-testid="party-gate-clarification-external"
          className="mt-4 border border-outline-variant/40 bg-surface-low p-4 text-sm"
        >
          {rule.externalResources.lookupInstructions && (
            <p className="text-on-surface">
              {rule.externalResources.lookupInstructions}
            </p>
          )}
          <ul className="mt-3 space-y-2">
            {rule.externalResources.sosVoterLookupUrl && (
              <li>
                <a
                  href={rule.externalResources.sosVoterLookupUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="party-gate-clarification-sos-link"
                  className="underline text-primary"
                >
                  Look up your voter history &rarr;
                </a>
              </li>
            )}
            {rule.externalResources.countyElectionsLocatorUrl && (
              <li>
                <a
                  href={rule.externalResources.countyElectionsLocatorUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="party-gate-clarification-county-link"
                  className="underline text-primary"
                >
                  Find your county elections office &rarr;
                </a>
              </li>
            )}
          </ul>
          <p className="mt-3 text-on-surface-muted">
            Once you know, come back and pick one of the options above.
          </p>
        </div>
      )}

      {/* Clarification placeholder — v1 doesn't ship the AI-assisted "I'm
          not sure" flow, so when the parent hasn't wired a handler AND
          the rule doesn't ship external resources we surface a polite
          redirect rather than silently no-op on Continue. */}
      {showClarificationPlaceholder && (
        <p
          data-testid="party-gate-clarification-placeholder"
          className="mt-4 text-sm text-on-surface-muted"
        >
          Clarification flow coming soon &mdash; for now, please pick one of the
          named options above.
        </p>
      )}

      {/* Continue — disabled until any non-unaffiliated option is picked, or
          when unaffiliated is selected (the skip-to-general button takes
          over for that path). Either clarification fallback (external links
          or placeholder) keeps Continue disabled — the voter still has to
          pick a real named option. */}
      {!isUnaffiliatedSelected && (
        <div className="mt-5">
          <button
            type="button"
            onClick={handleContinue}
            disabled={
              !selectedOption ||
              showClarificationPlaceholder ||
              showClarificationExternal
            }
            data-testid="party-gate-continue"
            className="bg-primary text-on-primary px-4 py-2 text-sm font-bold uppercase tracking-wide disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Continue
          </button>
        </div>
      )}
    </section>
  );
}
