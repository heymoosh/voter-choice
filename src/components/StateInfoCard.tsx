"use client";

import { useState } from "react";
import type { BallotData, Election, BallotContest } from "@/lib/types";
import { getDeadlineStatus } from "@/lib/deadlineStatus";
import type { Language } from "@/lib/i18n";
import { tStr } from "@/lib/i18n";

type StateInfoCardProps = {
  ballotData: BallotData;
  today?: Date;
  language?: Language;
};

function formatDate(
  isoDate: string | null | undefined,
  language: Language = "en",
): string {
  if (!isoDate) return "N/A";
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const locale = language === "es" ? "es" : "en-US";
  return date.toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

type DeadlineRowProps = {
  label: string;
  isoDate: string | null | undefined;
  today: Date;
  note?: string;
  language?: Language;
};

function DeadlineRow({
  label,
  isoDate,
  today,
  note,
  language = "en",
}: DeadlineRowProps) {
  const status = getDeadlineStatus(isoDate, today, language);
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 py-1">
      <span className="text-sm text-gray-600 min-w-[100px] font-medium">
        {label}
      </span>
      <span className="text-sm text-gray-800">
        {formatDate(isoDate, language)}
      </span>
      <span className={`text-sm font-semibold ${status.colorClass}`}>
        {status.label}
        {note && (
          <span className="text-gray-500 font-normal text-xs ml-1">
            ({note})
          </span>
        )}
      </span>
    </div>
  );
}

function ElectionSection({
  nextElection,
  stateName,
  stateElectionWebsite,
  language = "en",
}: {
  nextElection: Election | null;
  stateName: string;
  stateElectionWebsite: string;
  language?: Language;
}) {
  return (
    <section aria-labelledby="election-heading">
      <h3
        id="election-heading"
        className="text-base font-semibold text-gray-800 mb-2"
      >
        {tStr(language, "nextElection")}
      </h3>
      {nextElection ? (
        <div className="space-y-1">
          <p data-testid="election-name" className="text-gray-900 font-medium">
            {nextElection.name}
          </p>
          <p data-testid="election-date" className="text-gray-600 text-sm">
            {formatDate(nextElection.date, language)}
          </p>
        </div>
      ) : (
        <p data-testid="no-election-message" className="text-gray-500 text-sm">
          {tStr(language, "noElection")} {stateName}.{" "}
          {tStr(language, "noElectionSuffix")}{" "}
          <a
            href={stateElectionWebsite}
            className="text-blue-600 underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            {stateElectionWebsite}
          </a>{" "}
          {tStr(language, "noElectionSuffix2")}
        </p>
      )}
    </section>
  );
}

function PollingLocationSection({
  ballotData,
  language = "en",
}: {
  ballotData: BallotData;
  language?: Language;
}) {
  return (
    <section
      aria-labelledby="polling-location-heading"
      data-testid="polling-location"
    >
      <h3
        id="polling-location-heading"
        className="text-base font-semibold text-gray-800 mb-2"
      >
        {tStr(language, "pollingLocation")}
      </h3>
      {ballotData.pollingLocation ? (
        <div className="text-sm text-gray-700 space-y-1">
          <p className="font-medium">{ballotData.pollingLocation.name}</p>
          <p>{ballotData.pollingLocation.address}</p>
          {ballotData.pollingLocation.hours && (
            <p className="text-gray-500">{ballotData.pollingLocation.hours}</p>
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-500">
          {tStr(language, "pollingLocationNotAvailable")}{" "}
          <a
            href={ballotData.resources.pollingPlaceLookup}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline"
          >
            {tStr(language, "stateElectionWebsite")}
          </a>
        </p>
      )}
    </section>
  );
}

function CandidatePanel({
  candidate,
  contest,
  state,
  language = "en",
}: {
  candidate: BallotContest["candidates"][0];
  contest: BallotContest;
  state: string;
  language?: Language;
}) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [enrichment, setEnrichment] = useState<{
    votingRecord: string;
    topDonors: string;
    endorsements: string;
    citations: string[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleExpand() {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    if (enrichment) return; // Already loaded

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/candidate-enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: candidate.name,
          race: contest.office,
          state,
        }),
      });
      if (!res.ok) throw new Error("Request failed");
      const data = await res.json();
      setEnrichment(data);
    } catch {
      setError("Unable to load candidate information.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      data-testid="candidate-detail"
      className="border-l-2 border-gray-200 pl-3 py-1"
    >
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm font-medium text-gray-800">
            {candidate.name}
          </span>
          {candidate.party && (
            <span className="text-xs text-gray-500 ml-2">
              ({candidate.party})
            </span>
          )}
        </div>
        <button
          onClick={handleExpand}
          className="text-xs text-blue-600 underline hover:text-blue-800 ml-2"
          aria-expanded={expanded}
        >
          {tStr(language, "viewVotingRecord")}
        </button>
      </div>

      {expanded && (
        <div className="mt-2 space-y-2">
          {loading && (
            <p className="text-xs text-gray-500 italic">
              {tStr(language, "loadingCandidateInfo")}
            </p>
          )}
          {error && <p className="text-xs text-red-500">{error}</p>}
          {enrichment && (
            <div className="text-xs text-gray-700 space-y-2">
              {enrichment.votingRecord && (
                <div>
                  <p className="font-semibold text-gray-800">
                    {tStr(language, "votingRecord")}
                  </p>
                  <p>{enrichment.votingRecord}</p>
                </div>
              )}
              {enrichment.topDonors && (
                <div>
                  <p className="font-semibold text-gray-800">
                    {tStr(language, "topDonors")}
                  </p>
                  <p>{enrichment.topDonors}</p>
                </div>
              )}
              {enrichment.endorsements && (
                <div>
                  <p className="font-semibold text-gray-800">
                    {tStr(language, "endorsements")}
                  </p>
                  <p>{enrichment.endorsements}</p>
                </div>
              )}
              {enrichment.citations.length > 0 && (
                <div>
                  <p className="font-semibold text-gray-800 text-xs">
                    Sources:
                  </p>
                  <ul className="list-disc list-inside space-y-0.5">
                    {enrichment.citations.map((url, i) => (
                      <li key={i}>
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 underline break-all"
                        >
                          {url}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BallotContestsSection({
  ballotData,
  language = "en",
}: {
  ballotData: BallotData;
  language?: Language;
}) {
  return (
    <section
      aria-labelledby="ballot-contests-heading"
      data-testid="ballot-contests"
    >
      <h3
        id="ballot-contests-heading"
        className="text-base font-semibold text-gray-800 mb-2"
      >
        {tStr(language, "ballotContests")}
      </h3>
      {ballotData.ballotContests.length === 0 ? (
        <p className="text-sm text-gray-500">
          {tStr(language, "ballotContestsEmpty")}
        </p>
      ) : (
        <div className="space-y-3">
          {ballotData.ballotContests.map((contest) => (
            <div key={contest.id} className="space-y-1">
              <p className="text-sm font-medium text-gray-800">
                {contest.office}
                {contest.district && (
                  <span className="text-xs text-gray-500 ml-1">
                    — {contest.district}
                  </span>
                )}
              </p>
              <div className="space-y-1 pl-2">
                {contest.candidates.map((candidate, i) => (
                  <CandidatePanel
                    key={i}
                    candidate={candidate}
                    contest={contest}
                    state={ballotData.stateCode}
                    language={language}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function RegistrationSection({
  registration,
  today,
  language = "en",
}: {
  registration: BallotData["registration"];
  today: Date;
  language?: Language;
}) {
  return (
    <section aria-labelledby="reg-heading" data-testid="registration-status">
      <h3
        id="reg-heading"
        className="text-base font-semibold text-gray-800 mb-2"
      >
        {tStr(language, "registrationDeadlines")}
      </h3>
      <div className="space-y-1">
        {registration.online.available && (
          <DeadlineRow
            label={tStr(language, "onlineLabel")}
            isoDate={registration.online.deadline}
            today={today}
            language={language}
          />
        )}
        <DeadlineRow
          label={tStr(language, "byMailLabel")}
          isoDate={registration.byMail.deadline}
          today={today}
          note={
            registration.byMail.sincePostmarked
              ? language === "es"
                ? "fecha de matasellos"
                : "postmark date"
              : language === "es"
                ? "fecha de recepción"
                : "received"
          }
          language={language}
        />
        <DeadlineRow
          label={tStr(language, "inPersonLabel")}
          isoDate={registration.inPerson.deadline}
          today={today}
          language={language}
        />
      </div>
      {registration.sameDayRegistration && (
        <p className="text-sm text-green-700 mt-2 font-medium">
          ✓ {tStr(language, "sameDayReg")}
        </p>
      )}
      <p className="text-xs text-gray-500 mt-2">
        {tStr(language, "checkRegistration")}{" "}
        <a
          href={registration.registrationCheckUrl}
          className="text-blue-600 underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          {registration.registrationCheckUrl}
        </a>
      </p>
    </section>
  );
}

function VotingRulesSection({
  votingRules,
  language = "en",
}: {
  votingRules: BallotData["votingRules"];
  language?: Language;
}) {
  return (
    <section aria-labelledby="rules-heading">
      <h3
        id="rules-heading"
        className="text-base font-semibold text-gray-800 mb-2"
      >
        {tStr(language, "votingRules")}
      </h3>
      <div className="space-y-1 text-sm text-gray-700">
        <p>
          <span className="font-medium">{tStr(language, "voterId")} </span>
          {votingRules.idRequired
            ? tStr(language, "voterIdRequired")
            : tStr(language, "voterIdNotRequired")}
        </p>
        {votingRules.idRequired && votingRules.acceptedIds.length > 0 && (
          <ul className="list-disc list-inside ml-2 space-y-1">
            {votingRules.acceptedIds.map((id) => (
              <li key={id}>{id}</li>
            ))}
          </ul>
        )}
        <p>
          <span className="font-medium">
            {tStr(language, "phonesAtPolls")}{" "}
          </span>
          {votingRules.phonesAtPollsDetail}
        </p>
      </div>
    </section>
  );
}

function ResourcesSection({
  resources,
  language = "en",
}: {
  resources: BallotData["resources"];
  language?: Language;
}) {
  return (
    <section aria-labelledby="resources-heading">
      <h3
        id="resources-heading"
        className="text-base font-semibold text-gray-800 mb-2"
      >
        {tStr(language, "resources")}
      </h3>
      <ul className="space-y-1 text-sm">
        <li>
          <a
            href={resources.stateElectionWebsite}
            className="text-blue-600 underline hover:text-blue-800"
            target="_blank"
            rel="noopener noreferrer"
          >
            {tStr(language, "stateElectionWebsite")}
          </a>
        </li>
        <li>
          <a
            href={resources.countyElectionLookup}
            className="text-blue-600 underline hover:text-blue-800"
            target="_blank"
            rel="noopener noreferrer"
          >
            {tStr(language, "countyElectionOffice")}
          </a>
        </li>
        <li>
          <a
            href={resources.sampleBallotLookup}
            className="text-blue-600 underline hover:text-blue-800"
            target="_blank"
            rel="noopener noreferrer"
          >
            {tStr(language, "sampleBallot")}
          </a>
        </li>
      </ul>
    </section>
  );
}

export function StateInfoCard({
  ballotData,
  today = new Date(),
  language = "en",
}: StateInfoCardProps) {
  const {
    stateName,
    elections,
    registration,
    earlyVoting,
    votingRules,
    resources,
    fetchedAt,
  } = ballotData;

  const todayMs = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );

  const nextElection =
    elections.find((e) => {
      const [y, m, d] = e.date.split("-").map(Number);
      return Date.UTC(y, m - 1, d) >= todayMs;
    }) ?? null;

  const fetchedDate = fetchedAt
    ? new Date(fetchedAt).toLocaleString(language === "es" ? "es" : "en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div
      data-testid="state-info"
      className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-5"
    >
      <div>
        <h2 className="text-xl font-bold text-gray-900">{stateName}</h2>
        {fetchedDate && (
          <p className="text-sm text-gray-500">
            {tStr(language, "lastUpdated")} {fetchedDate}
          </p>
        )}
      </div>

      <ElectionSection
        nextElection={nextElection}
        stateName={stateName}
        stateElectionWebsite={resources.stateElectionWebsite}
        language={language}
      />

      <PollingLocationSection ballotData={ballotData} language={language} />

      {ballotData.ballotContests.length > 0 && (
        <BallotContestsSection ballotData={ballotData} language={language} />
      )}

      <RegistrationSection
        registration={registration}
        today={today}
        language={language}
      />

      {earlyVoting.available && (
        <section aria-labelledby="early-voting-heading">
          <h3
            id="early-voting-heading"
            className="text-base font-semibold text-gray-800 mb-1"
          >
            {tStr(language, "earlyVoting")}
          </h3>
          <p className="text-sm text-gray-700">
            {formatDate(earlyVoting.startDate, language)} —{" "}
            {formatDate(earlyVoting.endDate, language)}
            {earlyVoting.notes && (
              <span className="text-gray-500 ml-1">({earlyVoting.notes})</span>
            )}
          </p>
        </section>
      )}

      <VotingRulesSection votingRules={votingRules} language={language} />

      <ResourcesSection resources={resources} language={language} />

      {/* Data attribution footer */}
      <footer
        data-testid="data-attribution"
        className="border-t border-gray-100 pt-3 text-xs text-gray-400"
      >
        <p>
          {tStr(language, "dataAttribution")}{" "}
          <a
            href={resources.stateElectionWebsite}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            {tStr(language, "verifyAt")} {stateName}
          </a>
          .
        </p>
      </footer>
    </div>
  );
}
