import type {
  CandidateLookup,
  OpenStatesCandidateContext,
  OpenStatesDerivedData,
  OpenStatesRawTables,
  OpenStatesIdentifier,
  OpenStatesVoteSummary,
  RawRow,
  SourceLink,
} from "@/lib/openstates/types";

type MaybeString = string | null | undefined;

function asString(value: unknown): string | null {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

function asDate(value: MaybeString): string {
  return value ?? "";
}

function toSourceLinks(rows: RawRow[] | undefined, key: string): SourceLink[] {
  return (rows ?? [])
    .map((row) => ({
      label: asString(row.note) ?? key,
      url: asString(row.url) ?? "",
    }))
    .filter((item) => item.url.length > 0);
}

function toIdentifiers(rows: RawRow[] | undefined): OpenStatesIdentifier[] {
  return (rows ?? [])
    .map((row) => ({
      scheme: asString(row.scheme) ?? "identifier",
      identifier: asString(row.identifier) ?? "",
    }))
    .filter((item) => item.identifier.length > 0);
}

function normalizeStateCodeFromDivision(
  divisionId: MaybeString,
): string | null {
  if (!divisionId) {
    return null;
  }

  const match = divisionId.match(/state:([a-z]{2})/i);
  return match ? match[1].toUpperCase() : null;
}

function normalizeStateCode(row: RawRow): string | null {
  return (
    asString(row.state_code) ??
    asString(row.stateCode) ??
    normalizeStateCodeFromDivision(
      asString(row.division_id) ?? asString(row.divisionId),
    )
  );
}

function buildVoteSummary(
  voteEvent: RawRow,
  voteCounts: RawRow[],
  personVotes: RawRow[],
  voteSources: RawRow[],
  billSources: RawRow[],
  billById: Map<string, RawRow>,
  billActionById: Map<string, RawRow>,
): OpenStatesVoteSummary {
  const voteEventId = asString(voteEvent.id) ?? "";
  const billId = asString(voteEvent.bill_id) ?? null;
  const billActionId = asString(voteEvent.bill_action_id) ?? null;
  const bill = billId ? billById.get(billId) : undefined;
  const billAction = billActionId
    ? billActionById.get(billActionId)
    : undefined;
  const sourcesOut = [
    ...toSourceLinks(voteSources, "vote source"),
    ...toSourceLinks(billSources, "bill source"),
  ];

  return {
    voteEventId,
    date: asDate(asString(voteEvent.start_date)),
    motionText:
      asString(voteEvent.motion_text) ??
      asString(bill?.title) ??
      billAction?.description?.toString() ??
      "",
    result: asString(voteEvent.result) ?? "",
    counts: voteCounts.map((count) => ({
      option: asString(count.option) ?? "",
      value: Number(count.value) || 0,
    })),
    personVote: personVotes[0]
      ? {
          option: asString(personVotes[0].option) ?? "",
          note: asString(personVotes[0].note) ?? "",
        }
      : undefined,
    sources: [...sourcesOut],
  };
}

function summarizeVotes(votes: OpenStatesVoteSummary[]): string | null {
  if (votes.length === 0) {
    return null;
  }

  const counts = votes.reduce(
    (acc, vote) => {
      const option = vote.personVote?.option.toLowerCase() ?? "";
      if (option.includes("yea") || option.includes("yes")) {
        acc.support += 1;
      } else if (option.includes("nay") || option.includes("no")) {
        acc.opposition += 1;
      } else {
        acc.other += 1;
      }
      return acc;
    },
    { support: 0, opposition: 0, other: 0 },
  );

  return [
    `${votes.length} recorded votes`,
    `${counts.support} support`,
    `${counts.opposition} opposition`,
    counts.other > 0 ? `${counts.other} other` : null,
  ]
    .filter(Boolean)
    .join(", ");
}

function mergeSourceUrls(...groups: Array<SourceLink[] | undefined>): string[] {
  const urls = new Set<string>();
  for (const group of groups) {
    for (const item of group ?? []) {
      if (item.url) {
        urls.add(item.url);
      }
    }
  }
  return [...urls];
}

export function deriveOpenStatesData(
  raw: OpenStatesRawTables,
): OpenStatesDerivedData {
  const people = raw.opencivicdata_person ?? [];
  const namesByPerson = new Map<string, RawRow[]>();
  const identifiersByPerson = new Map<string, RawRow[]>();
  const linksByPerson = new Map<string, RawRow[]>();
  const sourcesByPerson = new Map<string, RawRow[]>();
  const postsById = new Map<string, RawRow>();
  const membershipsByPerson = new Map<string, RawRow[]>();
  const divisionsById = new Map<string, RawRow>();
  const jurisdictionsById = new Map<string, RawRow>();
  const organizationsById = new Map<string, RawRow>();
  const officesByPerson = new Map<string, RawRow[]>();
  const voteEventsById = new Map<string, RawRow>();
  const voteCountsByEvent = new Map<string, RawRow[]>();
  const personVotesByEvent = new Map<string, RawRow[]>();
  const voteSourcesByEvent = new Map<string, RawRow[]>();
  const billsById = new Map<string, RawRow>();
  const billActionsById = new Map<string, RawRow>();
  const billSourcesByBill = new Map<string, RawRow[]>();

  for (const row of raw.opencivicdata_personname ?? []) {
    const personId = asString(row.person_id);
    if (personId) {
      namesByPerson.set(personId, [
        ...(namesByPerson.get(personId) ?? []),
        row,
      ]);
    }
  }
  for (const row of raw.opencivicdata_personidentifier ?? []) {
    const personId = asString(row.person_id);
    if (personId) {
      identifiersByPerson.set(personId, [
        ...(identifiersByPerson.get(personId) ?? []),
        row,
      ]);
    }
  }
  for (const row of raw.opencivicdata_personlink ?? []) {
    const personId = asString(row.person_id);
    if (personId) {
      linksByPerson.set(personId, [
        ...(linksByPerson.get(personId) ?? []),
        row,
      ]);
    }
  }
  for (const row of raw.opencivicdata_personsource ?? []) {
    const personId = asString(row.person_id);
    if (personId) {
      sourcesByPerson.set(personId, [
        ...(sourcesByPerson.get(personId) ?? []),
        row,
      ]);
    }
  }
  for (const row of raw.opencivicdata_post ?? []) {
    const postId = asString(row.id);
    if (postId) {
      postsById.set(postId, row);
    }
  }
  for (const row of raw.opencivicdata_membership ?? []) {
    const personId = asString(row.person_id);
    if (personId) {
      membershipsByPerson.set(personId, [
        ...(membershipsByPerson.get(personId) ?? []),
        row,
      ]);
    }
  }
  for (const row of raw.opencivicdata_division ?? []) {
    const id = asString(row.id);
    if (id) {
      divisionsById.set(id, row);
    }
  }
  for (const row of raw.opencivicdata_jurisdiction ?? []) {
    const id = asString(row.id);
    if (id) {
      jurisdictionsById.set(id, row);
    }
  }
  for (const row of raw.opencivicdata_organization ?? []) {
    const id = asString(row.id);
    if (id) {
      organizationsById.set(id, row);
    }
  }
  for (const row of raw.openstates_personoffice ?? []) {
    const personId = asString(row.person_id);
    if (personId) {
      officesByPerson.set(personId, [
        ...(officesByPerson.get(personId) ?? []),
        row,
      ]);
    }
  }
  for (const row of raw.opencivicdata_voteevent ?? []) {
    const id = asString(row.id);
    if (id) {
      voteEventsById.set(id, row);
    }
  }
  for (const row of raw.opencivicdata_votecount ?? []) {
    const voteEventId = asString(row.vote_event_id);
    if (voteEventId) {
      voteCountsByEvent.set(voteEventId, [
        ...(voteCountsByEvent.get(voteEventId) ?? []),
        row,
      ]);
    }
  }
  for (const row of raw.opencivicdata_personvote ?? []) {
    const voteEventId = asString(row.vote_event_id);
    if (voteEventId) {
      personVotesByEvent.set(voteEventId, [
        ...(personVotesByEvent.get(voteEventId) ?? []),
        row,
      ]);
    }
  }
  for (const row of raw.opencivicdata_votesource ?? []) {
    const voteEventId = asString(row.vote_event_id);
    if (voteEventId) {
      voteSourcesByEvent.set(voteEventId, [
        ...(voteSourcesByEvent.get(voteEventId) ?? []),
        row,
      ]);
    }
  }
  for (const row of raw.opencivicdata_bill ?? []) {
    const id = asString(row.id);
    if (id) {
      billsById.set(id, row);
    }
  }
  for (const row of raw.opencivicdata_billaction ?? []) {
    const id = asString(row.id);
    if (id) {
      billActionsById.set(id, row);
    }
  }
  for (const row of raw.opencivicdata_billsource ?? []) {
    const billId = asString(row.bill_id);
    if (billId) {
      billSourcesByBill.set(billId, [
        ...(billSourcesByBill.get(billId) ?? []),
        row,
      ]);
    }
  }

  const records: OpenStatesCandidateContext[] = people.flatMap((person) => {
    const personId = asString(person.id);
    if (!personId) {
      return [];
    }

    const displayName = asString(person.name) ?? personId;
    const nameRows = namesByPerson.get(personId) ?? [];
    const identifiers = toIdentifiers(identifiersByPerson.get(personId));
    const links = (linksByPerson.get(personId) ?? []).map((row) => ({
      label: asString(row.note) ?? "link",
      url: asString(row.url) ?? "",
    }));
    const sourceLinks = (sourcesByPerson.get(personId) ?? []).map((row) => ({
      label: asString(row.note) ?? "source",
      url: asString(row.url) ?? "",
    }));
    const officeRows = officesByPerson.get(personId) ?? [];
    const membershipRows = membershipsByPerson.get(personId) ?? [];
    const officeContactRow = officeRows[0] ?? null;
    const membershipRow = membershipRows[0] ?? null;
    const postId =
      asString(officeContactRow?.post_id) ?? asString(membershipRow?.post_id);
    const post = postId ? postsById.get(postId) : undefined;
    const organizationId = post
      ? asString(post.organization_id)
      : (asString(officeContactRow?.organization_id) ??
        asString(membershipRow?.organization_id));
    const organization = organizationId
      ? organizationsById.get(organizationId)
      : undefined;
    const jurisdictionId = organization
      ? asString(organization.jurisdiction_id)
      : null;
    const jurisdiction = jurisdictionId
      ? jurisdictionsById.get(jurisdictionId)
      : undefined;
    const divisionId = jurisdiction
      ? asString(jurisdiction.division_id)
      : (asString(post?.division_id) ??
        asString(officeContactRow?.division_id) ??
        asString(membershipRow?.division_id));
    const division = divisionId ? divisionsById.get(divisionId) : undefined;
    const stateCode =
      normalizeStateCode(person) ??
      normalizeStateCode(jurisdiction ?? {}) ??
      normalizeStateCode(post ?? {}) ??
      normalizeStateCode(division ?? {}) ??
      "UNKNOWN";
    const voteSummaries: OpenStatesVoteSummary[] = [];
    for (const [
      voteEventId,
      relatedPersonVotes,
    ] of personVotesByEvent.entries()) {
      const filteredVotes = relatedPersonVotes.filter(
        (row) => asString(row.voter_id) === personId,
      );
      if (filteredVotes.length === 0) {
        continue;
      }

      const voteEvent = voteEventsById.get(voteEventId);
      if (!voteEvent) {
        continue;
      }

      const billId = asString(voteEvent.bill_id);
      voteSummaries.push(
        buildVoteSummary(
          voteEvent,
          voteCountsByEvent.get(voteEventId) ?? [],
          filteredVotes,
          voteSourcesByEvent.get(voteEventId) ?? [],
          billId ? (billSourcesByBill.get(billId) ?? []) : [],
          billsById,
          billActionsById,
        ),
      );
    }

    const recentVoteSummary = summarizeVotes(voteSummaries);
    const incumbent =
      Boolean(person.current_role) ||
      officeRows.length > 0 ||
      membershipRows.some((row) => {
        const startDate = asString(row.start_date);
        const endDate = asString(row.end_date);
        return Boolean(startDate) && (!endDate || endDate === "");
      });

    return [
      {
        stateCode,
        jurisdictionId,
        jurisdictionName:
          asString(jurisdiction?.name) ?? asString(organization?.name),
        divisionId,
        officeLabel:
          asString(officeContactRow?.name) ??
          asString(post?.label) ??
          asString(membershipRow?.role) ??
          null,
        officeRole: asString(post?.role) ?? asString(membershipRow?.role),
        officeClassification: asString(officeContactRow?.classification),
        personId,
        displayName,
        otherNames: nameRows
          .map((row) => asString(row.name))
          .filter(
            (name): name is string => Boolean(name) && name !== displayName,
          ),
        familyName: asString(person.family_name),
        givenName: asString(person.given_name),
        primaryParty: asString(person.primary_party),
        incumbent,
        identifiers,
        links,
        sourceUrls: mergeSourceUrls(
          sourceLinks.map((item) => ({ ...item })),
          links,
          voteSummaries.flatMap((vote) => vote.sources),
        ),
        recentVoteSummary,
        voteSummaries,
      },
    ];
  });

  return {
    generatedAt: new Date().toISOString(),
    records,
  };
}

export function lookupOpenStatesCandidate(
  derived: OpenStatesDerivedData,
  lookup: CandidateLookup,
): OpenStatesCandidateContext | null {
  const normalizedState = lookup.stateCode.toUpperCase();
  const candidates = derived.records.filter(
    (record) => record.stateCode === normalizedState,
  );

  return (
    candidates.find((record) => {
      if (
        lookup.jurisdictionId &&
        record.jurisdictionId !== lookup.jurisdictionId
      ) {
        return false;
      }

      if (lookup.officeLabel && record.officeLabel !== lookup.officeLabel) {
        return false;
      }

      if (lookup.candidateName) {
        const needle = lookup.candidateName.toLowerCase();
        const haystack = [
          record.displayName,
          record.familyName,
          record.givenName,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(needle);
      }

      return true;
    }) ?? null
  );
}
