export type Language = "en" | "es";

export interface Translations {
  hero: {
    title: string;
    subtitle1: string;
    subtitle2: string;
    worksWith: string;
  };
  zipForm: {
    label: string;
    placeholder: string;
    submit: string;
  };
  loading: string;
  errors: {
    empty: string;
    invalid: string;
    notFound: string;
    noElection: (stateName: string) => string;
    multiState: string;
  };
  stateInfo: {
    election: string;
    electionType: string;
    registrationDeadlines: string;
    earlyVoting: string;
    voterId: string;
    voterIdRequired: string;
    voterIdNotRequired: string;
    phonesAtPolls: string;
    sampleBallot: string;
    countyElectionOffice: string;
    earlyVotingNotAvailable: string;
    deadlinePassed: string;
    deadlineStatus: (days: number) => string;
    registrationDeadlinePassed: string;
  };
  stateSelector: {
    prompt: string;
    selectButton: string;
  };
  promptOutput: {
    title: string;
    instructions: string;
    copyButton: string;
    copiedButton: string;
  };
  tips: {
    title: string;
    tip1: string;
    tip2: string;
    tip3: string;
    tip4: string;
    disclaimer: string;
  };
  footer: {
    share: string;
    createdBy: string;
    basedOn: string;
    promptLink: string;
  };
  polling: {
    addressLabel: string;
    addressPlaceholder: string;
    lookUpButton: string;
    skipLink: string;
    loadingLocations: string;
    pollingPlace: string;
    earlyVoteSites: string;
    getDirections: string;
    hours: string;
    fallbackMessage: string;
    fallbackLink: string;
    noLocationsFound: string;
    privacyNote: string;
  };
  a11y: {
    skipToContent: string;
    languageToggleLabel: string;
  };
}

const en: Translations = {
  hero: {
    title: "Free AI Ballot Research Tool",
    subtitle1:
      "Enter your zip code to get a customized AI ballot research prompt. Paste it into any free AI chatbot to research what\u2019s on your ballot \u2014 candidates, propositions, and local races.",
    subtitle2:
      "The AI conversation happens in your own chatbot session. This tool does not store any data or run an AI.",
    worksWith: "Works with:",
  },
  zipForm: {
    label: "Enter your zip code",
    placeholder: "e.g. 73301",
    submit: "Find My Ballot Info",
  },
  loading: "Loading...",
  errors: {
    empty: "Please enter a zip code",
    invalid: "Please enter a valid 5-digit zip code",
    notFound:
      "We don\u2019t have data for this zip code yet. We\u2019re working on adding all U.S. zip codes.",
    noElection: (stateName: string) =>
      `No upcoming elections found for ${stateName}. Check the ${stateName} election website for updates.`,
    multiState:
      "This zip code spans multiple states. Which state are you voting in?",
  },
  stateInfo: {
    election: "Election",
    electionType: "Election type",
    registrationDeadlines: "Voter Registration Deadlines",
    earlyVoting: "Early Voting",
    voterId: "Voter ID",
    voterIdRequired: "Required. Accepted IDs:",
    voterIdNotRequired: "Not required",
    phonesAtPolls: "Phones at Polls",
    sampleBallot: "Sample ballot",
    countyElectionOffice: "County election office",
    earlyVotingNotAvailable: "Not available \u2014 absentee voting only",
    deadlinePassed: "Passed",
    deadlineStatus: (days: number) => `${days} days left`,
    registrationDeadlinePassed:
      "Registration deadlines for this election have passed. Check your registration status.",
  },
  stateSelector: {
    prompt:
      "This zip code spans multiple states. Which state are you voting in?",
    selectButton: "Select",
  },
  promptOutput: {
    title: "Your Ballot Research Prompt",
    instructions:
      "Copy this prompt and paste it into any free AI chatbot to start your ballot research.",
    copyButton: "Copy to Clipboard",
    copiedButton: "Copied!",
  },
  tips: {
    title: "Tips for using the prompt",
    tip1: 'You can say "I don\u2019t know" or "I\u2019m not sure where I stand" \u2014 the AI will explain more and help you figure it out.',
    tip2: 'You can ask it to research something for you ("Can you look up this candidate\u2019s voting record?").',
    tip3: 'You can ask questions anytime ("What does this position actually do?" or "Why does this matter?").',
    tip4: "You\u2019re not taking a test. You\u2019re having a conversation. The AI works with you.",
    disclaimer:
      "Important: AI can make mistakes. This is a research starting point. Verify important information with official sources.",
  },
  footer: {
    share:
      "Share this tool with friends, family, or your community. It works for any U.S. state and any election.",
    createdBy: "Created by a human using AI tools.",
    basedOn: "Based on the",
    promptLink: "Free AI Ballot Research Prompt",
  },
  polling: {
    addressLabel: "Enter your full street address for polling location",
    addressPlaceholder: "e.g. 123 Main St, Houston, TX 77001",
    lookUpButton: "Look up my polling place",
    skipLink: "Skip \u2014 I\u2019ll find it myself",
    loadingLocations: "Looking up your polling place\u2026",
    pollingPlace: "Your Polling Place",
    earlyVoteSites: "Early Vote Sites",
    getDirections: "Get Directions",
    hours: "Hours",
    fallbackMessage:
      "We couldn\u2019t find your polling location automatically.",
    fallbackLink: "Find your polling place on your county election website",
    noLocationsFound: "No polling locations found for this address.",
    privacyNote:
      "Your address is sent to Google\u2019s Civic API to find your polling place. We don\u2019t store it.",
  },
  a11y: {
    skipToContent: "Skip to main content",
    languageToggleLabel: "Switch to Spanish",
  },
};

const es: Translations = {
  hero: {
    title: "Herramienta Gratuita de Investigaci\u00f3n Electoral con IA",
    subtitle1:
      "Ingresa tu c\u00f3digo postal para obtener un mensaje personalizado de investigaci\u00f3n electoral. P\u00e9galo en cualquier chatbot de IA gratuito para investigar tu boleta \u2014 candidatos, proposiciones y elecciones locales.",
    subtitle2:
      "La conversaci\u00f3n con la IA ocurre en tu propia sesi\u00f3n de chatbot. Esta herramienta no almacena ning\u00fan dato ni ejecuta una IA.",
    worksWith: "Funciona con:",
  },
  zipForm: {
    label: "Ingresa tu c\u00f3digo postal",
    placeholder: "ej. 73301",
    submit: "Buscar mi informaci\u00f3n electoral",
  },
  loading: "Cargando...",
  errors: {
    empty: "Por favor ingresa un c\u00f3digo postal",
    invalid:
      "Por favor ingresa un c\u00f3digo postal v\u00e1lido de 5 d\u00edgitos",
    notFound:
      "A\u00fan no tenemos datos para este c\u00f3digo postal. Estamos trabajando para agregar todos los c\u00f3digos postales de EE. UU.",
    noElection: (stateName: string) =>
      `No se encontraron elecciones pr\u00f3ximas para ${stateName}. Consulta el sitio web electoral de ${stateName} para m\u00e1s informaci\u00f3n.`,
    multiState:
      "Este c\u00f3digo postal abarca varios estados. \u00bfEn qu\u00e9 estado vas a votar?",
  },
  stateInfo: {
    election: "Elecci\u00f3n",
    electionType: "Tipo de elecci\u00f3n",
    registrationDeadlines: "Fechas l\u00edmite de registro de votantes",
    earlyVoting: "Votaci\u00f3n anticipada",
    voterId: "Identificaci\u00f3n para votar",
    voterIdRequired: "Requerida. IDs aceptadas:",
    voterIdNotRequired: "No requerida",
    phonesAtPolls: "Tel\u00e9fonos en las casillas",
    sampleBallot: "Boleta de muestra",
    countyElectionOffice: "Oficina electoral del condado",
    earlyVotingNotAvailable:
      "No disponible \u2014 solo votaci\u00f3n en ausencia",
    deadlinePassed: "Pasado",
    deadlineStatus: (days: number) => `Quedan ${days} d\u00edas`,
    registrationDeadlinePassed:
      "Las fechas l\u00edmite de registro para esta elecci\u00f3n ya pasaron. Verifica tu estado de registro.",
  },
  stateSelector: {
    prompt:
      "Este c\u00f3digo postal abarca varios estados. \u00bfEn qu\u00e9 estado vas a votar?",
    selectButton: "Seleccionar",
  },
  promptOutput: {
    title: "Tu mensaje de investigaci\u00f3n electoral",
    instructions:
      "Copia este mensaje y p\u00e9galo en cualquier chatbot de IA gratuito para comenzar tu investigaci\u00f3n electoral.",
    copyButton: "Copiar al portapapeles",
    copiedButton: "\u00a1Copiado!",
  },
  tips: {
    title: "Consejos para usar el mensaje",
    tip1: 'Puedes decir "No s\u00e9" o "No estoy seguro/a de d\u00f3nde estoy parado/a" \u2014 la IA explicar\u00e1 m\u00e1s y te ayudar\u00e1 a entender.',
    tip2: 'Puedes pedirle que investigue algo por ti ("¿Puedes buscar el historial de votaci\u00f3n de este candidato?").',
    tip3: 'Puedes hacer preguntas en cualquier momento ("¿Qu\u00e9 hace exactamente este cargo?" o "¿Por qu\u00e9 importa esto?").',
    tip4: "No est\u00e1s tomando un examen. Est\u00e1s teniendo una conversaci\u00f3n. La IA trabaja contigo.",
    disclaimer:
      "Importante: La IA puede cometer errores. Este es un punto de partida para tu investigaci\u00f3n. Verifica la informaci\u00f3n importante con fuentes oficiales.",
  },
  footer: {
    share:
      "Comparte esta herramienta con amigos, familia o tu comunidad. Funciona para cualquier estado de EE. UU. y cualquier elecci\u00f3n.",
    createdBy: "Creado por una persona usando herramientas de IA",
    basedOn: "Basado en el",
    promptLink: "Mensaje Gratuito de Investigaci\u00f3n Electoral con IA",
  },
  polling: {
    addressLabel:
      "Ingresa tu direcci\u00f3n completa para encontrar tu casilla",
    addressPlaceholder: "ej. 123 Main St, Houston, TX 77001",
    lookUpButton: "Buscar mi casilla electoral",
    skipLink: "Omitir \u2014 la buscar\u00e9 yo mismo/a",
    loadingLocations: "Buscando tu casilla electoral\u2026",
    pollingPlace: "Tu casilla electoral",
    earlyVoteSites: "Sitios de votaci\u00f3n anticipada",
    getDirections: "C\u00f3mo llegar",
    hours: "Horario",
    fallbackMessage: "No pudimos encontrar tu casilla autom\u00e1ticamente.",
    fallbackLink: "Busca tu casilla en el sitio web electoral de tu condado",
    noLocationsFound: "No se encontraron casillas para esta direcci\u00f3n.",
    privacyNote:
      "Tu direcci\u00f3n se env\u00eda a la API de Google Civic para encontrar tu casilla. No la almacenamos.",
  },
  a11y: {
    skipToContent: "Ir al contenido principal",
    languageToggleLabel: "Cambiar a ingl\u00e9s",
  },
};

export const translations: Record<Language, Translations> = { en, es };
