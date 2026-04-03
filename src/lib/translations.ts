export interface Translations {
  hero: {
    headline: string;
    subtitle: string;
  };
  form: {
    label: string;
    placeholder: string;
    submit: string;
    continue: string;
  };
  errors: {
    zipEmpty: string;
    zipInvalid: string;
    zipNotFound: string;
    multiState: string;
    deadlinePassed: string;
    noElection: string;
    findElectionWebsite: string;
  };
  stateInfo: {
    lastUpdated: string;
    registrationDeadlines: string;
    online: string;
    byMail: string;
    inPerson: string;
    sameDayReg: string;
    earlyVoting: string;
    earlyVotingNotAvailable: string;
    voterId: string;
    voterIdRequired: string;
    voterIdNotRequired: string;
    phonesAtPolls: string;
    electionWebsite: string;
    sampleBallot: string;
    noElectionMessage: string;
    checkWebsite: string;
  };
  deadline: {
    daysLeft: string;
    dayLeft: string;
    today: string;
    tomorrow: string;
    passed: string;
    notAvailable: string;
  };
  prompt: {
    heading: string;
    instructions: string;
    copyButton: string;
    copiedButton: string;
  };
  tips: {
    heading: string;
    tip1: string;
    tip2: string;
    tip3: string;
    tip4: string;
    tip5: string;
  };
  footer: {
    share: string;
    credit: string;
  };
  a11y: {
    skipToContent: string;
    langToggleToEs: string;
    langToggleToEn: string;
    langChangedToEs: string;
    langChangedToEn: string;
  };
}

export const EN: Translations = {
  hero: {
    headline: "Research Your Ballot with AI",
    subtitle:
      "Enter your zip code, get a customized prompt, and paste it into any free AI chatbot to research every race on your ballot.",
  },
  form: {
    label: "Zip Code",
    placeholder: "Enter your 5-digit zip code",
    submit: "Go",
    continue: "Continue",
  },
  errors: {
    zipEmpty: "Please enter a zip code",
    zipInvalid: "Please enter a valid 5-digit zip code",
    zipNotFound:
      "We don't have data for this zip code yet. We're working on adding all U.S. zip codes.",
    multiState:
      "This zip code spans multiple states. Which state are you voting in?",
    deadlinePassed:
      "Registration deadlines have passed for the next election.",
    noElection: "No upcoming elections found for this state.",
    findElectionWebsite: "Find your state election website →",
  },
  stateInfo: {
    lastUpdated: "Last updated:",
    registrationDeadlines: "Registration Deadlines",
    online: "Online",
    byMail: "By mail",
    inPerson: "In person",
    sameDayReg: "Same-day registration available",
    earlyVoting: "Early Voting",
    earlyVotingNotAvailable: "Not available — absentee voting only",
    voterId: "Voter ID",
    voterIdRequired: "Required",
    voterIdNotRequired: "Not required",
    phonesAtPolls: "Phones at Polls",
    electionWebsite: "Election Website ↗",
    sampleBallot: "Sample Ballot ↗",
    noElectionMessage: "No upcoming elections found for",
    checkWebsite: "election website",
  },
  deadline: {
    daysLeft: "{days} days left",
    dayLeft: "1 day left",
    today: "Today!",
    tomorrow: "Tomorrow!",
    passed: "Passed",
    notAvailable: "Not available",
  },
  prompt: {
    heading: "Your Customized Prompt",
    instructions:
      "Copy this prompt and paste it as your first message in any AI chatbot",
    copyButton: "Copy to Clipboard",
    copiedButton: "Copied!",
  },
  tips: {
    heading: "Tips for Using AI Ballot Research",
    tip1: "You can say \"I don't know\" or \"I'm not sure where I stand\" — the AI will explain more and help you figure it out",
    tip2: "Ask it to research something for you (\"Can you look up this candidate's voting record?\")",
    tip3: "Ask questions anytime (\"What does this position actually do?\" or \"Why does this matter?\")",
    tip4: "You're not taking a test. You're having a conversation. The AI works with you.",
    tip5: "AI can make mistakes. This is a research starting point. Always verify with official sources — the tool links you to them.",
  },
  footer: {
    share: "Share this tool with friends and family",
    credit: "Created by a human using AI tools",
  },
  a11y: {
    skipToContent: "Skip to main content",
    langToggleToEs: "Switch to Spanish",
    langToggleToEn: "Switch to English",
    langChangedToEs: "Language changed to Spanish",
    langChangedToEn: "Language changed to English",
  },
};

export const ES: Translations = {
  hero: {
    headline: "Investiga tu boleta con IA",
    subtitle:
      "Ingresa tu código postal, obtén un prompt personalizado y pégalo en cualquier chatbot de IA para investigar cada cargo en tu boleta.",
  },
  form: {
    label: "Código postal",
    placeholder: "Ingresa tu código postal de 5 dígitos",
    submit: "Buscar",
    continue: "Continuar",
  },
  errors: {
    zipEmpty: "Por favor ingresa un código postal",
    zipInvalid: "Por favor ingresa un código postal válido de 5 dígitos",
    zipNotFound:
      "Aún no tenemos datos para este código postal. Estamos trabajando en agregar todos los códigos postales de EE. UU.",
    multiState:
      "Este código postal abarca varios estados. ¿En qué estado vas a votar?",
    deadlinePassed:
      "Las fechas límite de registro ya pasaron para la próxima elección.",
    noElection:
      "No se encontraron próximas elecciones para este estado.",
    findElectionWebsite:
      "Encuentra el sitio web de elecciones de tu estado →",
  },
  stateInfo: {
    lastUpdated: "Última actualización:",
    registrationDeadlines: "Fechas límite de registro",
    online: "En línea",
    byMail: "Por correo",
    inPerson: "En persona",
    sameDayReg: "Registro el mismo día disponible",
    earlyVoting: "Votación anticipada",
    earlyVotingNotAvailable: "No disponible — solo votación por correo",
    voterId: "Identificación para votar",
    voterIdRequired: "Requerida",
    voterIdNotRequired: "No requerida",
    phonesAtPolls: "Teléfonos en las urnas",
    electionWebsite: "Sitio de elecciones ↗",
    sampleBallot: "Boleta de muestra ↗",
    noElectionMessage: "No se encontraron próximas elecciones para",
    checkWebsite: "sitio web de elecciones",
  },
  deadline: {
    daysLeft: "Quedan {days} días",
    dayLeft: "Queda 1 día",
    today: "¡Hoy!",
    tomorrow: "¡Mañana!",
    passed: "Plazo pasado",
    notAvailable: "No disponible",
  },
  prompt: {
    heading: "Tu Prompt Personalizado",
    instructions:
      "Copia este prompt y pégalo como tu primer mensaje en cualquier chatbot de IA",
    copyButton: "Copiar en el portapapeles",
    copiedButton: "¡Copiado!",
  },
  tips: {
    heading: "Consejos para usar IA en tu investigación de boleta",
    tip1: "Puedes decir \"No sé\" o \"No estoy seguro/a de mi posición\" — la IA te explicará más y te ayudará a entender",
    tip2: "Pídele que investigue algo por ti (\"¿Puedes buscar el historial de votación de este candidato?\")",
    tip3: "Haz preguntas cuando quieras (\"¿Qué hace realmente este cargo?\" o \"¿Por qué importa esto?\")",
    tip4: "No estás tomando un examen. Estás teniendo una conversación. La IA trabaja contigo.",
    tip5: "La IA puede cometer errores. Este es un punto de partida para tu investigación. Siempre verifica con fuentes oficiales — la herramienta te enlaza a ellas.",
  },
  footer: {
    share: "Comparte esta herramienta con amigos y familiares",
    credit: "Creado por una persona usando herramientas de IA",
  },
  a11y: {
    skipToContent: "Ir al contenido principal",
    langToggleToEs: "Cambiar a Español",
    langToggleToEn: "Cambiar a Inglés",
    langChangedToEs: "Idioma cambiado a español",
    langChangedToEn: "Idioma cambiado a inglés",
  },
};

// Nested key lookup: getTranslation('en', 'errors.zipEmpty') → EN.errors.zipEmpty
export function getTranslation(lang: "en" | "es", key: string): string {
  const store = lang === "es" ? ES : EN;
  const value = key.split(".").reduce((obj: unknown, k) => {
    if (obj && typeof obj === "object")
      return (obj as Record<string, unknown>)[k];
    return undefined;
  }, store as unknown);
  return typeof value === "string" && value ? value : key;
}
