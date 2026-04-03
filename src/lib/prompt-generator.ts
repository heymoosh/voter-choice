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

function buildRegistrationDeadlinesEs(
  stateData: StateData,
  today: Date,
): string {
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
// Context block builders
// ============================================================
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

/** Returns the full prompt text = BALLOT_PROMPT + pre-filled context block. */
export function generatePromptText(
  stateData: StateData,
  zip: string,
  today: Date,
  lang: Language = "en",
): string {
  const prompt = lang === "es" ? BALLOT_PROMPT_ES : BALLOT_PROMPT_EN;
  return (
    prompt + "\n\n---\n\n" + buildContextBlock(stateData, zip, today, lang)
  );
}
