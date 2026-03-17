import type { StateElectionData, ZipLookupResult, Election, DeadlineStatus } from '@/types/election';

const zipToStateMap: Record<string, string[]> = require('@/data/zip-to-state.json');

export function lookupZipCode(zipCode: string): ZipLookupResult | null {
  const states = zipToStateMap[zipCode];

  if (!states) {
    return null;
  }

  return {
    states,
    isMultiState: states.length > 1
  };
}

export async function getStateElectionData(stateCode: string): Promise<StateElectionData | null> {
  try {
    const data = require(`@/data/states/${stateCode}.json`);
    return data;
  } catch (error) {
    return null;
  }
}

export function getNextElection(elections: Election[]): Election | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingElections = elections
    .filter(election => {
      const electionDate = new Date(election.date);
      electionDate.setHours(0, 0, 0, 0);
      return electionDate >= today;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return upcomingElections[0] || null;
}

export function calculateDeadlineStatus(deadlineDate: string): DeadlineStatus {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const deadline = new Date(deadlineDate);
  deadline.setHours(0, 0, 0, 0);

  const diffTime = deadline.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      date: deadlineDate,
      daysRemaining: null,
      status: 'passed',
      statusText: 'Passed'
    };
  } else if (diffDays <= 3) {
    return {
      date: deadlineDate,
      daysRemaining: diffDays,
      status: 'urgent',
      statusText: diffDays === 0 ? 'Today' : `${diffDays} day${diffDays === 1 ? '' : 's'} left`
    };
  } else if (diffDays <= 14) {
    return {
      date: deadlineDate,
      daysRemaining: diffDays,
      status: 'warning',
      statusText: `${diffDays} days left`
    };
  } else {
    return {
      date: deadlineDate,
      daysRemaining: diffDays,
      status: 'good',
      statusText: `${diffDays} days left`
    };
  }
}

export function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
}
