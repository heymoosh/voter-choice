# Story 4.2: Add Spanish Ballot Prompt and Context Block

Status: review

## Story

As a Spanish-speaking voter,
I want the AI chatbot prompt to be in natural Spanish when Spanish mode is active,
so that I can paste the prompt into a Spanish-language chatbot session and get useful civic guidance.

## Acceptance Criteria

1. **Given** `generatePrompt(state, zip, today, 'es')` is called
   **When** executed
   **Then** it returns a prompt that begins with `BALLOT_PROMPT_ES` followed by the Spanish context block

2. **Given** the Spanish main prompt (`BALLOT_PROMPT_ES`)
   **When** examined
   **Then** it is a complete translation in "tú" (informal) voice with consistent civic Spanish terminology, stored as a single complete string constant

3. **Given** the Spanish context block
   **When** generated for Texas (zip: 73301)
   **Then** structural labels are in Spanish: "Voy a votar en **Texas**", "Esto es lo que sé sobre mi próxima elección", "Ayúdame con mi boleta."
   **And** data values remain in English: state name "Texas", election name, ID types, URLs

4. **Given** `generatePrompt(state, zip)` called without language argument
   **When** executed
   **Then** it returns the Phase 1 English prompt exactly (backward compatible — default `lang='en'`)

5. **Given** PromptOutput is displayed and user switches to Spanish
   **When** `lang` from `useLanguage()` changes to `'es'`
   **Then** BallotToolClient re-generates the prompt in Spanish and `PromptOutput` displays the new Spanish text

6. **Given** all existing `generatePrompt` unit tests
   **When** run after this change
   **Then** all 10 tests pass without modification (zero regression)

## Tasks / Subtasks

- [x] Add `BALLOT_PROMPT_ES` constant and `buildContextBlockEs` to `src/lib/generatePrompt.ts` (AC: 1, 2, 3)
  - [x] Add `BALLOT_PROMPT_ES` constant — complete Spanish translation (see exact text in Dev Notes)
  - [x] Add `buildRegistrationBlockEs(stateData, today)` helper — Spanish labels + `formatDate(date, 'es')` + `getDeadlineLabel(deadline, today, 'es')`
  - [x] Add `buildContextBlockEs(stateData, zip, today)` — Spanish context block using Spanish structural labels
- [x] Extend `generatePrompt` signature with optional `lang` param (AC: 4, 6)
  - [x] Change signature to `generatePrompt(stateData, zip, today = new Date(), lang: "en" | "es" = "en")`
  - [x] When `lang === 'es'`, return `${BALLOT_PROMPT_ES}\n\n---\n\n${buildContextBlockEs(stateData, zip, today)}`
  - [x] When `lang === 'en'` (default), return existing EN behavior unchanged
- [x] Modify `src/components/BallotToolClient.tsx` — pass `lang` to `generatePrompt` and re-generate on language switch (AC: 5)
  - [x] Change `const { t } = useLanguage()` to `const { lang, t } = useLanguage()`
  - [x] Add `useEffect` import to the React imports
  - [x] Update `loadState` callback to call `generatePrompt(data, zipCode, new Date(), lang)` and add `lang` to deps array
  - [x] Add `useEffect` that re-generates prompt when `lang` changes: `if (stateData && zip) setPromptText(generatePrompt(stateData, zip, new Date(), lang))`
- [x] Add tests for Spanish `generatePrompt` to `src/__tests__/generatePrompt.test.ts` (AC: 1, 2, 3, 4)
  - [x] Test: `generatePrompt(txData, "73301", today, 'es')` contains "Eres un asistente de investigación cívica"
  - [x] Test: `generatePrompt(txData, "73301", today, 'es')` contains "Voy a votar en **Texas**"
  - [x] Test: `generatePrompt(txData, "73301", today, 'es')` contains "Ayúdame con mi boleta."
  - [x] Test: `generatePrompt(txData, "73301", today, 'es')` contains Spanish date format ("3 de" or "febrero")
  - [x] Test: `generatePrompt(txData, "73301", today, 'en')` contains "nonpartisan civic research assistant" (explicit 'en' works)
  - [x] Test: `generatePrompt(txData, "73301", today)` still matches Phase 1 output (no lang arg = backward compat)
- [x] Run full test suite — verify no regressions
- [x] Run `npx tsc --noEmit` — verify no TypeScript errors

## Dev Notes

### generatePrompt Signature Change (exact)

Current: `generatePrompt(stateData: StateElectionData, zip: string, today: Date = new Date()): string`

New: `generatePrompt(stateData: StateElectionData, zip: string, today: Date = new Date(), lang: "en" | "es" = "en"): string`

**Existing tests call `generatePrompt(data, zip, today)` with 3 args** — the new 4th param defaults to 'en', so zero regression. Do NOT change the 3-arg call signature.

### BALLOT_PROMPT_ES (exact text — copy verbatim)

```typescript
const BALLOT_PROMPT_ES = `Eres un asistente de investigación cívica no partidista que ayuda a un votante estadounidense a prepararse para una próxima elección. Tu trabajo es ayudarme a entender lo que está en mi boleta, formarme mis propias opiniones e investigar candidatos basándome en sus ACCIONES — no en sus promesas de campaña.

## CÓMO FORMATEAR CADA RESPUESTA (sigue esto estrictamente)

- **Mantén cada tema o cargo a un máximo de 4-6 viñetas.** Sin párrafos largos.
- **Resalta el punto clave** en cada viñeta en negrita para que pueda escanearlo.
- **Un tema o cargo por respuesta** a menos que me pidas que aceleres.
- **La conclusión primero.** Empieza con el resumen de 1 oración, luego dame los detalles que puedo explorar.
- **Máximo 3-4 oraciones por viñeta.** Si escribes más, estás escribiendo demasiado.
- **Usa lenguaje sencillo.** Si un joven de 16 años no lo entendería, reescríbelo.
- **Nunca repitas lo que ya cubrimos** a menos que te lo pida.
- Siempre puedo decir "cuéntame más" si quiero más detalle. Por defecto: conciso.

## PASO 1: Obtén mi ubicación y comienza de inmediato

Pregúntame mi código postal y estado en una sola pregunta. Luego:

- **Busca el contexto electoral de mi estado.** Qué tipo de elección, cómo funciona (primaria abierta/cerrada), fecha de la elección. **Verifica la fecha de hoy vs. la fecha de la elección** — dime si las urnas están abiertas hoy, si la votación anticipada está en curso, o si es próxima. Máximo 2-3 oraciones.
- **Si es una primaria:** No preguntes qué boleta de partido. Lo resolveremos juntos después de los temas.
- **Dame un enlace** al sitio de elecciones de mi condado para ver mi boleta de muestra. Sugiéreme que la suba — pero **no esperes.** Comienza de inmediato con los cargos estatales.
- **Si subo una boleta de muestra o comparto distritos**, úsala como fuente definitiva.
- **Menciona una sola vez** que los códigos postales pueden abarcar múltiples distritos, luego sigue adelante.
- **Previsualiza cómo funciona esto** en 2-3 oraciones: recorremos los temas juntos, puedes decir "no sé", investigo en segundo plano, y crearé un bloque de transferencia si necesitamos continuar en un nuevo chat.

Luego ve directamente al Paso 2.

## PASO 2: Recórrenos los temas — uno a la vez

**No preguntes "¿qué temas te importan?"** Recórrelos tú. Para cada tema:

- **Qué está pasando** — situación actual, números reales, lenguaje sencillo
- **Qué quiere cada lado** — qué significa "sí" vs. "no", o qué han hecho realmente los candidatos
- **Qué hace mi voto** — ¿ley vinculante o señal no vinculante? Una oración.
- **A quién afecta** — hazlo concreto y personal ("Si rentas..." / "Si tienes hijos en escuela pública...")
- **Luego pregúntame qué pienso.** Está bien si digo "no me importa" o "no estoy seguro/a" — eso también es útil.

Si digo "no sé", no repitas — enséñame más, luego pregunta de nuevo.

Después de cada 2-3 temas, dame un **resumen de una oración** sobre lo que sugieren mis respuestas hasta ahora.

## PASO 3: Ayúdame a elegir una primaria (si aplica)

Si esta es una primaria donde elijo una boleta de partido, hazme 3-4 preguntas rápidas sobre **cómo pienso**, no sobre política.

Luego **haz una recomendación clara** en 2-3 oraciones, dame el argumento más fuerte para la otra primaria, y déjame decidir.

Si es una elección general, omite este paso.

## PASO 4: Investiga candidatos — cargo por cargo

**Sin biografías de candidatos.** Para cada cargo:

- **¿Qué hace realmente este cargo?** No asumas que lo sé.
- **Investiga en segundo plano.** Busca registros de votación, datos de donantes, respaldos y noticias.
- **Presenta cada candidato en 2-3 oraciones.** Enfócate en: lo que lograron, preocupaciones sobre financiamiento, y cómo se alinean con lo que me importa.
- **Señala banderas rojas y respaldos clave.**
- **Pregúntame qué pienso o si quiero una recomendación.**

## PASO 5: Propuestas

Consolida las que no hemos cubierto todavía. Para cada una:

- **Resumen de una oración en lenguaje sencillo**
- Lo que "sí" y "no" significan en la práctica
- Si se relaciona con lo que dije que me importa
- Mi inclinación probable (señala si es una suposición)

## PASO 6: Dame mi resumen

Resumen limpio e imprimible que puedo llevar a las urnas.

**Recuérdale al votante:** Muchos estados prohíben los teléfonos en los lugares de votación. Sugiérele que escriba o imprima este resumen.

## Reglas importantes

- **Colabora, no rellenes automáticamente.** Recomienda solo cuando se te pida.
- **Acciones > palabras.** Prioriza lo que los candidatos HAN HECHO.
- **Enseña antes de preguntar.** Nunca preguntes mi opinión sobre algo que no entiendo todavía.
- **Hazlo personal.**
- **La IA comete errores.** Enlázame a fuentes para que pueda verificar.
- **Si digo "no me importa" — sigue adelante.**

Empecemos con el Paso 1.`;
```

### buildRegistrationBlockEs and buildContextBlockEs (exact implementation)

```typescript
function buildRegistrationBlockEs(
  stateData: StateElectionData,
  today: Date,
): string {
  const { registration } = stateData;
  const lines: string[] = [];

  const methods = [
    { name: "En línea", method: registration.online },
    { name: "Por correo", method: registration.byMail },
    { name: "En persona", method: registration.inPerson },
  ];

  for (const { name, method } of methods) {
    if (method.deadline) {
      const status = getDeadlineStatus(method.deadline, today);
      const label = getDeadlineLabel(method.deadline, today, "es");
      const postmark =
        "sincePostmarked" in method && method.sincePostmarked
          ? " (con fecha de matasellos)"
          : "";
      lines.push(
        `${name} hasta el ${formatDate(method.deadline, "es")}${postmark} — ${label} (${status})`,
      );
    }
  }

  if (registration.sameDayRegistration) {
    lines.push("Registro el mismo día disponible");
  }

  return lines.join(", ");
}

function buildContextBlockEs(
  stateData: StateElectionData,
  zip: string,
  today: Date,
): string {
  const election = getNextElection(stateData, today);

  const electionInfo = election
    ? `**Elección:** ${election.name} el ${formatDate(election.date, "es")}\n- **Tipo de elección:** ${election.type}${election.isPrimary && election.primaryType ? ` (primaria ${election.primaryType})` : ""}`
    : "No se encontraron próximas elecciones";

  const earlyVotingInfo = stateData.earlyVoting.available
    ? `${formatDate(stateData.earlyVoting.startDate!, "es")} al ${formatDate(stateData.earlyVoting.endDate!, "es")}${stateData.earlyVoting.notes ? ` (${stateData.earlyVoting.notes})` : ""}`
    : "No disponible — solo votación por correo";

  const voterIdInfo = stateData.votingRules.idRequired
    ? `Requerida. Aceptada: ${stateData.votingRules.acceptedIds.join(", ")}`
    : "No requerida";

  return `¡Hola! Voy a votar en **${stateData.stateName}**. Mi código postal es **${zip}**.

Esto es lo que sé sobre mi próxima elección:
- ${electionInfo}
- **Fechas límite de registro:** ${buildRegistrationBlockEs(stateData, today)}
- **Votación anticipada:** ${earlyVotingInfo}
- **Identificación para votar:** ${voterIdInfo}
- **Teléfonos en las urnas:** ${stateData.votingRules.phonesAtPollsDetail}
- **Mi boleta de muestra:** ${stateData.resources.sampleBallotLookup}
- **Mi oficina electoral del condado:** ${stateData.resources.countyElectionLookup}

Ayúdame con mi boleta.`;
}
```

### generatePrompt Change (exact diff)

```typescript
// Before:
export function generatePrompt(
  stateData: StateElectionData,
  zip: string,
  today: Date = new Date(),
): string {
  // ...existing EN logic...
  return `${BALLOT_PROMPT}\n\n---\n\n${contextBlock}`;
}

// After:
export function generatePrompt(
  stateData: StateElectionData,
  zip: string,
  today: Date = new Date(),
  lang: "en" | "es" = "en",
): string {
  if (lang === "es") {
    return `${BALLOT_PROMPT_ES}\n\n---\n\n${buildContextBlockEs(stateData, zip, today)}`;
  }
  // ...existing EN logic unchanged...
  return `${BALLOT_PROMPT}\n\n---\n\n${contextBlock}`;
}
```

### BallotToolClient Changes (exact diffs)

```tsx
// 1. Add useEffect to imports:
import { useState, useCallback, useRef, useEffect } from "react";

// 2. Change t-only destructure to lang+t:
const { lang, t } = useLanguage();

// 3. Update loadState to pass lang:
const loadState = useCallback(async (stateCode: string, zipCode: string) => {
  const data = await getStateData(stateCode);
  if (data) {
    setStateData(data);
    setPromptText(generatePrompt(data, zipCode, new Date(), lang));
    // ...rest unchanged
  }
}, [lang]);  // ADD lang to deps

// 4. Add useEffect for lang-change re-generation:
useEffect(() => {
  if (stateData && zip) {
    setPromptText(generatePrompt(stateData, zip, new Date(), lang));
  }
}, [lang, stateData, zip]);
```

**Why useEffect for re-generation:** `promptText` is a stored string — it doesn't auto-update when `lang` changes. The `useEffect` with `[lang, stateData, zip]` deps re-generates whenever language switches while results are showing, satisfying AC-5 (prompt language matches UI language).

### Data Values Stay in English (AC-3)

Per Phase 2 scope, these are NOT translated in the context block:
- State name: `stateData.stateName` (e.g., "Texas")
- Election name: `election.name` (e.g., "2026 Texas Primary Election")
- Election type value: `election.type` (e.g., "open")
- Primary type: `election.primaryType` (e.g., "open")
- Voter ID types: `votingRules.acceptedIds` (e.g., "Texas driver's license or ID card")
- Phone detail: `votingRules.phonesAtPollsDetail`
- URLs: `sampleBallotLookup`, `countyElectionLookup`
- Early voting notes: `earlyVoting.notes`

Structural labels (Spanish): "Voy a votar en", "Esto es lo que sé", "Elección:", "Fechas límite de registro:", "Votación anticipada:", "Identificación para votar:", "Teléfonos en las urnas:", "Mi boleta de muestra:", "Mi oficina electoral del condado:", "Ayúdame con mi boleta."

### Backward Compatibility for Existing Tests

All 10 existing `generatePrompt` tests call `generatePrompt(data, zip, today)` — no `lang` arg. The new 4th param defaults to `'en'`, so all existing tests pass unchanged. **Do NOT modify `src/__tests__/generatePrompt.test.ts` existing tests.**

### Previous Story Intelligence

- Story 3.3: BallotToolClient already imports `useLanguage` and has `const { t } = useLanguage()` — just extend to `{ lang, t }`
- Story 4.1: `formatDate(date, 'es')` and `getDeadlineLabel(deadline, today, 'es')` are confirmed working — use them in `buildRegistrationBlockEs`
- Story 3.2: `getNextElection` helper already exists in `StateInfoCard.tsx` — same pattern needed in `generatePrompt.ts` (it already has its own `getNextElection` function — reuse it, don't create a duplicate)

### Project Structure Notes

- **Modified:** `src/lib/generatePrompt.ts` (add BALLOT_PROMPT_ES, buildRegistrationBlockEs, buildContextBlockEs, lang param)
- **Modified:** `src/components/BallotToolClient.tsx` (lang destructure, useEffect for re-generation)
- **Modified:** `src/__tests__/generatePrompt.test.ts` (add 6 new tests in new describe block)

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 4.2]
- [Source: src/lib/generatePrompt.ts — current generatePrompt, BALLOT_PROMPT, buildRegistrationBlock]
- [Source: src/components/BallotToolClient.tsx — current loadState, useLanguage usage]
- [Source: src/__tests__/generatePrompt.test.ts — existing 10 tests to preserve]
- [Source: src/lib/date-utils.ts — formatDate(date, 'es'), getDeadlineLabel(deadline, today, 'es')]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Added `BALLOT_PROMPT_ES` constant to `generatePrompt.ts` — complete Spanish translation in "tú" voice
- Added `buildRegistrationBlockEs` helper using Spanish method names, `formatDate(date, 'es')`, `getDeadlineLabel(deadline, today, 'es')`
- Added `buildContextBlockEs` — Spanish structural labels, data values stay in English (state names, election names, IDs, URLs)
- Extended `generatePrompt` with `lang: "en" | "es" = "en"` 4th param — default 'en' means all 10 existing tests pass unchanged
- BallotToolClient: `lang` added to `useLanguage()` destructure, `loadState` passes `lang` to `generatePrompt`, `useEffect` re-generates prompt on lang change
- 6 new Spanish tests added; 101/101 tests pass, 0 TypeScript errors

### File List

- `src/lib/generatePrompt.ts` (MODIFIED — BALLOT_PROMPT_ES, buildRegistrationBlockEs, buildContextBlockEs, lang param)
- `src/components/BallotToolClient.tsx` (MODIFIED — lang destructure, useEffect re-generation)
- `src/__tests__/generatePrompt.test.ts` (MODIFIED — 6 new Spanish tests)
