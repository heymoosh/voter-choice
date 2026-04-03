# Spanish Language Support Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Spanish/English language toggle to the ballot research tool — all UI text, error messages, tips, footer, the full AI prompt, and context block available in both languages, with localStorage persistence.

**Architecture:** React Context + typed translations object. `src/lib/translations.ts` holds the `Translations` interface and `TRANSLATIONS` record. `src/lib/i18n.tsx` provides `LanguageProvider` and `useLanguage()` hook. All components consume translations via hook. `page.tsx` is a thin server shell; hero/tips/footer move to client `PageContent.tsx`.

**Tech Stack:** Next.js 15 App Router, React 18, TypeScript, Vitest (unit tests), Playwright (e2e)

---

## Chunk 1: Foundation — Translations + i18n Context

### Task 1: `src/lib/translations.ts` — Interface and English translations

**Files:**
- Create: `src/lib/translations.ts`
- Create: `src/lib/__tests__/translations.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/translations.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { TRANSLATIONS } from "../translations";

describe("TRANSLATIONS", () => {
  it("has 'en' and 'es' language entries", () => {
    expect(TRANSLATIONS).toHaveProperty("en");
    expect(TRANSLATIONS).toHaveProperty("es");
  });

  it("en - hero title is present", () => {
    expect(TRANSLATIONS.en.hero.title).toBe("Know What You're Voting For");
  });

  it("es - hero title is present", () => {
    expect(TRANSLATIONS.es.hero.title).toBe("Sabe por quién vas a votar");
  });

  it("en - zipForm errors are present", () => {
    expect(TRANSLATIONS.en.zipForm.errors.required).toBe(
      "Please enter a zip code",
    );
    expect(TRANSLATIONS.en.zipForm.errors.invalid).toBe(
      "Please enter a valid 5-digit zip code",
    );
  });

  it("es - zipForm errors are present", () => {
    expect(TRANSLATIONS.es.zipForm.errors.required).toBe(
      "Por favor ingresa un código postal",
    );
    expect(TRANSLATIONS.es.zipForm.errors.invalid).toBe(
      "Por favor ingresa un código postal válido de 5 dígitos",
    );
  });

  it("notFound.description is a function returning a string with zip", () => {
    const desc = TRANSLATIONS.en.notFound.description("90210");
    expect(desc).toContain("90210");
    const descEs = TRANSLATIONS.es.notFound.description("90210");
    expect(descEs).toContain("90210");
  });

  it("stateInfo.stateInfoTitle is a function returning state name", () => {
    expect(TRANSLATIONS.en.stateInfo.stateInfoTitle("Texas")).toContain(
      "Texas",
    );
    expect(TRANSLATIONS.es.stateInfo.stateInfoTitle("Texas")).toContain(
      "Texas",
    );
  });

  it("stateInfo.deadlineDaysLeft returns correct singular/plural", () => {
    expect(TRANSLATIONS.en.stateInfo.deadlineDaysLeft(1)).toBe("1 day left");
    expect(TRANSLATIONS.en.stateInfo.deadlineDaysLeft(5)).toBe("5 days left");
    expect(TRANSLATIONS.es.stateInfo.deadlineDaysLeft(1)).toBe(
      "Queda 1 día",
    );
    expect(TRANSLATIONS.es.stateInfo.deadlineDaysLeft(5)).toBe(
      "Quedan 5 días",
    );
  });

  it("en and es have the same set of top-level keys", () => {
    const enKeys = Object.keys(TRANSLATIONS.en).sort();
    const esKeys = Object.keys(TRANSLATIONS.es).sort();
    expect(enKeys).toEqual(esKeys);
  });

  it("tips.items is an array with 4 items in both languages", () => {
    expect(TRANSLATIONS.en.tips.items).toHaveLength(4);
    expect(TRANSLATIONS.es.tips.items).toHaveLength(4);
  });

  it("footer.created is translated", () => {
    expect(TRANSLATIONS.en.footer.created).toBe(
      "Created by a human using AI tools",
    );
    expect(TRANSLATIONS.es.footer.created).toBe(
      "Creado por una persona usando herramientas de IA",
    );
  });
});
```

- [ ] **Step 2: Run test to confirm failure**

```bash
npm test -- src/lib/__tests__/translations.test.ts 2>&1 | tail -10
```

Expected: FAIL — `../translations` not found.

- [ ] **Step 3: Create `src/lib/translations.ts`**

```typescript
import type { DeadlineStatus } from "../types/election";

export type Language = "en" | "es";

export interface Translations {
  skipLink: string;
  hero: {
    title: string;
    subtitle: string;
    worksWith: string;
  };
  zipForm: {
    label: string;
    placeholder: string;
    submit: string;
    loading: string;
    errors: {
      required: string;
      invalid: string;
    };
  };
  notFound: {
    title: string;
    description: (zip: string) => string;
    linkText: string;
  };
  stateInfo: {
    stateInfoTitle: (stateName: string) => string;
    nextElection: string;
    registrationDeadlines: string;
    earlyVoting: string;
    votingRules: string;
    voterIdLabel: string;
    phonesAtPollsLabel: string;
    noEarlyVoting: string;
    sameDayRegistration: string;
    checkRegistration: string;
    registrationDeadlinesPassed: string;
    noElectionFound: (stateName: string) => string;
    checkStateWebsite: string;
    countyElectionLink: string;
    sampleBallotLink: string;
    onlineLabel: string;
    byMailLabel: string;
    inPersonLabel: string;
    postmarkDetail: string;
    receivedDetail: string;
    primaryLabel: (type: string) => string;
    voterIdRequired: string;
    voterIdNotRequired: string;
    // Deadline status labels
    deadlinePassed: string;
    deadlineToday: string;
    deadlineNotAvailable: string;
    deadlineDaysLeft: (n: number) => string;
    deadlineStatusLabel: (status: DeadlineStatus) => string;
  };
  stateSelector: {
    title: string;
    subtitle: string;
    cancel: string;
    cancelAriaLabel: string;
  };
  promptOutput: {
    title: string;
    instructions: string;
    copyButton: string;
    copiedButton: string;
    copyAriaLabel: string;
    copiedStatus: string;
  };
  tips: {
    heading: string;
    items: string[];
    disclaimer: string;
  };
  footer: {
    share: string;
    created: string;
  };
}

const en: Translations = {
  skipLink: "Skip to main content",
  hero: {
    title: "Know What You're Voting For",
    subtitle:
      "Enter your zip code to get a customized AI ballot research prompt. Paste it into any free AI chatbot to research candidates based on what they've actually done.",
    worksWith: "Works with:",
  },
  zipForm: {
    label: "Your zip code",
    placeholder: "e.g. 90210",
    submit: "Look Up",
    loading: "Loading…",
    errors: {
      required: "Please enter a zip code",
      invalid: "Please enter a valid 5-digit zip code",
    },
  },
  notFound: {
    title: "Zip code not found",
    description: (zip: string) =>
      `We don't have data for zip code ${zip} yet. We're working on adding all U.S. zip codes.`,
    linkText: "Find your state election website",
  },
  stateInfo: {
    stateInfoTitle: (stateName: string) => `${stateName} Election Info`,
    nextElection: "Next Election",
    registrationDeadlines: "Registration Deadlines",
    earlyVoting: "Early Voting",
    votingRules: "Voting Rules",
    voterIdLabel: "Voter ID:",
    phonesAtPollsLabel: "Phones at polls:",
    noEarlyVoting: "Not available — absentee voting only",
    sameDayRegistration: "✓ Same-day registration available",
    checkRegistration: "Check your registration status",
    registrationDeadlinesPassed:
      "Registration deadlines for this election have passed.",
    noElectionFound: (stateName: string) =>
      `No upcoming elections found for ${stateName}.`,
    checkStateWebsite: "Check the state election website",
    countyElectionLink: "County Election Office →",
    sampleBallotLink: "Sample Ballot Lookup →",
    onlineLabel: "Online",
    byMailLabel: "By mail",
    inPersonLabel: "In person",
    postmarkDetail: "postmark",
    receivedDetail: "received",
    primaryLabel: (type: string) =>
      `${type.charAt(0).toUpperCase() + type.slice(1)} primary`,
    voterIdRequired: "Required",
    voterIdNotRequired: "Not required",
    deadlinePassed: "Passed",
    deadlineToday: "Today",
    deadlineNotAvailable: "Not available",
    deadlineDaysLeft: (n: number) => (n === 1 ? "1 day left" : `${n} days left`),
    deadlineStatusLabel: (status: DeadlineStatus) => {
      if (status.urgency === "passed") return "Passed";
      if (status.urgency === "na") return "Not available";
      if (status.daysLeft === 0) return "Today";
      return status.daysLeft === 1
        ? "1 day left"
        : `${status.daysLeft} days left`;
    },
  },
  stateSelector: {
    title: "Which state are you voting in?",
    subtitle: "This zip code spans multiple states.",
    cancel: "Cancel",
    cancelAriaLabel: "Cancel state selection",
  },
  promptOutput: {
    title: "Your Customized Prompt",
    instructions:
      "Copy this prompt and paste it as your first message in any AI chatbot.",
    copyButton: "Copy to Clipboard",
    copiedButton: "Copied!",
    copyAriaLabel: "Copy prompt to clipboard",
    copiedStatus: "✓ Copied!",
  },
  tips: {
    heading: "Tips for the conversation",
    items: [
      'You can say "I don\'t know" or "I\'m not sure" — the AI will help you figure it out',
      'Ask it to research something for you ("Can you look up this candidate\'s voting record?")',
      'You can ask questions anytime ("What does this position actually do?")',
      "At the end, it'll give you a printable ballot summary you can take to the polls",
    ],
    disclaimer:
      "AI can make mistakes. This is a research starting point — the tool links to official sources so you can verify anything that matters.",
  },
  footer: {
    share: "Share this tool with voters in your community",
    created: "Created by a human using AI tools",
  },
};

const es: Translations = {
  skipLink: "Ir al contenido principal",
  hero: {
    title: "Sabe por quién vas a votar",
    subtitle:
      "Ingresa tu código postal para obtener un prompt personalizado de investigación electoral. Pégalo en cualquier chatbot de IA gratuito para investigar candidatos según lo que realmente han hecho.",
    worksWith: "Funciona con:",
  },
  zipForm: {
    label: "Tu código postal",
    placeholder: "ej. 90210",
    submit: "Buscar",
    loading: "Cargando…",
    errors: {
      required: "Por favor ingresa un código postal",
      invalid: "Por favor ingresa un código postal válido de 5 dígitos",
    },
  },
  notFound: {
    title: "Código postal no encontrado",
    description: (zip: string) =>
      `Aún no tenemos datos para el código postal ${zip}. Estamos trabajando para agregar todos los códigos postales de EE.UU.`,
    linkText: "Encuentra el sitio web electoral de tu estado",
  },
  stateInfo: {
    stateInfoTitle: (stateName: string) =>
      `Información Electoral de ${stateName}`,
    nextElection: "Próxima Elección",
    registrationDeadlines: "Fechas Límite de Registro",
    earlyVoting: "Votación Anticipada",
    votingRules: "Reglas de Votación",
    voterIdLabel: "Identificación para votar:",
    phonesAtPollsLabel: "Teléfonos en las casillas:",
    noEarlyVoting: "No disponible — solo voto en ausencia",
    sameDayRegistration: "✓ Registro el mismo día disponible",
    checkRegistration: "Verifica tu estado de registro",
    registrationDeadlinesPassed:
      "Las fechas límite de registro para esta elección ya pasaron.",
    noElectionFound: (stateName: string) =>
      `No se encontraron elecciones próximas para ${stateName}.`,
    checkStateWebsite: "Consulta el sitio web electoral del estado",
    countyElectionLink: "Oficina Electoral del Condado →",
    sampleBallotLink: "Consulta de Boleta de Muestra →",
    onlineLabel: "En línea",
    byMailLabel: "Por correo",
    inPersonLabel: "En persona",
    postmarkDetail: "matasellos",
    receivedDetail: "recibido",
    primaryLabel: (type: string) =>
      `${type.charAt(0).toUpperCase() + type.slice(1)} primaria`,
    voterIdRequired: "Requerida",
    voterIdNotRequired: "No requerida",
    deadlinePassed: "Pasada",
    deadlineToday: "Hoy",
    deadlineNotAvailable: "No disponible",
    deadlineDaysLeft: (n: number) =>
      n === 1 ? "Queda 1 día" : `Quedan ${n} días`,
    deadlineStatusLabel: (status: DeadlineStatus) => {
      if (status.urgency === "passed") return "Pasada";
      if (status.urgency === "na") return "No disponible";
      if (status.daysLeft === 0) return "Hoy";
      return status.daysLeft === 1 ? "Queda 1 día" : `Quedan ${status.daysLeft} días`;
    },
  },
  stateSelector: {
    title: "¿En qué estado vas a votar?",
    subtitle: "Este código postal abarca varios estados.",
    cancel: "Cancelar",
    cancelAriaLabel: "Cancelar selección de estado",
  },
  promptOutput: {
    title: "Tu Prompt Personalizado",
    instructions:
      "Copia este prompt y pégalo como tu primer mensaje en cualquier chatbot de IA.",
    copyButton: "Copiar al Portapapeles",
    copiedButton: "¡Copiado!",
    copyAriaLabel: "Copiar prompt al portapapeles",
    copiedStatus: "✓ ¡Copiado!",
  },
  tips: {
    heading: "Consejos para la conversación",
    items: [
      'Puedes decir "No sé" o "No estoy seguro/a" — la IA te ayudará a descubrirlo',
      'Pídele que investigue algo por ti ("¿Puedes buscar el historial de votación de este candidato?")',
      'Puedes hacer preguntas en cualquier momento ("¿Qué hace exactamente este cargo?")',
      "Al final, te dará un resumen imprimible de tu boleta para llevar a las urnas",
    ],
    disclaimer:
      "La IA puede cometer errores. Esto es un punto de partida — la herramienta enlaza a fuentes oficiales para que puedas verificar lo que importa.",
  },
  footer: {
    share: "Comparte esta herramienta con votantes de tu comunidad",
    created: "Creado por una persona usando herramientas de IA",
  },
};

export const TRANSLATIONS: Record<Language, Translations> = { en, es };
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- src/lib/__tests__/translations.test.ts 2>&1 | tail -10
```

Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/translations.ts src/lib/__tests__/translations.test.ts
git commit -m "phase2: translations.ts — Language type, Translations interface, en/es records (TDD)"
```

---

### Task 2: `src/lib/i18n.tsx` — LanguageProvider + useLanguage hook

**Files:**
- Create: `src/lib/i18n.tsx`
- Create: `src/lib/__tests__/i18n.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/i18n.test.tsx`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { LanguageProvider, useLanguage } from "../i18n";

// Helper component that exposes language state
function LangDisplay() {
  const { lang, setLang, t } = useLanguage();
  return (
    <div>
      <span data-testid="lang">{lang}</span>
      <span data-testid="title">{t.hero.title}</span>
      <button onClick={() => setLang(lang === "en" ? "es" : "en")}>
        Toggle
      </button>
    </div>
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe("LanguageProvider", () => {
  it("defaults to English", () => {
    render(
      <LanguageProvider>
        <LangDisplay />
      </LanguageProvider>,
    );
    expect(screen.getByTestId("lang").textContent).toBe("en");
  });

  it("reads persisted language from localStorage", () => {
    localStorage.setItem("lang", "es");
    render(
      <LanguageProvider>
        <LangDisplay />
      </LanguageProvider>,
    );
    expect(screen.getByTestId("lang").textContent).toBe("es");
  });

  it("toggling language updates state and localStorage", () => {
    render(
      <LanguageProvider>
        <LangDisplay />
      </LanguageProvider>,
    );
    act(() => {
      fireEvent.click(screen.getByRole("button"));
    });
    expect(screen.getByTestId("lang").textContent).toBe("es");
    expect(localStorage.getItem("lang")).toBe("es");
  });

  it("t reflects current language translations", () => {
    localStorage.setItem("lang", "es");
    render(
      <LanguageProvider>
        <LangDisplay />
      </LanguageProvider>,
    );
    expect(screen.getByTestId("title").textContent).toBe(
      "Sabe por quién vas a votar",
    );
  });
});
```

- [ ] **Step 2: Run test to confirm failure**

```bash
npm test -- src/lib/__tests__/i18n.test.tsx 2>&1 | tail -10
```

Expected: FAIL — `../i18n` not found.

- [ ] **Step 3: Create `src/lib/i18n.tsx`**

```typescript
"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { TRANSLATIONS, type Language, type Translations } from "./translations";

interface LanguageContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: "en",
  setLang: () => {},
  t: TRANSLATIONS.en,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  // SSR-safe: start with 'en', hydrate from localStorage on mount
  const [lang, setLangState] = useState<Language>("en");

  useEffect(() => {
    const stored = localStorage.getItem("lang");
    if (stored === "en" || stored === "es") {
      setLangState(stored);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem("lang", newLang);
  }, []);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: TRANSLATIONS[lang] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext);
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- src/lib/__tests__/i18n.test.tsx 2>&1 | tail -10
```

Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/i18n.tsx src/lib/__tests__/i18n.test.tsx
git commit -m "phase2: i18n.tsx — LanguageProvider, useLanguage hook, localStorage persistence (TDD)"
```

---

## Chunk 2: Core Logic — date-utils + prompt-generator

### Task 3: Extend `formatDate` with locale parameter

**Files:**
- Modify: `src/lib/date-utils.ts`
- Modify: `src/lib/__tests__/date-utils.test.ts`

- [ ] **Step 1: Write the failing test**

Add to the `describe("formatDate", ...)` block in `src/lib/__tests__/date-utils.test.ts`:

```typescript
  it("formats date in Spanish locale (es-US) as 'D de mes de YYYY'", () => {
    expect(formatDate("2026-03-03", "es-US")).toBe("3 de marzo de 2026");
    expect(formatDate("2026-11-03", "es-US")).toBe("3 de noviembre de 2026");
    expect(formatDate("2026-02-02", "es-US")).toBe("2 de febrero de 2026");
  });

  it("defaults to English (en-US) when no locale provided", () => {
    expect(formatDate("2026-11-03")).toBe("November 3, 2026");
  });
```

- [ ] **Step 2: Run test to confirm failure**

```bash
npm test -- src/lib/__tests__/date-utils.test.ts 2>&1 | tail -10
```

Expected: FAIL — `formatDate` doesn't accept a second argument.

- [ ] **Step 3: Update `formatDate` in `src/lib/date-utils.ts`**

Change the `formatDate` function signature and implementation:

```typescript
/** Formats "YYYY-MM-DD" as locale-appropriate date string. */
export function formatDate(isoDate: string, locale: string = "en-US"): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}
```

- [ ] **Step 4: Run all date-utils tests**

```bash
npm test -- src/lib/__tests__/date-utils.test.ts 2>&1 | tail -10
```

Expected: all tests PASS (existing + new)

- [ ] **Step 5: Commit**

```bash
git add src/lib/date-utils.ts src/lib/__tests__/date-utils.test.ts
git commit -m "phase2: date-utils — locale-aware formatDate with es-US support (TDD)"
```

---

### Task 4: Spanish context block and prompt in `prompt-generator.ts`

**Files:**
- Modify: `src/lib/prompt-generator.ts`
- Modify: `src/lib/__tests__/prompt-generator.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `src/lib/__tests__/prompt-generator.test.ts`:

```typescript
import { generatePromptText, buildContextBlock } from "../prompt-generator";

// ... existing imports and tests ...

describe("buildContextBlock — Spanish (lang='es')", () => {
  it("opens with Spanish greeting", () => {
    const block = buildContextBlock(txData, "73301", today, "es");
    expect(block).toContain("¡Hola!");
    expect(block).toContain("Texas");
    expect(block).toContain("73301");
  });

  it("uses Spanish date format", () => {
    const block = buildContextBlock(txData, "73301", today, "es");
    // TX election dates should appear in Spanish format
    expect(block).toMatch(/de [a-z]+ de 20\d\d/);
  });

  it("uses Spanish section labels", () => {
    const block = buildContextBlock(txData, "73301", today, "es");
    expect(block).toContain("Elección:");
    expect(block).toContain("Votación anticipada:");
    expect(block).toContain("Mi código postal es");
  });

  it("ends with Spanish CTA", () => {
    const block = buildContextBlock(txData, "73301", today, "es");
    expect(block.trim()).toMatch(/Ayúdame con mi boleta\.$/);
  });

  it("keeps data values (URLs) unchanged in Spanish context", () => {
    const enBlock = buildContextBlock(txData, "73301", today, "en");
    const esBlock = buildContextBlock(txData, "73301", today, "es");
    // URLs should appear in both blocks
    expect(enBlock).toContain("votetexas.gov");
    expect(esBlock).toContain("votetexas.gov");
  });
});

describe("generatePromptText — Spanish (lang='es')", () => {
  it("contains Spanish prompt text", () => {
    const text = generatePromptText(txData, "73301", today, "es");
    expect(text).toContain("asistente cívico no partidario");
  });

  it("contains Spanish context block", () => {
    const text = generatePromptText(txData, "73301", today, "es");
    expect(text).toContain("¡Hola!");
    expect(text).toContain("Ayúdame con mi boleta.");
  });

  it("English call still works unchanged", () => {
    const text = generatePromptText(txData, "73301", today, "en");
    expect(text).toContain("nonpartisan civic research assistant");
    expect(text).toContain("Hi! I'm voting in");
  });
});
```

- [ ] **Step 2: Run test to confirm failure**

```bash
npm test -- src/lib/__tests__/prompt-generator.test.ts 2>&1 | tail -15
```

Expected: FAIL — `buildContextBlock` and `generatePromptText` don't accept `lang` argument.

- [ ] **Step 3: Update `src/lib/prompt-generator.ts`**

Replace the file with the updated version. Keep all existing code, add Spanish prompt constant and update function signatures:

```typescript
import type { StateData } from "../types/election";
import type { Language } from "./translations";
import {
  getNextElection,
  computeDeadlineStatus,
  formatDate,
} from "./date-utils";

// ============================================================
// English ballot prompt (original)
// ============================================================
const BALLOT_PROMPT_EN = `You are a nonpartisan civic research assistant helping a U.S. voter prepare for an upcoming election. Your job is to help me understand what's on my ballot, form my own opinions, and research candidates based on their ACTIONS — not their campaign promises.

## HOW TO FORMAT EVERY RESPONSE (follow this strictly)

- **Keep each issue or race to 4-6 bullet points max.** No long paragraphs.
- **Bold the key takeaway** in each bullet so I can scan.
- **One issue or race per response** unless I ask you to speed up.
- **Bottom line first.** Lead with the 1-sentence summary, then give me supporting detail I can expand on.
- **3-4 sentences per bullet max.** If you're writing more, you're writing too much.
- **Use plain language.** If a 16-year-old wouldn't understand it, rewrite it.
- **Never recap what we already covered** unless I ask.
- I can always say "tell me more" if I want depth. Default to concise.

## STEP 1: Get my location and start immediately

Ask me my zip code and state in one question. Then:

- **Search for my state's election context.** What type of election, how it works (open/closed primary), election date. **Verify today's date vs. election date** — tell me if polls are open today, early voting is underway, or it's upcoming. 2-3 sentences max.
- **If this is a primary:** Don't ask which party ballot. We'll figure that out together after the issues.
- **Give me one link** to my county election site for my sample ballot. Suggest I upload it — but **don't wait.** Start immediately with statewide races.
- **If I upload a sample ballot or share districts**, use that as the definitive source.
- **Flag once** that zip codes can span multiple districts, then move on.
- **Preview how this works** in 2-3 sentences: we walk through issues together, you can say "I don't know," I research in the background, and I'll create a handoff block if we need to continue in a new chat.

Then go straight to Step 2.

## STEP 2: Walk me through the issues — one at a time

**Don't ask "what issues matter to you."** Walk me through them. For each issue:

- **What's happening** — current situation, real numbers, plain language
- **What each side wants** — what "yes" vs. "no" means, or what candidates have actually done
- **What my vote does** — binding law or non-binding signal? One sentence.
- **Who this affects** — make it concrete and personal ("If you rent..." / "If you have kids in public school...")
- **Then ask what I think.** It's okay if I say "I don't care" or "I'm not sure" — that's useful too.

If I say "I don't know," don't restate — teach me more, then ask again.

After every 2-3 issues, give me a **one-sentence summary** of what my answers suggest so far.

## STEP 3: Help me pick a primary (if applicable)

If this is a primary where I choose a party ballot, ask me 3-4 quick questions about **how I think**, not policy.

Then **make a clear recommendation** in 2-3 sentences, give me the strongest counterargument for the other primary, and let me decide.

If this is a general election, skip this step.

## STEP 4: Research candidates — race by race

**No candidate bios.** For each race:

- **What does this position actually do?** Use concrete examples.
- **Research in the background.** Search voting records, donor data, endorsements, and news.
- **Present each candidate in 2-3 sentences.** Focus on: what they got done, money trail concerns, and how they match what I care about.
- **Flag red flags and key endorsements.**
- **Ask me what I think or if I want a recommendation.**

## STEP 5: Propositions

For each: one-sentence plain language summary, what yes/no means, whether it connects to what I care about.

## STEP 6: Give me my summary

Clean, printable summary I can take to the polls.

**Remind the voter:** Many states prohibit phones at polling places. Suggest they write down or print this summary.

## STEP 7: Generate my outputs

At the end, generate: (A) 1-page ballot printout, (B) voter profile for future elections.

## Important rules

- **Collaborate, don't auto-fill.** Recommend only when asked.
- **Actions > words.** Prioritize what candidates have DONE.
- **Teach before you ask.**
- **AI makes mistakes.** Link me to sources so I can verify.

Let's start with Step 1.`;

// ============================================================
// Spanish ballot prompt (complete fluent translation, "tú" voice)
// ============================================================
const BALLOT_PROMPT_ES = `Eres un asistente cívico no partidario que ayuda a un votante de EE.UU. a prepararse para una próxima elección. Tu trabajo es ayudarme a entender lo que hay en mi boleta, formar mis propias opiniones e investigar candidatos según sus ACCIONES — no sus promesas de campaña.

## CÓMO FORMATEAR CADA RESPUESTA (sigue esto estrictamente)

- **Limita cada tema o cargo a un máximo de 4-6 puntos.** Sin párrafos largos.
- **Resalta en negrita el punto clave** de cada punto para que pueda escanearlo.
- **Un tema o cargo por respuesta** a menos que me pidas que aceleres.
- **La conclusión primero.** Comienza con el resumen en 1 oración, luego dame los detalles de apoyo.
- **Máximo 3-4 oraciones por punto.** Si escribes más, es demasiado.
- **Usa lenguaje sencillo.** Si un joven de 16 años no lo entendería, reescríbelo.
- **Nunca resumas lo que ya cubrimos** a menos que te lo pida.
- Siempre puedo decir "cuéntame más" si quiero profundidad. Por defecto, sé conciso.

## PASO 1: Obtén mi ubicación y empieza de inmediato

Pregúntame mi código postal y estado en una sola pregunta. Luego:

- **Busca el contexto electoral de mi estado.** Qué tipo de elección, cómo funciona (primaria abierta/cerrada), fecha de la elección. **Verifica la fecha de hoy vs. la fecha de la elección** — dime si las urnas están abiertas hoy, si el voto anticipado está en curso o si es próxima. Máximo 2-3 oraciones.
- **Si es una primaria:** No preguntes qué boleta de partido quiero. Lo descubriremos juntos después de los temas.
- **Dame un enlace** al sitio de elecciones de mi condado para obtener mi boleta de muestra. Sugiere que la suba — pero **no esperes.** Empieza de inmediato con las carreras estatales.
- **Si subo una boleta de muestra o comparto distritos**, úsala como fuente definitiva.
- **Menciona una vez** que los códigos postales pueden abarcar varios distritos, luego continúa.
- **Presenta cómo funciona esto** en 2-3 oraciones: vamos pasando por los temas juntos, puedes decir "no sé", investigo en segundo plano y crearé un bloque de continuación si necesitamos seguir en un nuevo chat.

Luego ve directamente al Paso 2.

## PASO 2: Repasa los temas conmigo — uno a la vez

**No preguntes "¿qué temas te importan?"** Repásalos conmigo. Para cada tema:

- **Qué está pasando** — situación actual, números reales, lenguaje sencillo
- **Qué quiere cada lado** — qué significa "sí" vs. "no", o qué han hecho realmente los candidatos
- **Qué hace mi voto** — ¿ley vinculante o señal no vinculante? Una oración.
- **A quién afecta** — hazlo concreto y personal ("Si alquilas..." / "Si tienes hijos en escuelas públicas...")
- **Luego pregúntame qué pienso.** Está bien si digo "no me importa" o "no estoy seguro/a" — eso también es útil.

Si digo "no sé", no lo repitas — enséñame más, luego pregunta de nuevo.

Después de cada 2-3 temas, dame un **resumen de una oración** de lo que mis respuestas sugieren hasta ahora.

## PASO 3: Ayúdame a elegir una primaria (si aplica)

Si esta es una primaria donde elijo una boleta de partido, hazme 3-4 preguntas rápidas sobre **cómo pienso**, no sobre política.

Luego **haz una recomendación clara** en 2-3 oraciones, dame el argumento más fuerte a favor de la otra primaria y déjame decidir.

Si esta es una elección general, omite este paso.

## PASO 4: Investiga los candidatos — carrera por carrera

**Sin biografías de candidatos.** Para cada carrera:

- **¿Qué hace realmente este cargo?** Usa ejemplos concretos.
- **Investiga en segundo plano.** Busca historial de votación, datos de donantes, avales y noticias.
- **Presenta a cada candidato en 2-3 oraciones.** Enfócate en: lo que lograron, preocupaciones sobre financiamiento y cómo encajan con lo que me importa.
- **Señala señales de alerta y avales clave.**
- **Pregúntame qué pienso o si quiero una recomendación.**

## PASO 5: Propuestas

Para cada una: resumen en lenguaje sencillo de una oración, qué significa sí/no, si se relaciona con lo que me importa.

## PASO 6: Dame mi resumen

Resumen limpio e imprimible que pueda llevar a las urnas.

**Recuérdale al votante:** Muchos estados prohíben los teléfonos en los lugares de votación. Sugiere que escriba o imprima este resumen.

## PASO 7: Genera mis resultados

Al final, genera: (A) Resumen de boleta de 1 página, (B) Perfil de votante para futuras elecciones.

## Reglas importantes

- **Colabora, no rellenes automáticamente.** Recomienda solo cuando te lo pidan.
- **Acciones > palabras.** Prioriza lo que los candidatos han HECHO.
- **Enseña antes de preguntar.**
- **La IA comete errores.** Enlázame a fuentes para que pueda verificar.

Empecemos con el Paso 1.`;

// ============================================================
// Context block helpers — English
// ============================================================
function buildRegistrationDeadlines(stateData: StateData, today: Date): string {
  const reg = stateData.registration;
  const onlineStatus = computeDeadlineStatus(
    reg.online.available ? reg.online.deadline : null,
    today,
  );
  const byMailStatus = computeDeadlineStatus(reg.byMail.deadline, today);
  const inPersonStatus = computeDeadlineStatus(reg.inPerson.deadline, today);
  const onlineDeadline = reg.online.available
    ? `Online by ${formatDate(reg.online.deadline!)} (${onlineStatus.label})`
    : "Online registration not available";
  const postmarkNote = reg.byMail.sincePostmarked
    ? ", postmark date"
    : ", received date";
  const byMailDeadline = `By mail by ${formatDate(reg.byMail.deadline)} (${byMailStatus.label}${postmarkNote})`;
  const inPersonDeadline = `In person by ${formatDate(reg.inPerson.deadline)} (${inPersonStatus.label})`;
  return `${onlineDeadline}; ${byMailDeadline}; ${inPersonDeadline}`;
}

function buildEarlyVotingLine(stateData: StateData): string {
  const ev = stateData.earlyVoting;
  if (!ev.available || !ev.startDate || !ev.endDate) {
    return "Not available — absentee voting only";
  }
  const notesStr = ev.notes ? ` — ${ev.notes}` : "";
  return `${formatDate(ev.startDate)} through ${formatDate(ev.endDate)}${notesStr}`;
}

// ============================================================
// Context block helpers — Spanish
// ============================================================
function deadlineLabelEs(daysLeft: number | null, urgency: string): string {
  if (urgency === "passed") return "pasada";
  if (urgency === "na") return "no disponible";
  if (daysLeft === 0) return "hoy";
  if (daysLeft === 1) return "queda 1 día";
  return `quedan ${daysLeft} días`;
}

function buildRegistrationDeadlinesEs(stateData: StateData, today: Date): string {
  const reg = stateData.registration;
  const onlineStatus = computeDeadlineStatus(
    reg.online.available ? reg.online.deadline : null,
    today,
  );
  const byMailStatus = computeDeadlineStatus(reg.byMail.deadline, today);
  const inPersonStatus = computeDeadlineStatus(reg.inPerson.deadline, today);

  const onlineDeadline = reg.online.available
    ? `En línea antes del ${formatDate(reg.online.deadline!, "es-US")} (${deadlineLabelEs(onlineStatus.daysLeft, onlineStatus.urgency)})`
    : "Registro en línea no disponible";
  const postmarkNote = reg.byMail.sincePostmarked
    ? ", fecha de matasellos"
    : ", fecha de recepción";
  const byMailDeadline = `Por correo antes del ${formatDate(reg.byMail.deadline, "es-US")} (${deadlineLabelEs(byMailStatus.daysLeft, byMailStatus.urgency)}${postmarkNote})`;
  const inPersonDeadline = `En persona antes del ${formatDate(reg.inPerson.deadline, "es-US")} (${deadlineLabelEs(inPersonStatus.daysLeft, inPersonStatus.urgency)})`;
  return `${onlineDeadline}; ${byMailDeadline}; ${inPersonDeadline}`;
}

function buildEarlyVotingLineEs(stateData: StateData): string {
  const ev = stateData.earlyVoting;
  if (!ev.available || !ev.startDate || !ev.endDate) {
    return "No disponible — solo voto en ausencia";
  }
  const notesStr = ev.notes ? ` — ${ev.notes}` : "";
  return `Del ${formatDate(ev.startDate, "es-US")} al ${formatDate(ev.endDate, "es-US")}${notesStr}`;
}

// ============================================================
// Exported context block builder (language-aware)
// ============================================================
/** Builds the pre-filled context block in the requested language. */
export function buildContextBlock(
  stateData: StateData,
  zip: string,
  today: Date,
  lang: Language = "en",
): string {
  if (lang === "es") {
    return buildContextBlockEs(stateData, zip, today);
  }
  return buildContextBlockEn(stateData, zip, today);
}

function buildContextBlockEn(
  stateData: StateData,
  zip: string,
  today: Date,
): string {
  const nextElection = getNextElection(stateData.elections, today);
  const electionLine = nextElection
    ? `- **Election:** ${nextElection.name} on ${formatDate(nextElection.date)}\n- **Election type:** ${nextElection.type}${nextElection.primaryType ? ` (${nextElection.primaryType} primary)` : ""}`
    : "- **Election:** No upcoming elections found — check your state election website for updates.";

  const rules = stateData.votingRules;
  const voterIdLine = rules.idRequired
    ? `Required. Accepted: ${rules.acceptedIds.slice(0, 3).join(", ")}${rules.acceptedIds.length > 3 ? ", and others" : ""}`
    : "Not required";

  return `Hi! I'm voting in **${stateData.stateName}**. My zip code is **${zip}**.

Here's what I know about my upcoming election:
${electionLine}
- **Registration deadlines:** ${buildRegistrationDeadlines(stateData, today)}
- **Early voting:** ${buildEarlyVotingLine(stateData)}
- **Voter ID:** ${voterIdLine}
- **Phones at polls:** ${rules.phonesAtPollsDetail}
- **My sample ballot:** ${stateData.resources.sampleBallotLookup}
- **My county election office:** ${stateData.resources.countyElectionLookup}

Help me with my ballot.`;
}

function buildContextBlockEs(
  stateData: StateData,
  zip: string,
  today: Date,
): string {
  const nextElection = getNextElection(stateData.elections, today);
  const electionLine = nextElection
    ? `- **Elección:** ${nextElection.name} el ${formatDate(nextElection.date, "es-US")}\n- **Tipo de elección:** ${nextElection.type}${nextElection.primaryType ? ` (${nextElection.primaryType} primaria)` : ""}`
    : "- **Elección:** No se encontraron elecciones próximas — consulta el sitio web electoral de tu estado.";

  const rules = stateData.votingRules;
  const voterIdLine = rules.idRequired
    ? `Requerida. Aceptados: ${rules.acceptedIds.slice(0, 3).join(", ")}${rules.acceptedIds.length > 3 ? ", y otros" : ""}`
    : "No requerida";

  return `¡Hola! Voy a votar en **${stateData.stateName}**. Mi código postal es **${zip}**.

Esto es lo que sé sobre mi próxima elección:
${electionLine}
- **Fechas límite de registro:** ${buildRegistrationDeadlinesEs(stateData, today)}
- **Votación anticipada:** ${buildEarlyVotingLineEs(stateData)}
- **Identificación para votar:** ${voterIdLine}
- **Teléfonos en las casillas:** ${rules.phonesAtPollsDetail}
- **Mi boleta de muestra:** ${stateData.resources.sampleBallotLookup}
- **Mi oficina electoral del condado:** ${stateData.resources.countyElectionLookup}

Ayúdame con mi boleta.`;
}

/** Returns the full prompt text = BALLOT_PROMPT + pre-filled context block. */
export function generatePromptText(
  stateData: StateData,
  zip: string,
  today: Date,
  lang: Language = "en",
): string {
  const prompt = lang === "es" ? BALLOT_PROMPT_ES : BALLOT_PROMPT_EN;
  return prompt + "\n\n---\n\n" + buildContextBlock(stateData, zip, today, lang);
}
```

- [ ] **Step 4: Run all prompt-generator tests**

```bash
npm test -- src/lib/__tests__/prompt-generator.test.ts 2>&1 | tail -15
```

Expected: all tests PASS (existing + new)

- [ ] **Step 5: Commit**

```bash
git add src/lib/prompt-generator.ts src/lib/__tests__/prompt-generator.test.ts
git commit -m "phase2: prompt-generator — Spanish ballot prompt + Spanish context block (TDD)"
```

---

## Chunk 3: New Components — LanguageToggle + PageContent

### Task 5: `src/components/LanguageToggle.tsx`

**Files:**
- Create: `src/components/LanguageToggle.tsx`
- Create: `src/components/__tests__/LanguageToggle.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/__tests__/LanguageToggle.test.tsx`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { LanguageProvider } from "../../lib/i18n";
import { LanguageToggle } from "../LanguageToggle";

beforeEach(() => {
  localStorage.clear();
});

function renderWithProvider() {
  return render(
    <LanguageProvider>
      <LanguageToggle />
    </LanguageProvider>,
  );
}

describe("LanguageToggle", () => {
  it("renders with data-testid='language-toggle'", () => {
    renderWithProvider();
    expect(screen.getByTestId("language-toggle")).toBeInTheDocument();
  });

  it("shows 'Español' when language is English (switch to Spanish)", () => {
    renderWithProvider();
    expect(screen.getByTestId("language-toggle").textContent).toContain(
      "Español",
    );
  });

  it("shows 'English' when language is Spanish", () => {
    localStorage.setItem("lang", "es");
    renderWithProvider();
    expect(screen.getByTestId("language-toggle").textContent).toContain(
      "English",
    );
  });

  it("clicking toggles language from en to es", () => {
    renderWithProvider();
    act(() => {
      fireEvent.click(screen.getByTestId("language-toggle"));
    });
    expect(screen.getByTestId("language-toggle").textContent).toContain(
      "English",
    );
  });

  it("is a button element (keyboard accessible)", () => {
    renderWithProvider();
    const toggle = screen.getByTestId("language-toggle");
    expect(toggle.tagName).toBe("BUTTON");
  });
});
```

- [ ] **Step 2: Run test to confirm failure**

```bash
npm test -- src/components/__tests__/LanguageToggle.test.tsx 2>&1 | tail -10
```

Expected: FAIL — `../LanguageToggle` not found.

- [ ] **Step 3: Create `src/components/LanguageToggle.tsx`**

```typescript
"use client";

import { useLanguage } from "../lib/i18n";

export function LanguageToggle() {
  const { lang, setLang } = useLanguage();
  const targetLabel = lang === "en" ? "Español" : "English";
  const ariaLabel =
    lang === "en" ? "Switch to Spanish" : "Cambiar a inglés";

  return (
    <button
      data-testid="language-toggle"
      onClick={() => setLang(lang === "en" ? "es" : "en")}
      aria-label={ariaLabel}
      className="fixed top-4 right-4 z-50 bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 hover:border-gray-400 shadow-sm transition-colors min-h-[44px] min-w-[44px]"
    >
      {targetLabel}
    </button>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- src/components/__tests__/LanguageToggle.test.tsx 2>&1 | tail -10
```

Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/LanguageToggle.tsx src/components/__tests__/LanguageToggle.test.tsx
git commit -m "phase2: LanguageToggle component — fixed top-right, keyboard accessible (TDD)"
```

---

### Task 6: `src/components/PageContent.tsx`

**Files:**
- Create: `src/components/PageContent.tsx`
- Create: `src/components/__tests__/PageContent.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/__tests__/PageContent.test.tsx`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { LanguageProvider } from "../../lib/i18n";
import { PageContent } from "../PageContent";

beforeEach(() => {
  localStorage.clear();
});

function renderWithProvider() {
  return render(
    <LanguageProvider>
      <PageContent />
    </LanguageProvider>,
  );
}

describe("PageContent", () => {
  it("renders English hero title by default", () => {
    renderWithProvider();
    expect(
      screen.getByText("Know What You're Voting For"),
    ).toBeInTheDocument();
  });

  it("renders English tips heading by default", () => {
    renderWithProvider();
    expect(screen.getByText("Tips for the conversation")).toBeInTheDocument();
  });

  it("renders English footer by default", () => {
    renderWithProvider();
    expect(
      screen.getByText("Created by a human using AI tools"),
    ).toBeInTheDocument();
  });

  it("renders 'Works with:' in English", () => {
    renderWithProvider();
    expect(screen.getByText("Works with:")).toBeInTheDocument();
  });
});

describe("PageContent — Spanish", () => {
  beforeEach(() => {
    localStorage.setItem("lang", "es");
  });

  it("renders Spanish hero title when lang=es", () => {
    renderWithProvider();
    expect(
      screen.getByText("Sabe por quién vas a votar"),
    ).toBeInTheDocument();
  });

  it("renders Spanish tips heading when lang=es", () => {
    renderWithProvider();
    expect(
      screen.getByText("Consejos para la conversación"),
    ).toBeInTheDocument();
  });

  it("renders Spanish footer when lang=es", () => {
    renderWithProvider();
    expect(
      screen.getByText("Creado por una persona usando herramientas de IA"),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to confirm failure**

```bash
npm test -- src/components/__tests__/PageContent.test.tsx 2>&1 | tail -10
```

Expected: FAIL — `../PageContent` not found.

- [ ] **Step 3: Create `src/components/PageContent.tsx`**

```typescript
"use client";

import { useLanguage } from "../lib/i18n";
import { BallotToolClient } from "./BallotToolClient";

export function PageContent() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
            {t.hero.title}
          </h1>
          <p className="text-gray-600 text-base sm:text-lg mb-4">
            {t.hero.subtitle}
          </p>
          <div className="flex flex-wrap gap-3 text-sm">
            <span className="text-gray-500">{t.hero.worksWith}</span>
            {[
              { name: "Claude", url: "https://claude.ai" },
              { name: "ChatGPT", url: "https://chatgpt.com" },
              { name: "Gemini", url: "https://gemini.google.com" },
              { name: "Grok", url: "https://grok.com" },
            ].map(({ name, url }) => (
              <a
                key={name}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline font-medium"
              >
                {name}
              </a>
            ))}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main id="main-content" className="max-w-2xl mx-auto px-4 py-8">
        <BallotToolClient />

        {/* Tips */}
        <section
          className="mt-12 pt-8 border-t border-gray-200"
          aria-labelledby="tips-heading"
        >
          <h2 id="tips-heading" className="text-lg font-semibold mb-4">
            {t.tips.heading}
          </h2>
          <ul className="space-y-2 text-sm text-gray-700">
            {t.tips.items.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-gray-500 italic">{t.tips.disclaimer}</p>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 mt-12">
        <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-gray-500">
          <p>
            <strong className="text-gray-700">{t.footer.share}</strong>
          </p>
          <p>{t.footer.created}</p>
        </div>
      </footer>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- src/components/__tests__/PageContent.test.tsx 2>&1 | tail -10
```

Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/PageContent.tsx src/components/__tests__/PageContent.test.tsx
git commit -m "phase2: PageContent client component — hero/tips/footer with translations (TDD)"
```

---

## Chunk 4: Component Updates + page.tsx

### Task 7: Update `ZipForm.tsx` — use translations

**Files:**
- Modify: `src/components/ZipForm.tsx`
- Modify: `src/components/__tests__/ZipForm.test.tsx`

- [ ] **Step 1: Write the failing tests**

Add Spanish assertions to `src/components/__tests__/ZipForm.test.tsx`. First read the existing test file, then add at the bottom:

```typescript
// Add this describe block at the end of the file:
describe("ZipForm — Spanish translations", () => {
  beforeEach(() => {
    localStorage.setItem("lang", "es");
  });

  function renderEs() {
    return render(
      <LanguageProvider>
        <ZipForm onSubmit={vi.fn()} isLoading={false} />
      </LanguageProvider>,
    );
  }

  it("shows Spanish label", () => {
    renderEs();
    expect(screen.getByText("Tu código postal")).toBeInTheDocument();
  });

  it("shows Spanish submit button", () => {
    renderEs();
    expect(screen.getByTestId("zip-submit")).toHaveTextContent("Buscar");
  });

  it("shows Spanish required error", async () => {
    renderEs();
    fireEvent.click(screen.getByTestId("zip-submit"));
    await waitFor(() => {
      expect(screen.getByTestId("zip-error")).toHaveTextContent(
        "Por favor ingresa un código postal",
      );
    });
  });

  it("shows Spanish invalid error", async () => {
    renderEs();
    fireEvent.change(screen.getByTestId("zip-input"), {
      target: { value: "123" },
    });
    fireEvent.click(screen.getByTestId("zip-submit"));
    await waitFor(() => {
      expect(screen.getByTestId("zip-error")).toHaveTextContent(
        "Por favor ingresa un código postal válido de 5 dígitos",
      );
    });
  });
});
```

Also add necessary imports to the existing test file:
- `import { LanguageProvider } from "../../lib/i18n";`
- `import { vi } from "vitest";` (if not already present)
- `import { waitFor } from "@testing-library/react";` (if not already present)

Check existing test file imports and wrap existing renders with LanguageProvider too (or add a separate describe with provider).

- [ ] **Step 2: Run test to confirm failure**

```bash
npm test -- src/components/__tests__/ZipForm.test.tsx 2>&1 | tail -15
```

Expected: FAIL — ZipForm doesn't use translations yet, Spanish tests will fail.

- [ ] **Step 3: Update `src/components/ZipForm.tsx`**

```typescript
"use client";

import { useState } from "react";
import { useLanguage } from "../lib/i18n";

interface ZipFormProps {
  onSubmit: (zip: string) => void;
  isLoading: boolean;
}

export function ZipForm({ onSubmit, isLoading }: ZipFormProps) {
  const [zip, setZip] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { t } = useLanguage();

  function validate(value: string): string | null {
    if (!value.trim()) return t.zipForm.errors.required;
    if (!/^\d{5}$/.test(value.trim())) return t.zipForm.errors.invalid;
    return null;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validate(zip);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    onSubmit(zip.trim());
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setZip(e.target.value);
    if (error) setError(null);
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="flex flex-col gap-2">
        <label
          htmlFor="zip-input-field"
          className="text-sm font-medium text-gray-700"
        >
          {t.zipForm.label}
        </label>
        <div className="flex gap-2">
          <input
            id="zip-input-field"
            data-testid="zip-input"
            type="text"
            inputMode="numeric"
            pattern="\d{5}"
            maxLength={5}
            value={zip}
            onChange={handleChange}
            placeholder={t.zipForm.placeholder}
            aria-invalid={error ? "true" : "false"}
            aria-describedby={error ? "zip-error-msg" : undefined}
            className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
          />
          <button
            data-testid="zip-submit"
            type="submit"
            disabled={isLoading}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 min-h-[44px] min-w-[44px] transition-colors"
          >
            {isLoading ? t.zipForm.loading : t.zipForm.submit}
          </button>
        </div>
        {error && (
          <p
            id="zip-error-msg"
            data-testid="zip-error"
            role="alert"
            aria-live="polite"
            className="text-red-600 text-sm"
          >
            {error}
          </p>
        )}
      </div>
    </form>
  );
}
```

NOTE: The existing ZipForm tests don't use LanguageProvider. The `useLanguage()` hook will return the default context (lang='en', English translations) when rendered without a provider — this is safe because the default context value in `i18n.tsx` has `t: TRANSLATIONS.en`. Existing tests will continue to pass without wrapping in a provider.

- [ ] **Step 4: Run all ZipForm tests**

```bash
npm test -- src/components/__tests__/ZipForm.test.tsx 2>&1 | tail -15
```

Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/ZipForm.tsx src/components/__tests__/ZipForm.test.tsx
git commit -m "phase2: ZipForm — use translations for labels, placeholder, errors (TDD)"
```

---

### Task 8: Update `StateSelectorModal.tsx` — use translations

**Files:**
- Modify: `src/components/StateSelectorModal.tsx`
- Modify: `src/components/__tests__/StateSelectorModal.test.tsx`

- [ ] **Step 1: Write the failing tests**

Read the existing test file. Add Spanish describe block at the bottom:

```typescript
// Add imports if not already present:
// import { LanguageProvider } from "../../lib/i18n";

describe("StateSelectorModal — Spanish translations", () => {
  beforeEach(() => {
    localStorage.setItem("lang", "es");
  });

  function renderEs() {
    return render(
      <LanguageProvider>
        <StateSelectorModal
          stateCodes={["TX", "NM"]}
          onSelect={vi.fn()}
          onCancel={vi.fn()}
        />
      </LanguageProvider>,
    );
  }

  it("shows Spanish title", () => {
    renderEs();
    expect(
      screen.getByText("¿En qué estado vas a votar?"),
    ).toBeInTheDocument();
  });

  it("shows Spanish subtitle", () => {
    renderEs();
    expect(
      screen.getByText("Este código postal abarca varios estados."),
    ).toBeInTheDocument();
  });

  it("shows Spanish cancel button", () => {
    renderEs();
    expect(screen.getByText("Cancelar")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to confirm failure**

```bash
npm test -- src/components/__tests__/StateSelectorModal.test.tsx 2>&1 | tail -10
```

Expected: FAIL

- [ ] **Step 3: Update `src/components/StateSelectorModal.tsx`**

```typescript
"use client";

import { useLanguage } from "../lib/i18n";

const STATE_NAMES: Record<string, string> = {
  TX: "Texas",
  CA: "California",
  NH: "New Hampshire",
  AZ: "Arizona",
  NM: "New Mexico",
  NY: "New York",
  FL: "Florida",
  WA: "Washington",
  OR: "Oregon",
};

interface StateSelectorModalProps {
  stateCodes: string[];
  onSelect: (stateCode: string) => void;
  onCancel: () => void;
}

export function StateSelectorModal({
  stateCodes,
  onSelect,
  onCancel,
}: StateSelectorModalProps) {
  const { t } = useLanguage();

  return (
    <div
      data-testid="state-selector"
      role="dialog"
      aria-modal="true"
      aria-labelledby="state-selector-title"
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    >
      <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
        <h2 id="state-selector-title" className="text-lg font-semibold mb-2">
          {t.stateSelector.title}
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          {t.stateSelector.subtitle}
        </p>
        <div className="flex flex-col gap-2 mb-4">
          {stateCodes.map((code) => (
            <button
              key={code}
              onClick={() => onSelect(code)}
              className="w-full text-left px-4 py-3 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors min-h-[44px] font-medium"
            >
              {STATE_NAMES[code] ?? code}
            </button>
          ))}
        </div>
        <button
          onClick={onCancel}
          className="w-full text-center text-sm text-gray-500 hover:text-gray-700 min-h-[44px]"
          aria-label={t.stateSelector.cancelAriaLabel}
        >
          {t.stateSelector.cancel}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run all StateSelectorModal tests**

```bash
npm test -- src/components/__tests__/StateSelectorModal.test.tsx 2>&1 | tail -10
```

Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/StateSelectorModal.tsx src/components/__tests__/StateSelectorModal.test.tsx
git commit -m "phase2: StateSelectorModal — use translations (TDD)"
```

---

### Task 9: Update `PromptOutput.tsx` — use translations

**Files:**
- Modify: `src/components/PromptOutput.tsx`
- Modify: `src/components/__tests__/PromptOutput.test.tsx`

- [ ] **Step 1: Write the failing tests**

Add to `src/components/__tests__/PromptOutput.test.tsx`:

```typescript
// Add LanguageProvider import if not present

describe("PromptOutput — Spanish translations", () => {
  beforeEach(() => {
    localStorage.setItem("lang", "es");
  });

  function renderEs(text = "Test prompt") {
    return render(
      <LanguageProvider>
        <PromptOutput promptText={text} />
      </LanguageProvider>,
    );
  }

  it("shows Spanish title", () => {
    renderEs();
    expect(screen.getByText("Tu Prompt Personalizado")).toBeInTheDocument();
  });

  it("shows Spanish instructions", () => {
    renderEs();
    expect(
      screen.getByText(
        "Copia este prompt y pégalo como tu primer mensaje en cualquier chatbot de IA.",
      ),
    ).toBeInTheDocument();
  });

  it("shows Spanish copy button text", () => {
    renderEs();
    expect(screen.getByTestId("copy-button")).toHaveTextContent(
      "Copiar al Portapapeles",
    );
  });
});
```

- [ ] **Step 2: Run test to confirm failure**

```bash
npm test -- src/components/__tests__/PromptOutput.test.tsx 2>&1 | tail -10
```

Expected: FAIL

- [ ] **Step 3: Update `src/components/PromptOutput.tsx`**

```typescript
"use client";

import { useState, useRef } from "react";
import { useLanguage } from "../lib/i18n";

interface PromptOutputProps {
  promptText: string;
}

export function PromptOutput({ promptText }: PromptOutputProps) {
  const [copied, setCopied] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const { t } = useLanguage();

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(promptText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select all text so user can copy manually
      if (textAreaRef.current) {
        textAreaRef.current.select();
      }
    }
  }

  return (
    <section className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">{t.promptOutput.title}</h2>
        <div className="flex items-center gap-2">
          {copied && (
            <span
              data-testid="copy-confirmation"
              role="status"
              aria-live="polite"
              className="text-green-600 text-sm font-medium flex items-center gap-1"
            >
              {t.promptOutput.copiedStatus}
            </span>
          )}
          <button
            data-testid="copy-button"
            onClick={handleCopy}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors min-h-[44px]"
            aria-label={t.promptOutput.copyAriaLabel}
          >
            {copied ? t.promptOutput.copiedButton : t.promptOutput.copyButton}
          </button>
        </div>
      </div>
      <p className="text-sm text-gray-600 mb-3">{t.promptOutput.instructions}</p>
      <textarea
        ref={textAreaRef}
        data-testid="prompt-output"
        readOnly
        value={promptText}
        aria-label="Customized ballot research prompt"
        className="w-full h-64 md:h-96 p-4 border border-gray-200 rounded-xl text-sm font-mono bg-gray-50 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </section>
  );
}
```

- [ ] **Step 4: Run all PromptOutput tests**

```bash
npm test -- src/components/__tests__/PromptOutput.test.tsx 2>&1 | tail -10
```

Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/PromptOutput.tsx src/components/__tests__/PromptOutput.test.tsx
git commit -m "phase2: PromptOutput — use translations (TDD)"
```

---

### Task 10: Update `StateInfoCard.tsx` — use translations

**Files:**
- Modify: `src/components/StateInfoCard.tsx`
- Modify: `src/components/__tests__/StateInfoCard.test.tsx`

- [ ] **Step 1: Write the failing tests**

Add to `src/components/__tests__/StateInfoCard.test.tsx`:

```typescript
// Add LanguageProvider import if not present
// import { LanguageProvider } from "../../lib/i18n";

describe("StateInfoCard — Spanish translations", () => {
  beforeEach(() => {
    localStorage.setItem("lang", "es");
  });

  function renderEs(stateData = txData, nextElection = mockElection) {
    return render(
      <LanguageProvider>
        <StateInfoCard
          stateData={stateData}
          nextElection={nextElection}
          regStatuses={regStatuses}
          today={today}
        />
      </LanguageProvider>,
    );
  }

  it("shows Spanish state info title", () => {
    renderEs();
    expect(
      screen.getByText("Información Electoral de Texas"),
    ).toBeInTheDocument();
  });

  it("shows Spanish 'Próxima Elección' section header", () => {
    renderEs();
    expect(screen.getByText("Próxima Elección")).toBeInTheDocument();
  });

  it("shows Spanish 'Fechas Límite de Registro' header", () => {
    renderEs();
    expect(
      screen.getByText("Fechas Límite de Registro"),
    ).toBeInTheDocument();
  });

  it("shows Spanish 'Votación Anticipada' header", () => {
    renderEs();
    expect(screen.getByText("Votación Anticipada")).toBeInTheDocument();
  });

  it("shows Spanish voter ID label", () => {
    renderEs();
    expect(
      screen.getByText("Identificación para votar:"),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to confirm failure**

```bash
npm test -- src/components/__tests__/StateInfoCard.test.tsx 2>&1 | tail -10
```

Expected: FAIL

- [ ] **Step 3: Update `src/components/StateInfoCard.tsx`**

```typescript
import type {
  StateData,
  Election,
  EarlyVoting,
  RegistrationStatuses,
  DeadlineUrgency,
  DeadlineStatus,
} from "../types/election";
import { formatDate } from "../lib/date-utils";
import { useLanguage } from "../lib/i18n";
import type { Translations } from "../lib/translations";

function EarlyVotingSection({
  earlyVoting,
  t,
  lang,
}: {
  earlyVoting: EarlyVoting;
  t: Translations;
  lang: string;
}) {
  const locale = lang === "es" ? "es-US" : "en-US";
  return (
    <div className="mb-4">
      <div className="text-sm text-gray-500 uppercase tracking-wide mb-1">
        {t.stateInfo.earlyVoting}
      </div>
      {earlyVoting.available && earlyVoting.startDate && earlyVoting.endDate ? (
        <p className="text-sm">
          {formatDate(earlyVoting.startDate, locale)} –{" "}
          {formatDate(earlyVoting.endDate, locale)}
          {earlyVoting.notes && (
            <span className="text-gray-500"> ({earlyVoting.notes})</span>
          )}
        </p>
      ) : (
        <p className="text-sm text-gray-500">{t.stateInfo.noEarlyVoting}</p>
      )}
    </div>
  );
}

interface StateInfoCardProps {
  stateData: StateData;
  nextElection: Election | null;
  regStatuses: RegistrationStatuses;
  today: Date;
}

const urgencyClasses: Record<DeadlineUrgency, string> = {
  ok: "text-green-700 bg-green-50 border-green-200",
  warning: "text-yellow-700 bg-yellow-50 border-yellow-200",
  urgent: "text-red-700 bg-red-50 border-red-200",
  passed: "text-gray-500 bg-gray-50 border-gray-200",
  na: "text-gray-400 bg-gray-50 border-gray-100",
};

function DeadlineRow({
  label,
  status,
  detail,
  t,
  lang,
}: {
  label: string;
  status: DeadlineStatus;
  detail?: string;
  t: Translations;
  lang: string;
}) {
  const locale = lang === "es" ? "es-US" : "en-US";
  const statusLabel = t.stateInfo.deadlineStatusLabel(status);
  return (
    <div
      className={`flex justify-between items-center px-3 py-2 rounded border text-sm ${urgencyClasses[status.urgency]}`}
    >
      <span className="font-medium">{label}</span>
      <span>
        {status.date ? formatDate(status.date, locale) : "N/A"} —{" "}
        <strong>{statusLabel}</strong>
        {detail && <span className="text-xs ml-1">({detail})</span>}
      </span>
    </div>
  );
}

export function StateInfoCard({
  stateData,
  nextElection,
  regStatuses,
}: StateInfoCardProps) {
  const reg = stateData.registration;
  const { t, lang } = useLanguage();
  const locale = lang === "es" ? "es-US" : "en-US";

  return (
    <section
      data-testid="state-info"
      className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm"
    >
      <h2 className="text-xl font-bold mb-4">
        {t.stateInfo.stateInfoTitle(stateData.stateName)}
      </h2>

      {/* Election */}
      {nextElection ? (
        <div className="mb-4">
          <div className="text-sm text-gray-500 uppercase tracking-wide mb-1">
            {t.stateInfo.nextElection}
          </div>
          <div data-testid="election-name" className="font-semibold text-lg">
            {nextElection.name}
          </div>
          <div data-testid="election-date" className="text-gray-600">
            {formatDate(nextElection.date, locale)}
          </div>
          {nextElection.primaryType && (
            <div className="text-sm text-gray-500 mt-1">
              {t.stateInfo.primaryLabel(nextElection.primaryType)}
            </div>
          )}
        </div>
      ) : (
        <div
          data-testid="no-election-message"
          role="alert"
          className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-sm"
        >
          {t.stateInfo.noElectionFound(stateData.stateName)}{" "}
          <a
            href={stateData.resources.stateElectionWebsite}
            className="underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t.stateInfo.checkStateWebsite}
          </a>
        </div>
      )}

      {/* Registration Deadlines */}
      <div data-testid="registration-status" className="mb-4">
        <div className="text-sm text-gray-500 uppercase tracking-wide mb-2">
          {t.stateInfo.registrationDeadlines}
        </div>

        {regStatuses.allPassed && (
          <div
            role="alert"
            aria-live="polite"
            className="mb-2 p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm"
          >
            {t.stateInfo.registrationDeadlinesPassed}{" "}
            <a
              href={reg.registrationCheckUrl}
              className="underline font-medium"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t.stateInfo.checkRegistration}
            </a>
            .
          </div>
        )}

        <div className="flex flex-col gap-2">
          {reg.online.available && (
            <DeadlineRow
              label={t.stateInfo.onlineLabel}
              status={regStatuses.online}
              t={t}
              lang={lang}
            />
          )}
          <DeadlineRow
            label={t.stateInfo.byMailLabel}
            status={regStatuses.byMail}
            detail={
              reg.byMail.sincePostmarked
                ? t.stateInfo.postmarkDetail
                : t.stateInfo.receivedDetail
            }
            t={t}
            lang={lang}
          />
          <DeadlineRow
            label={t.stateInfo.inPersonLabel}
            status={regStatuses.inPerson}
            t={t}
            lang={lang}
          />
        </div>

        {reg.sameDayRegistration && (
          <p className="text-sm text-green-700 mt-2">
            {t.stateInfo.sameDayRegistration}
          </p>
        )}
      </div>

      {/* Early Voting */}
      <EarlyVotingSection earlyVoting={stateData.earlyVoting} t={t} lang={lang} />

      {/* Voting Rules */}
      <div className="mb-4">
        <div className="text-sm text-gray-500 uppercase tracking-wide mb-1">
          {t.stateInfo.votingRules}
        </div>
        <p className="text-sm">
          <strong>{t.stateInfo.voterIdLabel}</strong>{" "}
          {stateData.votingRules.idRequired
            ? t.stateInfo.voterIdRequired
            : t.stateInfo.voterIdNotRequired}
        </p>
        <p className="text-sm mt-1">
          <strong>{t.stateInfo.phonesAtPollsLabel}</strong>{" "}
          {stateData.votingRules.phonesAtPollsDetail}
        </p>
      </div>

      {/* Links */}
      <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-gray-100">
        <a
          href={stateData.resources.countyElectionLookup}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline text-sm font-medium"
        >
          {t.stateInfo.countyElectionLink}
        </a>
        <a
          href={stateData.resources.sampleBallotLookup}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline text-sm font-medium"
        >
          {t.stateInfo.sampleBallotLink}
        </a>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run all StateInfoCard tests**

```bash
npm test -- src/components/__tests__/StateInfoCard.test.tsx 2>&1 | tail -10
```

Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/StateInfoCard.tsx src/components/__tests__/StateInfoCard.test.tsx
git commit -m "phase2: StateInfoCard — use translations, locale-aware dates (TDD)"
```

---

### Task 11: Update `BallotToolClient.tsx` — use translations + pass lang to prompt

**Files:**
- Modify: `src/components/BallotToolClient.tsx`
- Modify: `src/components/__tests__/BallotToolClient.test.tsx`

- [ ] **Step 1: Write the failing tests**

Add to `src/components/__tests__/BallotToolClient.test.tsx`:

```typescript
// Add LanguageProvider import if not present

describe("BallotToolClient — Spanish translations", () => {
  beforeEach(() => {
    localStorage.setItem("lang", "es");
  });

  function renderEs() {
    return render(
      <LanguageProvider>
        <BallotToolClient />
      </LanguageProvider>,
    );
  }

  it("shows Spanish not-found title after unknown zip", async () => {
    renderEs();
    fireEvent.change(screen.getByTestId("zip-input"), {
      target: { value: "00000" },
    });
    fireEvent.click(screen.getByTestId("zip-submit"));
    await waitFor(() => {
      expect(
        screen.getByText("Código postal no encontrado"),
      ).toBeInTheDocument();
    });
  });

  it("prompt output contains Spanish text after valid zip", async () => {
    renderEs();
    fireEvent.change(screen.getByTestId("zip-input"), {
      target: { value: "73301" },
    });
    fireEvent.click(screen.getByTestId("zip-submit"));
    await waitFor(() => {
      const output = screen.getByTestId("prompt-output") as HTMLTextAreaElement;
      // Spanish main prompt
      expect(output.value).toContain("asistente cívico no partidario");
      // Spanish context block
      expect(output.value).toContain("¡Hola!");
      expect(output.value).toContain("Ayúdame con mi boleta.");
    });
  });
});
```

- [ ] **Step 2: Run test to confirm failure**

```bash
npm test -- src/components/__tests__/BallotToolClient.test.tsx 2>&1 | tail -10
```

Expected: FAIL

- [ ] **Step 3: Update `src/components/BallotToolClient.tsx`**

```typescript
"use client";

import { useState } from "react";
import { ZipForm } from "./ZipForm";
import { StateInfoCard } from "./StateInfoCard";
import { PromptOutput } from "./PromptOutput";
import { StateSelectorModal } from "./StateSelectorModal";
import {
  lookupZip,
  loadStateData,
  computeRegistrationStatuses,
} from "../lib/data";
import { getNextElection } from "../lib/date-utils";
import { generatePromptText } from "../lib/prompt-generator";
import { useLanguage } from "../lib/i18n";
import type {
  StateData,
  Election,
  RegistrationStatuses,
} from "../types/election";

type AppState =
  | { stage: "idle" }
  | { stage: "multi-state"; zip: string; stateCodes: string[] }
  | {
      stage: "result";
      zip: string;
      stateData: StateData;
      nextElection: Election | null;
      regStatuses: RegistrationStatuses;
      promptText: string;
    }
  | { stage: "not-found"; zip: string };

export function BallotToolClient() {
  const [appState, setAppState] = useState<AppState>({ stage: "idle" });
  const [isLoading, setIsLoading] = useState(false);
  const { lang, t } = useLanguage();

  const today = new Date();

  function handleZipSubmit(zip: string) {
    setIsLoading(true);
    const stateCodes = lookupZip(zip);

    if (!stateCodes) {
      setAppState({ stage: "not-found", zip });
      setIsLoading(false);
      return;
    }

    if (stateCodes.length > 1) {
      setAppState({ stage: "multi-state", zip, stateCodes });
      setIsLoading(false);
      return;
    }

    resolveState(zip, stateCodes[0]);
  }

  function resolveState(zip: string, stateCode: string) {
    const stateData = loadStateData(stateCode);

    if (!stateData) {
      setAppState({ stage: "not-found", zip });
      setIsLoading(false);
      return;
    }

    const nextElection = getNextElection(stateData.elections, today);
    const regStatuses = computeRegistrationStatuses(
      stateData.registration,
      today,
    );
    const promptText = generatePromptText(stateData, zip, today, lang);

    setAppState({
      stage: "result",
      zip,
      stateData,
      nextElection,
      regStatuses,
      promptText,
    });
    setIsLoading(false);
  }

  function handleStateSelect(stateCode: string) {
    if (appState.stage !== "multi-state") return;
    resolveState(appState.zip, stateCode);
  }

  function handleStateCancel() {
    setAppState({ stage: "idle" });
  }

  return (
    <div className="max-w-2xl mx-auto">
      <ZipForm onSubmit={handleZipSubmit} isLoading={isLoading} />

      {appState.stage === "multi-state" && (
        <StateSelectorModal
          stateCodes={appState.stateCodes}
          onSelect={handleStateSelect}
          onCancel={handleStateCancel}
        />
      )}

      {appState.stage === "not-found" && (
        <div
          data-testid="not-found-message"
          role="alert"
          className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800"
        >
          <p className="font-semibold mb-1">{t.notFound.title}</p>
          <p className="text-sm">
            {t.notFound.description(appState.zip)}{" "}
            <a
              href="https://www.usa.gov/election-office"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              {t.notFound.linkText}
            </a>
            .
          </p>
        </div>
      )}

      {appState.stage === "result" && (
        <>
          <div className="mt-6">
            <StateInfoCard
              stateData={appState.stateData}
              nextElection={appState.nextElection}
              regStatuses={appState.regStatuses}
              today={today}
            />
          </div>
          <PromptOutput promptText={appState.promptText} />
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run all BallotToolClient tests**

```bash
npm test -- src/components/__tests__/BallotToolClient.test.tsx 2>&1 | tail -10
```

Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/BallotToolClient.tsx src/components/__tests__/BallotToolClient.test.tsx
git commit -m "phase2: BallotToolClient — use translations, pass lang to prompt generator (TDD)"
```

---

### Task 12: Update `src/app/page.tsx` — wrap with LanguageProvider + LanguageToggle

**Files:**
- Modify: `src/app/page.tsx`

No new test needed — the existing render path is tested via PageContent.test.tsx + e2e tests. page.tsx is a thin server shell.

- [ ] **Step 1: Update `src/app/page.tsx`**

```typescript
import { LanguageProvider } from "../lib/i18n";
import { LanguageToggle } from "../components/LanguageToggle";
import { PageContent } from "../components/PageContent";

export const metadata = {
  title: "AI Ballot Research Tool — Know What You're Voting For",
  description:
    "Enter your zip code to get a customized AI ballot research prompt. Free, nonpartisan, works with any chatbot.",
};

export default function Home() {
  return (
    <LanguageProvider>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded z-50"
      >
        Skip to main content
      </a>
      <LanguageToggle />
      <PageContent />
    </LanguageProvider>
  );
}
```

- [ ] **Step 2: Build to verify no TypeScript errors**

```bash
npm run build 2>&1 | tail -20
```

Expected: successful build, no TypeScript errors.

- [ ] **Step 3: Run full test suite**

```bash
npm test 2>&1 | tail -20
```

Expected: all tests PASS (≥53 tests)

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "phase2: page.tsx — wrap with LanguageProvider, add LanguageToggle + PageContent"
```

---

### Task 13: Final verification

- [ ] **Step 1: Run lint**

```bash
npm run lint 2>&1 | tail -10
```

Expected: 0 errors, 0 warnings

- [ ] **Step 2: Run full test suite**

```bash
npm test -- --coverage 2>&1 | tail -20
```

Expected: all tests pass, coverage report generated

- [ ] **Step 3: Run e2e tests**

```bash
npm run measure 2>&1 | tail -30
```

Expected: 42/42 e2e pass, ESLint 0 errors, metrics JSON saved

- [ ] **Step 4: Fix any remaining issues**

If lint errors: fix them before committing.
If e2e failures: investigate and fix.

- [ ] **Step 5: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "phase2: fix lint/test issues post-integration"
```

---

## Summary

**New files (8):**
- `src/lib/translations.ts` — Language type, Translations interface, EN/ES records
- `src/lib/i18n.tsx` — LanguageProvider, useLanguage hook
- `src/components/LanguageToggle.tsx` — Fixed top-right toggle
- `src/components/PageContent.tsx` — Client hero/tips/footer
- `src/lib/__tests__/translations.test.ts`
- `src/lib/__tests__/i18n.test.tsx`
- `src/components/__tests__/LanguageToggle.test.tsx`
- `src/components/__tests__/PageContent.test.tsx`

**Modified files (7):**
- `src/lib/date-utils.ts` — locale param for formatDate
- `src/lib/prompt-generator.ts` — Spanish prompt + context block
- `src/app/page.tsx` — server shell with provider + toggle
- `src/components/BallotToolClient.tsx` — translations + lang dispatch
- `src/components/ZipForm.tsx` — translations
- `src/components/StateInfoCard.tsx` — translations + locale dates
- `src/components/PromptOutput.tsx` — translations
- `src/components/StateSelectorModal.tsx` — translations

**Test files updated (5):** ZipForm, StateSelectorModal, PromptOutput, StateInfoCard, BallotToolClient
