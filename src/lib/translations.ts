import type { DeadlineStatus } from "../types/election";

export type Language = "en" | "es";

export interface Translations {
  skipLink: string;
  hero: {
    title: string;
    subtitle: string;
    worksWith: string;
  };
  zipForm: {
    label: string;
    placeholder: string;
    submit: string;
    loading: string;
    errors: {
      required: string;
      invalid: string;
    };
  };
  notFound: {
    title: string;
    description: (zip: string) => string;
    linkText: string;
  };
  stateInfo: {
    stateInfoTitle: (stateName: string) => string;
    nextElection: string;
    registrationDeadlines: string;
    earlyVoting: string;
    votingRules: string;
    voterIdLabel: string;
    phonesAtPollsLabel: string;
    noEarlyVoting: string;
    sameDayRegistration: string;
    checkRegistration: string;
    registrationDeadlinesPassed: string;
    noElectionFound: (stateName: string) => string;
    checkStateWebsite: string;
    countyElectionLink: string;
    sampleBallotLink: string;
    onlineLabel: string;
    byMailLabel: string;
    inPersonLabel: string;
    postmarkDetail: string;
    receivedDetail: string;
    primaryLabel: (type: string) => string;
    voterIdRequired: string;
    voterIdNotRequired: string;
    deadlinePassed: string;
    deadlineToday: string;
    deadlineNotAvailable: string;
    deadlineDaysLeft: (n: number) => string;
    deadlineStatusLabel: (status: DeadlineStatus) => string;
  };
  stateSelector: {
    title: string;
    subtitle: string;
    cancel: string;
    cancelAriaLabel: string;
  };
  promptOutput: {
    title: string;
    instructions: string;
    copyButton: string;
    copiedButton: string;
    copyAriaLabel: string;
    copiedStatus: string;
  };
  tips: {
    heading: string;
    items: string[];
    disclaimer: string;
  };
  footer: {
    share: string;
    created: string;
  };
}

const en: Translations = {
  skipLink: "Skip to main content",
  hero: {
    title: "Know What You're Voting For",
    subtitle:
      "Enter your zip code to get a customized AI ballot research prompt. Paste it into any free AI chatbot to research candidates based on what they've actually done.",
    worksWith: "Works with:",
  },
  zipForm: {
    label: "Your zip code",
    placeholder: "e.g. 90210",
    submit: "Look Up",
    loading: "Loading…",
    errors: {
      required: "Please enter a zip code",
      invalid: "Please enter a valid 5-digit zip code",
    },
  },
  notFound: {
    title: "Zip code not found",
    description: (zip: string) =>
      `We don't have data for zip code ${zip} yet. We're working on adding all U.S. zip codes.`,
    linkText: "Find your state election website",
  },
  stateInfo: {
    stateInfoTitle: (stateName: string) => `${stateName} Election Info`,
    nextElection: "Next Election",
    registrationDeadlines: "Registration Deadlines",
    earlyVoting: "Early Voting",
    votingRules: "Voting Rules",
    voterIdLabel: "Voter ID:",
    phonesAtPollsLabel: "Phones at polls:",
    noEarlyVoting: "Not available — absentee voting only",
    sameDayRegistration: "✓ Same-day registration available",
    checkRegistration: "Check your registration status",
    registrationDeadlinesPassed:
      "Registration deadlines for this election have passed.",
    noElectionFound: (stateName: string) =>
      `No upcoming elections found for ${stateName}.`,
    checkStateWebsite: "Check the state election website",
    countyElectionLink: "County Election Office →",
    sampleBallotLink: "Sample Ballot Lookup →",
    onlineLabel: "Online",
    byMailLabel: "By mail",
    inPersonLabel: "In person",
    postmarkDetail: "postmark",
    receivedDetail: "received",
    primaryLabel: (type: string) =>
      `${type.charAt(0).toUpperCase() + type.slice(1)} primary`,
    voterIdRequired: "Required",
    voterIdNotRequired: "Not required",
    deadlinePassed: "Passed",
    deadlineToday: "Today",
    deadlineNotAvailable: "Not available",
    deadlineDaysLeft: (n: number) => (n === 1 ? "1 day left" : `${n} days left`),
    deadlineStatusLabel: (status: DeadlineStatus) => {
      if (status.urgency === "passed") return "Passed";
      if (status.urgency === "na") return "Not available";
      if (status.daysLeft === 0) return "Today";
      return status.daysLeft === 1
        ? "1 day left"
        : `${status.daysLeft} days left`;
    },
  },
  stateSelector: {
    title: "Which state are you voting in?",
    subtitle: "This zip code spans multiple states.",
    cancel: "Cancel",
    cancelAriaLabel: "Cancel state selection",
  },
  promptOutput: {
    title: "Your Customized Prompt",
    instructions:
      "Copy this prompt and paste it as your first message in any AI chatbot.",
    copyButton: "Copy to Clipboard",
    copiedButton: "Copied!",
    copyAriaLabel: "Copy prompt to clipboard",
    copiedStatus: "✓ Copied!",
  },
  tips: {
    heading: "Tips for the conversation",
    items: [
      'You can say "I don\'t know" or "I\'m not sure" — the AI will help you figure it out',
      'Ask it to research something for you ("Can you look up this candidate\'s voting record?")',
      'You can ask questions anytime ("What does this position actually do?")',
      "At the end, it'll give you a printable ballot summary you can take to the polls",
    ],
    disclaimer:
      "AI can make mistakes. This is a research starting point — the tool links to official sources so you can verify anything that matters.",
  },
  footer: {
    share: "Share this tool with voters in your community",
    created: "Created by a human using AI tools",
  },
};

const es: Translations = {
  skipLink: "Ir al contenido principal",
  hero: {
    title: "Sabe por quién vas a votar",
    subtitle:
      "Ingresa tu código postal para obtener un prompt personalizado de investigación electoral. Pégalo en cualquier chatbot de IA gratuito para investigar candidatos según lo que realmente han hecho.",
    worksWith: "Funciona con:",
  },
  zipForm: {
    label: "Tu código postal",
    placeholder: "ej. 90210",
    submit: "Buscar",
    loading: "Cargando…",
    errors: {
      required: "Por favor ingresa un código postal",
      invalid: "Por favor ingresa un código postal válido de 5 dígitos",
    },
  },
  notFound: {
    title: "Código postal no encontrado",
    description: (zip: string) =>
      `Aún no tenemos datos para el código postal ${zip}. Estamos trabajando para agregar todos los códigos postales de EE.UU.`,
    linkText: "Encuentra el sitio web electoral de tu estado",
  },
  stateInfo: {
    stateInfoTitle: (stateName: string) =>
      `Información Electoral de ${stateName}`,
    nextElection: "Próxima Elección",
    registrationDeadlines: "Fechas Límite de Registro",
    earlyVoting: "Votación Anticipada",
    votingRules: "Reglas de Votación",
    voterIdLabel: "Identificación para votar:",
    phonesAtPollsLabel: "Teléfonos en las casillas:",
    noEarlyVoting: "No disponible — solo voto en ausencia",
    sameDayRegistration: "✓ Registro el mismo día disponible",
    checkRegistration: "Verifica tu estado de registro",
    registrationDeadlinesPassed:
      "Las fechas límite de registro para esta elección ya pasaron.",
    noElectionFound: (stateName: string) =>
      `No se encontraron elecciones próximas para ${stateName}.`,
    checkStateWebsite: "Consulta el sitio web electoral del estado",
    countyElectionLink: "Oficina Electoral del Condado →",
    sampleBallotLink: "Consulta de Boleta de Muestra →",
    onlineLabel: "En línea",
    byMailLabel: "Por correo",
    inPersonLabel: "En persona",
    postmarkDetail: "matasellos",
    receivedDetail: "recibido",
    primaryLabel: (type: string) =>
      `${type.charAt(0).toUpperCase() + type.slice(1)} primaria`,
    voterIdRequired: "Requerida",
    voterIdNotRequired: "No requerida",
    deadlinePassed: "Pasada",
    deadlineToday: "Hoy",
    deadlineNotAvailable: "No disponible",
    deadlineDaysLeft: (n: number) =>
      n === 1 ? "Queda 1 día" : `Quedan ${n} días`,
    deadlineStatusLabel: (status: DeadlineStatus) => {
      if (status.urgency === "passed") return "Pasada";
      if (status.urgency === "na") return "No disponible";
      if (status.daysLeft === 0) return "Hoy";
      return status.daysLeft === 1 ? "Queda 1 día" : `Quedan ${status.daysLeft} días`;
    },
  },
  stateSelector: {
    title: "¿En qué estado vas a votar?",
    subtitle: "Este código postal abarca varios estados.",
    cancel: "Cancelar",
    cancelAriaLabel: "Cancelar selección de estado",
  },
  promptOutput: {
    title: "Tu Prompt Personalizado",
    instructions:
      "Copia este prompt y pégalo como tu primer mensaje en cualquier chatbot de IA.",
    copyButton: "Copiar al Portapapeles",
    copiedButton: "¡Copiado!",
    copyAriaLabel: "Copiar prompt al portapapeles",
    copiedStatus: "✓ ¡Copiado!",
  },
  tips: {
    heading: "Consejos para la conversación",
    items: [
      'Puedes decir "No sé" o "No estoy seguro/a" — la IA te ayudará a descubrirlo',
      'Pídele que investigue algo por ti ("¿Puedes buscar el historial de votación de este candidato?")',
      'Puedes hacer preguntas en cualquier momento ("¿Qué hace exactamente este cargo?")',
      "Al final, te dará un resumen imprimible de tu boleta para llevar a las urnas",
    ],
    disclaimer:
      "La IA puede cometer errores. Esto es un punto de partida — la herramienta enlaza a fuentes oficiales para que puedas verificar lo que importa.",
  },
  footer: {
    share: "Comparte esta herramienta con votantes de tu comunidad",
    created: "Creado por una persona usando herramientas de IA",
  },
};

export const TRANSLATIONS: Record<Language, Translations> = { en, es };
