/**
 * Translations for the ballot research tool.
 * Add a new language by adding a new key to the `translations` object.
 * All keys must match the `T` interface exactly.
 */

export type Language = "en" | "es";

export interface T {
  // Meta
  lang: Language;
  langToggleLabel: string; // text shown on the toggle button for the OTHER language

  // Page title and hero
  heroTitle: string;
  heroSubtitle: string;
  chatbotsLabel: string;

  // Zip input section
  step1Label: string;
  zipPlaceholder: string;
  zipAriaLabel: string;
  submitButton: string;
  submitButtonLoading: string;

  // Validation errors
  errorEmpty: string;
  errorInvalidZip: string;

  // Not found
  notFoundTitle: string;
  notFoundBody: string;
  notFoundLink: string;

  // Multi-state selector
  stateSelectorPrompt: string;

  // Loading
  loadingLabel: string;

  // Deadlines passed
  deadlinesPassedTitle: string;
  deadlinesPassedBody: string;
  deadlinesPassedLink: string;

  // No election
  noElectionText: string;
  noElectionLink: string;

  // State info card
  stateInfoAriaLabel: string; // "{stateName} election information"
  stateInfoHeading: string; // "{stateName} — Election Info"
  nextElectionLabel: string;
  registrationDeadlinesLabel: string;
  registrationOnline: string;
  registrationByMail: string;
  registrationInPerson: string;
  sameDayRegistration: string;
  checkRegistrationLink: string;
  earlyVotingLabel: string;
  earlyVotingNotAvailable: string;
  voterIdLabel: string;
  voterIdNotRequired: string;
  voterIdRequired: string; // "{accepted IDs}" is appended by code
  phonesAtPollsLabel: string;
  officialResourcesLabel: string;
  stateElectionWebsiteLink: string;
  sampleBallotLink: string;
  countyElectionLink: string;

  // Deadline badge labels
  deadlineBadgePassed: string;
  deadlineBadgeToday: string;
  deadlineBadgeDaysLeft: string; // "{n} days left" — {n} is inserted by code
  deadlineBadgeDayLeft: string; // "1 day left"

  // Election type labels
  electionTypePrimary: string; // used in parenthetical
  primaryTypeOpen: string;
  primaryTypeClosed: string;
  primaryTypeSemiClosed: string;
  primaryTypeSemiOpen: string;
  earlyVotingThrough: string; // "{start} through {end}"

  // Prompt section
  step2Label: string;
  promptInstructions: string;
  copyButton: string;
  copiedButton: string;
  promptAriaLabel: string;

  // Tips section
  tipsAriaLabel: string;
  tipsHeading: string;
  tip1: string;
  tip2: string;
  tip3: string;
  tip4: string;
  tipWarning: string;

  // Footer
  footerShare: string;
  footerAttribution: string;

  // Context block strings (the pre-filled prompt)
  ctxHello: string; // "Hi! I'm voting in"
  ctxZip: string; // "My zip code is"
  ctxKnow: string; // "Here's what I know about my upcoming election:"
  ctxElection: string; // "Election:"
  ctxElectionType: string; // "Election type:"
  ctxRegistration: string; // "Registration deadlines:"
  ctxOnline: string; // "Online by"
  ctxOnlineNA: string; // "Online registration not available"
  ctxByMail: string; // "by mail by"
  ctxPostmark: string; // "postmark date"
  ctxReceivedDate: string; // "received date"
  ctxInPerson: string; // "in person by"
  ctxSameDayReg: string; // "Same-day registration available"
  ctxEarlyVoting: string; // "Early voting:"
  ctxEarlyVotingNA: string; // "Not available — absentee voting only"
  ctxEarlyThrough: string; // "through"
  ctxVoterId: string; // "Voter ID:"
  ctxVoterIdNotRequired: string; // "Not required"
  ctxVoterIdRequired: string; // "Required. Accepted IDs:"
  ctxPhones: string; // "Phones at polls:"
  ctxSampleBallot: string; // "My sample ballot:"
  ctxCountyOffice: string; // "My county election office:"
  ctxHelp: string; // "Help me with my ballot."
  ctxNoElection: string; // "No upcoming elections found"

  // Phase 3: Live data UI
  pollingLocationLabel: string; // "Polling Location"
  pollingLocationNotFound: string; // "No polling location found"
  pollingLocationHours: string; // "Hours:"
  pollingLocationNotes: string; // "Notes:"
  ballotContestsLabel: string; // "Your Ballot Contests"
  ballotContestsNone: string; // "No contests found"
  candidateLabel: string; // "Candidate" (singular)
  candidatesLabel: string; // "Candidates"
  viewVotingRecord: string; // "View voting record"
  closeVotingRecord: string; // "Close"
  candidateResearching: string; // "Researching…"
  candidateSummaryLabel: string; // "Background"
  candidateVotingRecordLabel: string; // "Voting Record"
  candidateDonorsLabel: string; // "Top Donors"
  candidateEndorsementsLabel: string; // "Endorsements"
  candidateSourcesLabel: string; // "Sources"
  candidateResearchError: string; // "Could not load research. Try again."
  dataAttributionLabel: string; // "Election data from Google Civic…"
  dataLastUpdated: string; // "Updated {timestamp}"
  dataLoadingLabel: string; // "Loading election data…"
  dataPartialError: string; // "Some election data is temporarily unavailable."
  dataFullError: string; // "We're having trouble loading live election data."
  dataVerifyLink: string; // "for complete details"
  districtLabel: string; // "Your Districts"
  districtCounty: string; // "County:"
  districtCongress: string; // "Congressional District:"
  districtStateSenate: string; // "State Senate:"
  districtStateHouse: string; // "State House:"
  referendumLabel: string; // "Referendum"
  voterIdVerifyNote: string; // "Verify current requirements at"

  // Phase 3: Context block additions
  ctxDistricts: string; // "My districts:"
  ctxPollingPlace: string; // "My polling place:"
  ctxBallotContests: string; // "My ballot includes:"
}

// ---- English translations --------------------------------------------------

const en: T = {
  lang: "en",
  langToggleLabel: "Español",

  heroTitle: "Free AI Ballot Research Tool",
  heroSubtitle:
    "Enter your zip code to get a customized AI research prompt. Paste it into any free AI chatbot — Claude, ChatGPT, Gemini, or Grok — and it will walk you through every race and issue on your specific ballot.",
  chatbotsLabel: "Open a chatbot",

  step1Label: "Step 1: Enter your zip code",
  zipPlaceholder: "e.g. 73301",
  zipAriaLabel: "5-digit U.S. zip code",
  submitButton: "Get My Prompt",
  submitButtonLoading: "Looking up…",

  errorEmpty: "Please enter a zip code",
  errorInvalidZip: "Please enter a valid 5-digit zip code",

  notFoundTitle: "We don't have data for zip code {zip} yet.",
  notFoundBody: "We're working on adding all U.S. zip codes.",
  notFoundLink: "Find your state election website",

  stateSelectorPrompt:
    "This zip code spans multiple states. Which state are you voting in?",

  loadingLabel: "Loading election data…",

  deadlinesPassedTitle: "Registration deadlines for this election have passed.",
  deadlinesPassedBody: "to confirm you're still registered.",
  deadlinesPassedLink: "Check your registration status",

  noElectionText: "No upcoming elections found for {stateName}.",
  noElectionLink: "Check the state election website",

  stateInfoAriaLabel: "{stateName} election information",
  stateInfoHeading: "{stateName} — Election Info",
  nextElectionLabel: "Next Election",
  registrationDeadlinesLabel: "Registration Deadlines",
  registrationOnline: "Online",
  registrationByMail: "By mail",
  registrationInPerson: "In person",
  sameDayRegistration: "Same-day registration available",
  checkRegistrationLink: "Check your registration status",
  earlyVotingLabel: "Early Voting",
  earlyVotingNotAvailable: "Not available — absentee voting only",
  voterIdLabel: "Voter ID",
  voterIdNotRequired: "Not required",
  voterIdRequired: "Required. Accepted IDs:",
  phonesAtPollsLabel: "Phones at polls:",
  officialResourcesLabel: "Official Resources",
  stateElectionWebsiteLink: "State election website",
  sampleBallotLink: "Look up your sample ballot",
  countyElectionLink: "County election office",

  deadlineBadgePassed: "Passed",
  deadlineBadgeToday: "Today!",
  deadlineBadgeDaysLeft: "{n} days left",
  deadlineBadgeDayLeft: "1 day left",

  electionTypePrimary: "primary",
  primaryTypeOpen: "open",
  primaryTypeClosed: "closed",
  primaryTypeSemiClosed: "semi-closed",
  primaryTypeSemiOpen: "semi-open",
  earlyVotingThrough: "–",

  step2Label: "Step 2: Copy this prompt",
  promptInstructions:
    "Copy this prompt and paste it as your first message in any AI chatbot. The second block (starting with \"Hi! I'm voting in…\") is your pre-filled context — it's already included.",
  copyButton: "Copy to Clipboard",
  copiedButton: "Copied!",
  promptAriaLabel: "Customized ballot research prompt",

  tipsAriaLabel: "Tips for using the prompt",
  tipsHeading: "Tips for your conversation",
  tip1: 'You can say <strong>"I don\'t know"</strong> or <strong>"I\'m not sure where I stand"</strong> — the AI will explain more and help you figure it out.',
  tip2: 'You can ask it to <strong>research something</strong> for you (e.g. "Can you look up this candidate\'s voting record?").',
  tip3: 'You can <strong>ask questions</strong> anytime ("What does this position actually do?" or "Why does this matter?").',
  tip4: "You're not taking a test. You're having a conversation. The AI works <em>with</em> you.",
  tipWarning:
    "<strong>Important:</strong> AI can make mistakes. This is a research starting point. Always verify important information with official sources.",

  footerShare:
    "Share this tool — it works for any U.S. state and any election.",
  footerAttribution:
    "Created by a human using AI tools, because everyone deserves to know what they're actually voting for.",

  ctxHello: "Hi! I'm voting in",
  ctxZip: "My zip code is",
  ctxKnow: "Here's what I know about my upcoming election:",
  ctxElection: "Election:",
  ctxElectionType: "Election type:",
  ctxRegistration: "Registration deadlines:",
  ctxOnline: "Online by",
  ctxOnlineNA: "Online registration not available",
  ctxByMail: "by mail by",
  ctxPostmark: "postmark date",
  ctxReceivedDate: "received date",
  ctxInPerson: "in person by",
  ctxSameDayReg: "Same-day registration available",
  ctxEarlyVoting: "Early voting:",
  ctxEarlyVotingNA: "Not available — absentee voting only",
  ctxEarlyThrough: "through",
  ctxVoterId: "Voter ID:",
  ctxVoterIdNotRequired: "Not required",
  ctxVoterIdRequired: "Required. Accepted IDs:",
  ctxPhones: "Phones at polls:",
  ctxSampleBallot: "My sample ballot:",
  ctxCountyOffice: "My county election office:",
  ctxHelp: "Help me with my ballot.",
  ctxNoElection: "No upcoming elections found",

  // Phase 3
  pollingLocationLabel: "Polling Location",
  pollingLocationNotFound: "No polling location found for your address",
  pollingLocationHours: "Hours:",
  pollingLocationNotes: "Notes:",
  ballotContestsLabel: "Your Ballot Contests",
  ballotContestsNone: "No contest information found",
  candidateLabel: "Candidate",
  candidatesLabel: "Candidates",
  viewVotingRecord: "View voting record",
  closeVotingRecord: "Close",
  candidateResearching: "Researching…",
  candidateSummaryLabel: "Background",
  candidateVotingRecordLabel: "Voting Record",
  candidateDonorsLabel: "Top Donors",
  candidateEndorsementsLabel: "Endorsements",
  candidateSourcesLabel: "Sources",
  candidateResearchError: "Could not load research. Try again.",
  dataAttributionLabel:
    "Election data from Google Civic Information and live web search via Anthropic.",
  dataLastUpdated: "Updated {timestamp}",
  dataLoadingLabel: "Loading election data…",
  dataPartialError:
    "Some election data is temporarily unavailable. The information shown is current.",
  dataFullError:
    "We're having trouble loading live election data. Here's what we know about voting in {stateName}.",
  dataVerifyLink: "for complete details",
  districtLabel: "Your Districts",
  districtCounty: "County:",
  districtCongress: "Congressional District:",
  districtStateSenate: "State Senate:",
  districtStateHouse: "State House:",
  referendumLabel: "Referendum",
  voterIdVerifyNote: "Verify current requirements at",

  ctxDistricts: "My districts:",
  ctxPollingPlace: "My polling place:",
  ctxBallotContests: "My ballot includes:",
};

// ---- Spanish translations --------------------------------------------------

const es: T = {
  lang: "es",
  langToggleLabel: "English",

  heroTitle: "Herramienta Gratuita de Investigación Electoral con IA",
  heroSubtitle:
    "Ingresa tu código postal para obtener un prompt de investigación personalizado. Pégalo en cualquier chatbot de IA gratuito — Claude, ChatGPT, Gemini o Grok — y te guiará por cada candidatura e iniciativa en tu boleta específica.",
  chatbotsLabel: "Abrir un chatbot",

  step1Label: "Paso 1: Ingresa tu código postal",
  zipPlaceholder: "ej. 73301",
  zipAriaLabel: "Código postal de EE.UU. (5 dígitos)",
  submitButton: "Obtener mi prompt",
  submitButtonLoading: "Buscando…",

  errorEmpty: "Por favor ingresa un código postal",
  errorInvalidZip: "Por favor ingresa un código postal válido de 5 dígitos",

  notFoundTitle: "Aún no tenemos datos para el código postal {zip}.",
  notFoundBody:
    "Estamos trabajando para agregar todos los códigos postales de EE.UU.",
  notFoundLink: "Encuentra el sitio web electoral de tu estado",

  stateSelectorPrompt:
    "Este código postal abarca varios estados. ¿En qué estado vas a votar?",

  loadingLabel: "Cargando datos electorales…",

  deadlinesPassedTitle:
    "Las fechas límite de registro para esta elección ya pasaron.",
  deadlinesPassedBody: "para confirmar que sigues registrado.",
  deadlinesPassedLink: "Verifica el estado de tu registro",

  noElectionText: "No se encontraron elecciones próximas para {stateName}.",
  noElectionLink: "Consulta el sitio web electoral del estado",

  stateInfoAriaLabel: "Información electoral de {stateName}",
  stateInfoHeading: "{stateName} — Información Electoral",
  nextElectionLabel: "Próxima Elección",
  registrationDeadlinesLabel: "Fechas Límite de Registro",
  registrationOnline: "En línea",
  registrationByMail: "Por correo",
  registrationInPerson: "En persona",
  sameDayRegistration: "Registro el mismo día disponible",
  checkRegistrationLink: "Verifica el estado de tu registro",
  earlyVotingLabel: "Votación Anticipada",
  earlyVotingNotAvailable: "No disponible — solo voto en ausencia",
  voterIdLabel: "Identificación para Votar",
  voterIdNotRequired: "No requerida",
  voterIdRequired: "Requerida. Identificaciones aceptadas:",
  phonesAtPollsLabel: "Teléfonos en las casillas:",
  officialResourcesLabel: "Recursos Oficiales",
  stateElectionWebsiteLink: "Sitio web electoral del estado",
  sampleBallotLink: "Consulta tu boleta de muestra",
  countyElectionLink: "Oficina electoral del condado",

  deadlineBadgePassed: "Pasada",
  deadlineBadgeToday: "¡Hoy!",
  deadlineBadgeDaysLeft: "Quedan {n} días",
  deadlineBadgeDayLeft: "Queda 1 día",

  electionTypePrimary: "primaria",
  primaryTypeOpen: "abierta",
  primaryTypeClosed: "cerrada",
  primaryTypeSemiClosed: "semi-cerrada",
  primaryTypeSemiOpen: "semi-abierta",
  earlyVotingThrough: "al",

  step2Label: "Paso 2: Copia este prompt",
  promptInstructions:
    'Copia este prompt y pégalo como tu primer mensaje en cualquier chatbot de IA. El segundo bloque (que comienza con "¡Hola! Voy a votar en…") es tu contexto prellenado — ya está incluido.',
  copyButton: "Copiar al portapapeles",
  copiedButton: "¡Copiado!",
  promptAriaLabel: "Prompt personalizado de investigación electoral",

  tipsAriaLabel: "Consejos para usar el prompt",
  tipsHeading: "Consejos para tu conversación",
  tip1: 'Puedes decir <strong>"No sé"</strong> o <strong>"No estoy seguro/a de mi posición"</strong> — la IA explicará más y te ayudará a decidir.',
  tip2: 'Puedes pedirle que <strong>investigue algo</strong> por ti (ej. "¿Puedes buscar el historial de votación de este candidato?").',
  tip3: 'Puedes <strong>hacer preguntas</strong> en cualquier momento ("¿Qué hace realmente este cargo?" o "¿Por qué importa esto?").',
  tip4: "No estás haciendo un examen. Estás teniendo una conversación. La IA trabaja <em>contigo</em>.",
  tipWarning:
    "<strong>Importante:</strong> La IA puede cometer errores. Este es un punto de partida para la investigación. Siempre verifica la información importante con fuentes oficiales.",

  footerShare:
    "Comparte esta herramienta — funciona para cualquier estado de EE.UU. y cualquier elección.",
  footerAttribution:
    "Creado por una persona usando herramientas de IA, porque todos merecen saber por qué están votando.",

  ctxHello: "¡Hola! Voy a votar en",
  ctxZip: "Mi código postal es",
  ctxKnow: "Esto es lo que sé sobre mi próxima elección:",
  ctxElection: "Elección:",
  ctxElectionType: "Tipo de elección:",
  ctxRegistration: "Fechas límite de registro:",
  ctxOnline: "En línea antes del",
  ctxOnlineNA: "Registro en línea no disponible",
  ctxByMail: "por correo antes del",
  ctxPostmark: "fecha de matasellos",
  ctxReceivedDate: "fecha de recepción",
  ctxInPerson: "en persona antes del",
  ctxSameDayReg: "Registro el mismo día disponible",
  ctxEarlyVoting: "Votación anticipada:",
  ctxEarlyVotingNA: "No disponible — solo voto en ausencia",
  ctxEarlyThrough: "al",
  ctxVoterId: "Identificación para votar:",
  ctxVoterIdNotRequired: "No requerida",
  ctxVoterIdRequired: "Requerida. Identificaciones aceptadas:",
  ctxPhones: "Teléfonos en las casillas:",
  ctxSampleBallot: "Mi boleta de muestra:",
  ctxCountyOffice: "Mi oficina electoral del condado:",
  ctxHelp: "Ayúdame con mi boleta.",
  ctxNoElection: "No se encontraron elecciones próximas",

  // Phase 3
  pollingLocationLabel: "Lugar de Votación",
  pollingLocationNotFound: "No se encontró lugar de votación para tu dirección",
  pollingLocationHours: "Horario:",
  pollingLocationNotes: "Notas:",
  ballotContestsLabel: "Tus Candidaturas en la Boleta",
  ballotContestsNone: "No se encontró información de candidaturas",
  candidateLabel: "Candidato",
  candidatesLabel: "Candidatos",
  viewVotingRecord: "Ver historial de votación",
  closeVotingRecord: "Cerrar",
  candidateResearching: "Investigando…",
  candidateSummaryLabel: "Trayectoria",
  candidateVotingRecordLabel: "Historial de Votación",
  candidateDonorsLabel: "Principales Donantes",
  candidateEndorsementsLabel: "Respaldos",
  candidateSourcesLabel: "Fuentes",
  candidateResearchError:
    "No se pudo cargar la investigación. Inténtalo de nuevo.",
  dataAttributionLabel:
    "Datos electorales de Google Civic Information y búsqueda web en vivo vía Anthropic.",
  dataLastUpdated: "Actualizado {timestamp}",
  dataLoadingLabel: "Cargando datos electorales…",
  dataPartialError:
    "Algunos datos electorales no están disponibles temporalmente. La información mostrada es actual.",
  dataFullError:
    "Tenemos problemas para cargar los datos electorales en vivo. Esto es lo que sabemos sobre votar en {stateName}.",
  dataVerifyLink: "para detalles completos",
  districtLabel: "Tus Distritos",
  districtCounty: "Condado:",
  districtCongress: "Distrito Congresional:",
  districtStateSenate: "Senado Estatal:",
  districtStateHouse: "Cámara Estatal:",
  referendumLabel: "Referéndum",
  voterIdVerifyNote: "Verifica los requisitos actuales en",

  ctxDistricts: "Mis distritos:",
  ctxPollingPlace: "Mi lugar de votación:",
  ctxBallotContests: "Mi boleta incluye:",
};

// ---- Spanish BALLOT_PROMPT -------------------------------------------------

export const BALLOT_PROMPT_ES = `Eres un asistente de investigación cívica no partidista que ayuda a un votante de EE.UU. a prepararse para una próxima elección. Tu trabajo es ayudarme a entender qué hay en mi boleta, formarme mis propias opiniones e investigar a los candidatos basándome en sus ACCIONES — no en sus promesas de campaña.

## CÓMO FORMATEAR CADA RESPUESTA (sigue esto estrictamente)

- **Limita cada tema o candidatura a 4-6 puntos como máximo.** Sin párrafos largos.
- **Resalta el punto clave** de cada viñeta para que pueda escanearlo.
- **Un tema o candidatura por respuesta** a menos que te pida que aceleres.
- **La conclusión primero.** Empieza con el resumen de 1 oración, luego dame los detalles de apoyo que puedo ampliar.
- **Máximo 3-4 oraciones por viñeta.** Si escribes más, es demasiado.
- **Usa lenguaje sencillo.** Si un adolescente de 16 años no lo entendería, reescríbelo.
- **Nunca resumas lo que ya cubrimos** a menos que te lo pida.
- Siempre puedo decir "cuéntame más" si quiero profundidad. Por defecto, sé conciso.

## PASO 1: Obtén mi ubicación y empieza inmediatamente

Pregúntame mi código postal y estado en una sola pregunta. Luego:

- **Busca el contexto electoral de mi estado.** Qué tipo de elección, cómo funciona (primaria abierta/cerrada), fecha de la elección. **Verifica la fecha de hoy frente a la fecha de la elección** — dime si las urnas están abiertas hoy, si se está realizando la votación anticipada o si es próxima. Máximo 2-3 oraciones.
- **Si es una primaria:** No preguntes qué boleta de partido. Lo resolveremos juntos después de los temas.
- **Dame un enlace** al sitio de elecciones de mi condado para mi boleta de muestra. Sugiéreme que la suba — pero **no esperes.** Empieza inmediatamente con las candidaturas estatales.
- **Si subo una boleta de muestra o comparto distritos**, úsalos como fuente definitiva.
- **Señala una vez** que los códigos postales pueden abarcar múltiples distritos, y sigue adelante.
- **Previsualiza cómo funciona esto** en 2-3 oraciones: recorremos los temas juntos, puedes decir "no sé", investigo en segundo plano y crearé un bloque de traspaso si necesitamos continuar en un nuevo chat.

Luego ve directo al Paso 2.

## PASO 2: Recórramos los temas — uno a la vez

**No preguntes "¿qué temas te importan?"** Recórrelos. Para cada tema:

- **Qué está pasando** — situación actual, cifras reales, lenguaje sencillo
- **Qué quiere cada lado** — qué significa "sí" vs. "no", o qué han hecho realmente los candidatos
- **Qué hace mi voto** — ¿ley vinculante o señal no vinculante? Una oración.
- **A quién afecta** — hazlo concreto y personal ("Si rentas..." / "Si tienes hijos en la escuela pública...")
- **Luego pregunta qué pienso.** Está bien si digo "no me importa" o "no estoy seguro/a" — eso también es útil.

Si digo "no sé", no lo repitas — enséñame más, luego pregunta de nuevo.

Después de cada 2-3 temas, dame un **resumen de una oración** de lo que sugieren mis respuestas hasta ahora.

## PASO 3: Ayúdame a elegir una primaria (si aplica)

Si es una primaria donde elijo una boleta de partido, hazme 3-4 preguntas rápidas sobre **cómo pienso**, no sobre políticas. Ejemplos:

- ¿Historial de logros vs. voz pública fuerte para tus valores?
- ¿Ganador realista en noviembre vs. expresar lo que crees?
- ¿Mantener fuera a un mal actor vs. nominar al candidato más fuerte de tu lado?
- ¿Base de donantes de pequeñas contribuciones vs. historial de votación que muestra independencia de grandes donantes?

Luego **haz una recomendación clara** en 2-3 oraciones, dame el contraargumento más fuerte para la otra primaria y déjame decidir.

Si es una elección general, omite este paso.

## PASO 4: Investiga a los candidatos — candidatura por candidatura

**Sin biografías de candidatos.** Para cada candidatura:

- **¿Qué hace realmente este cargo?** No asumas que lo sé.
- **Investiga en segundo plano.** Busca historial de votación, datos de donantes, respaldos y noticias. Mira acciones, financiamiento y si las palabras coinciden con los hechos.
- **Presenta a cada candidato en 2-3 oraciones.** Enfócate en: qué lograron, preocupaciones sobre el rastro del dinero y cómo coinciden con lo que me importa.
- **Señala alertas y respaldos clave.**
- **Pregúntame qué pienso o si quiero una recomendación.** No llenes mi boleta automáticamente.

## PASO 5: Propuestas

Para cada propuesta: resumen en lenguaje sencillo de una oración, qué significan realmente "sí" y "no", si se conecta con lo que me importa y mi probable inclinación.

## PASO 6: Dame mi resumen

Resumen limpio e imprimible que puedo llevar a las urnas.

## PASO 7: Genera mis resultados

**Resultado A:** Una página de boleta imprimible con solo mis elecciones.
**Resultado B:** Mi perfil de votante para elecciones futuras.

## Reglas importantes

- **Colabora, no llenes automáticamente.** Recomienda solo cuando te lo pidan.
- **Acciones > palabras.** Prioriza lo que los candidatos han HECHO.
- **Enseña antes de preguntar.** Nunca preguntes mi opinión sobre algo que no entiendo todavía.
- **La IA comete errores.** Enlázame a fuentes para que pueda verificar.

Empecemos con el Paso 1.`;

// ---- Exports ---------------------------------------------------------------

export const translations: Record<Language, T> = { en, es };

export function getTranslations(lang: Language): T {
  return translations[lang];
}
