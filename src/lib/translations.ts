/**
 * Translation store for i18n support.
 * Adding a new language requires only:
 *   1. Adding to the Language union type
 *   2. Adding a new record implementing the Translations interface
 */

export type Language = "en" | "es";

export interface Translations {
  // Skip to content
  skipToContent: string;

  // Header
  appName: string;

  // Hero section
  heroHeadline: string;
  heroHeadlineHighlight: string;
  heroSubtitle: string;
  heroSubtitleNote: string;
  heroChatbotsLabel: string;

  // Chatbot descriptions
  chatbotDescClaude: string;
  chatbotDescChatGPT: string;
  chatbotDescGemini: string;
  chatbotDescGrok: string;

  // ZipForm
  zipInputLabel: string;
  zipInputPlaceholder: string;
  zipSubmitButton: string;
  zipSubmitLoading: string;
  zipErrorEmpty: string;
  zipErrorInvalid: string;

  // Not found message
  notFoundTitle: string;
  notFoundBody: string;
  notFoundLink: string;

  // State info
  stateInfoAriaLabel: string;
  noElectionFound: string;
  noElectionMessage: string;
  noElectionLink: string;
  deadlinePassedMessage: string;
  deadlinePassedLink: string;
  registrationDeadlinesHeading: string;
  onlineRegistrationLabel: string;
  onlineRegistrationNotAvailable: string;
  byMailLabel: string;
  inPersonLabel: string;
  sameDayAvailable: string;
  sameDayDetail: string;
  postmarkNote: string;
  receivedNote: string;
  earlyVotingHeading: string;
  earlyVotingNotAvailable: string;
  earlyVotingFallback: string;
  votingRulesHeading: string;
  photoIdLabel: string;
  photoIdRequired: string;
  photoIdNotRequired: string;
  phonesAtPollsLabel: string;
  officialResourcesHeading: string;
  stateElectionWebsiteLink: string;
  sampleBallotLink: string;
  countyElectionLink: string;

  // Deadline status
  deadlineStatusOpen: string;
  deadlineStatusClosingSoon: string;
  deadlineStatusUrgent: string;
  deadlineStatusPassed: string;
  deadlineNotAvailable: string;
  deadlineLabelToday: string;
  deadlineLabel1Day: string;

  // State selector
  stateSelectorPrompt: string;
  stateSelectorButton: string;

  // Prompt output
  promptOutputSectionLabel: string;
  promptOutputHeading: string;
  promptOutputInstructions: string;
  promptOutputHowTo: string;
  copyButton: string;
  copyButtonCopied: string;
  copyConfirmation: string;
  copyFallback: string;
  promptTextAreaLabel: string;

  // Tips section
  tipsSectionHeading: string;
  tip1Heading: string;
  tip1Body: string;
  tip2Heading: string;
  tip2Body: string;
  tip3Heading: string;
  tip3Body: string;
  tip4Heading: string;
  tip4Body: string;
  tip5Heading: string;
  tip5Body: string;

  // Footer
  footerCredit: string;

  // Language toggle
  languageToggleLabel: string;
  languageToggleAnnouncement: string;

  // Phase 3: Live data
  pollingLocationHeading: string;
  ballotContestsHeading: string;
  viewVotingRecord: string;
  candidateLoading: string;
  electionDataLoading: string;
  apiPartialError: string;
  apiFullError: string;
  dataAttribution: string;
  dataUpdated: string;
  voterIdVerifyNote: string;
}

export const en: Translations = {
  // Skip to content
  skipToContent: "Skip to main content",

  // Header
  appName: "Voter Choice",

  // Hero section
  heroHeadline: "Know what you're voting for.",
  heroHeadlineHighlight: "In minutes.",
  heroSubtitle:
    "Enter your zip code to get a personalized AI ballot research prompt. Paste it into any free AI chatbot and get a nonpartisan walkthrough of every race and issue on your specific ballot.",
  heroSubtitleNote:
    "No account needed. No data stored. Works with any AI chatbot.",
  heroChatbotsLabel: "Supported AI chatbots",

  // Chatbot descriptions
  chatbotDescClaude: "by Anthropic",
  chatbotDescChatGPT: "by OpenAI",
  chatbotDescGemini: "by Google",
  chatbotDescGrok: "by xAI",

  // ZipForm
  zipInputLabel: "Your zip code",
  zipInputPlaceholder: "e.g. 73301",
  zipSubmitButton: "Look up my ballot",
  zipSubmitLoading: "Looking up...",
  zipErrorEmpty: "Please enter a zip code",
  zipErrorInvalid: "Please enter a valid 5-digit zip code",

  // Not found message
  notFoundTitle: "Zip code not found",
  notFoundBody:
    "We don't have data for zip code {zip} yet. We're working on adding all U.S. zip codes.",
  notFoundLink: "Find your state election website",

  // State info
  stateInfoAriaLabel: "Election information for {state}",
  noElectionFound: "No upcoming elections found",
  noElectionMessage:
    "No upcoming elections found for {state}. Check the {state} election website for updates.",
  noElectionLink: "{state} election website",
  deadlinePassedMessage:
    "Registration deadlines for this election have passed.",
  deadlinePassedLink: "your registration status",
  registrationDeadlinesHeading: "Voter Registration Deadlines",
  onlineRegistrationLabel: "Online registration",
  onlineRegistrationNotAvailable: "Not available",
  byMailLabel: "By mail",
  inPersonLabel: "In person",
  sameDayAvailable: "Same-day registration available",
  sameDayDetail: "You can register on Election Day",
  postmarkNote: "Postmark by this date",
  receivedNote: "Must be received by this date",
  earlyVotingHeading: "Early Voting",
  earlyVotingNotAvailable: "Not available",
  earlyVotingFallback:
    "Early voting not available. Absentee voting may be available.",
  votingRulesHeading: "Voting Rules",
  photoIdLabel: "Photo ID: ",
  photoIdRequired: "Required",
  photoIdNotRequired: "Not required",
  phonesAtPollsLabel: "Phones at polls: ",
  officialResourcesHeading: "Official Resources",
  stateElectionWebsiteLink: "{state} Election Website",
  sampleBallotLink: "Sample Ballot Lookup",
  countyElectionLink: "County Election Office",

  // Deadline status
  deadlineStatusOpen: "Open",
  deadlineStatusClosingSoon: "Closing Soon",
  deadlineStatusUrgent: "Urgent",
  deadlineStatusPassed: "Passed",
  deadlineNotAvailable: "Not available",
  deadlineLabelToday: "Today — Last Day",
  deadlineLabel1Day: "1 day left",

  // State selector
  stateSelectorPrompt:
    "This zip code spans multiple states. Which state are you voting in?",
  stateSelectorButton: "I'm voting in {state}",

  // Prompt output
  promptOutputSectionLabel: "Customized ballot research prompt",
  promptOutputHeading: "Your Customized Ballot Research Prompt",
  promptOutputInstructions:
    "Copy this prompt and paste it as your first message in any AI chatbot",
  promptOutputHowTo:
    "How to use: Copy below → open any free AI chatbot → paste as your first message",
  copyButton: "Copy to Clipboard",
  copyButtonCopied: "Copied!",
  copyConfirmation: "✓ Copied to clipboard!",
  copyFallback:
    "Clipboard not available. The text is selected — press Ctrl+C / Cmd+C to copy.",
  promptTextAreaLabel:
    "Ballot research prompt — read only, use copy button above",

  // Tips section
  tipsSectionHeading: "Tips for using your prompt effectively",
  tip1Heading: 'Say "I don\'t know" anytime',
  tip1Body:
    "The AI will explain more and help you figure out where you stand — you're not being tested.",
  tip2Heading: "Ask it to research things",
  tip2Body:
    '"Can you look up this candidate\'s voting record?" or "Who funds this ballot measure?" — it\'ll dig in.',
  tip3Heading: "Ask questions",
  tip3Body:
    '"What does this position actually do?" or "Why does this matter?" — no question is too basic.',
  tip4Heading: "Print your summary",
  tip4Body:
    "Many states ban phones at the polling place. Print or write down your choices before you go.",
  tip5Heading: "AI can make mistakes",
  tip5Body:
    "This is a research starting point. The AI will link you to official sources so you can verify anything that matters.",

  // Footer
  footerCredit:
    "Created by a human using AI tools — because everyone deserves to know what they're actually voting for.",

  // Language toggle
  languageToggleLabel: "Switch to Español",
  languageToggleAnnouncement: "Language changed to English",

  // Phase 3: Live data
  pollingLocationHeading: "Your Polling Location",
  ballotContestsHeading: "Races on Your Ballot",
  viewVotingRecord: "View voting record",
  candidateLoading: "Loading candidate information...",
  electionDataLoading: "Loading election data...",
  apiPartialError:
    "Some election data is temporarily unavailable. The information shown is current. Visit your",
  apiFullError:
    "We're having trouble loading live election data. Here's what we know about voting in your state. Visit your state election office for current dates and deadlines.",
  dataAttribution:
    "Election data from Google Civic Information and live web search via Anthropic.",
  dataUpdated: "Updated",
  voterIdVerifyNote:
    "Verify current requirements at your state election office.",
};

export const es: Translations = {
  // Skip to content
  skipToContent: "Ir al contenido principal",

  // Header
  appName: "Voter Choice",

  // Hero section
  heroHeadline: "Conoce por qué vas a votar.",
  heroHeadlineHighlight: "En minutos.",
  heroSubtitle:
    "Ingresa tu código postal para obtener un prompt personalizado de investigación electoral. Pégalo en cualquier chatbot de IA gratuito y obtén un resumen no partidista de cada candidato y tema en tu boleta.",
  heroSubtitleNote:
    "Sin cuenta. Sin datos guardados. Funciona con cualquier chatbot de IA.",
  heroChatbotsLabel: "Chatbots de IA compatibles",

  // Chatbot descriptions
  chatbotDescClaude: "por Anthropic",
  chatbotDescChatGPT: "por OpenAI",
  chatbotDescGemini: "por Google",
  chatbotDescGrok: "por xAI",

  // ZipForm
  zipInputLabel: "Tu código postal",
  zipInputPlaceholder: "ej. 73301",
  zipSubmitButton: "Buscar mi boleta",
  zipSubmitLoading: "Buscando...",
  zipErrorEmpty: "Por favor ingresa un código postal",
  zipErrorInvalid: "Por favor ingresa un código postal válido de 5 dígitos",

  // Not found message
  notFoundTitle: "Código postal no encontrado",
  notFoundBody:
    "Aún no tenemos datos para el código postal {zip}. Estamos trabajando para incluir todos los códigos postales de EE.UU.",
  notFoundLink: "Encuentra el sitio web electoral de tu estado",

  // State info
  stateInfoAriaLabel: "Información electoral para {state}",
  noElectionFound: "No se encontraron elecciones próximas",
  noElectionMessage:
    "No se encontraron elecciones próximas para {state}. Consulta el sitio web electoral de {state} para más información.",
  noElectionLink: "Sitio web electoral de {state}",
  deadlinePassedMessage:
    "Las fechas límite de registro para esta elección ya pasaron.",
  deadlinePassedLink: "tu estado de registro",
  registrationDeadlinesHeading: "Fechas límite de registro para votar",
  onlineRegistrationLabel: "Registro en línea",
  onlineRegistrationNotAvailable: "No disponible",
  byMailLabel: "Por correo",
  inPersonLabel: "En persona",
  sameDayAvailable: "Registro el mismo día disponible",
  sameDayDetail: "Puedes registrarte el día de las elecciones",
  postmarkNote: "Fecha de matasellos de correos",
  receivedNote: "Debe recibirse antes de esta fecha",
  earlyVotingHeading: "Votación anticipada",
  earlyVotingNotAvailable: "No disponible",
  earlyVotingFallback:
    "La votación anticipada no está disponible. Es posible que el voto por correo esté disponible.",
  votingRulesHeading: "Reglas de votación",
  photoIdLabel: "Identificación con foto: ",
  photoIdRequired: "Requerida",
  photoIdNotRequired: "No requerida",
  phonesAtPollsLabel: "Teléfonos en las casillas: ",
  officialResourcesHeading: "Recursos oficiales",
  stateElectionWebsiteLink: "Sitio web electoral de {state}",
  sampleBallotLink: "Buscar boleta de muestra",
  countyElectionLink: "Oficina electoral del condado",

  // Deadline status
  deadlineStatusOpen: "Abierto",
  deadlineStatusClosingSoon: "Cierra pronto",
  deadlineStatusUrgent: "Urgente",
  deadlineStatusPassed: "Vencido",
  deadlineNotAvailable: "No disponible",
  deadlineLabelToday: "Hoy — Último día",
  deadlineLabel1Day: "Queda 1 día",

  // State selector
  stateSelectorPrompt:
    "Este código postal abarca varios estados. ¿En qué estado vas a votar?",
  stateSelectorButton: "Voy a votar en {state}",

  // Prompt output
  promptOutputSectionLabel: "Prompt personalizado de investigación electoral",
  promptOutputHeading: "Tu Prompt Personalizado de Investigación Electoral",
  promptOutputInstructions:
    "Copia este prompt y pégalo como tu primer mensaje en cualquier chatbot de IA",
  promptOutputHowTo:
    "Cómo usarlo: Copia abajo → abre cualquier chatbot de IA gratuito → pégalo como tu primer mensaje",
  copyButton: "Copiar al portapapeles",
  copyButtonCopied: "¡Copiado!",
  copyConfirmation: "✓ ¡Copiado al portapapeles!",
  copyFallback:
    "Portapapeles no disponible. El texto está seleccionado — presiona Ctrl+C / Cmd+C para copiar.",
  promptTextAreaLabel:
    "Prompt de investigación electoral — solo lectura, usa el botón de copiar",

  // Tips section
  tipsSectionHeading: "Consejos para usar tu prompt de manera efectiva",
  tip1Heading: 'Di "No sé" cuando quieras',
  tip1Body:
    "La IA te explicará más y te ayudará a entender tu postura — no te está evaluando.",
  tip2Heading: "Pídele que investigue",
  tip2Body:
    '"¿Puedes buscar el historial de votación de este candidato?" o "¿Quién financia esta propuesta?" — lo investigará.',
  tip3Heading: "Haz preguntas",
  tip3Body:
    '"¿Qué hace realmente este cargo?" o "¿Por qué esto importa?" — ninguna pregunta es demasiado básica.',
  tip4Heading: "Imprime tu resumen",
  tip4Body:
    "Muchos estados prohíben los teléfonos en el lugar de votación. Imprime o anota tus opciones antes de ir.",
  tip5Heading: "La IA puede cometer errores",
  tip5Body:
    "Este es un punto de partida para tu investigación. La IA te enlazará a fuentes oficiales para que puedas verificar lo que importa.",

  // Footer
  footerCredit:
    "Creado por una persona usando herramientas de IA — porque todos merecen saber por qué votan realmente.",

  // Language toggle
  languageToggleLabel: "Switch to English",
  languageToggleAnnouncement: "Idioma cambiado a español",

  // Phase 3: Live data
  pollingLocationHeading: "Tu lugar de votación",
  ballotContestsHeading: "Candidaturas en tu boleta",
  viewVotingRecord: "Ver historial de votación",
  candidateLoading: "Cargando información del candidato...",
  electionDataLoading: "Cargando datos electorales...",
  apiPartialError:
    "Algunos datos electorales no están disponibles temporalmente. La información que se muestra está actualizada. Visita tu",
  apiFullError:
    "Tenemos problemas para cargar los datos electorales en vivo. Aquí está lo que sabemos sobre votar en tu estado. Visita tu oficina electoral estatal para fechas y plazos actuales.",
  dataAttribution:
    "Datos electorales de Google Civic Information y búsqueda web en vivo a través de Anthropic.",
  dataUpdated: "Actualizado",
  voterIdVerifyNote:
    "Verifica los requisitos actuales en tu oficina electoral estatal.",
};

/**
 * Get a translation string for the given language and key.
 */
export function getTranslation(
  lang: Language,
  key: keyof Translations,
): string {
  const translations = lang === "es" ? es : en;
  return translations[key];
}

/**
 * Replace {placeholder} tokens in a translation string.
 */
export function interpolate(
  template: string,
  values: Record<string, string>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? `{${key}}`);
}
