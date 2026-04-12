/**
 * Shared utilities for extracting ballot/profile content from AI messages
 * and generating printable ballot pages.
 */

/** Extract "MY BALLOT" (EN) or "MI BOLETA" (ES) block from message content */
export function extractBallot(content: string): string | null {
  const match = content.match(
    /^((?:MY BALLOT|MI BOLETA)\s*[-—][\s\S]+?)(?=\n===|\n### |$)/m,
  );
  return match ? match[1].trim() : null;
}

/** Extract voter profile block (EN or ES) from message content */
export function extractVoterProfile(content: string): string | null {
  const match = content.match(
    /=== (?:MY VOTER PROFILE|MI PERFIL DE VOTANTE)[\s\S]*?=== (?:END VOTER PROFILE|FIN DEL PERFIL DE VOTANTE) ===/,
  );
  return match ? match[0].trim() : null;
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
<title>My Ballot</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;600;700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Public Sans', Arial, Helvetica, sans-serif;
    color: #000;
    background: #fff;
    padding: 1.5cm 2cm;
    line-height: 1.5;
  }
  pre {
    font-family: 'Public Sans', Arial, Helvetica, sans-serif;
    font-size: 13pt;
    line-height: 1.6;
    white-space: pre-wrap;
    word-wrap: break-word;
  }
  .reminder {
    margin-top: 1.5em;
    padding-top: 0.75em;
    border-top: 1px solid #ccc;
    font-size: 10pt;
    color: #555;
  }
  @media print {
    body { padding: 0.5cm 1cm; }
    .no-print { display: none; }
  }
  .no-print {
    text-align: center;
    margin-bottom: 1em;
  }
  .no-print button {
    font-family: 'Public Sans', Arial, sans-serif;
    font-size: 14pt;
    padding: 8px 24px;
    cursor: pointer;
    margin: 0 8px;
  }
</style>
</head>
<body>
<div class="no-print">
  <button onclick="window.print()">Print</button>
  <button onclick="window.close()">Close</button>
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

/** Build a ballot string from manual entries */
export function buildManualBallot(
  header: string,
  races: { race: string; pick: string }[],
  propositions: { number: string; vote: string }[],
): string {
  const lines = [header, ""];

  for (const r of races) {
    if (r.race && r.pick) {
      lines.push(`${r.race}: ${r.pick}`);
    }
  }

  if (propositions.some((p) => p.number && p.vote)) {
    lines.push("", "Propositions:");
    for (const p of propositions) {
      if (p.number && p.vote) {
        lines.push(`${p.number}: ${p.vote}`);
      }
    }
  }

  return lines.join("\n");
}
