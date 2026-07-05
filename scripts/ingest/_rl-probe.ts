import { readFileSync } from "node:fs";
function env(n: string) {
  const r = readFileSync(".env.alignment", "utf8");
  for (const l of r.split("\n")) {
    const t = l.trim();
    if (t.startsWith("#") || !t.includes("=")) continue;
    const [k, ...v] = t.split("=");
    if (k.trim() === n)
      return v
        .join("=")
        .trim()
        .replace(/^["']|["']$/g, "");
  }
  throw new Error(n);
}
async function main() {
  const key = env("OPENSTATES_API_KEY");
  // one cheap request; print rate-limit headers
  const res = await fetch(
    "https://v3.openstates.org/jurisdictions?per_page=1",
    { headers: { "X-API-KEY": key, "user-agent": "vc-probe" } },
  );
  console.log("status:", res.status);
  const h: Record<string, string> = {};
  res.headers.forEach((v, k) => {
    if (/rate|limit|retry|quota|remain/i.test(k)) h[k] = v;
  });
  console.log("rate-limit headers:", JSON.stringify(h, null, 2));
  if (res.status !== 200)
    console.log("body:", (await res.text()).slice(0, 300));
}
main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
