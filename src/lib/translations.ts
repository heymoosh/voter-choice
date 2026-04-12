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
  budget: {
    notice: string;
    softClose: string;
    exhausted: string;
    resetNote: string;
  };
  handoff: {
    header: string;
    ballotSoFar: string;
    voterProfile: string;
    continueHeader: string;
    copyContinuation: string;
    copied: string;
    downloadProfile: string;
    continueOn: string;
    clientFallbackHeader: string;
    clientFallbackBody: string;
  };
  ballot: {
    downloadBallot: string;
    downloadProfile: string;
    printReminder: string;
    buildBallot: string;
    pasteLabel: string;
    pastePlaceholder: string;
    generatePrintable: string;
    manualEntry: string;
    manualEntryDesc: string;
    raceName: string;
    candidateName: string;
    addRace: string;
    addProposition: string;
    propNumber: string;
    propVote: string;
    generateFromManual: string;
    preview: string;
    printBallot: string;
    closePrint: string;
  };
  profile: {
    uploadLabel: string;
    uploadButton: string;
    uploadAccept: string;
    uploadTooLarge: string;
    uploadInvalidType: string;
    uploadConfirmation: (date: string) => string;
    uploadGeneric: string;
    includeInPrompt: string;
  };
  rateLimit: {
    sessionLimit: string;
    ipLimit: string;
    messageCount: (current: number, max: number) => string;
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
  budget: {
    notice:
      "Free AI chat may be limited later this month. You can always copy the prompt to use in your own chatbot.",
    softClose:
      "Our AI chat is at capacity this month, but you can still research your ballot.",
    exhausted:
      "Our free AI chat has reached its monthly limit. Copy the prompt below and paste it into any free AI chatbot to continue your research.",
    resetNote: "Chat resets at the start of each month.",
  },
  handoff: {
    header: "Here\u2019s everything we\u2019ve worked on so far",
    ballotSoFar: "Your Ballot So Far",
    voterProfile: "Your Voter Profile",
    continueHeader: "Continue Where You Left Off",
    copyContinuation: "Copy Continuation Prompt",
    copied: "Copied!",
    downloadProfile: "Download Voter Profile",
    continueOn: "Continue your research on",
    clientFallbackHeader: "Your session so far",
    clientFallbackBody:
      "We\u2019ve packaged your conversation so you can continue in any AI chatbot.",
  },
  ballot: {
    downloadBallot: "Download My Ballot",
    downloadProfile: "Download My Voter Profile",
    printReminder:
      "Texas law bans wireless devices in the voting room. Print this or write it down.",
    buildBallot: "Build My Ballot",
    pasteLabel: "Paste the ballot output from your AI chatbot",
    pastePlaceholder: "Paste the MY BALLOT section here\u2026",
    generatePrintable: "Generate Printable Ballot",
    manualEntry: "Or enter your choices manually",
    manualEntryDesc:
      "Add each race and your chosen candidate, then generate a printable ballot.",
    raceName: "Race",
    candidateName: "Your pick",
    addRace: "Add race",
    addProposition: "Add proposition",
    propNumber: "Prop #",
    propVote: "YES / NO",
    generateFromManual: "Generate Printable Ballot",
    preview: "Ballot Preview",
    printBallot: "Print Ballot",
    closePrint: "Close",
  },
  profile: {
    uploadLabel: "Returning voter? Upload your voter profile",
    uploadButton: "Upload Profile (.txt)",
    uploadAccept: "Accepts .txt files only, max 10KB",
    uploadTooLarge: "File is too large. Maximum size is 10KB.",
    uploadInvalidType: "Please upload a .txt file.",
    uploadConfirmation: (date: string) =>
      `Welcome back! I found your profile from ${date}.`,
    uploadGeneric: "Welcome back! Your voter profile has been loaded.",
    includeInPrompt:
      "Your profile will be included when you start the chat or copy the prompt.",
  },
  rateLimit: {
    sessionLimit:
      "You\u2019ve reached the session message limit. Copy the continuation prompt below to keep going in any free AI chatbot.",
    ipLimit:
      "To keep this tool free for everyone, we limit sessions per day. Copy the prompt below to continue your research.",
    messageCount: (current: number, max: number) => `${current}/${max}`,
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
  budget: {
    notice:
      "El chat gratuito con IA puede ser limitado m\u00e1s adelante este mes. Siempre puedes copiar el mensaje para usarlo en tu propio chatbot.",
    softClose:
      "Nuestro chat con IA est\u00e1 al m\u00e1ximo este mes, pero a\u00fan puedes investigar tu boleta.",
    exhausted:
      "Nuestro chat gratuito con IA ha alcanzado su l\u00edmite mensual. Copia el mensaje a continuaci\u00f3n y p\u00e9galo en cualquier chatbot de IA gratuito para continuar tu investigaci\u00f3n.",
    resetNote: "El chat se reinicia al inicio de cada mes.",
  },
  handoff: {
    header: "Aqu\u00ed est\u00e1 todo en lo que hemos trabajado hasta ahora",
    ballotSoFar: "Tu boleta hasta ahora",
    voterProfile: "Tu perfil de votante",
    continueHeader: "Contin\u00faa donde lo dejaste",
    copyContinuation: "Copiar mensaje de continuaci\u00f3n",
    copied: "\u00a1Copiado!",
    downloadProfile: "Descargar perfil de votante",
    continueOn: "Contin\u00faa tu investigaci\u00f3n en",
    clientFallbackHeader: "Tu sesi\u00f3n hasta ahora",
    clientFallbackBody:
      "Hemos empaquetado tu conversaci\u00f3n para que puedas continuar en cualquier chatbot de IA.",
  },
  ballot: {
    downloadBallot: "Descargar mi boleta",
    downloadProfile: "Descargar mi perfil de votante",
    printReminder:
      "La ley de Texas proh\u00edbe dispositivos inal\u00e1mbricos en la sala de votaci\u00f3n. Imprime esto o escr\u00edbelo.",
    buildBallot: "Construir mi boleta",
    pasteLabel: "Pega el resultado de la boleta de tu chatbot de IA",
    pastePlaceholder: "Pega la secci\u00f3n MI BOLETA aqu\u00ed\u2026",
    generatePrintable: "Generar boleta imprimible",
    manualEntry: "O ingresa tus elecciones manualmente",
    manualEntryDesc:
      "Agrega cada contienda y tu candidato elegido, luego genera una boleta imprimible.",
    raceName: "Contienda",
    candidateName: "Tu elecci\u00f3n",
    addRace: "Agregar contienda",
    addProposition: "Agregar proposici\u00f3n",
    propNumber: "Prop #",
    propVote: "S\u00cd / NO",
    generateFromManual: "Generar boleta imprimible",
    preview: "Vista previa de la boleta",
    printBallot: "Imprimir boleta",
    closePrint: "Cerrar",
  },
  profile: {
    uploadLabel: "\u00bfVotante que regresa? Sube tu perfil de votante",
    uploadButton: "Subir perfil (.txt)",
    uploadAccept: "Solo archivos .txt, m\u00e1ximo 10KB",
    uploadTooLarge:
      "El archivo es demasiado grande. El tama\u00f1o m\u00e1ximo es 10KB.",
    uploadInvalidType: "Por favor sube un archivo .txt.",
    uploadConfirmation: (date: string) =>
      `\u00a1Bienvenido/a de vuelta! Encontr\u00e9 tu perfil de ${date}.`,
    uploadGeneric:
      "\u00a1Bienvenido/a de vuelta! Tu perfil de votante ha sido cargado.",
    includeInPrompt:
      "Tu perfil se incluir\u00e1 cuando inicies el chat o copies el mensaje.",
  },
  rateLimit: {
    sessionLimit:
      "Has alcanzado el l\u00edmite de mensajes de la sesi\u00f3n. Copia el mensaje de continuaci\u00f3n a continuaci\u00f3n para seguir en cualquier chatbot de IA gratuito.",
    ipLimit:
      "Para mantener esta herramienta gratuita para todos, limitamos las sesiones por d\u00eda. Copia el mensaje a continuaci\u00f3n para continuar tu investigaci\u00f3n.",
    messageCount: (current: number, max: number) => `${current}/${max}`,
  },
  a11y: {
    skipToContent: "Ir al contenido principal",
    languageToggleLabel: "Cambiar a ingl\u00e9s",
  },
};

export const translations: Record<Language, Translations> = { en, es };
