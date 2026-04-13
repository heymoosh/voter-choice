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
    privacyPolicy: string;
    termsOfUse: string;
    dataLastUpdated: (date: string) => string;
    copyright: string;
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
  landing: {
    brandName: string;
    heroHeadline: string;
    heroSubtext: string;
    trustNoData: string;
    trustNoAccounts: string;
    trustPrivate: string;
    returningBadge: string;
    returningHeadline: string;
    returningSubtext: string;
    returningNote: string;
    returningUploadTitle: string;
    returningUploadHint: string;
    returningSelectFile: string;
    returningDragDrop: string;
    resourcePollingTitle: string;
    resourcePollingDesc: string;
    resourcePollingCta: string;
    resourceDatesTitle: string;
    resourceDatesDesc: string;
    resourceIdTitle: string;
    resourceIdDesc: string;
    howItWorksTitle: string;
    howItWorksSubtext: string;
    step1Title: string;
    step1Desc: string;
    step2Title: string;
    step2Desc: string;
    step3Title: string;
    step3Desc: string;
    ctaHeadline: string;
    ctaSubtext: string;
    ctaButton: string;
    missionTitle: string;
    missionQuote: string;
    footerTagline: string;
    footerResources: string;
    footerLegal: string;
    footerConnect: string;
    footerBallotData: string;
    footerSourceCode: string;
    footerSupport: string;
  };
  research: {
    sidebarTitle: string;
    sidebarSubtitle: string;
    navResearch: string;
    navResources: string;
    tabDates: string;
    tabId: string;
    tabPolling: string;
    tabBallot: string;
    checkRegistration: string;
    memoLabel: string;
    ballotSelections: string;
    statusLabel: string;
    statusInitialized: string;
    regionLabel: string;
    historicalContext: string;
    historicalContextQuote: string;
    daysUntilElection: string;
    inputLabel: string;
    inputPlaceholder: string;
    chipNotSure: string;
    chipCandidates: string;
    chipBallot: string;
    chipCounty: string;
    progressLabel: string;
    selectionsLabel: string;
    viewLedger: string;
    verifiedSources: string;
    sourcesDisclaimer: string;
    deepSearchLabel: string;
    deepSearchPlaceholder: string;
    nonPartisanNotice: string;
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
    privacyPolicy: "Privacy Policy",
    termsOfUse: "Terms of Use",
    dataLastUpdated: (date: string) => `Data last updated: ${date}`,
    copyright: "\u00a9 2026 Grey Bird LLC. All Rights Reserved.",
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
  landing: {
    brandName: "Civic Research",
    heroHeadline: "Your Ballot, Your Research, Your Privacy.",
    heroSubtext:
      "The Modern Archivist\u2019s approach to democracy. Unbiased data, locally curated, and strictly anonymous. No accounts, no cookies, just the facts.",
    trustNoData: "No data stored.",
    trustNoAccounts: "No accounts.",
    trustPrivate: "100% private.",
    returningBadge: "Efficiency",
    returningHeadline: "Returning User? Jumpstart your Personalized Ballot.",
    returningSubtext:
      "If you have a Voter Profile from a previous session, upload below to get a quick start on your ballot.",
    returningNote:
      "Note: We do NOT store any data. Our unique encryption protocol allows you to save progress locally. When you return, simply reload your file.",
    returningUploadTitle: "Upload Your Voter Profile",
    returningUploadHint: "Drag and drop your voter profile .txt file here.",
    returningSelectFile: "Select File",
    returningDragDrop: "or drag and drop here",
    resourcePollingTitle: "Polling Places",
    resourcePollingDesc:
      "Find your nearest precinct and early voting locations for the upcoming election. Zero tracking.",
    resourcePollingCta: "Locate Now",
    resourceDatesTitle: "Election Dates",
    resourceDatesDesc:
      "Check registration deadlines, early voting schedules, and key dates for your election.",
    resourceIdTitle: "ID Rules",
    resourceIdDesc:
      "Detailed breakdown of state-specific ID requirements. Don\u2019t be surprised at the door.",
    howItWorksTitle: "How it Works",
    howItWorksSubtext:
      "Empowering your vote through neutral, data-driven insights. Our platform transforms complex legislative data into clear, non-partisan research.",
    step1Title: "Locate Your District",
    step1Desc:
      "Instantly map your residential zip code to your specific electoral district and candidates.",
    step2Title: "Engage the Archivist",
    step2Desc:
      "Ask anything about candidate voting records, donor history, or legislative impacts.",
    step3Title: "Take Action",
    step3Desc:
      "Download your personalized voter guide to carry into the polling booth.",
    ctaHeadline: "Ready to choose?",
    ctaSubtext:
      "Join thousands of informed citizens using Civic Research for non-partisan guidance.",
    ctaButton: "Get Started Now",
    missionTitle: "Mission Statement",
    missionQuote:
      "\u201cWe believe democracy thrives when barriers to information are removed. Voter Choice was built to provide a high-fidelity, archival interface for civic data, ensuring that every citizen has access to their local ballot without the cost of their personal privacy.\u201d",
    footerTagline:
      "A non-partisan digital archive dedicated to civic clarity. Produced by Civic Research.",
    footerResources: "Resources",
    footerLegal: "Legal",
    footerConnect: "Connect",
    footerBallotData: "Ballot Data",
    footerSourceCode: "Source Code",
    footerSupport: "Support",
  },
  research: {
    sidebarTitle: "Election Guide",
    sidebarSubtitle: "Local Civic Utility",
    navResearch: "Research",
    navResources: "Resources",
    tabDates: "Dates",
    tabId: "ID Requirements",
    tabPolling: "Polling Places",
    tabBallot: "Sample Ballot",
    checkRegistration: "Check Registration",
    memoLabel: "Research Memo",
    ballotSelections: "Ballot Selections",
    statusLabel: "Status",
    statusInitialized: "Voter File Initialized",
    regionLabel: "Region",
    historicalContext: "Historical Context",
    historicalContextQuote:
      "Municipal elections in Texas often see lower turnout than general cycles, meaning your individual vote carries significantly more weight in determining local policy and educational funding.",
    daysUntilElection: "Days until election",
    inputLabel: "Your response",
    inputPlaceholder: "Type your thoughts, or just say 'I'm not sure'...",
    chipNotSure: "I'm not sure",
    chipCandidates: "Tell me about the candidates",
    chipBallot: "What's on my ballot?",
    chipCounty: "I'm in Travis County",
    progressLabel: "Progress",
    selectionsLabel: "Selections",
    viewLedger: "View Full Ledger",
    verifiedSources: "Verified Sources",
    sourcesDisclaimer:
      "Sources are from Claude\u2019s training data. Always verify with official records before voting.",
    deepSearchLabel: "Deep Search Prompt",
    deepSearchPlaceholder:
      "Ask about candidate history, voting records, or ballot measures...",
    nonPartisanNotice:
      "Verified Non-Partisan Database \u2022 Educational Use Only",
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
    privacyPolicy: "Pol\u00edtica de Privacidad",
    termsOfUse: "T\u00e9rminos de Uso",
    dataLastUpdated: (date: string) => `Datos actualizados: ${date}`,
    copyright: "\u00a9 2026 Grey Bird LLC. Todos los derechos reservados.",
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
  landing: {
    brandName: "Civic Research",
    heroHeadline: "Tu Boleta, Tu Investigaci\u00f3n, Tu Privacidad.",
    heroSubtext:
      "El enfoque del Archivista Moderno hacia la democracia. Datos imparciales, curados localmente, y estrictamente an\u00f3nimos. Sin cuentas, sin cookies, solo los hechos.",
    trustNoData: "Sin datos almacenados.",
    trustNoAccounts: "Sin cuentas.",
    trustPrivate: "100% privado.",
    returningBadge: "Eficiencia",
    returningHeadline:
      "\u00bfUsuario que regresa? Impulsa tu Boleta Personalizada.",
    returningSubtext:
      "Si tienes un Perfil de Votante de una sesi\u00f3n anterior, s\u00fabelo a continuaci\u00f3n para comenzar r\u00e1pidamente con tu boleta.",
    returningNote:
      "Nota: NO almacenamos ning\u00fan dato. Nuestro protocolo \u00fanico de encriptaci\u00f3n te permite guardar tu progreso localmente. Cuando regreses, simplemente recarga tu archivo.",
    returningUploadTitle: "Sube tu Perfil de Votante",
    returningUploadHint:
      "Arrastra y suelta tu archivo de perfil de votante .txt aqu\u00ed.",
    returningSelectFile: "Seleccionar Archivo",
    returningDragDrop: "o arrastra y suelta aqu\u00ed",
    resourcePollingTitle: "Casillas Electorales",
    resourcePollingDesc:
      "Encuentra tu casilla m\u00e1s cercana y los sitios de votaci\u00f3n anticipada para la pr\u00f3xima elecci\u00f3n. Sin rastreo.",
    resourcePollingCta: "Localizar Ahora",
    resourceDatesTitle: "Fechas Electorales",
    resourceDatesDesc:
      "Consulta fechas l\u00edmite de registro, horarios de votaci\u00f3n anticipada y fechas clave de tu elecci\u00f3n.",
    resourceIdTitle: "Reglas de ID",
    resourceIdDesc:
      "Desglose detallado de los requisitos de identificaci\u00f3n espec\u00edficos de tu estado. No te sorprendas en la puerta.",
    howItWorksTitle: "C\u00f3mo Funciona",
    howItWorksSubtext:
      "Empoderando tu voto con informaci\u00f3n neutral y basada en datos. Nuestra plataforma transforma datos legislativos complejos en investigaci\u00f3n clara y no partidista.",
    step1Title: "Localiza tu Distrito",
    step1Desc:
      "Mapea instant\u00e1neamente tu c\u00f3digo postal a tu distrito electoral espec\u00edfico y candidatos.",
    step2Title: "Consulta al Archivista",
    step2Desc:
      "Pregunta lo que quieras sobre registros de votaci\u00f3n de candidatos, historial de donantes o impactos legislativos.",
    step3Title: "Toma Acci\u00f3n",
    step3Desc:
      "Descarga tu gu\u00eda personalizada de votante para llevar a la casilla electoral.",
    ctaHeadline: "\u00bfListo para elegir?",
    ctaSubtext:
      "\u00danete a miles de ciudadanos informados que usan Civic Research para orientaci\u00f3n no partidista.",
    ctaButton: "Comienza Ahora",
    missionTitle: "Declaraci\u00f3n de Misi\u00f3n",
    missionQuote:
      "\u201cCreemos que la democracia prospera cuando se eliminan las barreras a la informaci\u00f3n. Voter Choice fue creado para proporcionar una interfaz archiv\u00edstica de alta fidelidad para datos c\u00edvicos, asegurando que cada ciudadano tenga acceso a su boleta local sin el costo de su privacidad personal.\u201d",
    footerTagline:
      "Un archivo digital no partidista dedicado a la claridad c\u00edvica. Producido por Civic Research.",
    footerResources: "Recursos",
    footerLegal: "Legal",
    footerConnect: "Conectar",
    footerBallotData: "Datos Electorales",
    footerSourceCode: "C\u00f3digo Fuente",
    footerSupport: "Soporte",
  },
  research: {
    sidebarTitle: "Gu\u00eda Electoral",
    sidebarSubtitle: "Utilidad C\u00edvica Local",
    navResearch: "Investigaci\u00f3n",
    navResources: "Recursos",
    tabDates: "Fechas",
    tabId: "Requisitos de ID",
    tabPolling: "Casillas",
    tabBallot: "Boleta de Muestra",
    checkRegistration: "Verificar Registro",
    memoLabel: "Memorando de Investigaci\u00f3n",
    ballotSelections: "Selecciones de Boleta",
    statusLabel: "Estado",
    statusInitialized: "Archivo de Votante Inicializado",
    regionLabel: "Regi\u00f3n",
    historicalContext: "Contexto Hist\u00f3rico",
    historicalContextQuote:
      "Las elecciones municipales en Texas a menudo ven menor participaci\u00f3n que los ciclos generales, lo que significa que tu voto individual tiene significativamente m\u00e1s peso en determinar la pol\u00edtica local y el financiamiento educativo.",
    daysUntilElection: "D\u00edas hasta la elecci\u00f3n",
    inputLabel: "Tu respuesta",
    inputPlaceholder:
      "Escribe tus ideas, o simplemente di 'No estoy seguro'...",
    chipNotSure: "No estoy seguro",
    chipCandidates: "Cu\u00e9ntame de los candidatos",
    chipBallot: "\u00bfQu\u00e9 hay en mi boleta?",
    chipCounty: "Estoy en el Condado de Travis",
    progressLabel: "Progreso",
    selectionsLabel: "Selecciones",
    viewLedger: "Ver Registro Completo",
    verifiedSources: "Fuentes Verificadas",
    sourcesDisclaimer:
      "Las fuentes provienen de los datos de entrenamiento de Claude. Siempre verifica con registros oficiales antes de votar.",
    deepSearchLabel: "B\u00fasqueda Profunda",
    deepSearchPlaceholder:
      "Pregunta sobre historial de candidatos, registros de votaci\u00f3n o medidas electorales...",
    nonPartisanNotice:
      "Base de Datos No Partidista Verificada \u2022 Solo Uso Educativo",
  },
  a11y: {
    skipToContent: "Ir al contenido principal",
    languageToggleLabel: "Cambiar a ingl\u00e9s",
  },
};

export const translations: Record<Language, Translations> = { en, es };
