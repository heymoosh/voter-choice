/**
 * Shared utilities for extracting ballot/profile content from AI messages
 * and generating printable ballot pages.
 */

/** Extract "MY BALLOT" (EN) or "MI BOLETA" (ES) block from message content */
export function extractBallot(content: string): string | null {
  const matches = [
    ...content.matchAll(
      /(?:^|\n)((?:(?:===\s*)?(?:MY BALLOT|MI BOLETA)(?:\s*[-—][^\n=]*)?(?:\s*===)?)[\s\S]+?)(?=\n===\s*(?:MY VOTER PROFILE|MI PERFIL DE VOTANTE|VOTER SESSION HANDOFF|TRANSFERENCIA DE SESIÓN DE VOTANTE)|\n### |$)/g,
    ),
  ];
  const match = matches.at(-1);
  return match?.[1] ? match[1].trim() : null;
}

/** Extract voter profile block (EN or ES) from message content */
export function extractVoterProfile(content: string): string | null {
  const matches = [
    ...content.matchAll(
      /=== (?:MY VOTER PROFILE|MI PERFIL DE VOTANTE)[\s\S]*?=== (?:END VOTER PROFILE|FIN DEL PERFIL DE VOTANTE) ===/g,
    ),
  ];
  const match = matches.at(-1);
  return match?.[0] ? match[0].trim() : null;
}

/** Extract the date from a voter profile string, if present */
export function extractProfileDate(profile: string): string | null {
  const match = profile.match(
    /=== (?:MY VOTER PROFILE|MI PERFIL DE VOTANTE)\s*[-—]\s*(.+?)\s*===/,
  );
  return match ? match[1].trim() : null;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Open a new browser window with a printable ballot and trigger print */
export function openPrintableBallot(ballotText: string): void {
  const win = window.open("", "_blank");
  if (!win) return;

  win.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>My Ballot</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    color: #000;
    background: #fff;
    padding: 1.5cm 2cm;
    line-height: 1.5;
    max-width: 800px;
    margin: 0 auto;
  }
  .header {
    border-bottom: 3px solid #005c55;
    padding-bottom: 0.5em;
    margin-bottom: 1em;
  }
  .header h1 {
    font-size: 18pt;
    font-weight: 900;
    color: #005c55;
    letter-spacing: -0.5px;
  }
  .header .date {
    font-size: 9pt;
    color: #666;
    margin-top: 2px;
  }
  pre {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 13pt;
    line-height: 1.6;
    white-space: pre-wrap;
    word-wrap: break-word;
  }
  .reminder {
    margin-top: 1.5em;
    padding: 0.75em 1em;
    border: 1px solid #ccc;
    background: #f9f9f9;
    font-size: 10pt;
    color: #555;
  }
  @media print {
    body { padding: 0.5cm 1cm; }
    .no-print { display: none !important; }
    .reminder { background: none; }
  }
  @media screen and (max-width: 600px) {
    body { padding: 1em; }
    pre { font-size: 11pt; }
  }
  .no-print {
    text-align: center;
    margin-bottom: 1.5em;
    display: flex;
    gap: 8px;
    justify-content: center;
    flex-wrap: wrap;
  }
  .no-print button {
    font-family: Arial, sans-serif;
    font-size: 14pt;
    font-weight: 700;
    padding: 10px 28px;
    cursor: pointer;
    border: none;
    min-height: 44px;
    min-width: 44px;
    touch-action: manipulation;
  }
  .no-print .print-btn {
    background: #005c55;
    color: #fff;
  }
  .no-print .close-btn {
    background: #eae8e6;
    color: #1b1c1b;
  }
</style>
</head>
<body>
<div class="no-print">
  <button class="print-btn" onclick="window.print()">Print My Ballot</button>
  <button class="close-btn" onclick="window.close()">Close</button>
</div>
<div class="header">
  <h1>VOTER CHOICE</h1>
  <div class="date">${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</div>
</div>
<pre>${escapeHtml(ballotText)}</pre>
<div class="reminder">
  Many states (including Texas) ban phones at polling places.
  Print this or write it down — you CAN bring written notes but CANNOT use your phone.
</div>
</body>
</html>`);
  win.document.close();
}

/** Download voter profile as a .txt file */
export function downloadProfileAsText(profileText: string): void {
  const blob = new Blob([profileText], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "voter-profile.txt";
  a.click();
  URL.revokeObjectURL(url);
}
