/**
 * Translations for the ballot research tool.
 * Add a new language by adding a new key to the `translations` object.
 * All keys must match the `T` interface exactly.
 */

export type Language = "en" | "es" | "vi" | "zh" | "ar";

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

  // Phase 5: Chat window
  chatCtaLabel: string; // "Research My Ballot with AI"
  chatCtaSubtitle: string; // "Chat on-site with Claude Sonnet"
  chatWindowTitle: string; // "AI Ballot Research"
  chatPrivacyNotice: string; // Pre-session privacy warning
  chatInputPlaceholder: string; // "Type your message…"
  chatSendLabel: string; // "Send"
  chatBudgetWarning: string; // 70-90% budget notice
  chatBudgetCritical: string; // 90-100% budget notice
  chatBudgetExhausted: string; // 100% budget message
  chatSessionLimitMsg: string; // 60-message limit message
  chatRateLimitMsg: string; // Rate limit message
  chatErrorMsg: string; // Generic error

  // Phase 5: Downloadable ballot
  downloadBallotBtn: string; // "Download My Ballot"
  ballotPreviewTitle: string; // "Your Ballot"
  ballotPasteLabel: string; // "Paste AI ballot output"
  ballotPastePlaceholder: string; // "Paste the MY BALLOT section…"
  ballotPasteBtn: string; // "Build Ballot"
  ballotParseError: string; // parse failure message
  ballotManualEntryLabel: string; // "Enter choices manually"
  ballotManualRaceLabel: string; // "Race name"
  ballotManualPickLabel: string; // "Your choice"
  ballotManualAddRow: string; // "Add race"
  ballotManualBuildBtn: string; // "Build My Ballot"
  ballotPrivacyNote: string; // Disclaimer
  ballotSectionTitle: string; // "Build My Ballot"
  ballotPathBTitle: string; // "Paste from External Chatbot"

  // Phase 5: Voter profile
  downloadProfileBtn: string; // "Download My Voter Profile"
  uploadProfileLabel: string; // "Returning voter? Upload your voter profile"
  uploadProfileBtn: string; // "Upload Profile"
  profileConfirmTitle: string; // "Profile loaded"
  profileConfirmNote: string; // "Your profile is used for this session only"
  profileSaveNote: string; // "Save this file before the next election"
  profileTooLarge: string; // "File too large (max 10KB)"
  profileWrongType: string; // "Only .txt files are accepted"

  // Phase 5: Alignment banner
  alignmentLabel: string; // "Alignment:"
  alignmentStrong: string; // "Strong alignment"
  alignmentMixed: string; // "Mixed alignment"
  alignmentWeak: string; // "Weak alignment"
  alignmentExpandBtn: string; // "Expand breakdown"
  alignmentCollapseBtn: string; // "Collapse"
  alignmentParseError: string; // graceful degradation message
  alignmentOverallLabel: string; // "Overall:"
  alignmentIssueLabel: string; // "Issues breakdown"
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

  // Phase 5: Chat
  chatCtaLabel: "Research My Ballot with AI",
  chatCtaSubtitle: "Chat on-site with Claude Sonnet — free",
  chatWindowTitle: "AI Ballot Research",
  chatPrivacyNotice:
    "Your conversation stays in your browser only — we don't store it. If you close or refresh this page, your conversation will be lost. Download your ballot and voter profile before leaving.",
  chatInputPlaceholder: "Type your message…",
  chatSendLabel: "Send",
  chatBudgetWarning:
    "Free AI chat may be limited later this month. You can always use the copy-paste option.",
  chatBudgetCritical:
    "Free AI chat is running low this month. Consider using the copy-paste option for an uninterrupted experience.",
  chatBudgetExhausted:
    "Our free AI chat has reached its monthly limit. You can still research your ballot — copy the prompt below and paste it into any free AI chatbot (Claude, ChatGPT, Gemini, Grok).",
  chatSessionLimitMsg:
    "You've reached the 60-message session limit. To keep this tool free for everyone, we limit sessions per day. You can continue by copying the prompt below.",
  chatRateLimitMsg:
    "To keep this tool free for everyone, we limit sessions per day. You can continue your research by copying the prompt below.",
  chatErrorMsg:
    "Something went wrong. Please try again or use the copy-paste option.",

  // Phase 5: Ballot
  downloadBallotBtn: "Download My Ballot",
  ballotPreviewTitle: "Your Ballot",
  ballotPasteLabel: "Paste AI ballot output (Path B)",
  ballotPastePlaceholder:
    "Paste the MY BALLOT section from your AI conversation…",
  ballotPasteBtn: "Build Ballot from Paste",
  ballotParseError:
    "We couldn't read that format. Try copying just the 'MY BALLOT' section from your AI conversation, or enter your choices manually below.",
  ballotManualEntryLabel: "Enter choices manually",
  ballotManualRaceLabel: "Race / office name",
  ballotManualPickLabel: "Your choice",
  ballotManualAddRow: "Add another race",
  ballotManualBuildBtn: "Build My Ballot",
  ballotPrivacyNote:
    "This is your personal reference, not an official ballot. Verify all information at your state election office.",
  ballotSectionTitle: "Build My Ballot",
  ballotPathBTitle: "Paste from External Chatbot",

  // Phase 5: Voter profile
  downloadProfileBtn: "Download My Voter Profile",
  uploadProfileLabel: "Returning voter? Upload your voter profile",
  uploadProfileBtn: "Upload Profile",
  profileConfirmTitle: "Profile loaded from previous session",
  profileConfirmNote:
    "Your profile is used for this session only and is not stored on our servers.",
  profileSaveNote:
    "Save this file somewhere you'll find it before the next election. When you come back, upload it so you don't have to start from scratch.",
  profileTooLarge: "File too large. Maximum size is 10KB.",
  profileWrongType: "Only .txt files are accepted.",

  // Phase 5: Alignment
  alignmentLabel: "Alignment:",
  alignmentStrong: "Strong alignment",
  alignmentMixed: "Mixed alignment",
  alignmentWeak: "Weak alignment",
  alignmentExpandBtn: "Expand breakdown",
  alignmentCollapseBtn: "Collapse",
  alignmentParseError:
    "Alignment scores couldn't be generated for this response — try asking the AI to score the candidates again.",
  alignmentOverallLabel: "Overall:",
  alignmentIssueLabel: "Issues breakdown",
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

  // Phase 5: Chat
  chatCtaLabel: "Investiga mi boleta con IA",
  chatCtaSubtitle: "Chatea en el sitio con Claude Sonnet — gratis",
  chatWindowTitle: "Investigación de Boleta con IA",
  chatPrivacyNotice:
    "Tu conversación permanece solo en tu navegador — no la almacenamos. Si cierras o recargas esta página, tu conversación se perderá. Descarga tu boleta y perfil de votante antes de salir.",
  chatInputPlaceholder: "Escribe tu mensaje…",
  chatSendLabel: "Enviar",
  chatBudgetWarning:
    "El chat de IA gratuito puede limitarse más adelante este mes. Siempre puedes usar la opción de copiar y pegar.",
  chatBudgetCritical:
    "El chat de IA gratuito se está agotando este mes. Considera usar la opción de copiar y pegar para una experiencia ininterrumpida.",
  chatBudgetExhausted:
    "Nuestro chat de IA gratuito ha alcanzado su límite mensual. Aún puedes investigar tu boleta — copia el prompt a continuación y pégalo en cualquier chatbot de IA gratuito.",
  chatSessionLimitMsg:
    "Has alcanzado el límite de 60 mensajes por sesión. Puedes continuar copiando el prompt a continuación.",
  chatRateLimitMsg:
    "Para mantener esta herramienta gratuita para todos, limitamos las sesiones por día. Puedes continuar tu investigación copiando el prompt a continuación.",
  chatErrorMsg:
    "Algo salió mal. Por favor intenta de nuevo o usa la opción de copiar y pegar.",

  // Phase 5: Ballot
  downloadBallotBtn: "Descargar mi boleta",
  ballotPreviewTitle: "Tu Boleta",
  ballotPasteLabel: "Pega el resultado de IA (Ruta B)",
  ballotPastePlaceholder:
    "Pega la sección MI BOLETA de tu conversación con IA…",
  ballotPasteBtn: "Construir boleta desde pegado",
  ballotParseError:
    "No pudimos leer ese formato. Intenta copiar solo la sección 'MI BOLETA' de tu conversación con IA, o ingresa tus opciones manualmente.",
  ballotManualEntryLabel: "Ingresar opciones manualmente",
  ballotManualRaceLabel: "Nombre del cargo / candidatura",
  ballotManualPickLabel: "Tu elección",
  ballotManualAddRow: "Agregar otro cargo",
  ballotManualBuildBtn: "Construir mi boleta",
  ballotPrivacyNote:
    "Esta es tu referencia personal, no una boleta oficial. Verifica toda la información en la oficina electoral de tu estado.",
  ballotSectionTitle: "Construir mi boleta",
  ballotPathBTitle: "Pegar desde chatbot externo",

  // Phase 5: Voter profile
  downloadProfileBtn: "Descargar mi perfil de votante",
  uploadProfileLabel: "¿Votante que regresa? Sube tu perfil de votante",
  uploadProfileBtn: "Subir perfil",
  profileConfirmTitle: "Perfil cargado de sesión anterior",
  profileConfirmNote:
    "Tu perfil se usa solo para esta sesión y no se almacena en nuestros servidores.",
  profileSaveNote:
    "Guarda este archivo donde puedas encontrarlo antes de las próximas elecciones.",
  profileTooLarge: "Archivo demasiado grande. El tamaño máximo es 10KB.",
  profileWrongType: "Solo se aceptan archivos .txt.",

  // Phase 5: Alignment
  alignmentLabel: "Alineación:",
  alignmentStrong: "Alineación fuerte",
  alignmentMixed: "Alineación mixta",
  alignmentWeak: "Alineación débil",
  alignmentExpandBtn: "Ver desglose",
  alignmentCollapseBtn: "Colapsar",
  alignmentParseError:
    "No se pudieron generar puntuaciones de alineación — intenta pedirle a la IA que evalúe a los candidatos nuevamente.",
  alignmentOverallLabel: "Total:",
  alignmentIssueLabel: "Desglose por temas",
};

// ---- Vietnamese translations ------------------------------------------------

const vi: T = {
  lang: "vi",
  langToggleLabel: "English",

  heroTitle: "Công Cụ Nghiên Cứu Bầu Cử AI Miễn Phí",
  heroSubtitle:
    "Nhập mã bưu chính của bạn để nhận gợi ý nghiên cứu AI được cá nhân hóa. Dán vào bất kỳ chatbot AI miễn phí nào — Claude, ChatGPT, Gemini hoặc Grok — và nó sẽ hướng dẫn bạn qua từng cuộc đua và vấn đề trên lá phiếu cụ thể của bạn.",
  chatbotsLabel: "Mở chatbot",

  step1Label: "Bước 1: Nhập mã bưu chính của bạn",
  zipPlaceholder: "ví dụ: 73301",
  zipAriaLabel: "Mã bưu chính Hoa Kỳ 5 chữ số",
  submitButton: "Lấy Gợi Ý Của Tôi",
  submitButtonLoading: "Đang tra cứu…",

  errorEmpty: "Vui lòng nhập mã bưu chính",
  errorInvalidZip: "Vui lòng nhập mã bưu chính hợp lệ gồm 5 chữ số",

  notFoundTitle: "Chúng tôi chưa có dữ liệu cho mã bưu chính {zip}.",
  notFoundBody:
    "Chúng tôi đang làm việc để thêm tất cả mã bưu chính của Hoa Kỳ.",
  notFoundLink: "Tìm trang web bầu cử tiểu bang của bạn",

  stateSelectorPrompt:
    "Mã bưu chính này trải rộng nhiều tiểu bang. Bạn đang bỏ phiếu ở tiểu bang nào?",

  loadingLabel: "Đang tải dữ liệu bầu cử…",

  deadlinesPassedTitle: "Hạn chót đăng ký cho cuộc bầu cử này đã qua.",
  deadlinesPassedBody: "để xác nhận bạn vẫn còn đăng ký.",
  deadlinesPassedLink: "Kiểm tra trạng thái đăng ký của bạn",

  noElectionText: "Không tìm thấy cuộc bầu cử sắp tới cho {stateName}.",
  noElectionLink: "Kiểm tra trang web bầu cử tiểu bang",

  stateInfoAriaLabel: "Thông tin bầu cử {stateName}",
  stateInfoHeading: "{stateName} — Thông Tin Bầu Cử",
  nextElectionLabel: "Cuộc Bầu Cử Tiếp Theo",
  registrationDeadlinesLabel: "Hạn Chót Đăng Ký",
  registrationOnline: "Trực tuyến",
  registrationByMail: "Qua thư",
  registrationInPerson: "Trực tiếp",
  sameDayRegistration: "Có thể đăng ký trong ngày bầu cử",
  checkRegistrationLink: "Kiểm tra trạng thái đăng ký của bạn",
  earlyVotingLabel: "Bỏ Phiếu Sớm",
  earlyVotingNotAvailable: "Không có — chỉ bỏ phiếu vắng mặt",
  voterIdLabel: "Chứng Minh Cử Tri",
  voterIdNotRequired: "Không bắt buộc",
  voterIdRequired: "Bắt buộc. Giấy tờ được chấp nhận:",
  phonesAtPollsLabel: "Điện thoại tại phòng bỏ phiếu:",
  officialResourcesLabel: "Tài Nguyên Chính Thức",
  stateElectionWebsiteLink: "Trang web bầu cử tiểu bang",
  sampleBallotLink: "Tra cứu lá phiếu mẫu của bạn",
  countyElectionLink: "Văn phòng bầu cử quận",

  deadlineBadgePassed: "Đã qua",
  deadlineBadgeToday: "Hôm nay!",
  deadlineBadgeDaysLeft: "Còn {n} ngày",
  deadlineBadgeDayLeft: "Còn 1 ngày",

  electionTypePrimary: "sơ bộ",
  primaryTypeOpen: "mở",
  primaryTypeClosed: "đóng",
  primaryTypeSemiClosed: "nửa đóng",
  primaryTypeSemiOpen: "nửa mở",
  earlyVotingThrough: "đến",

  step2Label: "Bước 2: Sao chép gợi ý này",
  promptInstructions:
    'Sao chép gợi ý này và dán làm tin nhắn đầu tiên của bạn trong bất kỳ chatbot AI nào. Khối thứ hai (bắt đầu bằng "Xin chào! Tôi đang bỏ phiếu tại…") là thông tin ngữ cảnh đã điền sẵn — đã được bao gồm.',
  copyButton: "Sao Chép vào Bảng Nhớ Tạm",
  copiedButton: "Đã sao chép!",
  promptAriaLabel: "Gợi ý nghiên cứu bầu cử được tùy chỉnh",

  tipsAriaLabel: "Mẹo sử dụng gợi ý",
  tipsHeading: "Mẹo cho cuộc trò chuyện của bạn",
  tip1: 'Bạn có thể nói <strong>"Tôi không biết"</strong> hoặc <strong>"Tôi chưa chắc về quan điểm của mình"</strong> — AI sẽ giải thích thêm và giúp bạn tìm ra.',
  tip2: 'Bạn có thể yêu cầu AI <strong>nghiên cứu điều gì đó</strong> cho bạn (ví dụ: "Bạn có thể tra cứu lịch sử bỏ phiếu của ứng cử viên này không?").',
  tip3: 'Bạn có thể <strong>đặt câu hỏi</strong> bất cứ lúc nào ("Vị trí này thực sự làm gì?" hoặc "Tại sao điều này quan trọng?").',
  tip4: "Bạn không phải đang làm bài kiểm tra. Bạn đang có một cuộc trò chuyện. AI làm việc <em>cùng</em> bạn.",
  tipWarning:
    "<strong>Quan trọng:</strong> AI có thể mắc lỗi. Đây là điểm khởi đầu nghiên cứu. Luôn xác minh thông tin quan trọng với các nguồn chính thức.",

  footerShare:
    "Chia sẻ công cụ này — nó hoạt động cho bất kỳ tiểu bang nào của Hoa Kỳ và bất kỳ cuộc bầu cử nào.",
  footerAttribution:
    "Được tạo ra bởi con người sử dụng công cụ AI, vì mọi người đều xứng đáng biết họ đang thực sự bỏ phiếu cho điều gì.",

  ctxHello: "Xin chào! Tôi đang bỏ phiếu tại",
  ctxZip: "Mã bưu chính của tôi là",
  ctxKnow: "Đây là những gì tôi biết về cuộc bầu cử sắp tới của mình:",
  ctxElection: "Cuộc bầu cử:",
  ctxElectionType: "Loại bầu cử:",
  ctxRegistration: "Hạn chót đăng ký:",
  ctxOnline: "Trực tuyến trước ngày",
  ctxOnlineNA: "Đăng ký trực tuyến không có sẵn",
  ctxByMail: "qua thư trước ngày",
  ctxPostmark: "ngày đóng dấu bưu điện",
  ctxReceivedDate: "ngày nhận",
  ctxInPerson: "trực tiếp trước ngày",
  ctxSameDayReg: "Có thể đăng ký trong ngày bầu cử",
  ctxEarlyVoting: "Bỏ phiếu sớm:",
  ctxEarlyVotingNA: "Không có — chỉ bỏ phiếu vắng mặt",
  ctxEarlyThrough: "đến",
  ctxVoterId: "Chứng minh cử tri:",
  ctxVoterIdNotRequired: "Không bắt buộc",
  ctxVoterIdRequired: "Bắt buộc. Giấy tờ được chấp nhận:",
  ctxPhones: "Điện thoại tại phòng bỏ phiếu:",
  ctxSampleBallot: "Lá phiếu mẫu của tôi:",
  ctxCountyOffice: "Văn phòng bầu cử quận của tôi:",
  ctxHelp: "Hãy giúp tôi với lá phiếu của mình.",
  ctxNoElection: "Không tìm thấy cuộc bầu cử sắp tới",

  // Phase 3
  pollingLocationLabel: "Địa Điểm Bỏ Phiếu",
  pollingLocationNotFound:
    "Không tìm thấy địa điểm bỏ phiếu cho địa chỉ của bạn",
  pollingLocationHours: "Giờ:",
  pollingLocationNotes: "Ghi chú:",
  ballotContestsLabel: "Các Cuộc Đua Trên Lá Phiếu Của Bạn",
  ballotContestsNone: "Không tìm thấy thông tin cuộc đua",
  candidateLabel: "Ứng cử viên",
  candidatesLabel: "Các ứng cử viên",
  viewVotingRecord: "Xem lịch sử bỏ phiếu",
  closeVotingRecord: "Đóng",
  candidateResearching: "Đang nghiên cứu…",
  candidateSummaryLabel: "Tiểu sử",
  candidateVotingRecordLabel: "Lịch Sử Bỏ Phiếu",
  candidateDonorsLabel: "Nhà Tài Trợ Hàng Đầu",
  candidateEndorsementsLabel: "Sự Chứng Thực",
  candidateSourcesLabel: "Nguồn",
  candidateResearchError: "Không thể tải nghiên cứu. Thử lại.",
  dataAttributionLabel:
    "Dữ liệu bầu cử từ Google Civic Information và tìm kiếm web trực tiếp qua Anthropic.",
  dataLastUpdated: "Cập nhật {timestamp}",
  dataLoadingLabel: "Đang tải dữ liệu bầu cử…",
  dataPartialError:
    "Một số dữ liệu bầu cử tạm thời không có sẵn. Thông tin hiển thị là hiện tại.",
  dataFullError:
    "Chúng tôi đang gặp khó khăn khi tải dữ liệu bầu cử trực tiếp. Đây là những gì chúng tôi biết về bỏ phiếu tại {stateName}.",
  dataVerifyLink: "để biết thêm chi tiết đầy đủ",
  districtLabel: "Các Khu Vực Của Bạn",
  districtCounty: "Quận:",
  districtCongress: "Khu Vực Quốc Hội:",
  districtStateSenate: "Thượng Viện Tiểu Bang:",
  districtStateHouse: "Hạ Viện Tiểu Bang:",
  referendumLabel: "Trưng Cầu Dân Ý",
  voterIdVerifyNote: "Xác minh các yêu cầu hiện tại tại",

  ctxDistricts: "Các khu vực của tôi:",
  ctxPollingPlace: "Địa điểm bỏ phiếu của tôi:",
  ctxBallotContests: "Lá phiếu của tôi bao gồm:",

  // Phase 5: Chat
  chatCtaLabel: "Nghiên cứu lá phiếu của tôi với AI",
  chatCtaSubtitle: "Chat trực tiếp với Claude Sonnet — miễn phí",
  chatWindowTitle: "Nghiên cứu lá phiếu bằng AI",
  chatPrivacyNotice:
    "Cuộc trò chuyện của bạn chỉ lưu trên trình duyệt — chúng tôi không lưu trữ. Nếu đóng hoặc tải lại trang, cuộc trò chuyện sẽ mất. Hãy tải xuống phiếu bầu và hồ sơ cử tri trước khi rời trang.",
  chatInputPlaceholder: "Nhập tin nhắn…",
  chatSendLabel: "Gửi",
  chatBudgetWarning:
    "Chat AI miễn phí có thể bị hạn chế sau này trong tháng. Bạn luôn có thể sử dụng tùy chọn sao chép-dán.",
  chatBudgetCritical:
    "Chat AI miễn phí đang cạn dần trong tháng này. Hãy xem xét sử dụng tùy chọn sao chép-dán.",
  chatBudgetExhausted:
    "Chat AI miễn phí đã đạt giới hạn tháng. Bạn vẫn có thể nghiên cứu phiếu bầu — sao chép prompt bên dưới và dán vào bất kỳ chatbot AI nào.",
  chatSessionLimitMsg:
    "Bạn đã đạt giới hạn 60 tin nhắn mỗi phiên. Bạn có thể tiếp tục bằng cách sao chép prompt bên dưới.",
  chatRateLimitMsg:
    "Để giữ công cụ này miễn phí cho mọi người, chúng tôi giới hạn số phiên mỗi ngày. Bạn có thể tiếp tục bằng cách sao chép prompt bên dưới.",
  chatErrorMsg:
    "Đã xảy ra lỗi. Vui lòng thử lại hoặc sử dụng tùy chọn sao chép-dán.",

  // Phase 5: Ballot
  downloadBallotBtn: "Tải xuống phiếu bầu của tôi",
  ballotPreviewTitle: "Phiếu Bầu Của Bạn",
  ballotPasteLabel: "Dán kết quả AI (Đường dẫn B)",
  ballotPastePlaceholder: "Dán phần MY BALLOT từ cuộc trò chuyện AI của bạn…",
  ballotPasteBtn: "Xây dựng phiếu bầu từ dán",
  ballotParseError:
    "Chúng tôi không thể đọc định dạng đó. Hãy thử sao chép chỉ phần 'MY BALLOT' hoặc nhập thủ công.",
  ballotManualEntryLabel: "Nhập lựa chọn thủ công",
  ballotManualRaceLabel: "Tên cuộc đua / chức vụ",
  ballotManualPickLabel: "Lựa chọn của bạn",
  ballotManualAddRow: "Thêm cuộc đua khác",
  ballotManualBuildBtn: "Xây dựng phiếu bầu của tôi",
  ballotPrivacyNote:
    "Đây là tài liệu tham khảo cá nhân, không phải phiếu bầu chính thức. Hãy xác minh thông tin tại văn phòng bầu cử tiểu bang.",
  ballotSectionTitle: "Xây dựng phiếu bầu của tôi",
  ballotPathBTitle: "Dán từ chatbot bên ngoài",

  // Phase 5: Voter profile
  downloadProfileBtn: "Tải xuống hồ sơ cử tri của tôi",
  uploadProfileLabel: "Cử tri quay lại? Tải lên hồ sơ cử tri của bạn",
  uploadProfileBtn: "Tải lên hồ sơ",
  profileConfirmTitle: "Hồ sơ được tải từ phiên trước",
  profileConfirmNote:
    "Hồ sơ của bạn chỉ được sử dụng cho phiên này và không được lưu trữ trên máy chủ của chúng tôi.",
  profileSaveNote:
    "Lưu tệp này trước cuộc bầu cử tiếp theo để không phải bắt đầu lại từ đầu.",
  profileTooLarge: "Tệp quá lớn. Kích thước tối đa là 10KB.",
  profileWrongType: "Chỉ chấp nhận tệp .txt.",

  // Phase 5: Alignment
  alignmentLabel: "Tương thích:",
  alignmentStrong: "Tương thích cao",
  alignmentMixed: "Tương thích hỗn hợp",
  alignmentWeak: "Tương thích thấp",
  alignmentExpandBtn: "Xem chi tiết",
  alignmentCollapseBtn: "Thu gọn",
  alignmentParseError:
    "Không thể tạo điểm tương thích — hãy yêu cầu AI đánh giá lại các ứng viên.",
  alignmentOverallLabel: "Tổng thể:",
  alignmentIssueLabel: "Phân tích theo vấn đề",
};

// ---- Chinese (Simplified Mandarin) translations ----------------------------

const zh: T = {
  lang: "zh",
  langToggleLabel: "English",

  heroTitle: "免费AI选票研究工具",
  heroSubtitle:
    "输入您的邮政编码，获取个性化的AI研究提示。将其粘贴到任何免费AI聊天机器人中——Claude、ChatGPT、Gemini或Grok——它将引导您了解您选票上的每个候选人和议题。",
  chatbotsLabel: "打开聊天机器人",

  step1Label: "第一步：输入您的邮政编码",
  zipPlaceholder: "例如：73301",
  zipAriaLabel: "美国5位邮政编码",
  submitButton: "获取我的提示",
  submitButtonLoading: "查询中…",

  errorEmpty: "请输入邮政编码",
  errorInvalidZip: "请输入有效的5位邮政编码",

  notFoundTitle: "我们尚未有邮政编码 {zip} 的数据。",
  notFoundBody: "我们正在努力添加所有美国邮政编码。",
  notFoundLink: "查找您所在州的选举网站",

  stateSelectorPrompt: "此邮政编码跨越多个州。您在哪个州投票？",

  loadingLabel: "正在加载选举数据…",

  deadlinesPassedTitle: "此次选举的注册截止日期已过。",
  deadlinesPassedBody: "以确认您仍然已注册。",
  deadlinesPassedLink: "检查您的注册状态",

  noElectionText: "未找到 {stateName} 即将举行的选举。",
  noElectionLink: "查看州选举网站",

  stateInfoAriaLabel: "{stateName} 选举信息",
  stateInfoHeading: "{stateName} — 选举信息",
  nextElectionLabel: "下次选举",
  registrationDeadlinesLabel: "注册截止日期",
  registrationOnline: "在线",
  registrationByMail: "邮寄",
  registrationInPerson: "亲自",
  sameDayRegistration: "可在选举当日注册",
  checkRegistrationLink: "检查您的注册状态",
  earlyVotingLabel: "提前投票",
  earlyVotingNotAvailable: "不可用——仅限缺席投票",
  voterIdLabel: "选民身份证",
  voterIdNotRequired: "不需要",
  voterIdRequired: "需要。可接受的证件：",
  phonesAtPollsLabel: "投票站手机使用：",
  officialResourcesLabel: "官方资源",
  stateElectionWebsiteLink: "州选举网站",
  sampleBallotLink: "查找您的样本选票",
  countyElectionLink: "县选举办公室",

  deadlineBadgePassed: "已过",
  deadlineBadgeToday: "今天！",
  deadlineBadgeDaysLeft: "还剩 {n} 天",
  deadlineBadgeDayLeft: "还剩1天",

  electionTypePrimary: "初选",
  primaryTypeOpen: "开放",
  primaryTypeClosed: "封闭",
  primaryTypeSemiClosed: "半封闭",
  primaryTypeSemiOpen: "半开放",
  earlyVotingThrough: "至",

  step2Label: "第二步：复制此提示",
  promptInstructions:
    '复制此提示并将其粘贴为您在任何AI聊天机器人中的第一条消息。第二个块（以"你好！我正在……投票"开头）是您预填的上下文——已包含在内。',
  copyButton: "复制到剪贴板",
  copiedButton: "已复制！",
  promptAriaLabel: "定制化选票研究提示",

  tipsAriaLabel: "使用提示的建议",
  tipsHeading: "对话建议",
  tip1: '你可以说<strong>"我不知道"</strong>或<strong>"我不确定我的立场"</strong>——AI会进一步解释并帮助你弄清楚。',
  tip2: '你可以要求AI为你<strong>研究某些内容</strong>（例如："你能查一下这位候选人的投票记录吗？"）。',
  tip3: '你随时可以<strong>提问</strong>（"这个职位实际上是做什么的？"或"为什么这很重要？"）。',
  tip4: "你不是在参加考试。你在进行对话。AI与你<em>一起</em>工作。",
  tipWarning:
    "<strong>重要：</strong>AI可能会犯错。这只是研究的起点。请务必通过官方来源核实重要信息。",

  footerShare: "分享此工具——适用于美国任何州和任何选举。",
  footerAttribution:
    "由人类使用AI工具创建，因为每个人都值得知道他们真正在为什么投票。",

  ctxHello: "你好！我正在",
  ctxZip: "我的邮政编码是",
  ctxKnow: "以下是我对即将到来的选举的了解：",
  ctxElection: "选举：",
  ctxElectionType: "选举类型：",
  ctxRegistration: "注册截止日期：",
  ctxOnline: "在线截止",
  ctxOnlineNA: "不提供在线注册",
  ctxByMail: "邮寄截止",
  ctxPostmark: "邮戳日期",
  ctxReceivedDate: "收到日期",
  ctxInPerson: "亲自截止",
  ctxSameDayReg: "可在选举当日注册",
  ctxEarlyVoting: "提前投票：",
  ctxEarlyVotingNA: "不可用——仅限缺席投票",
  ctxEarlyThrough: "至",
  ctxVoterId: "选民身份证：",
  ctxVoterIdNotRequired: "不需要",
  ctxVoterIdRequired: "需要。可接受的证件：",
  ctxPhones: "投票站手机使用：",
  ctxSampleBallot: "我的样本选票：",
  ctxCountyOffice: "我的县选举办公室：",
  ctxHelp: "请帮助我了解我的选票。",
  ctxNoElection: "未找到即将举行的选举",

  // Phase 3
  pollingLocationLabel: "投票地点",
  pollingLocationNotFound: "未找到您地址的投票地点",
  pollingLocationHours: "时间：",
  pollingLocationNotes: "备注：",
  ballotContestsLabel: "您选票上的候选项目",
  ballotContestsNone: "未找到候选信息",
  candidateLabel: "候选人",
  candidatesLabel: "候选人",
  viewVotingRecord: "查看投票记录",
  closeVotingRecord: "关闭",
  candidateResearching: "研究中…",
  candidateSummaryLabel: "背景",
  candidateVotingRecordLabel: "投票记录",
  candidateDonorsLabel: "主要捐赠者",
  candidateEndorsementsLabel: "背书",
  candidateSourcesLabel: "来源",
  candidateResearchError: "无法加载研究。请重试。",
  dataAttributionLabel:
    "选举数据来自Google Civic Information和通过Anthropic的实时网络搜索。",
  dataLastUpdated: "更新于 {timestamp}",
  dataLoadingLabel: "正在加载选举数据…",
  dataPartialError: "部分选举数据暂时不可用。显示的信息是最新的。",
  dataFullError:
    "我们在加载实时选举数据时遇到问题。以下是我们对在 {stateName} 投票的了解。",
  dataVerifyLink: "获取完整详情",
  districtLabel: "您的选区",
  districtCounty: "县：",
  districtCongress: "国会选区：",
  districtStateSenate: "州参议院：",
  districtStateHouse: "州众议院：",
  referendumLabel: "公民投票",
  voterIdVerifyNote: "在以下网址核实当前要求",

  ctxDistricts: "我的选区：",
  ctxPollingPlace: "我的投票地点：",
  ctxBallotContests: "我的选票包括：",

  // Phase 5: Chat
  chatCtaLabel: "用AI研究我的选票",
  chatCtaSubtitle: "与Claude Sonnet在线聊天 — 免费",
  chatWindowTitle: "AI选票研究",
  chatPrivacyNotice:
    "您的对话仅保存在浏览器中——我们不存储它。如果您关闭或刷新页面，对话将丢失。离开前请下载您的选票和选民档案。",
  chatInputPlaceholder: "输入您的消息…",
  chatSendLabel: "发送",
  chatBudgetWarning:
    "本月晚些时候免费AI聊天可能会受限。您随时可以使用复制粘贴选项。",
  chatBudgetCritical:
    "本月免费AI聊天余额不足。建议使用复制粘贴选项以获得不间断体验。",
  chatBudgetExhausted:
    "我们的免费AI聊天已达到本月限额。您仍然可以研究选票——复制下方的提示并粘贴到任何免费AI聊天机器人中。",
  chatSessionLimitMsg:
    "您已达到每次会话60条消息的限制。您可以通过复制下方提示继续。",
  chatRateLimitMsg:
    "为了让所有人都能免费使用此工具，我们限制每天的会话次数。您可以通过复制下方提示继续研究。",
  chatErrorMsg: "出现问题。请重试或使用复制粘贴选项。",

  // Phase 5: Ballot
  downloadBallotBtn: "下载我的选票",
  ballotPreviewTitle: "您的选票",
  ballotPasteLabel: "粘贴AI选票输出（路径B）",
  ballotPastePlaceholder: "从AI对话中粘贴MY BALLOT部分…",
  ballotPasteBtn: "从粘贴构建选票",
  ballotParseError:
    "我们无法读取该格式。请尝试仅复制AI对话中的'MY BALLOT'部分，或手动输入您的选择。",
  ballotManualEntryLabel: "手动输入选择",
  ballotManualRaceLabel: "竞选/职位名称",
  ballotManualPickLabel: "您的选择",
  ballotManualAddRow: "添加另一个竞选",
  ballotManualBuildBtn: "构建我的选票",
  ballotPrivacyNote:
    "这是您的个人参考，不是官方选票。请在州选举办公室核实所有信息。",
  ballotSectionTitle: "构建我的选票",
  ballotPathBTitle: "从外部聊天机器人粘贴",

  // Phase 5: Voter profile
  downloadProfileBtn: "下载我的选民档案",
  uploadProfileLabel: "回访选民？上传您的选民档案",
  uploadProfileBtn: "上传档案",
  profileConfirmTitle: "已从上次会话加载档案",
  profileConfirmNote: "您的档案仅用于本次会话，不会存储在我们的服务器上。",
  profileSaveNote:
    "请将此文件保存在下次选举前能找到的地方，这样您就不必从头开始。",
  profileTooLarge: "文件太大。最大大小为10KB。",
  profileWrongType: "只接受.txt文件。",

  // Phase 5: Alignment
  alignmentLabel: "契合度：",
  alignmentStrong: "高度契合",
  alignmentMixed: "中等契合",
  alignmentWeak: "低度契合",
  alignmentExpandBtn: "展开详情",
  alignmentCollapseBtn: "收起",
  alignmentParseError: "无法为此回复生成契合度分数——请尝试让AI重新评分候选人。",
  alignmentOverallLabel: "总体：",
  alignmentIssueLabel: "按议题分析",
};

// ---- Arabic translations ---------------------------------------------------

const ar: T = {
  lang: "ar",
  langToggleLabel: "English",

  heroTitle: "أداة بحث الاقتراع المجانية بالذكاء الاصطناعي",
  heroSubtitle:
    "أدخل الرمز البريدي للحصول على موجّه بحث مخصص بالذكاء الاصطناعي. الصقه في أي روبوت دردشة ذكاء اصطناعي مجاني — Claude أو ChatGPT أو Gemini أو Grok — وسيرشدك خلال كل سباق وقضية في ورقة اقتراعك.",
  chatbotsLabel: "افتح روبوت دردشة",

  step1Label: "الخطوة الأولى: أدخل رمزك البريدي",
  zipPlaceholder: "مثال: 73301",
  zipAriaLabel: "الرمز البريدي الأمريكي المكون من 5 أرقام",
  submitButton: "احصل على موجّهي",
  submitButtonLoading: "جارٍ البحث…",

  errorEmpty: "يرجى إدخال الرمز البريدي",
  errorInvalidZip: "يرجى إدخال رمز بريدي صالح مكون من 5 أرقام",

  notFoundTitle: "ليس لدينا بيانات للرمز البريدي {zip} حتى الآن.",
  notFoundBody: "نعمل على إضافة جميع الرموز البريدية الأمريكية.",
  notFoundLink: "ابحث عن موقع انتخابات ولايتك",

  stateSelectorPrompt:
    "يمتد هذا الرمز البريدي عبر ولايات متعددة. في أي ولاية ستصوت؟",

  loadingLabel: "جارٍ تحميل بيانات الانتخابات…",

  deadlinesPassedTitle: "انتهت مواعيد تسجيل هذه الانتخابات.",
  deadlinesPassedBody: "للتأكد من أنك لا تزال مسجلاً.",
  deadlinesPassedLink: "تحقق من حالة تسجيلك",

  noElectionText: "لم يتم العثور على انتخابات قادمة لـ {stateName}.",
  noElectionLink: "تحقق من موقع انتخابات الولاية",

  stateInfoAriaLabel: "معلومات انتخابات {stateName}",
  stateInfoHeading: "{stateName} — معلومات الانتخابات",
  nextElectionLabel: "الانتخابات القادمة",
  registrationDeadlinesLabel: "مواعيد التسجيل النهائية",
  registrationOnline: "إلكتروني",
  registrationByMail: "بالبريد",
  registrationInPerson: "شخصياً",
  sameDayRegistration: "التسجيل في يوم الانتخابات متاح",
  checkRegistrationLink: "تحقق من حالة تسجيلك",
  earlyVotingLabel: "التصويت المبكر",
  earlyVotingNotAvailable: "غير متاح — التصويت الغيابي فقط",
  voterIdLabel: "هوية الناخب",
  voterIdNotRequired: "غير مطلوبة",
  voterIdRequired: "مطلوبة. الوثائق المقبولة:",
  phonesAtPollsLabel: "الهواتف في مراكز الاقتراع:",
  officialResourcesLabel: "الموارد الرسمية",
  stateElectionWebsiteLink: "موقع انتخابات الولاية",
  sampleBallotLink: "ابحث عن نموذج ورقة اقتراعك",
  countyElectionLink: "مكتب انتخابات المقاطعة",

  deadlineBadgePassed: "انتهى",
  deadlineBadgeToday: "اليوم!",
  deadlineBadgeDaysLeft: "باقي {n} أيام",
  deadlineBadgeDayLeft: "باقي يوم واحد",

  electionTypePrimary: "تمهيدية",
  primaryTypeOpen: "مفتوحة",
  primaryTypeClosed: "مغلقة",
  primaryTypeSemiClosed: "شبه مغلقة",
  primaryTypeSemiOpen: "شبه مفتوحة",
  earlyVotingThrough: "حتى",

  step2Label: "الخطوة الثانية: انسخ هذا الموجّه",
  promptInstructions:
    'انسخ هذا الموجّه والصقه كرسالتك الأولى في أي روبوت دردشة. الكتلة الثانية (التي تبدأ بـ "مرحباً! سأصوت في…") هي سياقك المعبأ مسبقاً — وهو مضمّن بالفعل.',
  copyButton: "نسخ إلى الحافظة",
  copiedButton: "تم النسخ!",
  promptAriaLabel: "موجّه بحث الاقتراع المخصص",

  tipsAriaLabel: "نصائح لاستخدام الموجّه",
  tipsHeading: "نصائح لمحادثتك",
  tip1: 'يمكنك قول <strong>"لا أعرف"</strong> أو <strong>"لست متأكداً من موقفي"</strong> — سيشرح الذكاء الاصطناعي أكثر ويساعدك في معرفة ذلك.',
  tip2: 'يمكنك طلب منه <strong>البحث عن شيء ما</strong> لك (مثل: "هل يمكنك البحث عن سجل التصويت لهذا المرشح؟").',
  tip3: 'يمكنك <strong>طرح الأسئلة</strong> في أي وقت ("ماذا يفعل هذا المنصب فعلاً؟" أو "لماذا هذا مهم؟").',
  tip4: "أنت لست في اختبار. أنت في محادثة. الذكاء الاصطناعي يعمل <em>معك</em>.",
  tipWarning:
    "<strong>مهم:</strong> قد يرتكب الذكاء الاصطناعي أخطاء. هذه نقطة بداية للبحث. تحقق دائماً من المعلومات المهمة مع المصادر الرسمية.",

  footerShare: "شارك هذه الأداة — تعمل لأي ولاية أمريكية وأي انتخابات.",
  footerAttribution:
    "أُنشئ بواسطة إنسان باستخدام أدوات الذكاء الاصطناعي، لأن كل شخص يستحق أن يعرف ما يصوت له حقاً.",

  ctxHello: "مرحباً! سأصوت في",
  ctxZip: "رمزي البريدي هو",
  ctxKnow: "إليك ما أعرفه عن انتخاباتي القادمة:",
  ctxElection: "الانتخابات:",
  ctxElectionType: "نوع الانتخابات:",
  ctxRegistration: "مواعيد التسجيل النهائية:",
  ctxOnline: "إلكترونياً بحلول",
  ctxOnlineNA: "التسجيل الإلكتروني غير متاح",
  ctxByMail: "بالبريد بحلول",
  ctxPostmark: "تاريخ الطابع البريدي",
  ctxReceivedDate: "تاريخ الاستلام",
  ctxInPerson: "شخصياً بحلول",
  ctxSameDayReg: "التسجيل في يوم الانتخابات متاح",
  ctxEarlyVoting: "التصويت المبكر:",
  ctxEarlyVotingNA: "غير متاح — التصويت الغيابي فقط",
  ctxEarlyThrough: "حتى",
  ctxVoterId: "هوية الناخب:",
  ctxVoterIdNotRequired: "غير مطلوبة",
  ctxVoterIdRequired: "مطلوبة. الوثائق المقبولة:",
  ctxPhones: "الهواتف في مراكز الاقتراع:",
  ctxSampleBallot: "نموذج ورقة اقتراعي:",
  ctxCountyOffice: "مكتب انتخابات مقاطعتي:",
  ctxHelp: "ساعدني في ورقة اقتراعي.",
  ctxNoElection: "لم يتم العثور على انتخابات قادمة",

  // Phase 3
  pollingLocationLabel: "مركز الاقتراع",
  pollingLocationNotFound: "لم يتم العثور على مركز اقتراع لعنوانك",
  pollingLocationHours: "الساعات:",
  pollingLocationNotes: "ملاحظات:",
  ballotContestsLabel: "مسابقات ورقة اقتراعك",
  ballotContestsNone: "لم يتم العثور على معلومات المسابقات",
  candidateLabel: "مرشح",
  candidatesLabel: "المرشحون",
  viewVotingRecord: "عرض سجل التصويت",
  closeVotingRecord: "إغلاق",
  candidateResearching: "جارٍ البحث…",
  candidateSummaryLabel: "الخلفية",
  candidateVotingRecordLabel: "سجل التصويت",
  candidateDonorsLabel: "أبرز المانحين",
  candidateEndorsementsLabel: "التأييدات",
  candidateSourcesLabel: "المصادر",
  candidateResearchError: "تعذر تحميل البحث. حاول مرة أخرى.",
  dataAttributionLabel:
    "بيانات الانتخابات من Google Civic Information والبحث المباشر عبر Anthropic.",
  dataLastUpdated: "تم التحديث في {timestamp}",
  dataLoadingLabel: "جارٍ تحميل بيانات الانتخابات…",
  dataPartialError:
    "بعض بيانات الانتخابات غير متاحة مؤقتاً. المعلومات المعروضة محدّثة.",
  dataFullError:
    "نواجه صعوبة في تحميل بيانات الانتخابات المباشرة. إليك ما نعرفه عن التصويت في {stateName}.",
  dataVerifyLink: "للتفاصيل الكاملة",
  districtLabel: "مناطقك الانتخابية",
  districtCounty: "المقاطعة:",
  districtCongress: "الدائرة الكونغرسية:",
  districtStateSenate: "مجلس الشيوخ الولائي:",
  districtStateHouse: "مجلس النواب الولائي:",
  referendumLabel: "استفتاء",
  voterIdVerifyNote: "تحقق من المتطلبات الحالية في",

  ctxDistricts: "مناطقي الانتخابية:",
  ctxPollingPlace: "مركز اقتراعي:",
  ctxBallotContests: "تتضمن ورقة اقتراعي:",

  // Phase 5: Chat
  chatCtaLabel: "ابحث في ورقة اقتراعي بالذكاء الاصطناعي",
  chatCtaSubtitle: "تحدث مباشرة مع Claude Sonnet — مجاناً",
  chatWindowTitle: "بحث ورقة الاقتراع بالذكاء الاصطناعي",
  chatPrivacyNotice:
    "تبقى محادثتك في متصفحك فقط — لا نخزّنها. إذا أغلقت الصفحة أو أعدت تحميلها، ستُفقد المحادثة. نزّل ورقة اقتراعك وملف الناخب قبل المغادرة.",
  chatInputPlaceholder: "اكتب رسالتك…",
  chatSendLabel: "إرسال",
  chatBudgetWarning:
    "قد يكون الدردشة بالذكاء الاصطناعي محدودة لاحقاً هذا الشهر. يمكنك دائماً استخدام خيار النسخ واللصق.",
  chatBudgetCritical:
    "رصيد الدردشة بالذكاء الاصطناعي المجاني ينفد هذا الشهر. فكر في استخدام خيار النسخ واللصق.",
  chatBudgetExhausted:
    "وصلت دردشة الذكاء الاصطناعي المجانية إلى حدها الشهري. يمكنك الاستمرار في بحث ورقة اقتراعك — انسخ الموجّه أدناه والصقه في أي روبوت دردشة ذكاء اصطناعي مجاني.",
  chatSessionLimitMsg:
    "لقد وصلت إلى حد 60 رسالة للجلسة. يمكنك الاستمرار بنسخ الموجّه أدناه.",
  chatRateLimitMsg:
    "للحفاظ على هذه الأداة مجانية للجميع، نحدد عدد الجلسات يومياً. يمكنك مواصلة بحثك بنسخ الموجّه أدناه.",
  chatErrorMsg: "حدث خطأ. يرجى المحاولة مرة أخرى أو استخدام خيار النسخ واللصق.",

  // Phase 5: Ballot
  downloadBallotBtn: "تنزيل ورقة اقتراعي",
  ballotPreviewTitle: "ورقة اقتراعك",
  ballotPasteLabel: "الصق مخرجات الذكاء الاصطناعي (المسار ب)",
  ballotPastePlaceholder: "الصق قسم MY BALLOT من محادثتك مع الذكاء الاصطناعي…",
  ballotPasteBtn: "بناء ورقة الاقتراع من اللصق",
  ballotParseError:
    "لم نتمكن من قراءة ذلك التنسيق. جرّب نسخ قسم 'MY BALLOT' فقط، أو أدخل اختياراتك يدوياً.",
  ballotManualEntryLabel: "إدخال الاختيارات يدوياً",
  ballotManualRaceLabel: "اسم المنصب / السباق",
  ballotManualPickLabel: "اختيارك",
  ballotManualAddRow: "إضافة سباق آخر",
  ballotManualBuildBtn: "بناء ورقة اقتراعي",
  ballotPrivacyNote:
    "هذه مرجع شخصي وليست ورقة اقتراع رسمية. تحقق من جميع المعلومات في مكتب انتخابات ولايتك.",
  ballotSectionTitle: "بناء ورقة اقتراعي",
  ballotPathBTitle: "لصق من روبوت دردشة خارجي",

  // Phase 5: Voter profile
  downloadProfileBtn: "تنزيل ملف الناخب الخاص بي",
  uploadProfileLabel: "ناخب عائد؟ ارفع ملف الناخب الخاص بك",
  uploadProfileBtn: "رفع الملف",
  profileConfirmTitle: "تم تحميل الملف من الجلسة السابقة",
  profileConfirmNote: "يُستخدم ملفك لهذه الجلسة فقط ولا يُخزَّن على خوادمنا.",
  profileSaveNote:
    "احفظ هذا الملف قبل الانتخابات القادمة حتى لا تبدأ من الصفر.",
  profileTooLarge: "الملف كبير جداً. الحجم الأقصى هو 10KB.",
  profileWrongType: "يُقبل ملفات .txt فقط.",

  // Phase 5: Alignment
  alignmentLabel: "التوافق:",
  alignmentStrong: "توافق قوي",
  alignmentMixed: "توافق مختلط",
  alignmentWeak: "توافق ضعيف",
  alignmentExpandBtn: "عرض التفاصيل",
  alignmentCollapseBtn: "طي",
  alignmentParseError:
    "تعذر إنشاء درجات التوافق — جرّب طلب من الذكاء الاصطناعي تقييم المرشحين مرة أخرى.",
  alignmentOverallLabel: "الإجمالي:",
  alignmentIssueLabel: "تحليل حسب القضايا",
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

// ---- Vietnamese BALLOT_PROMPT -----------------------------------------------

export const BALLOT_PROMPT_VI = `Bạn là trợ lý nghiên cứu công dân không thiên vị, giúp cử tri Hoa Kỳ chuẩn bị cho cuộc bầu cử sắp tới. Công việc của bạn là giúp tôi hiểu những gì có trên lá phiếu của mình, hình thành quan điểm riêng và nghiên cứu các ứng cử viên dựa trên HÀNH ĐỘNG của họ — không phải lời hứa tranh cử.

## CÁCH ĐỊNH DẠNG MỖI PHẢN HỒI (tuân thủ nghiêm ngặt)

- **Giới hạn mỗi vấn đề hoặc cuộc đua ở tối đa 4-6 điểm.** Không có đoạn văn dài.
- **In đậm điểm chính** trong mỗi gạch đầu dòng để tôi có thể lướt qua.
- **Một vấn đề hoặc cuộc đua mỗi phản hồi** trừ khi bạn yêu cầu tôi tăng tốc.
- **Kết luận trước.** Bắt đầu với tóm tắt 1 câu, sau đó cho tôi các chi tiết hỗ trợ mà tôi có thể mở rộng.
- **Tối đa 3-4 câu mỗi gạch đầu dòng.** Nếu bạn viết nhiều hơn thế, là quá nhiều rồi.
- **Dùng ngôn ngữ đơn giản.** Nếu một học sinh 16 tuổi không hiểu được, hãy viết lại.
- **Không bao giờ tóm tắt những gì chúng ta đã đề cập** trừ khi tôi yêu cầu.
- Tôi luôn có thể nói "cho tôi biết thêm" nếu tôi muốn đi sâu hơn. Mặc định hãy ngắn gọn.

## BƯỚC 1: Lấy vị trí của tôi và bắt đầu ngay

Hỏi tôi mã bưu chính và tiểu bang trong một câu hỏi. Sau đó:

- **Tìm kiếm bối cảnh bầu cử của tiểu bang tôi.** Loại bầu cử gì, cách thức hoạt động (bầu cử sơ bộ mở/đóng), ngày bầu cử. **Kiểm tra ngày hôm nay so với ngày bầu cử** — cho tôi biết nếu các phòng bỏ phiếu mở hôm nay, đang diễn ra bỏ phiếu sớm, hay sắp tới. Tối đa 2-3 câu.
- **Nếu đây là bầu cử sơ bộ:** Không hỏi về phiếu của đảng nào. Chúng ta sẽ cùng tìm hiểu sau khi xem qua các vấn đề.
- **Cho tôi một liên kết** đến trang web bầu cử của quận tôi để xem lá phiếu mẫu. Đề nghị tôi tải lên — nhưng **đừng chờ đợi.** Bắt đầu ngay với các cuộc đua cấp tiểu bang.
- **Nếu tôi tải lên lá phiếu mẫu hoặc chia sẻ các khu vực bầu cử**, hãy dùng đó làm nguồn chính thức.
- **Lưu ý một lần** rằng các mã bưu chính có thể bao gồm nhiều khu vực bầu cử, rồi tiếp tục.
- **Xem trước cách thức hoạt động** trong 2-3 câu: chúng ta đi qua từng vấn đề cùng nhau, bạn có thể nói "không biết", tôi nghiên cứu trong nền và sẽ tạo khối bàn giao nếu chúng ta cần tiếp tục trong một cuộc trò chuyện mới.

Sau đó đi thẳng đến Bước 2.

## BƯỚC 2: Đi qua các vấn đề — từng vấn đề một

**Đừng hỏi "vấn đề nào quan trọng với bạn?"** Hãy đi qua chúng. Với mỗi vấn đề:

- **Điều gì đang xảy ra** — tình huống hiện tại, con số thực, ngôn ngữ đơn giản
- **Mỗi bên muốn gì** — ý nghĩa của "có" so với "không", hoặc các ứng cử viên đã thực sự làm gì
- **Phiếu của tôi làm gì** — luật ràng buộc hay tín hiệu không ràng buộc? Một câu.
- **Ai bị ảnh hưởng** — làm cho nó cụ thể và cá nhân ("Nếu bạn đang thuê nhà..." / "Nếu bạn có con trong trường công...")
- **Sau đó hỏi tôi nghĩ gì.** Không sao nếu tôi nói "không quan tâm" hay "không chắc" — điều đó cũng hữu ích.

Nếu tôi nói "không biết", đừng lặp lại — dạy tôi thêm, rồi hỏi lại.

Sau mỗi 2-3 vấn đề, cho tôi một **tóm tắt một câu** về những gì câu trả lời của tôi gợi ý cho đến nay.

## BƯỚC 3: Giúp tôi chọn bầu cử sơ bộ (nếu áp dụng)

Nếu đây là bầu cử sơ bộ có chọn phiếu đảng, hãy hỏi tôi 3-4 câu hỏi nhanh về **cách tôi suy nghĩ**, không phải về chính sách. Ví dụ:

- Thành tích đã đạt được vs. tiếng nói công chúng mạnh mẽ cho các giá trị của bạn?
- Người chiến thắng thực tế vào tháng 11 vs. bày tỏ những gì bạn tin?
- Ngăn chặn kẻ xấu vs. đề cử ứng cử viên mạnh nhất của phe bạn?
- Nguồn tài trợ từ đóng góp nhỏ vs. lịch sử bỏ phiếu cho thấy sự độc lập với các nhà tài trợ lớn?

Sau đó **đưa ra một khuyến nghị rõ ràng** trong 2-3 câu, cho tôi lập luận phản bác mạnh nhất cho bầu cử sơ bộ kia, và để tôi quyết định.

Nếu đây là cuộc bầu cử phổ thông, hãy bỏ qua bước này.

## BƯỚC 4: Nghiên cứu ứng cử viên — từng cuộc đua một

**Không có tiểu sử ứng cử viên.** Với mỗi cuộc đua:

- **Vị trí này thực sự làm gì?** Đừng cho rằng tôi biết.
- **Nghiên cứu trong nền.** Tìm kiếm lịch sử bỏ phiếu, dữ liệu nhà tài trợ, chứng thực và tin tức. Xem xét hành động, nguồn tài trợ và liệu lời nói có khớp với việc làm không.
- **Trình bày từng ứng cử viên trong 2-3 câu.** Tập trung vào: những gì họ đã đạt được, mối lo ngại về dấu vết tiền bạc và cách họ phù hợp với những gì tôi quan tâm.
- **Nêu các dấu hiệu đáng lo ngại và chứng thực quan trọng.**
- **Hỏi tôi nghĩ gì hoặc nếu tôi muốn khuyến nghị.** Đừng tự động điền vào lá phiếu của tôi.

## BƯỚC 5: Các đề xuất

Với mỗi đề xuất: tóm tắt một câu bằng ngôn ngữ đơn giản, ý nghĩa thực sự của "có" và "không", liệu nó có liên quan đến những gì tôi quan tâm, và xu hướng có thể của tôi.

## BƯỚC 6: Cho tôi tóm tắt

Tóm tắt sạch sẽ, có thể in ra để tôi mang đến phòng bỏ phiếu.

## BƯỚC 7: Tạo kết quả của tôi

**Kết quả A:** Một trang in lá phiếu chỉ với các lựa chọn của tôi.
**Kết quả B:** Hồ sơ cử tri của tôi cho các cuộc bầu cử trong tương lai.

## Quy tắc quan trọng

- **Cộng tác, đừng tự động điền.** Chỉ khuyến nghị khi được yêu cầu.
- **Hành động > lời nói.** Ưu tiên những gì ứng cử viên đã LÀM.
- **Dạy trước khi hỏi.** Không bao giờ hỏi ý kiến tôi về điều gì đó tôi chưa hiểu.
- **AI mắc lỗi.** Liên kết cho tôi đến các nguồn để tôi có thể xác minh.

Hãy bắt đầu với Bước 1.`;

// ---- Chinese BALLOT_PROMPT -------------------------------------------------

export const BALLOT_PROMPT_ZH = `你是一位无党派公民研究助手，帮助美国选民为即将到来的选举做准备。你的工作是帮助我了解选票上的内容，形成自己的观点，并根据候选人的行动——而非竞选承诺——来研究他们。

## 每次回复的格式要求（严格遵守）

- **每个议题或选举限制在最多4-6个要点。** 不要长篇大论。
- **加粗每个要点的关键结论**，让我可以快速浏览。
- **每次回复只讨论一个议题或选举**，除非我要求加快进度。
- **先说结论。** 以1句话摘要开始，然后给我可以展开的支持细节。
- **每个要点最多3-4句话。** 如果你写了更多，就是太多了。
- **使用简单语言。** 如果16岁的学生看不懂，就重写。
- **不要重复我们已经讨论过的内容**，除非我要求。
- 如果我想深入了解，我会说"告诉我更多"。默认保持简洁。

## 第一步：获取我的位置并立即开始

用一个问题问我的邮政编码和州。然后：

- **搜索我所在州的选举背景。** 选举类型、运作方式（开放/封闭式初选）、选举日期。**核对今天日期与选举日期**——告诉我今天是否在投票、是否在提前投票期，还是即将到来。最多2-3句话。
- **如果是初选：** 不要问哪个党的选票。我们在讨论完议题后再一起决定。
- **给我一个链接**，链接到我所在县的选举网站以获取样本选票。建议我上传它——但**不要等待。** 立即开始讨论全州范围的选举。
- **如果我上传了样本选票或分享了选区**，将其作为权威来源。
- **提醒一次**邮政编码可能覆盖多个选区，然后继续。
- **用2-3句话预览这是如何工作的：** 我们一起逐个讨论议题，你可以说"我不知道"，我在后台研究，如果需要在新对话中继续，我会创建一个交接块。

然后直接进入第二步。

## 第二步：逐一讨论议题

**不要问"哪些议题对你重要？"** 直接逐一讨论。对于每个议题：

- **正在发生什么**——当前情况、真实数字、简单语言
- **各方想要什么**——"赞成"和"反对"意味着什么，或候选人实际做了什么
- **我的投票有什么用**——具有约束力的法律还是无约束力的信号？一句话。
- **谁会受影响**——具体化、个人化（"如果你在租房……"/"如果你有孩子在公立学校……"）
- **然后问我的想法。** 说"不在乎"或"不确定"也没关系——这也有价值。

如果我说"不知道"，不要重复——多教我一些，然后再问。

每讨论2-3个议题后，给我一个**一句话总结**，说明我的回答到目前为止意味着什么。

## 第三步：帮我选择初选（如适用）

如果是需要选择党派选票的初选，问我3-4个关于**我如何思考**而非政策的快速问题。示例：

- 有成绩记录的人 vs. 为你的价值观发出强烈公共声音的人？
- 11月份能赢的现实主义者 vs. 表达你真正相信的人？
- 排除坏人 vs. 提名你这边最强的候选人？
- 小额捐款人基础 vs. 显示独立于大捐款人的投票记录？

然后用2-3句话**给出明确建议**，告诉我另一个初选的最强反驳论点，让我自己决定。

如果是普选，跳过这一步。

## 第四步：逐个选举研究候选人

**不要介绍候选人简历。** 对于每个选举：

- **这个职位实际上做什么？** 不要假设我知道。
- **在后台研究。** 搜索投票记录、捐款数据、背书和新闻。看行动、资金来源，以及话语是否与行动一致。
- **用2-3句话介绍每位候选人。** 重点关注：他们取得了什么成就、对资金路径的担忧，以及他们如何与我关心的内容契合。
- **标记主要红旗和重要背书。**
- **问我的想法或是否需要建议。** 不要自动填写我的选票。

## 第五步：提案

对于每个提案：一句话简单语言摘要，"赞成"和"反对"的真实含义，是否与我关心的内容相关，以及我可能的倾向。

## 第六步：给我总结

简洁、可打印的总结，我可以带去投票站。

## 第七步：生成我的输出

**输出A：** 只有我的选择的一页选票打印件。
**输出B：** 我的选民档案，用于未来的选举。

## 重要规则

- **合作，不要自动填写。** 只有在被要求时才建议。
- **行动 > 话语。** 优先考虑候选人已经做过的事。
- **先教后问。** 永远不要问我对我还不了解的事情的看法。
- **AI会犯错。** 给我链接到来源，以便我可以核实。

让我们从第一步开始。`;

// ---- Arabic BALLOT_PROMPT --------------------------------------------------

export const BALLOT_PROMPT_AR = `أنت مساعد بحث مدني غير حزبي يساعد ناخباً أمريكياً على الاستعداد لانتخابات قادمة. مهمتك مساعدتي على فهم ما هو موجود في ورقة اقتراعي، وتكوين آرائي الخاصة، والبحث عن المرشحين بناءً على أفعالهم — لا وعودهم الانتخابية.

## كيفية تنسيق كل رد (اتبع هذا بدقة)

- **حدّ كل قضية أو سباق بـ 4-6 نقاط كحد أقصى.** لا فقرات طويلة.
- **اجعل النقطة الرئيسية** في كل نقطة بارزة حتى أتمكن من الاطلاع عليها سريعاً.
- **قضية أو سباق واحد لكل رد** إلا إذا طلبت منك التسريع.
- **الخلاصة أولاً.** ابدأ بملخص من جملة واحدة، ثم أعطني تفاصيل داعمة يمكنني التعمق فيها.
- **3-4 جمل كحد أقصى لكل نقطة.** إذا كتبت أكثر من ذلك، فهذا كثير.
- **استخدم لغة بسيطة.** إذا كان طالب في السادسة عشرة لن يفهم هذا، فأعد كتابته.
- **لا تلخص ما ناقشناه من قبل** إلا إذا طلبت ذلك.
- دائماً يمكنني قول "أخبرني المزيد" إذا أردت التعمق. كن موجزاً بشكل افتراضي.

## الخطوة الأولى: احصل على موقعي وابدأ فوراً

اسألني عن رمزي البريدي والولاية في سؤال واحد. ثم:

- **ابحث عن سياق انتخابات ولايتي.** نوع الانتخابات، كيفية عملها (انتخابات تمهيدية مفتوحة/مغلقة)، تاريخ الانتخابات. **تحقق من تاريخ اليوم مقارنة بتاريخ الانتخابات** — أخبرني إذا كانت مراكز الاقتراع مفتوحة اليوم، أو إذا كان التصويت المبكر جارياً، أو إذا كانت قادمة. 2-3 جمل كحد أقصى.
- **إذا كانت انتخابات تمهيدية:** لا تسألني عن ورقة اقتراع الحزب. سنحل ذلك معاً بعد مناقشة القضايا.
- **أعطني رابطاً** لموقع انتخابات مقاطعتي لنموذج ورقة الاقتراع. اقترح عليّ تحميلها — لكن **لا تنتظر.** ابدأ فوراً بالسباقات على مستوى الولاية.
- **إذا حمّلت نموذج ورقة اقتراع أو شاركت مناطقي الانتخابية**، استخدمها كمصدر رسمي.
- **أشر مرة واحدة** إلى أن الرموز البريدية يمكن أن تمتد عبر مناطق متعددة، ثم تابع.
- **قدّم معاينة لكيفية عمل هذا** في 2-3 جمل: نمر بالقضايا معاً، يمكنك قول "لا أعرف"، أبحث في الخلفية وسأنشئ كتلة تسليم إذا احتجنا للمتابعة في محادثة جديدة.

ثم انتقل مباشرة إلى الخطوة الثانية.

## الخطوة الثانية: مرّ على القضايا — قضية واحدة في كل مرة

**لا تسأل "ما القضايا التي تهمك؟"** مرّ عليها. لكل قضية:

- **ما الذي يحدث** — الوضع الحالي، الأرقام الحقيقية، لغة بسيطة
- **ماذا يريد كل طرف** — ما معنى "نعم" مقابل "لا"، أو ما الذي فعله المرشحون فعلاً
- **ماذا يفعل صوتي** — قانون ملزم أم إشارة غير ملزمة؟ جملة واحدة.
- **من يتأثر** — اجعله ملموساً وشخصياً ("إذا كنت مستأجراً..." / "إذا كان لديك أطفال في المدارس الحكومية...")
- **ثم اسألني ما أعتقده.** لا بأس إذا قلت "لا يهمني" أو "لست متأكداً" — هذا مفيد أيضاً.

إذا قلت "لا أعرف"، لا تكرر — علّمني المزيد، ثم اسأل مجدداً.

بعد كل 2-3 قضايا، أعطني **ملخصاً من جملة واحدة** عما تشير إليه إجاباتي حتى الآن.

## الخطوة الثالثة: ساعدني في اختيار الانتخابات التمهيدية (إن انطبق)

إذا كانت انتخابات تمهيدية أختار فيها ورقة اقتراع حزبية، اسألني 3-4 أسئلة سريعة عن **طريقة تفكيري**، لا عن السياسات. أمثلة:

- سجل الإنجازات مقابل صوت عام قوي لقيمك؟
- فائز واقعي في نوفمبر مقابل التعبير عما تؤمن به؟
- إبعاد شخص سيئ مقابل ترشيح أقوى مرشح من جانبك؟
- قاعدة المانحين الصغار مقابل سجل التصويت الذي يظهر الاستقلالية عن المانحين الكبار؟

ثم **قدّم توصية واضحة** في 2-3 جمل، أعطني أقوى حجة مضادة للانتخابات التمهيدية الأخرى، ودعني أقرر.

إذا كانت انتخابات عامة، تخطّ هذه الخطوة.

## الخطوة الرابعة: ابحث عن المرشحين — سباقاً سباقاً

**لا تراجم للمرشحين.** لكل سباق:

- **ماذا يفعل هذا المنصب فعلاً؟** لا تفترض أنني أعرف.
- **ابحث في الخلفية.** ابحث عن سجلات التصويت، بيانات المانحين، التأييدات والأخبار. انظر إلى الأفعال والتمويل وما إذا كانت الأقوال تتطابق مع الأفعال.
- **قدّم كل مرشح في 2-3 جمل.** ركّز على: ما أنجزوه، مخاوف مسار الأموال، وكيف يتوافقون مع ما يهمني.
- **أشر إلى العلامات الحمراء والتأييدات الرئيسية.**
- **اسألني ما أعتقده أو إذا أردت توصية.** لا تملأ ورقة اقتراعي تلقائياً.

## الخطوة الخامسة: المقترحات

لكل مقترح: ملخص بسيط من جملة واحدة، ما يعنيه "نعم" و"لا" حقاً، ما إذا كان يرتبط بما يهمني، وميلي المحتمل.

## الخطوة السادسة: أعطني ملخصي

ملخص نظيف وقابل للطباعة يمكنني أخذه إلى مركز الاقتراع.

## الخطوة السابعة: أنشئ مخرجاتي

**المخرج أ:** صفحة واحدة من ورقة الاقتراع القابلة للطباعة مع خياراتي فقط.
**المخرج ب:** ملف ناخبي للانتخابات المستقبلية.

## قواعد مهمة

- **تعاون، لا تملأ تلقائياً.** أوصِ فقط عند الطلب.
- **الأفعال > الكلام.** أعطِ الأولوية لما فعله المرشحون فعلاً.
- **علّم قبل أن تسأل.** لا تسألني رأيي في شيء لا أفهمه بعد.
- **الذكاء الاصطناعي يرتكب أخطاء.** أرسل لي روابط للمصادر حتى أتمكن من التحقق.

لنبدأ بالخطوة الأولى.`;

// ---- Exports ---------------------------------------------------------------

export const translations: Record<Language, T> = { en, es, vi, zh, ar };

export function getTranslations(lang: Language): T {
  return translations[lang];
}

/** Map from Language code to its ballot prompt (undefined = use English default) */
export function getBallotPrompt(lang: Language): string | undefined {
  switch (lang) {
    case "es":
      return BALLOT_PROMPT_ES;
    case "vi":
      return BALLOT_PROMPT_VI;
    case "zh":
      return BALLOT_PROMPT_ZH;
    case "ar":
      return BALLOT_PROMPT_AR;
    default:
      return undefined;
  }
}
