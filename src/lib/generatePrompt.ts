import type { StateElectionData } from "./types";
import { formatDate, getDeadlineStatus, getDeadlineLabel } from "./date-utils";

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

const BALLOT_PROMPT = `You are a nonpartisan civic research assistant helping a U.S. voter prepare for an upcoming election. Your job is to help me understand what's on my ballot, form my own opinions, and research candidates based on their ACTIONS — not their campaign promises.

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

- **What does this position actually do?** Don't assume I know.
- **Research in the background.** Search voting records, donor data, endorsements, and news.
- **Present each candidate in 2-3 sentences.** Focus on: what they got done, money trail concerns, and how they match what I care about.
- **Flag red flags and key endorsements.**
- **Ask me what I think or if I want a recommendation.**

## STEP 5: Propositions

Consolidate any we haven't covered yet. For each:

- **One-sentence plain language summary**
- What "yes" and "no" actually mean in practice
- Whether it connects to what I said I care about
- My likely lean (flag if it's a guess)

## STEP 6: Give me my summary

Clean, printable summary I can take to the polls.

**Remind the voter:** Many states prohibit phones at polling places. Suggest they write down or print this summary.

## Important rules

- **Collaborate, don't auto-fill.** Recommend only when asked.
- **Actions > words.** Prioritize what candidates have DONE.
- **Teach before you ask.** Never ask my opinion on something I don't understand yet.
- **Make it personal.**
- **AI makes mistakes.** Link me to sources so I can verify.
- **If I say "I don't care" — move on.**

Let's start with Step 1.`;

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

function getNextElection(
  stateData: StateElectionData,
  today: Date = new Date(),
): StateElectionData["elections"][0] | null {
  const todayStr = today.toISOString().split("T")[0];
  return stateData.elections.find((e) => e.date >= todayStr) ?? null;
}

function buildRegistrationBlock(
  stateData: StateElectionData,
  today: Date,
): string {
  const { registration } = stateData;
  const lines: string[] = [];

  const methods = [
    { name: "Online", method: registration.online },
    { name: "By mail", method: registration.byMail },
    { name: "In person", method: registration.inPerson },
  ];

  for (const { name, method } of methods) {
    if (method.deadline) {
      const status = getDeadlineStatus(method.deadline, today);
      const label = getDeadlineLabel(method.deadline, today);
      const postmark =
        "sincePostmarked" in method && method.sincePostmarked
          ? " (postmarked)"
          : "";
      lines.push(
        `${name} by ${formatDate(method.deadline)}${postmark} — ${label} (${status})`,
      );
    }
  }

  if (registration.sameDayRegistration) {
    lines.push("Same-day registration available");
  }

  return lines.join(", ");
}

export function generatePrompt(
  stateData: StateElectionData,
  zip: string,
  today: Date = new Date(),
  lang: "en" | "es" = "en",
): string {
  if (lang === "es") {
    return `${BALLOT_PROMPT_ES}\n\n---\n\n${buildContextBlockEs(stateData, zip, today)}`;
  }

  const election = getNextElection(stateData, today);

  const electionInfo = election
    ? `**Election:** ${election.name} on ${formatDate(election.date)}\n- **Election type:** ${election.type}${election.isPrimary && election.primaryType ? ` (${election.primaryType} primary)` : ""}`
    : "No upcoming elections found";

  const earlyVotingInfo = stateData.earlyVoting.available
    ? `${formatDate(stateData.earlyVoting.startDate!)} through ${formatDate(stateData.earlyVoting.endDate!)}${stateData.earlyVoting.notes ? ` (${stateData.earlyVoting.notes})` : ""}`
    : "Not available — absentee voting only";

  const voterIdInfo = stateData.votingRules.idRequired
    ? `Required. Accepted: ${stateData.votingRules.acceptedIds.join(", ")}`
    : "Not required";

  const contextBlock = `Hi! I'm voting in **${stateData.stateName}**. My zip code is **${zip}**.

Here's what I know about my upcoming election:
- ${electionInfo}
- **Registration deadlines:** ${buildRegistrationBlock(stateData, today)}
- **Early voting:** ${earlyVotingInfo}
- **Voter ID:** ${voterIdInfo}
- **Phones at polls:** ${stateData.votingRules.phonesAtPollsDetail}
- **My sample ballot:** ${stateData.resources.sampleBallotLookup}
- **My county election office:** ${stateData.resources.countyElectionLookup}

Help me with my ballot.`;

  return `${BALLOT_PROMPT}\n\n---\n\n${contextBlock}`;
}
