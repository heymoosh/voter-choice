/**
 * src/lib/canAttribution.ts
 *
 * Structural attribution for CAN2026-sourced data (Constitutional
 * Accountability Now, can2026.org — Paul Zurav LLC).
 *
 * Per the 2026-06-10 decision: attribution is structural — every surfaced
 * CAN-derived block must render "Context from CAN2026 — can2026.org" plus the
 * row-level citations (`can_citations`). The data layer carries provenance
 * (`source_url` + `snapshot_date` on every `can_*` row); display code imports
 * this constant so the credit line is consistent everywhere.
 *
 * See docs/CAN2026_ENRICHMENT_SCHEMA.md §1.1 and §6.6.
 */
export const CAN_ATTRIBUTION = {
  label: "Context from CAN2026",
  url: "https://can2026.org",
} as const;

export type CanAttribution = typeof CAN_ATTRIBUTION;
