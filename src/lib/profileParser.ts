const MAX_PROFILE_BYTES = 10 * 1024; // 10KB

/**
 * Extracts the date from a voter profile header like:
 * === MY VOTER PROFILE — 2026-05-12 ===
 */
export function parseProfileDate(content: string): string | null {
  const match = content.match(
    /===\s*MY VOTER PROFILE\s*[—–-]+\s*([^\s=]+)\s*===/i,
  );
  if (!match) return null;
  return match[1].trim();
}

/**
 * Validates uploaded profile file size only (before reading content).
 */
export function validateProfileSize(
  byteSize: number,
): { valid: true } | { valid: false; error: string } {
  if (byteSize > MAX_PROFILE_BYTES) {
    return {
      valid: false,
      error: "File too large. Please upload a .txt file under 10KB.",
    };
  }
  return { valid: true };
}

/**
 * Validates uploaded profile content (after reading file text).
 * Returns { valid: true } or { valid: false, error: string }.
 */
export function validateProfileContent(
  content: string,
  byteSize: number,
): { valid: true } | { valid: false; error: string } {
  if (byteSize > MAX_PROFILE_BYTES) {
    return {
      valid: false,
      error: "File too large. Please upload a .txt file under 10KB.",
    };
  }
  if (!content.trim()) {
    return { valid: false, error: "File appears to be empty." };
  }
  return { valid: true };
}

/**
 * Wraps voter profile content in injection-safe delimiters for system prompt inclusion.
 */
export function wrapProfileForPrompt(content: string): string {
  return `[BEGIN USER VOTER PROFILE]\n${content}\n[END USER VOTER PROFILE]`;
}
