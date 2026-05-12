/**
 * Generates downloadable .txt content for the voter profile.
 */

/**
 * Trigger a browser download of the voter profile as a .txt file.
 */
export function downloadProfileTxt(profileContent: string): void {
  const blob = new Blob([profileContent], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `voter-profile-${new Date().toISOString().slice(0, 10)}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
