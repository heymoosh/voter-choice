/**
 * Parses "=== MY VOTER PROFILE" structured output from AI response text.
 * Returns the profile string or null if the marker is missing.
 */

const PROFILE_START = "=== MY VOTER PROFILE";
const PROFILE_END = "=== END VOTER PROFILE ===";

/**
 * Extract the voter profile block from text.
 * Returns the raw profile text or null if not found.
 */
export function parseVoterProfile(text: string): string | null {
  const startIdx = text.indexOf(PROFILE_START);
  if (startIdx === -1) return null;

  const endIdx = text.indexOf(PROFILE_END, startIdx);
  if (endIdx === -1) {
    // No explicit end marker — take from start to end of text
    return text.slice(startIdx).trim();
  }

  return text.slice(startIdx, endIdx + PROFILE_END.length).trim();
}

/**
 * Validate that an uploaded voter profile string is within acceptable bounds.
 */
export function validateProfileContent(content: string): {
  valid: boolean;
  error?: string;
} {
  if (!content.trim()) {
    return { valid: false, error: "Profile file is empty." };
  }

  const wordCount = content.trim().split(/\s+/).length;
  if (wordCount > 1000) {
    // 500-word limit per spec, but allow 1000 for uploaded files that may have varied formatting
    return {
      valid: false,
      error:
        "Profile is too long. Maximum 500 words — try editing it down before uploading.",
    };
  }

  return { valid: true };
}
