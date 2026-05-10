import { BudgetStatus, BudgetTier } from "@/types/election";

const MONTHLY_CAP_CENTS = 2000; // $20

let currentSpendCents = 0;
let lastResetMonth = new Date().getMonth();

function maybeResetMonthly() {
  const now = new Date();
  if (now.getMonth() !== lastResetMonth) {
    currentSpendCents = 0;
    lastResetMonth = now.getMonth();
  }
}

export function getBudgetStatus(): BudgetStatus {
  maybeResetMonthly();
  const percentUsed = (currentSpendCents / MONTHLY_CAP_CENTS) * 100;

  let tier: BudgetTier;
  let chatAvailable: boolean;

  if (percentUsed >= 100) {
    tier = "exhausted";
    chatAvailable = false;
  } else if (percentUsed >= 90) {
    tier = "exhausted";
    chatAvailable = false;
  } else if (percentUsed >= 80) {
    tier = "soft-close";
    chatAvailable = false;
  } else if (percentUsed >= 70) {
    tier = "notice";
    chatAvailable = true;
  } else {
    tier = "normal";
    chatAvailable = true;
  }

  return { tier, percentUsed, chatAvailable };
}

export function recordSpend(cents: number) {
  maybeResetMonthly();
  currentSpendCents += cents;
}

export function isChatAvailable(): boolean {
  return getBudgetStatus().chatAvailable;
}
