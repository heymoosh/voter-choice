export type Language = "en" | "es";

export interface T {
  skipToContent: string;
  heroTitle: string;
  heroSubtitle: string;
  heroDescription: string;
  languageToggleLabel: string;
  switchToCode: string;
  zipInputLabel: string;
  zipInputPlaceholder: string;
  zipSubmitButton: string;
  errorEmptyZip: string;
  errorInvalidZip: string;
  errorZipNotFound: string;
  errorStateNotFound: string;
  multiStatePrompt: string;
  upcomingElection: string;
  electionType: string;
  primarySuffix: string;
  registrationDeadlines: string;
  registrationOnline: string;
  registrationByMail: string;
  registrationInPerson: string;
  postmarkDate: string;
  receivedDate: string;
  sameDayRegistration: string;
  earlyVotingTitle: string;
  earlyVotingThrough: string;
  earlyVotingNotAvailable: string;
  resources: string;
  sampleBallotLookup: string;
  countyElectionOffice: string;
  checkRegistrationStatus: string;
  deadlinePassed: string;
  deadlineToday: string;
  deadlineDayLeft: string;
  deadlineDaysLeft: (n: number) => string;
  noElectionBefore: string;
  noElectionCheck: string;
  noElectionLinkText: string;
  noElectionAfter: string;
  promptSectionTitle: string;
  promptInstructions: string;
  copyButton: string;
  copiedButton: string;
  copiedStatus: string;
  tipsTitle: string;
  tip1Bold1: string;
  tip1Bold2: string;
  tip1Rest: string;
  tip2Prefix: string;
  tip2Bold: string;
  tip2Suffix: string;
  tip3: string;
  tip4Bold: string;
  tip4Rest: string;
  tip5: string;
  footerShare: string;
  footerAttribution: string;
}

export const translations: Record<Language, T> = {
  en: {
    // Accessibility
    skipToContent: "Skip to content",

    // Hero
    heroTitle: "AI Ballot Research Tool",
    heroSubtitle:
      "Get a customized AI prompt with your local election information",
    heroDescription:
      "Enter your zip code to generate a personalized ballot research prompt. Copy it and paste into any free AI chatbot (Claude, ChatGPT, Gemini, Grok) to research your ballot.",

    // Language toggle
    languageToggleLabel: "Cambiar a Español",
    switchToCode: "ES",

    // Zip form
    zipInputLabel: "Enter Your Zip Code",
    zipInputPlaceholder: "12345",
    zipSubmitButton: "Submit",

    // Error messages
    errorEmptyZip: "Please enter a zip code",
    errorInvalidZip: "Please enter a valid 5-digit zip code",
    errorZipNotFound:
      "We don't have data for this zip code yet. We're working on adding all U.S. zip codes.",
    errorStateNotFound: "State data not found",

    // Multi-state selector
    multiStatePrompt:
      "This zip code spans multiple states. Which state are you voting in?",

    // State info card
    upcomingElection: "Upcoming Election",
    electionType: "Type",
    primarySuffix: "primary",
    registrationDeadlines: "Registration Deadlines",
    registrationOnline: "Online",
    registrationByMail: "By Mail",
    registrationInPerson: "In Person",
    postmarkDate: "postmark date",
    receivedDate: "received date",
    sameDayRegistration: "Same-day registration available",
    earlyVotingTitle: "Early Voting",
    earlyVotingThrough: "through",
    earlyVotingNotAvailable: "Not available — absentee voting only",
    resources: "Resources",
    sampleBallotLookup: "Sample Ballot Lookup",
    countyElectionOffice: "County Election Office",
    checkRegistrationStatus: "Check Registration Status",

    // Deadline status
    deadlinePassed: "Passed",
    deadlineToday: "Today",
    deadlineDayLeft: "1 day left",
    deadlineDaysLeft: (n: number) => `${n} days left`,

    // No election
    noElectionBefore: "No upcoming elections found for",
    noElectionCheck: "Check",
    noElectionLinkText: "the state election website",
    noElectionAfter: "for updates.",

    // Prompt output
    promptSectionTitle: "Your Customized Ballot Research Prompt",
    promptInstructions:
      "Copy this prompt and paste it as your first message in any AI chatbot. Your state-specific information is already included.",
    copyButton: "Copy to Clipboard",
    copiedButton: "✓ Copied!",
    copiedStatus: "Copied!",

    // Tips
    tipsTitle: "Tips for Using This Tool",
    tip1Bold1: '"I don\'t know"',
    tip1Bold2: '"I\'m not sure where I stand"',
    tip1Rest: " — the AI will explain more",
    tip2Prefix: "Ask it to ",
    tip2Bold: "research candidates' voting records",
    tip2Suffix: " and track records",
    tip3: 'Ask questions anytime: "What does this position actually do?" or "Why does this matter?"',
    tip4Bold: "AI can make mistakes.",
    tip4Rest:
      " This is a research starting point — verify with official sources",
    tip5: "Many states prohibit phones at polling places. Print or write down your final ballot choices",

    // Footer
    footerShare: "Share this tool with others",
    footerAttribution:
      "Created by a human using AI tools · Everyone deserves to know what they're voting for",
  },

  es: {
    // Accessibility
    skipToContent: "Ir al contenido",

    // Hero
    heroTitle: "Herramienta de Investigación de Boleta con IA",
    heroSubtitle:
      "Obtén un prompt personalizado de IA con tu información electoral local",
    heroDescription:
      "Ingresa tu código postal para generar un prompt personalizado de investigación de boleta. Cópialo y pégalo en cualquier chatbot de IA gratuito (Claude, ChatGPT, Gemini, Grok) para investigar tu boleta.",

    // Language toggle
    languageToggleLabel: "Switch to English",
    switchToCode: "EN",

    // Zip form
    zipInputLabel: "Ingresa Tu Código Postal",
    zipInputPlaceholder: "12345",
    zipSubmitButton: "Enviar",

    // Error messages
    errorEmptyZip: "Por favor ingresa un código postal",
    errorInvalidZip: "Por favor ingresa un código postal válido de 5 dígitos",
    errorZipNotFound:
      "Aún no tenemos datos para este código postal. Estamos trabajando para agregar todos los códigos postales de EE. UU.",
    errorStateNotFound: "No se encontraron datos del estado",

    // Multi-state selector
    multiStatePrompt:
      "Este código postal abarca varios estados. ¿En qué estado vas a votar?",

    // State info card
    upcomingElection: "Próxima Elección",
    electionType: "Tipo",
    primarySuffix: "primaria",
    registrationDeadlines: "Fechas Límite de Registro",
    registrationOnline: "En línea",
    registrationByMail: "Por correo",
    registrationInPerson: "En persona",
    postmarkDate: "fecha de matasellos",
    receivedDate: "fecha de recepción",
    sameDayRegistration: "Registro el mismo día disponible",
    earlyVotingTitle: "Votación Anticipada",
    earlyVotingThrough: "hasta el",
    earlyVotingNotAvailable: "No disponible — solo voto en ausencia",
    resources: "Recursos",
    sampleBallotLookup: "Búsqueda de Boleta de Muestra",
    countyElectionOffice: "Oficina Electoral del Condado",
    checkRegistrationStatus: "Verificar Estado de Registro",

    // Deadline status
    deadlinePassed: "Pasado",
    deadlineToday: "Hoy",
    deadlineDayLeft: "Queda 1 día",
    deadlineDaysLeft: (n: number) => `Quedan ${n} días`,

    // No election
    noElectionBefore: "No se encontraron elecciones próximas para",
    noElectionCheck: "Consulta",
    noElectionLinkText: "el sitio web electoral del estado",
    noElectionAfter: "para más información.",

    // Prompt output
    promptSectionTitle: "Tu Prompt Personalizado de Investigación de Boleta",
    promptInstructions:
      "Copia este prompt y pégalo como tu primer mensaje en cualquier chatbot de IA. Tu información específica del estado ya está incluida.",
    copyButton: "Copiar al Portapapeles",
    copiedButton: "✓ ¡Copiado!",
    copiedStatus: "¡Copiado!",

    // Tips
    tipsTitle: "Consejos para Usar Esta Herramienta",
    tip1Bold1: '"No sé"',
    tip1Bold2: '"No estoy seguro/a de mi postura"',
    tip1Rest: " — la IA te explicará más",
    tip2Prefix: "Pídele que ",
    tip2Bold: "investigue los historiales de votación de los candidatos",
    tip2Suffix: " y sus trayectorias",
    tip3: '¿Haz preguntas en cualquier momento: "¿Qué hace exactamente este cargo?" o "¿Por qué es importante esto?"',
    tip4Bold: "La IA puede cometer errores.",
    tip4Rest:
      " Este es un punto de partida para investigar — verifica con fuentes oficiales",
    tip5: "Muchos estados prohíben los teléfonos en los lugares de votación. Imprime o anota tus decisiones finales de boleta",

    // Footer
    footerShare: "Comparte esta herramienta con otros",
    footerAttribution:
      "Creado por una persona usando herramientas de IA · Todos merecen saber por qué votan",
  },
} as const;
