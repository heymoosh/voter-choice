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
    switchToVietnamese: "Cambiar a vietnamita",
    switchToChinese: "Cambiar a chino",
    switchToArabic: "Cambiar a árabe",
  },
  liveData: {
    pollingLocation: "Lugar de Votación",
    ballotContests: "Contiendas en la Boleta",
    candidateDetail: {
      viewRecord: "Ver historial de votación",
      votingRecord: "Historial de Votación",
      topDonors: "Principales Donantes",
      endorsements: "Respaldos",
    },
    loading: "Cargando datos electorales...",
    attribution:
      "Datos electorales de Google Civic Information y búsqueda web en vivo vía Anthropic.",
    lastUpdated: "Actualizado",
    errors: {
      apiPartial:
        "Algunos datos electorales no están disponibles temporalmente. La información mostrada está actualizada.",
      apiFull:
        "Tenemos problemas para cargar datos electorales en vivo. Aquí está lo que sabemos sobre votar en tu estado.",
    },
  },
  phase5: {
    chat: {
      ctaButton: "Investigar mi boleta con IA",
      privacyNotice:
        "Tu conversación permanece solo en tu navegador — no la almacenamos. Si cierras o refrescas esta página, tu conversación se perderá. Descarga tu boleta y perfil de votante antes de salir.",
      inputPlaceholder: "Escribe tu mensaje...",
      sendButton: "Enviar",
      budgetNotice70:
        "El chat de IA gratuito puede tener límites más tarde este mes. Siempre puedes usar la opción de copiar y pegar.",
      budgetNotice90:
        "El chat de IA gratuito está agotándose este mes. Considera usar la opción de copiar y pegar para una experiencia sin interrupciones.",
      chatDisabledMessage:
        "Nuestro chat de IA gratuito ha alcanzado su límite mensual. Aún puedes investigar tu boleta — copia el prompt abajo y pégalo en cualquier chatbot de IA gratuito.",
      sessionLimitMessage:
        "Para mantener esta herramienta gratuita para todos, limitamos las sesiones por día. Puedes continuar tu investigación copiando el prompt abajo.",
      loadingMessage: "Pensando...",
    },
    ballot: {
      sectionHeading: "Crear mi boleta",
      pasteAreaLabel: "Pega aquí el resultado de la IA para tu boleta",
      pasteInstructions:
        "Después de tu conversación con la IA, copia la sección 'MI BOLETA' y pégala aquí para generar tu boleta descargable.",
      parseErrorMessage:
        "No pudimos leer ese formato. Intenta copiar solo la sección 'MI BOLETA' de tu conversación con la IA, o ingresa tus elecciones manualmente abajo.",
      manualEntryHeading: "Ingresar elecciones manualmente",
      manualAddRaceButton: "Agregar contienda",
      downloadButton: "Descargar / Imprimir mi boleta",
      previewHeading: "Vista previa de la boleta",
      disclaimer:
        "Esta es tu referencia personal, no una boleta oficial. Verifica toda la información en tu oficina electoral estatal.",
    },
    profile: {
      uploadLabel: "¿Votante habitual? Sube tu perfil de votante",
      uploadPrivacyNotice:
        "Tu perfil se usa solo para esta sesión y no se almacena en nuestros servidores.",
      confirmationMessage:
        "Perfil de votante cargado. Esto se incluirá en tu conversación con la IA.",
      downloadButton: "Descargar mi perfil de votante",
      downloadNote:
        "Guarda este archivo en un lugar que encuentres antes de las próximas elecciones. Cuando regreses, súbelo para no tener que empezar desde cero.",
      sizeError:
        "El archivo es demasiado grande. Los perfiles de votante deben ser menores de 10KB.",
      typeError: "Por favor sube un archivo .txt.",
    },
    alignment: {
      strongLabel: "Alineación fuerte",
      mixedLabel: "Alineación mixta",
      weakLabel: "Alineación débil",
      expandButton: "Expandir desglose",
      collapseButton: "Contraer desglose",
      parseError:
        "No se pudieron generar puntajes de alineación para esta respuesta — intenta pedirle a la IA que califique a los candidatos de nuevo.",
      overallLabel: "Alineación",
    },
  },
  phase6: {
    issueRanking: {
      heading: "Clasifica tus prioridades",
      subheading:
        "Arrastra los temas a continuación en tu orden de preferencia — el más importante arriba.",
      skipButton: "Omitir — investigar sin prioridades",
      confirmButton: "Estas son mis prioridades",
      ariaGrabbed:
        "Agarrado. Usa las teclas de flecha para reordenar, Espacio para soltar.",
      ariaDropped: (position: number, total: number) =>
        `Soltado. Ahora en posición ${position} de ${total}.`,
    },
    concernDisambiguation: {
      heading: "¿Algo más en tu mente?",
      placeholder: "p.ej. 'Alquilo y no puedo pagar la vivienda en mi ciudad'",
      submitButton: "Mapear a temas",
      skipButton: "Omitir — solo usar mis clasificaciones",
      confirmButton: "Confirmar y continuar",
      editButton: "Editar mi respuesta",
      weHeard: "Escuchamos:",
      mappingTo: "Mapeando a temas que rastreamos:",
      noMatchesFound:
        "No se detectaron temas específicos. Puedes agregar temas manualmente u omitir.",
    },
    polisOverlay: {
      countyLabel: "De votantes en tu condado que clasificaron sus temas",
      privacyNotice:
        "Cuando clasificas un tema, añadimos anónimamente a un conteo de nivel de condado. Nunca almacenamos tu código postal, tu secuencia de clasificación ni nada más.",
    },
  },
};
