export enum BudgetTier {
  Normal = "normal",
  Notice = "notice",
  SoftClose = "soft-close",
  Handoff = "handoff",
  Exhausted = "exhausted",
}

export interface BudgetStatus {
  tier: BudgetTier;
  totalSpent: number;
  percentUsed: number;
  isChatAvailable: boolean;
  showNotice: boolean;
  message?: string;
}

const HARD_CAP = 20; // $20/month

let _memorySpent = 0;

export function getTierForPercentage(pct: number): BudgetTier {
  if (pct >= 100) return BudgetTier.Exhausted;
  if (pct >= 90) return BudgetTier.Handoff;
  if (pct >= 80) return BudgetTier.SoftClose;
  if (pct >= 70) return BudgetTier.Notice;
  return BudgetTier.Normal;
}

export class BudgetManager {
  async getStatus(): Promise<BudgetStatus> {
    const totalSpent = _memorySpent;
    const pct = Math.min((totalSpent / HARD_CAP) * 100, 100);
    const tier = getTierForPercentage(pct);
    const isChatAvailable =
      tier === BudgetTier.Normal || tier === BudgetTier.Notice;

    return {
      tier,
      totalSpent,
      percentUsed: pct,
      isChatAvailable,
      showNotice: tier === BudgetTier.Notice,
      message: getMessageForTier(tier),
    };
  }

  async recordSpend(amountUSD: number): Promise<void> {
    _memorySpent += amountUSD;
  }

  async setSpendForTest(amountUSD: number): Promise<void> {
    _memorySpent = amountUSD;
  }

  resetForTest(): void {
    _memorySpent = 0;
  }
}

function getMessageForTier(tier: BudgetTier): string | undefined {
  switch (tier) {
    case BudgetTier.Notice:
      return "High usage — chat available but may be limited soon.";
    case BudgetTier.SoftClose:
      return "Chat is currently at capacity. Use the copy/paste option below.";
    case BudgetTier.Handoff:
      return "Chat session limit reached. Copy your prompt to continue in any AI chatbot.";
    case BudgetTier.Exhausted:
      return "Monthly chat budget exhausted. Copy your prompt to continue in Claude, ChatGPT, or Gemini.";
    default:
      return undefined;
  }
}

export const budgetManager = new BudgetManager();
