export type Language = "en" | "es";

export interface Translations {
  // Language toggle
  languageToggleLabel: string;
  languageToggleAnnouncement: string;

  // Hero section
  heroEyebrow: string;
  heroTitle: string;
  heroCopy: string;
  chatbotLinksLabel: string;

  // Zip code form
  zipLabel: string;
  zipPlaceholder: string;
  submitButton: string;
  submitButtonLoading: string;

  // Error messages
  errorEmptyZip: string;
  errorInvalidZip: string;
  errorZipNotFound: string;
  errorRegistrationPassed: string;
  errorNoElection: (stateName: string) => string;

  // State selector
  stateSelectorEyebrow: string;
  stateSelectorTitle: string;

  // State info card
  stateSnapshotEyebrow: string;
  updatedLabel: string;
  electionLabel: string;
  registrationLabel: string;
  earlyVotingLabel: string;
  votingRulesLabel: string;
  noElectionData: string;
  noEarlyVoting: string;
  earlyVotingThrough: string;
  phonesProhibited: string;
  phonesPolicyVaries: string;
  registrationCheckPrefix: string;
  registrationCheckSuffix: string;

  // Deadline status
  daysLeft: (days: number) => string;
  deadlinePassed: string;
  deadlineNotAvailable: string;

  // Prompt section
  promptEyebrow: string;
  promptInstructions: string;
  copyButton: string;
  copyButtonCopied: string;

  // Copy confirmation
  copyConfirmation: string;

  // Tips section
  tipsTitle: string;
  tips: string[];
  tipsWarning: string;

  // Footer
  footerShare: string;
  footerAttribution: string;

  // Accessibility
  skipToContent: string;
}

export const en: Translations = {
  // Language toggle
  languageToggleLabel: "Español",
  languageToggleAnnouncement: "Language changed to Spanish",

  // Hero section
  heroEyebrow: "Voter Choice",
  heroTitle:
    "Ballot research, with local election context and candidate history.",
  heroCopy:
    "Enter a zip code to see your state election context, a copyable prompt, and any available candidate enrichment. Copy the prompt and paste it into any free AI chatbot to start researching your ballot.",
  chatbotLinksLabel: "Works with any AI chatbot:",

  // Zip code form
  zipLabel: "Zip code",
  zipPlaceholder: "Enter your 5-digit zip code",
  submitButton: "Research ballot",
  submitButtonLoading: "Loading...",

  // Error messages
  errorEmptyZip: "Please enter a zip code.",
  errorInvalidZip: "Please enter a valid 5-digit zip code.",
  errorZipNotFound:
    "We don't have data for this zip code yet. We're working on adding all U.S. zip codes.",
  errorRegistrationPassed:
    "Registration deadlines for this election have passed. You may still be able to vote if you're already registered.",
  errorNoElection: (stateName: string) =>
    `No upcoming elections found for ${stateName}. Check your state election website for updates.`,

  // State selector
  stateSelectorEyebrow: "This zip spans multiple states",
  stateSelectorTitle: "Which state are you voting in?",

  // State info card
  stateSnapshotEyebrow: "State snapshot",
  updatedLabel: "Updated",
  electionLabel: "Election",
  registrationLabel: "Registration",
  earlyVotingLabel: "Early voting",
  votingRulesLabel: "Voting rules",
  noElectionData: "No election data",
  noEarlyVoting: "Not available",
  earlyVotingThrough: "through",
  phonesProhibited: "Phones are prohibited at the polls.",
  phonesPolicyVaries: "Phone policy varies or is allowed.",
  registrationCheckPrefix: "Check",
  registrationCheckSuffix: "before Election Day.",

  // Deadline status
  daysLeft: (days: number) => `${days} day${days === 1 ? "" : "s"} left`,
  deadlinePassed: "Passed",
  deadlineNotAvailable: "Not available",

  // Prompt section
  promptEyebrow: "Customized prompt",
  promptInstructions:
    "Copy this prompt and paste it as your first message in any AI chatbot.",
  copyButton: "Copy to Clipboard",
  copyButtonCopied: "Copied!",

  // Copy confirmation
  copyConfirmation: "Prompt copied",

  // Tips section
  tipsTitle: "Tips for your conversation",
  tips: [
    'You can say "I don\'t know" or "I\'m not sure where I stand" — the AI will explain more and help you figure it out.',
    'You can ask it to research something for you ("Can you look up this candidate\'s voting record?").',
    "You're not taking a test. You're having a conversation. The AI works with you.",
    "At the end, it'll give you a summary you can write down or print and take to the polls.",
  ],
  tipsWarning:
    "AI can make mistakes. This is a research starting point. The tool will link you to official sources so you can double-check anything that matters to you.",

  // Footer
  footerShare: "Share this tool",
  footerAttribution: "Created by a human using AI tools",

  // Accessibility
  skipToContent: "Skip to main content",
};

export const es: Translations = {
  // Language toggle
  languageToggleLabel: "English",
  languageToggleAnnouncement: "Idioma cambiado a español",

  // Hero section
  heroEyebrow: "Voter Choice",
  heroTitle:
    "Investigación electoral con contexto local y historial de candidatos.",
  heroCopy:
    "Ingresa tu código postal para ver el contexto electoral de tu estado, un prompt listo para copiar, y cualquier información disponible sobre candidatos. Copia el prompt y pégalo en cualquier chatbot de IA gratuito para empezar a investigar tu boleta.",
  chatbotLinksLabel: "Funciona con cualquier chatbot de IA:",

  // Zip code form
  zipLabel: "Código postal",
  zipPlaceholder: "Ingresa tu código postal de 5 dígitos",
  submitButton: "Investigar boleta",
  submitButtonLoading: "Cargando...",

  // Error messages
  errorEmptyZip: "Por favor ingresa un código postal.",
  errorInvalidZip: "Por favor ingresa un código postal válido de 5 dígitos.",
  errorZipNotFound:
    "Aún no tenemos datos para este código postal. Estamos trabajando en agregar todos los códigos postales de EE.UU.",
  errorRegistrationPassed:
    "Las fechas límite de registro para esta elección ya pasaron. Es posible que puedas votar si ya estás registrado.",
  errorNoElection: (stateName: string) =>
    `No se encontraron elecciones próximas para ${stateName}. Consulta el sitio web electoral de tu estado para actualizaciones.`,

  // State selector
  stateSelectorEyebrow: "Este código postal abarca varios estados",
  stateSelectorTitle: "¿En qué estado vas a votar?",

  // State info card
  stateSnapshotEyebrow: "Resumen estatal",
  updatedLabel: "Actualizado",
  electionLabel: "Elección",
  registrationLabel: "Registro",
  earlyVotingLabel: "Votación anticipada",
  votingRulesLabel: "Reglas de votación",
  noElectionData: "Sin datos de elección",
  noEarlyVoting: "No disponible",
  earlyVotingThrough: "al",
  phonesProhibited:
    "Los teléfonos están prohibidos en las casillas de votación.",
  phonesPolicyVaries: "La política de teléfonos varía o está permitida.",
  registrationCheckPrefix: "Consulta",
  registrationCheckSuffix: "antes del día de elección.",

  // Deadline status
  daysLeft: (days: number) => `Quedan ${days} día${days === 1 ? "" : "s"}`,
  deadlinePassed: "Pasado",
  deadlineNotAvailable: "No disponible",

  // Prompt section
  promptEyebrow: "Prompt personalizado",
  promptInstructions:
    "Copia este prompt y pégalo como tu primer mensaje en cualquier chatbot de IA.",
  copyButton: "Copiar al portapapeles",
  copyButtonCopied: "¡Copiado!",

  // Copy confirmation
  copyConfirmation: "Prompt copiado",

  // Tips section
  tipsTitle: "Consejos para tu conversación",
  tips: [
    'Puedes decir "No sé" o "No estoy seguro/a de mi posición" — la IA te explicará más y te ayudará a decidir.',
    'Puedes pedirle que investigue algo por ti ("¿Puedes buscar el historial de votación de este candidato?").',
    "No estás siendo evaluado/a. Estás teniendo una conversación. La IA trabaja contigo.",
    "Al final, te dará un resumen que puedes anotar o imprimir para llevar a las urnas.",
  ],
  tipsWarning:
    "La IA puede cometer errores. Este es un punto de partida para tu investigación. La herramienta te enlazará a fuentes oficiales para que puedas verificar cualquier cosa que sea importante para ti.",

  // Footer
  footerShare: "Comparte esta herramienta",
  footerAttribution: "Creado por una persona usando herramientas de IA",

  // Accessibility
  skipToContent: "Ir al contenido principal",
};

export const translations: Record<Language, Translations> = { en, es };
