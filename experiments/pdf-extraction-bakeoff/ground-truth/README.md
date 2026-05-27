# Ground Truth

Hand-written canonical "right answer" for each fixture. One JSON file per fixture: `<same-basename-as-fixture>.json`.

## Schema

```json
{
  "fixture": "nj-camden-2026-primary.pdf",
  "state": "NJ",
  "election": {
    "name": "June 2, 2026 NJ Democratic Primary",
    "date": "2026-06-02",
    "type": "primary",
    "party": "Democratic"
  },
  "races": [
    {
      "section": "Federal",
      "office": "U.S. Senate",
      "district": null,
      "voteFor": 1,
      "candidates": [
        { "name": "Cory Booker", "party": "Democratic" }
      ]
    },
    {
      "section": "Local",
      "office": "County Commissioners",
      "district": "Camden County",
      "voteFor": 2,
      "candidates": [
        { "name": "Louis Cappelli Jr", "party": "Democratic" },
        { "name": "Jonathan Young", "party": "Democratic" },
        { "name": "Vanetta Hawkins", "party": "Democratic" },
        { "name": "Constance Mercedes", "party": "Democratic" }
      ]
    }
  ]
}
```

## Authoring rules

- Use the EXACT names and party labels as they appear on the official ballot. If the ballot says "Donald W. Norcross Jr.", write that — don't normalize to "Donald Norcross."
- `section` is one of: `"Federal" | "State" | "Local" | "Propositions"`. Map office types accordingly (US Senate/House = Federal, Governor/State Senate = State, etc.).
- `district` is null when not applicable (statewide races).
- `voteFor` reflects the ballot's "Vote for N" instruction.
- Order races as they appear on the ballot (top to bottom, left to right for multi-column).
