/**
 * Types for Phase 5: LLM Chat Window, Downloadable Ballot, and Voter Profile
 */

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  /** Timestamp when message was created */
  timestamp: number;
}

export interface ChatSession {
  id: string;
  messages: ChatMessage[];
  messageCount: number;
  startedAt: number;
}

export type BudgetStatus = "normal" | "warning" | "critical" | "exhausted";

export interface BudgetInfo {
  percentUsed: number;
  status: BudgetStatus;
}

export interface AlignmentIssue {
  issue: string;
  userPriority: string;
  score: number;
  rationale: string;
  sources: string[];
}

export interface AlignmentScore {
  candidate: string;
  overall: number;
  issues: AlignmentIssue[];
}

export interface AlignmentScores {
  race: string;
  scores: AlignmentScore[];
}

export interface BallotEntry {
  race: string;
  pick: string;
}

export interface BallotData {
  county?: string;
  electionName?: string;
  date?: string;
  entries: BallotEntry[];
  propositions: Array<{ number: string; vote: string }>;
  phonePolicy?: string;
}
