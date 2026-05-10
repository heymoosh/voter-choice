export type Language = "en" | "es";

export interface Translations {
  hero: {
    title: string;
    subtitle: string;
    description: string;
  };
  zipForm: {
    label: string;
    placeholder: string;
    submit: string;
    loading: string;
  };
  errors: {
    emptyZip: string;
    invalidZip: string;
    notFound: string;
  };
  stateSelector: {
    heading: string;
  };
  stateInfo: {
    registrationDeadlines: string;
    online: string;
    byMail: string;
    inPerson: string;
    sameDayAvailable: string;
    sameDayNotAvailable: string;
    earlyVoting: string;
    earlyVotingNotAvailable: string;
    voterId: string;
    voterIdNotRequired: string;
    phonesAtPolls: string;
    viewSampleBallot: string;
    findCountyOffice: string;
    checkRegistration: string;
    noUpcomingElection: string;
    electionDate: string;
    electionType: string;
  };
  prompt: {
    heading: string;
    description: string;
    copyButton: string;
    copied: string;
    copyConfirmation: string;
  };
  tips: {
    heading: string;
    tip1: string;
    tip2: string;
    tip3: string;
    tip4: string;
  };
  footer: {
    share: string;
    credit: string;
    privacy: string;
    terms: string;
  };
  languageToggle: {
    label: string;
  };
  deadlineStatus: {
    passed: string;
    urgent: string;
    daysLeft: string;
  };
  chat: {
    heading: string;
    placeholder: string;
    send: string;
    thinking: string;
    startChat: string;
    fallbackNotice: string;
  };
  profile: {
    heading: string;
    upload: string;
    download: string;
    uploadSuccess: string;
    uploadError: string;
  };
}

export const translations: Record<Language, Translations> = {
  en: {
    hero: {
      title: "Free AI Ballot Research Tool",
      subtitle:
        "Enter your zip code to get a customized AI prompt pre-filled with your state's election info, deadlines, and resources.",
      description:
        "Copy the prompt and paste it into any free AI chatbot — Claude, ChatGPT, Gemini, or Grok.",
    },
    zipForm: {
      label: "Enter your zip code",
      placeholder: "Enter your 5-digit zip code",
      submit: "Get Prompt",
      loading: "Loading...",
    },
    errors: {
      emptyZip: "Please enter a zip code",
      invalidZip: "Please enter a valid 5-digit zip code",
      notFound:
        "We don't have data for this zip code yet. We're working on adding all U.S. zip codes.",
    },
    stateSelector: {
      heading:
        "This zip code spans multiple states. Which state are you voting in?",
    },
    stateInfo: {
      registrationDeadlines: "Registration Deadlines",
      online: "Online",
      byMail: "By mail",
      inPerson: "In person",
      sameDayAvailable: "Available",
      sameDayNotAvailable: "Not available",
      earlyVoting: "Early Voting",
      earlyVotingNotAvailable: "Not available — absentee voting only",
      voterId: "Voter ID",
      voterIdNotRequired: "Not required",
      phonesAtPolls: "Phones at Polls",
      viewSampleBallot: "View sample ballot",
      findCountyOffice: "Find county election office",
      checkRegistration: "Check registration status",
      noUpcomingElection: "No upcoming elections are currently scheduled for",
      electionDate: "Date",
      electionType: "Type",
    },
    prompt: {
      heading: "Your Customized AI Prompt",
      description:
        "Copy this prompt and paste it as your first message in any AI chatbot.",
      copyButton: "Copy to Clipboard",
      copied: "Copied!",
      copyConfirmation: "✓ Copied",
    },
    tips: {
      heading: "Tips for Using the Prompt",
      tip1: 'You can say "I don\'t know" or "I\'m not sure" — the AI will explain more and help you figure it out.',
      tip2: 'Ask it to research something for you: "Can you look up this candidate\'s voting record?"',
      tip3: 'Ask questions anytime: "What does this position actually do?" or "Why does this matter?"',
      tip4: "AI can make mistakes. This is a research starting point. Verify with official sources.",
    },
    footer: {
      share:
        "Share this tool with friends and family who want to make informed voting decisions.",
      credit: "Created by a human using AI tools",
      privacy: "Privacy Policy",
      terms: "Terms of Use",
    },
    languageToggle: {
      label: "Español",
    },
    deadlineStatus: {
      passed: "Passed",
      urgent: "days left (URGENT)",
      daysLeft: "days left",
    },
    chat: {
      heading: "Research Your Ballot with AI",
      placeholder: "Ask about candidates, issues, or your ballot...",
      send: "Send",
      thinking: "Researching...",
      startChat: "Start Chat",
      fallbackNotice:
        "On-site chat is currently unavailable. Use the prompt below in any AI chatbot.",
    },
    profile: {
      heading: "Voter Profile",
      upload: "Upload Profile",
      download: "Download Profile",
      uploadSuccess: "Profile loaded successfully.",
      uploadError: "Could not read profile file. Please upload a .txt file.",
    },
  },

  es: {
    hero: {
      title: "Herramienta Gratuita de Investigación Electoral con IA",
      subtitle:
        "Ingresa tu código postal para obtener un aviso de IA personalizado con la información electoral de tu estado, fechas límite y recursos.",
      description:
        "Copia el aviso y pégalo en cualquier chatbot de IA gratuito — Claude, ChatGPT, Gemini o Grok.",
    },
    zipForm: {
      label: "Ingresa tu código postal",
      placeholder: "Ingresa tu código postal de 5 dígitos",
      submit: "Obtener Aviso",
      loading: "Cargando...",
    },
    errors: {
      emptyZip: "Por favor ingresa un código postal",
      invalidZip: "Por favor ingresa un código postal válido de 5 dígitos",
      notFound:
        "Aún no tenemos datos para este código postal. Estamos trabajando en agregar todos los códigos postales de EE.UU.",
    },
    stateSelector: {
      heading:
        "Este código postal abarca varios estados. ¿En qué estado vas a votar?",
    },
    stateInfo: {
      registrationDeadlines: "Fechas Límite de Registro",
      online: "En línea",
      byMail: "Por correo",
      inPerson: "En persona",
      sameDayAvailable: "Disponible",
      sameDayNotAvailable: "No disponible",
      earlyVoting: "Votación Anticipada",
      earlyVotingNotAvailable: "No disponible — solo voto en ausencia",
      voterId: "Identificación para Votar",
      voterIdNotRequired: "No requerida",
      phonesAtPolls: "Teléfonos en las Urnas",
      viewSampleBallot: "Ver boleta de muestra",
      findCountyOffice: "Encontrar oficina electoral del condado",
      checkRegistration: "Verificar estado de registro",
      noUpcomingElection: "No hay elecciones próximas programadas para",
      electionDate: "Fecha",
      electionType: "Tipo",
    },
    prompt: {
      heading: "Tu Aviso de IA Personalizado",
      description:
        "Copia este aviso y pégalo como tu primer mensaje en cualquier chatbot de IA.",
      copyButton: "Copiar al Portapapeles",
      copied: "¡Copiado!",
      copyConfirmation: "✓ Copiado",
    },
    tips: {
      heading: "Consejos para Usar el Aviso",
      tip1: 'Puedes decir "No sé" o "No estoy seguro/a" — la IA explicará más y te ayudará a entenderlo.',
      tip2: 'Pídele que investigue algo: "¿Puedes buscar el historial de votación de este candidato?"',
      tip3: 'Haz preguntas en cualquier momento: "¿Qué hace realmente este cargo?" o "¿Por qué importa esto?"',
      tip4: "La IA puede cometer errores. Este es un punto de partida para investigar. Verifica con fuentes oficiales.",
    },
    footer: {
      share:
        "Comparte esta herramienta con amigos y familiares que quieran tomar decisiones informadas al votar.",
      credit: "Creado por un humano usando herramientas de IA",
      privacy: "Política de Privacidad",
      terms: "Términos de Uso",
    },
    languageToggle: {
      label: "English",
    },
    deadlineStatus: {
      passed: "Vencida",
      urgent: "días restantes (URGENTE)",
      daysLeft: "días restantes",
    },
    chat: {
      heading: "Investiga tu Boleta con IA",
      placeholder: "Pregunta sobre candidatos, temas o tu boleta...",
      send: "Enviar",
      thinking: "Investigando...",
      startChat: "Iniciar Chat",
      fallbackNotice:
        "El chat en línea no está disponible en este momento. Usa el aviso a continuación en cualquier chatbot de IA.",
    },
    profile: {
      heading: "Perfil de Votante",
      upload: "Subir Perfil",
      download: "Descargar Perfil",
      uploadSuccess: "Perfil cargado correctamente.",
      uploadError:
        "No se pudo leer el archivo de perfil. Por favor sube un archivo .txt.",
    },
  },
};
