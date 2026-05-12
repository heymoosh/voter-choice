import type { Translations } from "./types";

export const es: Translations = {
  hero: {
    headline: "Conoce por qué estás votando",
    subtitle:
      "Ingresa tu código postal para obtener un aviso personalizado para investigar tu boleta con IA. Pégalo en cualquier chatbot de IA gratuito — Claude, ChatGPT, Gemini o Grok — y recibe una guía personalizada de cada cargo y propuesta en tu boleta.",
    chatbotLabel: "Abrir",
  },
  zipForm: {
    label: "Ingresa tu código postal",
    placeholder: "ej. 73301",
    submitButton: "Buscar mi boleta",
  },
  errors: {
    emptyZip: "Por favor ingresa un código postal",
    invalidZip: "Por favor ingresa un código postal válido de 5 dígitos",
    zipNotFound: {
      heading: "Código postal no encontrado",
      message:
        "Aún no tenemos datos para este código postal. Estamos trabajando para agregar todos los códigos postales de EE. UU.",
      linkText: "Encuentra el sitio web electoral de tu estado",
    },
    multiState:
      "Este código postal abarca varios estados. ¿En qué estado vas a votar?",
    deadlinesPassed:
      "Las fechas límite de registro para esta elección ya pasaron. En algunos estados aún puedes registrarte el Día de las Elecciones.",
    noElections: (state: string) =>
      `No se encontraron elecciones próximas para ${state}. Consulta el sitio web electoral de tu estado para más información.`,
    loadFailed:
      "No se pudieron cargar los datos del estado. Por favor intenta de nuevo.",
  },
  stateInfo: {
    title: "Información de tu elección",
    election: "Elección",
    electionDate: "Fecha",
    registrationDeadlines: "Fechas límite de registro",
    online: "En línea",
    byMail: "Por correo",
    inPerson: "En persona",
    postmark: "fecha de matasellos",
    received: "fecha de recepción",
    earlyVoting: "Votación anticipada",
    earlyVotingFrom: "del",
    earlyVotingThrough: "al",
    earlyVotingNotAvailable: "No disponible — solo voto en ausencia",
    voterId: "Identificación para votar",
    voterIdRequired: "Requerida",
    voterIdNotRequired: "No requerida",
    acceptedIds: "Identificaciones aceptadas",
    phonesAtPolls: "Teléfonos en las casillas",
    sampleBallot: "Boleta de muestra",
    countyOffice: "Oficina electoral del condado",
    noUpcomingElection:
      "No se encontraron elecciones próximas — consulta el sitio web electoral de tu estado.",
  },
  deadline: {
    passed: "Vencido",
    daysLeft: (n: number) => `Quedan ${n} día${n === 1 ? "" : "s"}`,
    today: "Vence hoy",
  },
  prompt: {
    instructions:
      "Copia este aviso y pégalo en cualquier chatbot de IA gratuito para comenzar a investigar tu boleta.",
    copyButton: "Copiar al portapapeles",
    copiedButton: "¡Copiado!",
    fallbackInstructions:
      "Selecciona todo el texto de arriba (Ctrl+A o Cmd+A) y cópialo manualmente.",
  },
  tips: {
    heading: "Consejos para tu conversación",
    item1:
      'Puedes decir "No sé" o "No estoy seguro/a de mi postura" — la IA te explicará más y te ayudará a entender el tema.',
    item2:
      'Puedes pedirle que investigue algo por ti (por ej., "¿Puedes buscar el historial de votación de este candidato?").',
    item3:
      'Puedes hacer preguntas en cualquier momento ("¿Qué hace exactamente este cargo?" o "¿Por qué es importante?").',
    item4:
      "Al final, la IA te dará un resumen que puedes imprimir y llevar a las urnas.",
    chatbotNote:
      "Estos consejos aplican ya sea que uses Claude, ChatGPT, Gemini, Grok u otro chatbot de IA.",
  },
  footer: {
    shareHeading: "Comparte esta herramienta",
    shareText:
      "¿Conoces a alguien que quiera votar informado/a? Comparte esta página con amigos, familia o tu comunidad. Funciona para cualquier estado y cualquier elección.",
    attribution: "Creado por una persona usando herramientas de IA",
  },
  stateSelector: {
    prompt:
      "Este código postal abarca varios estados. ¿En qué estado vas a votar?",
  },
  loading: "Buscando información sobre tu elección…",
  accessibility: {
    skipToContent: "Ir al contenido principal",
    languageChanged: "Idioma cambiado a español",
    loadingElectionInfo: "Cargando información electoral",
  },
  languageToggle: {
    label: "Idioma",
    switchToEnglish: "Cambiar a inglés",
    switchToSpanish: "Cambiar a español",
  },
};
