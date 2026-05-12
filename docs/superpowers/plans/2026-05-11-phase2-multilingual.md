# Phase 2: Multilingual Extension Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Spanish language support to the ballot research tool with a persistent language toggle, all UI text translated, and a complete Spanish AI prompt.

**Architecture:** React Context (`LanguageContext`) provides current language and `t()` function to all components. Translation strings live in `src/lib/i18n/translations.ts`. The `generatePrompt` function accepts a `language` parameter and returns the full Spanish prompt + Spanish context block when called with `"es"`.

**Tech Stack:** React 19, Next.js 15, TypeScript, Vitest, Playwright, Tailwind CSS (no new dependencies)

---

## Chunk 1: i18n Infrastructure

### Task 1: Translation strings module

**Files:**
- Create: `src/lib/i18n/translations.ts`
- Create: `src/lib/i18n/index.ts`

- [ ] **Step 1: Create translations.ts with all English and Spanish strings**

```typescript
// src/lib/i18n/translations.ts

export type Language = "en" | "es";

export const translations = {
  en: {
    // Hero
    heroHeadline: "Know What You're Voting For",
    heroSubtitle:
      "Enter your zip code to get a customized AI prompt that walks you through every race and issue on your ballot. Copy it into any free AI chatbot — no account required.",
    worksWith: "Works with:",
    // Zip form
    zipLabel: "Enter your 5-digit zip code",
    zipPlaceholder: "e.g. 73301",
    zipSubmit: "Look Up",
    zipError: "Please enter a zip code",
    zipErrorInvalid: "Please enter a valid 5-digit zip code",
    // Not found
    notFoundPrefix: "We don't have data for zip code",
    notFoundSuffix:
      "We're working on adding all U.S. zip codes. In the meantime, find your state election office at",
    // State selector
    stateSelectorPrompt:
      "This zip code spans multiple states. Which state are you voting in?",
    // State info card
    nextElection: "Next Election",
    noElection: "No upcoming elections found for",
    noElectionSuffix: "Check",
    noElectionSuffix2: "for updates.",
    registrationDeadlines: "Registration Deadlines",
    online: "Online",
    byMail: "By Mail",
    inPerson: "In Person",
    sameDayReg: "Same-day registration available",
    checkRegistration: "Check your registration:",
    earlyVoting: "Early Voting",
    votingRules: "Voting Rules",
    voterId: "Voter ID:",
    voterIdRequired: "Required",
    voterIdNotRequired: "Not required",
    phonesAtPolls: "Phones at polls:",
    resources: "Resources",
    stateElectionWebsite: "State election website",
    countyElectionOffice: "Find your county election office",
    sampleBallot: "Look up your sample ballot",
    dataLastUpdated: "Data last updated:",
    // Deadline status
    passed: "Passed",
    daysLeft: (n: number) => `${n} day${n === 1 ? "" : "s"} left`,
    // Prompt output
    yourPrompt: "Your Customized Prompt",
    promptInstructions:
      "Copy this prompt and paste it as your first message in any AI chatbot (Claude, ChatGPT, Gemini, Grok, etc.)",
    copyToClipboard: "Copy to Clipboard",
    copied: "✓ Copied!",
    copiedConfirmation: "Copied to clipboard!",
    fallbackCopy: "Select all text in the box and press",
    fallbackCopyOr: "/",
    fallbackCopyEnd: "to copy.",
    // Tips
    tipsHeading: "Tips for Using This Prompt",
    tips: [
      "You can say \"I don't know\" or \"I'm not sure where I stand\" — the AI will explain more and help you figure it out.",
      "You can ask it to research something for you: \"Can you look up this candidate's voting record?\"",
      "You can ask questions anytime: \"What does this position actually do?\" or \"Why does this matter?\"",
      "You're not taking a test. You're having a conversation. The AI works with you.",
      "At the end, it'll give you a summary you can write down or print and take to the polls.",
    ],
    tipsImportant: "Important:",
    tipsDisclaimer:
      "AI can make mistakes. This is a research starting point. The tool will link you to official sources so you can double-check anything that matters to you.",
    // Footer
    shareThis: "Share this tool:",
    shareOnX: "X / Twitter",
    shareOnFacebook: "Facebook",
    shareViaEmail: "Email",
    footerAttribution:
      "Created by a human using AI tools, because everyone deserves to know what they're actually voting for.",
    // Language toggle
    switchToSpanish: "Español",
    switchToEnglish: "English",
    languageChanged: "Language changed to English",
    // Screen reader
    skipToMain: "Skip to main content",
    lookupFormLabel: "Zip code lookup form",
    zipInputLabel: "Zip code",
    promptOutputLabel: "Customized ballot research prompt",
    copyPromptLabel: "Copy prompt to clipboard",
    shareOnXLabel: "Share on X / Twitter",
    shareOnFacebookLabel: "Share on Facebook",
    shareViaEmailLabel: "Share via email",
  },
  es: {
    // Hero
    heroHeadline: "Conoce por qué estás votando",
    heroSubtitle:
      "Ingresa tu código postal para obtener un mensaje de IA personalizado que te guía por cada cargo e iniciativa en tu boleta. Cópialo en cualquier chatbot de IA gratuito — sin necesidad de cuenta.",
    worksWith: "Funciona con:",
    // Zip form
    zipLabel: "Ingresa tu código postal de 5 dígitos",
    zipPlaceholder: "ej. 73301",
    zipSubmit: "Buscar",
    zipError: "Por favor ingresa un código postal",
    zipErrorInvalid: "Por favor ingresa un código postal válido de 5 dígitos",
    // Not found
    notFoundPrefix: "Aún no tenemos datos para el código postal",
    notFoundSuffix:
      "Estamos trabajando para agregar todos los códigos postales de EE.UU. Mientras tanto, encuentra tu oficina electoral estatal en",
    // State selector
    stateSelectorPrompt:
      "Este código postal abarca varios estados. ¿En qué estado vas a votar?",
    // State info card
    nextElection: "Próxima Elección",
    noElection: "No se encontraron elecciones próximas para",
    noElectionSuffix: "Consulta",
    noElectionSuffix2: "para más información.",
    registrationDeadlines: "Fechas Límite de Registro",
    online: "En línea",
    byMail: "Por correo",
    inPerson: "En persona",
    sameDayReg: "Registro el mismo día disponible",
    checkRegistration: "Verifica tu registro:",
    earlyVoting: "Votación Anticipada",
    votingRules: "Reglas de Votación",
    voterId: "Identificación para votar:",
    voterIdRequired: "Requerida",
    voterIdNotRequired: "No requerida",
    phonesAtPolls: "Teléfonos en las casillas:",
    resources: "Recursos",
    stateElectionWebsite: "Sitio web electoral del estado",
    countyElectionOffice: "Encuentra tu oficina electoral del condado",
    sampleBallot: "Consulta tu boleta de muestra",
    dataLastUpdated: "Datos actualizados:",
    // Deadline status
    passed: "Pasó",
    daysLeft: (n: number) => `Quedan ${n} día${n === 1 ? "" : "s"}`,
    // Prompt output
    yourPrompt: "Tu Mensaje Personalizado",
    promptInstructions:
      "Copia este mensaje y pégalo como tu primer mensaje en cualquier chatbot de IA (Claude, ChatGPT, Gemini, Grok, etc.)",
    copyToClipboard: "Copiar al Portapapeles",
    copied: "✓ ¡Copiado!",
    copiedConfirmation: "¡Copiado al portapapeles!",
    fallbackCopy: "Selecciona todo el texto en el cuadro y presiona",
    fallbackCopyOr: "/",
    fallbackCopyEnd: "para copiar.",
    // Tips
    tipsHeading: "Consejos para Usar Este Mensaje",
    tips: [
      "Puedes decir \"No sé\" o \"No estoy seguro/a de mi posición\" — la IA te explicará más y te ayudará a descubrirlo.",
      "Puedes pedirle que investigue algo por ti: \"¿Puedes buscar el historial de votación de este candidato?\"",
      "Puedes hacer preguntas en cualquier momento: \"¿Qué hace realmente este cargo?\" o \"¿Por qué es importante esto?\"",
      "No estás en un examen. Estás teniendo una conversación. La IA trabaja contigo.",
      "Al final, te dará un resumen que puedes anotar o imprimir y llevar a las urnas.",
    ],
    tipsImportant: "Importante:",
    tipsDisclaimer:
      "La IA puede cometer errores. Este es un punto de partida para investigar. La herramienta te enlazará a fuentes oficiales para que puedas verificar cualquier cosa que te importe.",
    // Footer
    shareThis: "Comparte esta herramienta:",
    shareOnX: "X / Twitter",
    shareOnFacebook: "Facebook",
    shareViaEmail: "Correo electrónico",
    footerAttribution:
      "Creado por una persona usando herramientas de IA",
    // Language toggle
    switchToSpanish: "Español",
    switchToEnglish: "English",
    languageChanged: "Idioma cambiado a español",
    // Screen reader
    skipToMain: "Saltar al contenido principal",
    lookupFormLabel: "Formulario de búsqueda por código postal",
    zipInputLabel: "Código postal",
    promptOutputLabel: "Mensaje personalizado de investigación electoral",
    copyPromptLabel: "Copiar mensaje al portapapeles",
    shareOnXLabel: "Compartir en X / Twitter",
    shareOnFacebookLabel: "Compartir en Facebook",
    shareViaEmailLabel: "Compartir por correo electrónico",
  },
} as const;

export type TranslationMap = (typeof translations)["en"];
export type TranslationKey = keyof TranslationMap;

export function t(lang: Language, key: TranslationKey): string | string[] | ((n: number) => string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (translations[lang] as any)[key];
}

export function tStr(lang: Language, key: TranslationKey): string {
  const val = t(lang, key);
  if (typeof val === "string") return val;
  return String(val);
}
```

- [ ] **Step 2: Create i18n index.ts**

```typescript
// src/lib/i18n/index.ts
export { translations, t, tStr } from "./translations";
export type { Language, TranslationMap, TranslationKey } from "./translations";
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/i18n/
git commit -m "phase2: add i18n translation strings module"
```

### Task 2: LanguageContext

**Files:**
- Create: `src/lib/i18n/LanguageContext.tsx`

- [ ] **Step 1: Write failing test for useLanguage hook**

```typescript
// src/lib/__tests__/i18n.test.ts
import { describe, it, expect } from "vitest";
import { translations, tStr } from "../i18n";

describe("translations", () => {
  it("has all required keys in both languages", () => {
    const enKeys = Object.keys(translations.en);
    const esKeys = Object.keys(translations.es);
    expect(enKeys.sort()).toEqual(esKeys.sort());
  });

  it("tStr returns a string for string keys", () => {
    expect(typeof tStr("en", "heroHeadline")).toBe("string");
    expect(typeof tStr("es", "heroHeadline")).toBe("string");
  });

  it("en heroHeadline is correct", () => {
    expect(tStr("en", "heroHeadline")).toBe("Know What You're Voting For");
  });

  it("es heroHeadline is correct", () => {
    expect(tStr("es", "heroHeadline")).toBe("Conoce por qué estás votando");
  });

  it("es footerAttribution matches spec", () => {
    expect(tStr("es", "footerAttribution")).toContain(
      "Creado por una persona usando herramientas de IA"
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/i18n.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Create LanguageContext.tsx**

```typescript
// src/lib/i18n/LanguageContext.tsx
"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { Language } from "./translations";

const STORAGE_KEY = "voter-choice-lang";

type LanguageContextValue = {
  language: Language;
  setLanguage: (lang: Language) => void;
};

const LanguageContext = createContext<LanguageContextValue>({
  language: "en",
  setLanguage: () => {},
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");

  // Initialize from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "en" || stored === "es") {
        setLanguageState(stored);
      }
    } catch {
      // localStorage unavailable (SSR / private browsing)
    }
  }, []);

  // Update html lang attribute and persist to localStorage when language changes
  useEffect(() => {
    document.documentElement.lang = language;
    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch {
      // ignore
    }
  }, [language]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
  }, []);

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext);
}
```

- [ ] **Step 4: Update i18n/index.ts to export LanguageContext**

Add to `src/lib/i18n/index.ts`:
```typescript
export { LanguageProvider, useLanguage } from "./LanguageContext";
```

- [ ] **Step 5: Run vitest again**

Run: `npx vitest run src/lib/__tests__/i18n.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/i18n/ src/lib/__tests__/i18n.test.ts
git commit -m "phase2: add LanguageContext and i18n tests"
```

---

## Chunk 2: Spanish Ballot Prompt

### Task 3: Spanish ballot prompt text

**Files:**
- Create: `src/lib/ballotPromptTextEs.ts`

- [ ] **Step 1: Create Spanish ballot prompt**

The full Spanish translation stored as a complete text (not fragments):

```typescript
// src/lib/ballotPromptTextEs.ts
export const BALLOT_PROMPT_TEXT_ES = `Eres un asistente cívico no partidista que ayuda a un votante de EE.UU. a prepararse para una próxima elección. Tu trabajo es ayudarme a entender qué hay en mi boleta, formarme mis propias opiniones e investigar candidatos basándome en sus ACCIONES — no en sus promesas de campaña.

## CÓMO FORMATEAR CADA RESPUESTA (sigue esto estrictamente)

- **Limita cada tema o cargo a 4-6 puntos máximo.** Sin párrafos largos.
- **Resalta en negrita la conclusión clave** de cada punto para que pueda leerlo de un vistazo.
- **Un tema o cargo por respuesta** a menos que me pidas que aceleres.
- **La conclusión primero.** Comienza con el resumen de 1 oración, luego dame los detalles que puedo ampliar.
- **3-4 oraciones por punto máximo.** Si escribes más, estás escribiendo demasiado.
- **Usa lenguaje sencillo.** Si un joven de 16 años no lo entendería, reescríbelo.
- **Nunca resumas lo que ya cubrimos** a menos que te lo pida.
- Siempre puedo decir "cuéntame más" si quiero profundidad. Por defecto, sé conciso.

## PASO 1: Obtén mi ubicación y comienza de inmediato

Pregúntame mi código postal y estado en una sola pregunta. Luego:

- **Busca el contexto electoral de mi estado.** Qué tipo de elección, cómo funciona (primaria abierta/cerrada), fecha electoral. **Verifica la fecha de hoy vs. la fecha electoral** — dime si hoy se puede votar, si la votación anticipada está en curso o si es una elección próxima. Máximo 2-3 oraciones.
- **Si es una primaria:** No preguntes por qué boleta de partido. Lo averiguaremos juntos después de los temas.
- **Dame un solo enlace** al sitio de elecciones de mi condado para mi boleta de muestra. Sugiere que la suba — pero **no esperes.** Comienza de inmediato con los cargos estatales.
- **Si subo una boleta de muestra o comparto distritos**, úsalos como la fuente definitiva.
- **Menciona una sola vez** que los códigos postales pueden abarcar varios distritos, luego avanza.
- **Previsualiza cómo funciona esto** en 2-3 oraciones: recorremos los temas juntos, puedes decir "no sé", investigo en segundo plano, y crearé un bloque de entrega si necesitamos continuar en un nuevo chat.

Luego ve directamente al Paso 2.

## PASO 2: Recórrenos los temas — uno a la vez

**No preguntes "qué temas te importan".** Recórrelos. Para cada tema:

- **Qué está pasando** — situación actual, números reales, lenguaje sencillo
- **Qué quiere cada parte** — qué significa "sí" vs. "no", o qué han hecho realmente los candidatos
- **Qué hace mi voto** — ¿ley vinculante o señal no vinculante? Una oración.
- **A quién afecta** — hazlo concreto y personal ("Si rentas..." / "Si tienes hijos en la escuela pública...")
- **Luego pregúntame qué pienso.** Está bien si digo "no me importa" o "no estoy seguro/a" — eso también es útil.

Si digo "no sé", no lo repitas — enséñame más, luego pregunta de nuevo.

Después de cada 2-3 temas, dame un **resumen de una oración** de lo que mis respuestas sugieren hasta ahora.

## PASO 3: Ayúdame a elegir en una primaria (si aplica)

Si es una primaria donde elijo una boleta de partido, hazme 3-4 preguntas rápidas sobre **cómo pienso**, no sobre políticas. Ejemplos:

- ¿Historial de logros concretos vs. voz fuerte por tus valores?
- ¿Ganador realista en noviembre vs. expresar lo que crees?
- ¿Evitar que un candidato problemático gane vs. nominar al más sólido de tu lado?

Basándote en mis respuestas, recomienda qué boleta de partido se alinea mejor con mi forma de pensar — y por qué. Sé directo/a.

## PASO 4: Ayúdame con candidatos específicos

**Para cada cargo:**

- El cargo en una oración: qué hace, cuánto poder tiene, cuánto tiempo dura.
- Dos o tres candidatos: qué han hecho realmente (no lo que dicen). Sé específico/a sobre acciones, votos y decisiones. Sin palabras de relleno.
- Cómo decido: ¿A quién pongo el estándar de incumbente? ¿Cuál es la decisión real que estoy tomando?

No me pidas que busque información. Si conoces los cargos, ve directamente al análisis.

## PASO 5: Ayúdame con iniciativas y medidas

Cada iniciativa:

- Qué dice exactamente el lenguaje oficial.
- Qué significan "Sí" y "No" en términos simples.
- Quién lo financia y por qué.
- Cuáles son los pros y contras reales — no los argumentos de campaña.
- Cuál es la consecuencia práctica en mi vida cotidiana.

## PASO 6: Crea mi resumen final

Cuando hayamos terminado (o si te digo "estamos listos"), crea un resumen de mis decisiones en el siguiente formato:

---
**MI RESUMEN DE VOTACIÓN**

Cargo | Mi elección | Mi razón (1 oración)
[para cada cargo e iniciativa]

**Recuérdame llevar:**
- [identificación si es requerida]
- [qué buscar en la boleta]
- [número del lugar de votación / horario]
---

Si estamos en el límite de contexto, termina el chat con:
"Guarda este resumen. Escribe 'Estoy de vuelta con mi boleta de muestra del condado [condado]' en un nuevo chat para continuar."

## REGLAS SIEMPRE ACTIVAS

- **Solo investiga.** Nunca me digas por quién votar. Sé directo/a sobre los hechos.
- **La alineación importa.** Después de cada tema, dime si mis respuestas sugieren una dirección — es útil.
- **Señala cuando no sé** — si no tienes datos sobre una iniciativa específica, dímelo directamente.
- **Usa lo que sé.** Construye sobre mis respuestas anteriores sin pedirme que me repita.
- **El contexto es limitado.** Si nos acercamos al límite del chat, avísame temprano.`;
```

- [ ] **Step 2: Write tests for Spanish prompt**

Add to `src/lib/__tests__/generatePrompt.test.ts`:
```typescript
it("returns Spanish prompt when language is es", () => {
  const stateData = getStateData("TX")!;
  const result = generatePrompt(stateData, "73301", new Date("2026-05-11"), "es");
  expect(result).toContain("asistente cívico no partidista");
});

it("returns Spanish context block when language is es", () => {
  const stateData = getStateData("TX")!;
  const result = generatePrompt(stateData, "73301", new Date("2026-05-11"), "es");
  expect(result).toContain("¡Hola! Voy a votar en");
  expect(result).toContain("Texas");
  expect(result).toContain("73301");
});

it("returns English prompt by default", () => {
  const stateData = getStateData("TX")!;
  const result = generatePrompt(stateData, "73301", new Date("2026-05-11"));
  expect(result).toContain("nonpartisan civic research assistant");
});

it("formats dates in Spanish in es mode", () => {
  const stateData = getStateData("TX")!;
  const result = generatePrompt(stateData, "73301", new Date("2026-05-11"), "es");
  expect(result).toMatch(/de \d{4}/); // Spanish date format "3 de marzo de 2026"
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/lib/__tests__/generatePrompt.test.ts`
Expected: FAIL — generatePrompt does not accept language param yet

- [ ] **Step 4: Update generatePrompt.ts to accept language parameter**

Modify `src/lib/generatePrompt.ts`:
- Add `language: Language = "en"` parameter
- Import `Language` from `@/lib/i18n`
- Import `BALLOT_PROMPT_TEXT_ES` from `@/lib/ballotPromptTextEs`
- Switch `formatDate` to use `"es"` locale when `language === "es"`
- Generate Spanish context block when `language === "es"`

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/lib/__tests__/generatePrompt.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/ballotPromptTextEs.ts src/lib/generatePrompt.ts src/lib/__tests__/generatePrompt.test.ts
git commit -m "phase2: Spanish ballot prompt and bilingual generatePrompt"
```

---

## Chunk 3: UI Components

### Task 4: LanguageToggle component

**Files:**
- Create: `src/components/LanguageToggle.tsx`

- [ ] **Step 1: Create LanguageToggle component**

```typescript
// src/components/LanguageToggle.tsx
"use client";

import { useLanguage } from "@/lib/i18n";
import { tStr } from "@/lib/i18n";

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();
  const isEs = language === "es";

  function handleToggle() {
    setLanguage(isEs ? "en" : "es");
  }

  return (
    <>
      {/* Screen reader announcement region */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {isEs
          ? tStr("es", "languageChanged")
          : tStr("en", "languageChanged")}
      </div>

      <button
        data-testid="language-toggle"
        onClick={handleToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleToggle();
          }
        }}
        aria-label={isEs ? "Switch to English" : "Cambiar a Español"}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors min-h-[36px]"
      >
        <span aria-hidden="true">🌐</span>
        <span>{isEs ? tStr("en", "switchToEnglish") : tStr("es", "switchToSpanish")}</span>
      </button>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/LanguageToggle.tsx
git commit -m "phase2: add LanguageToggle component"
```

### Task 5: Update layout.tsx — wrap in LanguageProvider

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Update layout.tsx**

```typescript
// src/app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { LanguageProvider } from "@/lib/i18n";
import "./globals.css";

// ... fonts same as before

export const metadata: Metadata = {
  title: "Free AI Ballot Research Tool",
  description:
    "Enter your zip code to get a customized AI ballot research prompt. Research every candidate and issue on your ballot with any free AI chatbot.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <LanguageProvider>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-blue-600 text-white px-4 py-2 rounded z-50"
          >
            Skip to main content
          </a>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/layout.tsx
git commit -m "phase2: wrap app in LanguageProvider"
```

### Task 6: Update page.tsx — add toggle, wire language to all components

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Update page.tsx**

Key changes:
- Import `useLanguage`, `tStr`, `translations`, `LanguageToggle`
- Add header with `LanguageToggle` fixed at top-right
- Use `tStr(language, key)` for hero content, error messages, chatbot links label
- Pass `language` to `ZipForm`, `StateSelector`, `StateInfoCard`, `PromptOutput`, `TipsSection`, `Footer`
- Pass `language` to `generatePrompt` call

- [ ] **Step 2: Commit**

```bash
git add src/app/page.tsx
git commit -m "phase2: update page.tsx with language toggle and t() calls"
```

### Task 7: Update all components for i18n

**Files:**
- Modify: `src/components/ZipForm.tsx`
- Modify: `src/components/StateSelector.tsx`
- Modify: `src/components/StateInfoCard.tsx`
- Modify: `src/components/PromptOutput.tsx`
- Modify: `src/components/TipsSection.tsx`
- Modify: `src/components/Footer.tsx`

- [ ] **Step 1: Update ZipForm.tsx**

Add `language: Language` prop. Replace hardcoded strings with `tStr(language, key)`.

- [ ] **Step 2: Update StateSelector.tsx**

Add `language: Language` prop. Replace prompt text.

- [ ] **Step 3: Update StateInfoCard.tsx**

Add `language: Language` prop. Update section headings, labels. Pass `language` to `formatDate` and `getDeadlineStatus`.

- [ ] **Step 4: Update PromptOutput.tsx**

Add `language: Language` prop. Replace all string literals.

- [ ] **Step 5: Update TipsSection.tsx**

Add `language: Language` prop. Use `translations[language].tips` array.

- [ ] **Step 6: Update Footer.tsx**

Add `language: Language` prop. Replace all strings.

- [ ] **Step 7: Update deadlineStatus.ts**

Add `language: Language = "en"` parameter. Return Spanish labels when `"es"`.

- [ ] **Step 8: Commit all component updates**

```bash
git add src/components/ src/lib/deadlineStatus.ts
git commit -m "phase2: translate all UI components to use i18n"
```

---

## Chunk 4: Tests and Verification

### Task 8: Update unit tests for deadlineStatus

**Files:**
- Modify: `src/lib/__tests__/deadlineStatus.test.ts`

- [ ] **Step 1: Add Spanish label tests**

```typescript
it("returns Spanish passed label", () => {
  const result = getDeadlineStatus("2020-01-01", new Date("2026-05-11"), "es");
  expect(result.label).toBe("Pasó");
});

it("returns Spanish days-left label", () => {
  const result = getDeadlineStatus("2026-05-25", new Date("2026-05-11"), "es");
  expect(result.label).toMatch(/Quedan \d+ días/);
});
```

- [ ] **Step 2: Run and verify**

Run: `npx vitest run src/lib/__tests__/deadlineStatus.test.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/lib/__tests__/deadlineStatus.test.ts
git commit -m "phase2: add Spanish deadline status tests"
```

### Task 9: Full test suite

- [ ] **Step 1: Run all unit tests**

Run: `npx vitest run`
Expected: all PASS

- [ ] **Step 2: Build the app**

Run: `npm run build`
Expected: no errors

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: no errors

- [ ] **Step 4: Run e2e tests**

Run: `npx playwright test`
Expected: all Phase 1 tests still pass; language toggle tests pass

- [ ] **Step 5: Final commit**

```bash
git add .
git commit -m "phase2: complete multilingual implementation"
```
