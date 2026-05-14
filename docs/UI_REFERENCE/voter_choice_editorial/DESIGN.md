# Design System Specification: Civic Editorial Utility

## 1. Overview & Creative North Star

**Creative North Star: "The Modern Archivist"**

This design system rejects the "app-like" clutter of modern SaaS in favor of the authoritative, timeless feel of a high-end broadsheet newspaper. We are building a digital experience that prioritizes democratic clarity and civic utility.

To achieve a "bespoke" feel while remaining non-partisan and flat, we utilize **Intentional Asymmetry** and **Tonal Depth**. Instead of standard grids, we use white space as a structural element. The layout should feel "curated"—as if a master typographer hand-set every module to ensure the information is not just readable, but undeniable. We break the "template" look by using exaggerated typographic scales and overlapping surface containers that mimic the physical layering of documents on a desk.

---

## 2. Colors & Surface Logic

The palette is rooted in a sophisticated Teal (`#0f766e`) and a warm, high-contrast newspaper surface (`#fcfaf8`).

### The "No-Line" Rule

To maintain an editorial elegance, **1px solid borders are strictly prohibited for sectioning.** Boundaries must be defined solely through background color shifts. For example, a `surface-container-low` section should sit on a `surface` background to create a "block" of content. This creates a cleaner, more sophisticated interface that feels integrated rather than boxed-in.

### Surface Hierarchy & Nesting

Treat the UI as a series of physical paper layers. Depth is achieved through tonal nesting:

- **Base Layer:** `surface` (#fbf9f7)
- **Content Blocks:** `surface-container-low` (#f5f3f1) for secondary info.
- **Interactive Cards:** `surface-container-lowest` (#ffffff) to "pop" off the warm background.
- **Emphasis Zones:** `surface-container-high` (#eae8e6) for utility sidebars or footers.

### Tonal Accents

- **Primary:** `#005c55` (The "Authority" Teal). Used for key actions and headers.
- **Tertiary:** `#7f4025` (The "Accent" Burnt Sienna). Use sparingly for "Call to Action" flags or legislative alerts to provide warmth against the teal.

---

## 3. Typography: Public Sans

Public Sans is our sole typeface. Its neutral, grotesque DNA provides the "non-partisan" foundation, but we elevate it through extreme scale contrast.

- **Display (L/M/S):** Used for primary landing headers. Use `display-lg` (3.5rem) with tight letter-spacing (-0.02em) to create an editorial "Headline" feel.
- **Headline (L/M/S):** Used for section breaks. Always set in `on-surface` (#1b1c1b) for maximum contrast.
- **Title (L/M/S):** Used for card headings and navigation. `title-lg` (1.375rem) serves as the standard "Article" header.
- **Body (L/M/S):** The workhorse. `body-lg` (1rem) is the default for article text to ensure high legibility. Never drop below `body-sm` (0.75rem / 12px) to maintain WCAG AA compliance.
- **Label (M/S):** Used for metadata (e.g., "Election Date," "Candidate Info"). Often set in All Caps with slightly increased letter-spacing to distinguish from body copy.

---

## 4. Elevation & Depth

In a flat, editorial system, elevation is conveyed through **Tonal Layering**, not shadows.

- **The Layering Principle:** To create a "card," do not use a shadow. Instead, place a `surface-container-lowest` (#ffffff) shape onto a `surface-container-low` (#f5f3f1) background. The subtle shift in "paper weight" provides the necessary affordance.
- **Ambient Shadows:** If a floating element (like a mobile FAB or a Modal) is required, use a "Civic Shadow": `on-surface` color at 4% opacity with a 32px blur. It should look like a soft glow of light, not a drop shadow.
- **The "Ghost Border" Fallback:** For input fields or high-density data where tonal shifts aren't enough, use a Ghost Border: `outline-variant` (#bdc9c6) at 20% opacity.

---

## 5. Components

### Buttons

- **Primary:** Solid `primary` (#005c55) with `on-primary` (#ffffff) text. Use `sm` (0.125rem) or `none` (0px) roundedness for a sharp, institutional feel.
- **Secondary:** `surface-container-high` background with `primary` text. No border.
- **Tertiary/Ghost:** `on-surface` text with no background. Underline on hover to mimic a "Text Link" but maintain button padding.

### Cards & Information Modules

- **Forbid Dividers:** Do not use horizontal lines to separate list items. Use 24px–32px of vertical white space or alternate background colors (`surface` to `surface-container-low`).
- **Interaction:** On hover, a card should shift from `surface-container-low` to `surface-container-lowest`.

### Inputs & Fields

- **Style:** Flat, `surface-container-highest` background with a bottom-only "Ghost Border" (2px).
- **Labels:** Always use `label-md` above the field, never placeholder text alone.

### Civic "Ballot" Chips

- **Status:** Use `secondary-container` for neutral status and `error-container` for urgent alerts. Use `full` (9999px) roundedness for chips to contrast against the sharp-edged buttons and containers.

---

## 6. Do’s and Don’ts

### Do

- **DO** use "Negative Space" as a separator. If a layout feels cluttered, increase padding rather than adding a line.
- **DO** use `display-lg` typography for impactful entry points.
- **DO** ensure all text/background combinations meet a 4.5:1 contrast ratio.
- **DO** align text to a strict baseline grid to maintain the editorial "column" feel.

### Don’t

- **DON'T** use gradients. The system is built on "flat utility."
- **DON'T** use standard blue for links. Use the `primary` Teal (#005c55).
- **DON'T** use heavy drop shadows. They break the "paper and ink" metaphor.
- **DON'T** use rounded corners above `md` (0.375rem) for primary structural elements; keep the edges crisp and authoritative.
