/**
 * anonymizeText — replace a candidate's real last name with their alias
 * in AI-generated narrative text when blind mode is active.
 *
 * Ported from the original design prototype's `prototype-shared.jsx` (preserved in git history).
 * Whole-word regex only, so unrelated text containing the name fragment
 * is not modified.
 */

export interface AnonymizeCtx {
  blindMode?: boolean;
  realLastName?: string;
  alias?: string;
}

export function anonymizeText(text: string, anonCtx?: AnonymizeCtx): string {
  if (!text || !anonCtx?.blindMode || !anonCtx?.realLastName) return text;
  const alias = anonCtx.alias || "this candidate";
  const safe = anonCtx.realLastName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.replace(new RegExp("\\b" + safe + "\\b", "g"), alias);
}
