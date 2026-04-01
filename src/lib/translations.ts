export type Language = "en" | "es";

export interface Translations {
  meta: { title: string; description: string };
  hero: {
    headline: string;
    subtitle: string;
    worksWith: string;
  };
  zipForm: {
    label: string;
    placeholder: string;
    submit: string;
    errorEmpty: string;
    errorInvalid: string;
  };
  stateSelector: {
    title: string;
    description: (zip: string) => string;
    label: string;
    placeholder: string;
  };
  stateInfo: {
    titleSuffix: string;
    registrationDeadlines: string;
    online: string;
    byMail: string;
    inPerson: string;
    postmarkNote: string;
    receivedNote: string;
    sameDayAvailable: string;
    notAvailable: string;
    earlyVoting: string;
    earlyVotingNotAvailable: string;
    voterId: string;
    idRequired: string;
    idNotRequired: string;
    phonesAtPolls: string;
    sampleBallot: string;
    countyOffice: string;
    checkRegistration: string;
  };
  deadlineStatus: {
    passed: string;
    daysLeft: (n: number) => string;
    unavailable: string;
  };
  promptOutput: {
    title: string;
    instruction: string;
    copyButton: string;
    copied: string;
    copiedAria: string;
    copiedMessage: string;
    copyFallback: string;
  };
  tips: {
    title: string;
    items: { bold: string; rest: string }[];
  };
  footer: {
    share: string;
    attribution: string;
  };
  errors: {
    notFoundTitle: string;
    notFoundMessage: (zip: string) => string;
    notFoundLink: string;
    noElection: (stateName: string) => string;
    noElectionLink: (stateName: string) => string;
    deadlinesPassed: string;
    loading: string;
  };
  accessibility: {
    skipToContent: string;
    languageToggleLabel: string;
    languageChanged: string;
    electionInfoFor: (state: string) => string;
  };
}

const en: Translations = {
  meta: {
    title: "Free AI Ballot Research Tool",
    description:
      "Enter your zip code to get a customized AI prompt pre-filled with your state's election dates, deadlines, and voting rules. Paste it into any free AI chatbot to research your ballot.",
  },
  hero: {
    headline: "Free AI Ballot Research Tool",
    subtitle:
      "Enter your zip code below to get a customized AI research prompt pre-filled with your state\u2019s election dates, deadlines, and voting rules. Copy it and paste into any free AI chatbot to get started.",
    worksWith: "Works with:",
  },
  zipForm: {
    label: "Enter your zip code",
    placeholder: "e.g. 73301",
    submit: "Look up",
    errorEmpty: "Please enter a zip code.",
    errorInvalid: "Please enter a valid 5-digit zip code.",
  },
  stateSelector: {
    title: "This zip code spans multiple states",
    description: (zip: string) =>
      `Zip code ${zip} covers more than one state. Which state are you voting in?`,
    label: "Select your state",
    placeholder: "\u2014 Choose a state \u2014",
  },
  stateInfo: {
    titleSuffix: "Upcoming Election",
    registrationDeadlines: "Voter Registration Deadlines",
    online: "Online:",
    byMail: "By mail:",
    inPerson: "In person:",
    postmarkNote: "(postmark date counts)",
    receivedNote: "(must be received)",
    sameDayAvailable: "\u2713 Same-day registration available on Election Day",
    notAvailable: "Not available",
    earlyVoting: "Early Voting",
    earlyVotingNotAvailable: "Not available",
    voterId: "Voter ID",
    idRequired: "Photo ID required",
    idNotRequired: "No photo ID required",
    phonesAtPolls: "Phones at Polls",
    sampleBallot: "Sample ballot \u2192",
    countyOffice: "County election office \u2192",
    checkRegistration: "Check your registration \u2192",
  },
  deadlineStatus: {
    passed: "Passed",
    daysLeft: (n: number) => (n === 1 ? "1 day left" : `${n} days left`),
    unavailable: "Not available",
  },
  promptOutput: {
    title: "Your Customized Prompt",
    instruction:
      "Copy this prompt and paste it as your first message in any AI chatbot.",
    copyButton: "Copy to Clipboard",
    copied: "\u2713 Copied!",
    copiedAria: "Copied to clipboard",
    copiedMessage:
      "\u2713 Copied to clipboard! Open any AI chatbot and paste to begin.",
    copyFallback:
      "Could not copy automatically. Select all the text below and press Ctrl+C (Windows) or Cmd+C (Mac) to copy.",
  },
  tips: {
    title: "Tips for using the prompt",
    items: [
      {
        bold: 'You can say "I don\'t know"',
        rest: " \u2014 the AI will explain more and help you figure it out.",
      },
      {
        bold: "Ask for research",
        rest: ' \u2014 try "Can you look up this candidate\'s voting record?"',
      },
      {
        bold: "Ask questions anytime",
        rest: ' \u2014 "What does this position actually do?" or "Why does this matter?"',
      },
      {
        bold: "AI can make mistakes.",
        rest: " This is a research starting point. The prompt links you to official sources so you can double-check anything.",
      },
      {
        bold: "Many states prohibit phones at the polls.",
        rest: " Write down or print your ballot picks \u2014 you can bring written notes but may not be able to use your phone.",
      },
    ],
  },
  footer: {
    share:
      "Share this tool with friends, family, or your community. It works for any U.S. state and any election.",
    attribution: "Created by a human using AI tools.",
  },
  errors: {
    notFoundTitle: "Zip code not found",
    notFoundMessage: (zip: string) =>
      `We don\u2019t have data for zip code ${zip} yet. We\u2019re working on adding all U.S. zip codes.`,
    notFoundLink: "Find your state election website \u2192",
    noElection: (stateName: string) =>
      `No upcoming elections found for ${stateName}.`,
    noElectionLink: (stateName: string) => `${stateName} election website`,
    deadlinesPassed:
      "Registration deadlines for this election have passed. Check your registration status.",
    loading: "Looking up your state\u2026",
  },
  accessibility: {
    skipToContent: "Skip to main content",
    languageToggleLabel: "Switch to Espa\u00f1ol",
    languageChanged: "Language changed to English",
    electionInfoFor: (state: string) => `Election information for ${state}`,
  },
};

const es: Translations = {
  meta: {
    title: "Herramienta Gratuita de Investigaci\u00f3n Electoral con IA",
    description:
      "Ingresa tu c\u00f3digo postal para obtener un prompt de IA personalizado con las fechas electorales, plazos y reglas de votaci\u00f3n de tu estado.",
  },
  hero: {
    headline: "Herramienta Gratuita de Investigaci\u00f3n Electoral con IA",
    subtitle:
      "Ingresa tu c\u00f3digo postal a continuaci\u00f3n para obtener un prompt de investigaci\u00f3n de IA personalizado con las fechas electorales, plazos y reglas de votaci\u00f3n de tu estado. C\u00f3pialo y p\u00e9galo en cualquier chatbot de IA gratuito para comenzar.",
    worksWith: "Funciona con:",
  },
  zipForm: {
    label: "Ingresa tu c\u00f3digo postal",
    placeholder: "p. ej. 73301",
    submit: "Buscar",
    errorEmpty: "Por favor ingresa un c\u00f3digo postal.",
    errorInvalid:
      "Por favor ingresa un c\u00f3digo postal v\u00e1lido de 5 d\u00edgitos.",
  },
  stateSelector: {
    title: "Este c\u00f3digo postal abarca varios estados",
    description: (zip: string) =>
      `El c\u00f3digo postal ${zip} abarca m\u00e1s de un estado. \u00bfEn qu\u00e9 estado vas a votar?`,
    label: "Selecciona tu estado",
    placeholder: "\u2014 Elige un estado \u2014",
  },
  stateInfo: {
    titleSuffix: "Pr\u00f3xima Elecci\u00f3n",
    registrationDeadlines: "Plazos de Registro de Votantes",
    online: "En l\u00ednea:",
    byMail: "Por correo:",
    inPerson: "En persona:",
    postmarkNote: "(cuenta la fecha de matasellos)",
    receivedNote: "(debe ser recibido)",
    sameDayAvailable:
      "\u2713 Registro el mismo d\u00eda disponible el D\u00eda de la Elecci\u00f3n",
    notAvailable: "No disponible",
    earlyVoting: "Votaci\u00f3n Anticipada",
    earlyVotingNotAvailable: "No disponible",
    voterId: "Identificaci\u00f3n para Votar",
    idRequired: "Se requiere identificaci\u00f3n con foto",
    idNotRequired: "No se requiere identificaci\u00f3n con foto",
    phonesAtPolls: "Tel\u00e9fonos en las Casillas",
    sampleBallot: "Boleta de muestra \u2192",
    countyOffice: "Oficina electoral del condado \u2192",
    checkRegistration: "Verifica tu registro \u2192",
  },
  deadlineStatus: {
    passed: "Vencido",
    daysLeft: (n: number) =>
      n === 1 ? "Queda 1 d\u00eda" : `Quedan ${n} d\u00edas`,
    unavailable: "No disponible",
  },
  promptOutput: {
    title: "Tu Prompt Personalizado",
    instruction:
      "Copia este prompt y p\u00e9galo como tu primer mensaje en cualquier chatbot de IA.",
    copyButton: "Copiar al Portapapeles",
    copied: "\u2713 \u00a1Copiado!",
    copiedAria: "Copiado al portapapeles",
    copiedMessage:
      "\u2713 \u00a1Copiado al portapapeles! Abre cualquier chatbot de IA y pega para comenzar.",
    copyFallback:
      "No se pudo copiar autom\u00e1ticamente. Selecciona todo el texto de abajo y presiona Ctrl+C (Windows) o Cmd+C (Mac) para copiar.",
  },
  tips: {
    title: "Consejos para usar el prompt",
    items: [
      {
        bold: 'Puedes decir "no s\u00e9"',
        rest: " \u2014 la IA te explicar\u00e1 m\u00e1s y te ayudar\u00e1 a entenderlo.",
      },
      {
        bold: "Pide investigaci\u00f3n",
        rest: ' \u2014 prueba "\u00bfPuedes buscar el historial de votaci\u00f3n de este candidato?"',
      },
      {
        bold: "Haz preguntas en cualquier momento",
        rest: ' \u2014 "\u00bfQu\u00e9 hace realmente este puesto?" o "\u00bfPor qu\u00e9 importa esto?"',
      },
      {
        bold: "La IA puede cometer errores.",
        rest: " Este es un punto de partida para tu investigaci\u00f3n. El prompt te enlaza a fuentes oficiales para que puedas verificar todo.",
      },
      {
        bold: "Muchos estados proh\u00edben tel\u00e9fonos en las casillas.",
        rest: " Anota o imprime tus opciones de voto \u2014 puedes llevar notas escritas pero quiz\u00e1s no puedas usar tu tel\u00e9fono.",
      },
    ],
  },
  footer: {
    share:
      "Comparte esta herramienta con amigos, familiares o tu comunidad. Funciona para cualquier estado de EE.UU. y cualquier elecci\u00f3n.",
    attribution: "Creado por una persona usando herramientas de IA.",
  },
  errors: {
    notFoundTitle: "C\u00f3digo postal no encontrado",
    notFoundMessage: (zip: string) =>
      `A\u00fan no tenemos datos para el c\u00f3digo postal ${zip}. Estamos trabajando para agregar todos los c\u00f3digos postales de EE.UU.`,
    notFoundLink: "Encuentra el sitio web electoral de tu estado \u2192",
    noElection: (stateName: string) =>
      `No se encontraron elecciones pr\u00f3ximas para ${stateName}.`,
    noElectionLink: (stateName: string) =>
      `Sitio web electoral de ${stateName}`,
    deadlinesPassed:
      "Los plazos de registro para esta elecci\u00f3n ya pasaron. Verifica el estado de tu registro.",
    loading: "Buscando tu estado\u2026",
  },
  accessibility: {
    skipToContent: "Ir al contenido principal",
    languageToggleLabel: "Switch to English",
    languageChanged: "Idioma cambiado a espa\u00f1ol",
    electionInfoFor: (state: string) =>
      `Informaci\u00f3n electoral para ${state}`,
  },
};

export const translations: Record<Language, Translations> = { en, es };
