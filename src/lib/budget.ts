export type BudgetTier =
  | "normal"
  | "notice"
  | "soft-close"
  | "handoff"
  | "exhausted";

interface BudgetState {
  spentCents: number;
  limitCents: number;
  resetAt: string;
}

const BUDGET_LIMIT_CENTS = 2000;

let inMemoryBudget: BudgetState = {
  spentCents: 0,
  limitCents: BUDGET_LIMIT_CENTS,
  resetAt: getMonthResetDate(),
};

function getMonthResetDate(): string {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return next.toISOString();
}

function checkAndResetIfNeeded(state: BudgetState): BudgetState {
  const now = new Date();
  if (now >= new Date(state.resetAt)) {
    return {
      spentCents: 0,
      limitCents: BUDGET_LIMIT_CENTS,
      resetAt: getMonthResetDate(),
    };
  }
  return state;
}

export function getBudgetTier(
  spentCents: number,
  limitCents: number,
): BudgetTier {
  const pct = spentCents / limitCents;
  if (pct >= 1.0) return "exhausted";
  if (pct >= 0.9) return "handoff";
  if (pct >= 0.8) return "soft-close";
  if (pct >= 0.7) return "notice";
  return "normal";
}

export function isChatAvailable(tier: BudgetTier): boolean {
  return tier === "normal" || tier === "notice";
}

export async function getCurrentBudgetState(): Promise<{
  tier: BudgetTier;
  spentCents: number;
  limitCents: number;
  chatAvailable: boolean;
}> {
  inMemoryBudget = checkAndResetIfNeeded(inMemoryBudget);
  const tier = getBudgetTier(
    inMemoryBudget.spentCents,
    inMemoryBudget.limitCents,
  );
  return {
    tier,
    spentCents: inMemoryBudget.spentCents,
    limitCents: inMemoryBudget.limitCents,
    chatAvailable: isChatAvailable(tier),
  };
}

export async function recordUsageCents(cents: number): Promise<void> {
  inMemoryBudget = checkAndResetIfNeeded(inMemoryBudget);
  inMemoryBudget.spentCents = Math.min(
    inMemoryBudget.spentCents + cents,
    inMemoryBudget.limitCents,
  );
}
