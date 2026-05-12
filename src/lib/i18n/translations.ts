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
    onlineLabel: "Online",
    byMailLabel: "By Mail",
    inPersonLabel: "In Person",
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
    tip1: 'You can say "I don\'t know" or "I\'m not sure where I stand" — the AI will explain more and help you figure it out.',
    tip2: 'You can ask it to research something for you: "Can you look up this candidate\'s voting record?"',
    tip3: 'You can ask questions anytime: "What does this position actually do?" or "Why does this matter?"',
    tip4: "You're not taking a test. You're having a conversation. The AI works with you.",
    tip5: "At the end, it'll give you a summary you can write down or print and take to the polls.",
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
    switchTo: "Español",
    languageChanged: "Language changed to English",
    // Screen reader / accessibility
    skipToMain: "Skip to main content",
    lookupFormLabel: "Zip code lookup form",
    zipInputLabel: "Zip code",
    promptOutputLabel: "Customized ballot research prompt",
    copyPromptLabel: "Copy prompt to clipboard",
    shareOnXLabel: "Share on X / Twitter",
    shareOnFacebookLabel: "Share on Facebook",
    shareViaEmailLabel: "Share via email",
    switchLangAriaLabel: "Switch to Spanish",
    // Context block labels (for generatePrompt)
    contextGreeting: (stateName: string, zip: string) =>
      `Hi! I'm voting in **${stateName}**. My zip code is **${zip}**.`,
    contextIntro: "Here's what I know about my upcoming election:",
    contextElection: "Election",
    contextElectionType: "Election type",
    contextRegistration: "Registration deadlines",
    contextEarlyVoting: "Early voting",
    contextVoterId: "Voter ID",
    contextPhones: "Phones at polls",
    contextSampleBallot: "My sample ballot",
    contextCounty: "My county election office",
    contextClosing: "Help me with my ballot.",
    contextNoElection: (website: string) =>
      `No upcoming elections found. Check ${website} for updates.`,
    contextOnline: (date: string, url: string) => `Online by ${date} (${url})`,
    contextOnlineNA: "Online registration not available",
    contextByMail: (date: string, postmark: string) =>
      `By mail by ${date} (${postmark})`,
    contextByMailPostmark: "postmark date",
    contextByMailReceived: "received date",
    contextInPerson: (date: string) => `In person by ${date}`,
    contextEarlyVotingDates: (start: string, end: string) =>
      `${start} through ${end}`,
    contextEarlyVotingNA: "Not available — absentee voting only",
    contextVoterIdRequired: (ids: string) => `Required. Accepted IDs: ${ids}`,
    contextVoterIdNA: "Not required",
    contextElectionTypePrimary: (type: string) => `${type} primary`,
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
    onlineLabel: "En línea",
    byMailLabel: "Por correo",
    inPersonLabel: "En persona",
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
    tip1: 'Puedes decir "No sé" o "No estoy seguro/a de mi posición" — la IA te explicará más y te ayudará a descubrirlo.',
    tip2: 'Puedes pedirle que investigue algo por ti: "¿Puedes buscar el historial de votación de este candidato?"',
    tip3: 'Puedes hacer preguntas en cualquier momento: "¿Qué hace realmente este cargo?" o "¿Por qué es importante esto?"',
    tip4: "No estás en un examen. Estás teniendo una conversación. La IA trabaja contigo.",
    tip5: "Al final, te dará un resumen que puedes anotar o imprimir y llevar a las urnas.",
    tipsImportant: "Importante:",
    tipsDisclaimer:
      "La IA puede cometer errores. Este es un punto de partida para investigar. La herramienta te enlazará a fuentes oficiales para que puedas verificar cualquier cosa que te importe.",
    // Footer
    shareThis: "Comparte esta herramienta:",
    shareOnX: "X / Twitter",
    shareOnFacebook: "Facebook",
    shareViaEmail: "Correo electrónico",
    footerAttribution: "Creado por una persona usando herramientas de IA",
    // Language toggle
    switchTo: "English",
    languageChanged: "Idioma cambiado a español",
    // Screen reader / accessibility
    skipToMain: "Saltar al contenido principal",
    lookupFormLabel: "Formulario de búsqueda por código postal",
    zipInputLabel: "Código postal",
    promptOutputLabel: "Mensaje personalizado de investigación electoral",
    copyPromptLabel: "Copiar mensaje al portapapeles",
    shareOnXLabel: "Compartir en X / Twitter",
    shareOnFacebookLabel: "Compartir en Facebook",
    shareViaEmailLabel: "Compartir por correo electrónico",
    switchLangAriaLabel: "Cambiar a inglés",
    // Context block labels (for generatePrompt)
    contextGreeting: (stateName: string, zip: string) =>
      `¡Hola! Voy a votar en **${stateName}**. Mi código postal es **${zip}**.`,
    contextIntro: "Esto es lo que sé sobre mi próxima elección:",
    contextElection: "Elección",
    contextElectionType: "Tipo de elección",
    contextRegistration: "Fechas límite de registro",
    contextEarlyVoting: "Votación anticipada",
    contextVoterId: "Identificación para votar",
    contextPhones: "Teléfonos en las casillas",
    contextSampleBallot: "Mi boleta de muestra",
    contextCounty: "Mi oficina electoral del condado",
    contextClosing: "Ayúdame con mi boleta.",
    contextNoElection: (website: string) =>
      `No se encontraron elecciones próximas. Consulta ${website} para más información.`,
    contextOnline: (date: string, url: string) =>
      `En línea antes del ${date} (${url})`,
    contextOnlineNA: "Registro en línea no disponible",
    contextByMail: (date: string, postmark: string) =>
      `Por correo antes del ${date} (${postmark})`,
    contextByMailPostmark: "fecha de matasellos",
    contextByMailReceived: "fecha de recepción",
    contextInPerson: (date: string) => `En persona antes del ${date}`,
    contextEarlyVotingDates: (start: string, end: string) =>
      `Del ${start} al ${end}`,
    contextEarlyVotingNA: "No disponible — solo voto en ausencia",
    contextVoterIdRequired: (ids: string) => `Requerida. [${ids}]`,
    contextVoterIdNA: "No requerida",
    contextElectionTypePrimary: (type: string) => `primaria (${type})`,
  },
} as const;

export type TranslationMap = (typeof translations)["en"];
export type TranslationKey = keyof TranslationMap;

// Returns the raw translation value (may be string or function)
export function t(
  lang: Language,
  key: TranslationKey,
): TranslationMap[TranslationKey] {
  return translations[lang][key] as TranslationMap[TranslationKey];
}

// Returns a guaranteed string (for string-only keys)
export function tStr(lang: Language, key: TranslationKey): string {
  const val = translations[lang][key];
  if (typeof val === "string") return val;
  return String(val);
}

// Returns a string for days-left status label
export function daysLeftLabel(lang: Language, n: number): string {
  if (lang === "es") {
    return `Quedan ${n} día${n === 1 ? "" : "s"}`;
  }
  return `${n} day${n === 1 ? "" : "s"} left`;
}
