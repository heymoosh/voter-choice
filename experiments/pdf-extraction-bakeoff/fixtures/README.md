# Fixtures

Real ballot PDFs we test extraction against. 4 fixtures span 3 states with distinct extraction challenges.

## Expected files (pending upload)

| Filename | State | County | What it tests |
|---|---|---|---|
| `nj-camden-2026-primary.pdf` | NJ | Camden | Broken text layer, multi-column party-grouped layout, "NO PETITION FILED" placeholders, write-in slots, bilingual, multiple party ballots on same page. **The hard case.** |
| `tx-harris-2026-dem-runoff.pdf` | TX | Harris | Clean text-layer baseline (May 26 DEM Primary Runoff). Any contender that fails this is disqualified. |
| `tx-hidalgo-2026-bilingual.pdf` | TX | Hidalgo | Bilingual / style-specific layout (14 pages). Exercises bilingual extraction explicitly. |
| `fl-orange-2026-composite.pdf` | FL | Orange | Composite ballot format. Distinct visual style from TX/NJ. |

## Privacy

Do NOT commit fixtures that contain:
- Real voter names or addresses
- Voter ID numbers
- Anything beyond public sample-ballot content

The state-issued sample ballots on official `.gov` sites are public; those are fair game.

## Naming convention

`<state-code>-<county-or-modifier>-<year>-<election-type-or-modifier>.pdf`

Lowercase, hyphenated. Examples above. If a state has multiple counties tested, use the county name. If a state has only one fixture, you can omit the county and use a modifier (e.g., `tx-current-2026-primary.pdf` for the "baseline current" TX ballot).
