export type Language = "en" | "es";

export type TranslationKey =
  | "hero.title"
  | "hero.description"
  | "hero.worksWith"
  | "zip.label"
  | "zip.placeholder"
  | "zip.submit"
  | "zip.error.empty"
  | "zip.error.invalid"
  | "zip.error.notFound"
  | "zip.error.notFoundLink"
  | "multiState.prompt"
  | "state.nextElection"
  | "state.registrationDeadlines"
  | "state.online"
  | "state.byMail"
  | "state.inPerson"
  | "state.earlyVoting"
  | "state.viewSampleBallot"
  | "state.countyOffice"
  | "prompt.title"
  | "prompt.description"
  | "prompt.copy"
  | "prompt.copied"
  | "chat.title"
  | "chat.inputPlaceholder"
  | "chat.send"
  | "chat.pathA"
  | "chat.pathB"
  | "chat.thinking"
  | "chat.error"
  | "tips.title"
  | "tips.1"
  | "tips.2"
  | "tips.3"
  | "tips.4"
  | "profile.upload"
  | "profile.download"
  | "profile.uploadLabel"
  | "footer.credit"
  | "footer.share"
  | "lang.toggle";

type TranslationMap = Record<TranslationKey, string>;

export const TRANSLATIONS: Record<Language, TranslationMap> = {
  en: {
    "hero.title": "Free AI Ballot Research Tool",
    "hero.description":
      "Get a customized AI prompt pre-filled with your local election information. Paste it into any free AI chatbot to research your ballot.",
    "hero.worksWith": "Works with:",
    "zip.label": "Enter your 5-digit zip code",
    "zip.placeholder": "e.g., 78701",
    "zip.submit": "Get My Prompt",
    "zip.error.empty": "Please enter a zip code",
    "zip.error.invalid": "Please enter a valid 5-digit zip code",
    "zip.error.notFound":
      "We don't have data for this zip code yet. We're working on adding all U.S. zip codes.",
    "zip.error.notFoundLink": "Find your state election website",
    "multiState.prompt":
      "This zip code spans multiple states. Which state are you voting in?",
    "state.nextElection": "Next Election",
    "state.registrationDeadlines": "Registration Deadlines",
    "state.online": "Online",
    "state.byMail": "By mail",
    "state.inPerson": "In person",
    "state.earlyVoting": "Early Voting",
    "state.viewSampleBallot": "View sample ballot →",
    "state.countyOffice": "County election office →",
    "prompt.title": "Your Customized Prompt",
    "prompt.description":
      "Copy this prompt and paste it as your first message in any AI chatbot",
    "prompt.copy": "Copy to Clipboard",
    "prompt.copied": "Copied!",
    "chat.title": "Research Your Ballot with AI",
    "chat.inputPlaceholder": "Ask about candidates, issues, or your ballot...",
    "chat.send": "Send",
    "chat.pathA": "Chat on this site",
    "chat.pathB": "Copy prompt for any chatbot",
    "chat.thinking": "Thinking...",
    "chat.error": "Chat unavailable. Use the copy/paste option below.",
    "tips.title": "Tips for Using This Tool",
    "tips.1":
      'You can say "I don\'t know" or "I\'m not sure where I stand" — the AI will explain more and help you figure it out',
    "tips.2":
      'Ask it to research something for you ("Can you look up this candidate\'s voting record?")',
    "tips.3":
      'Ask questions anytime ("What does this position actually do?" or "Why does this matter?")',
    "tips.4":
      "Important: AI can make mistakes. This is a research starting point. The AI will link you to official sources so you can verify anything that matters to you.",
    "profile.upload": "Upload Voter Profile",
    "profile.download": "Download Voter Profile",
    "profile.uploadLabel":
      "Upload a saved voter profile to personalize your research",
    "footer.credit": "Created by a human using AI tools",
    "footer.share":
      "Share this tool with friends and family to help them research their ballot",
    "lang.toggle": "Español",
  },
  es: {
    "hero.title": "Herramienta Gratuita de Investigación Electoral con IA",
    "hero.description":
      "Obtén un mensaje de IA personalizado con tu información electoral local. Pégalo en cualquier chatbot de IA gratuito para investigar tu boleta.",
    "hero.worksWith": "Compatible con:",
    "zip.label": "Ingresa tu código postal de 5 dígitos",
    "zip.placeholder": "ej., 78701",
    "zip.submit": "Obtener Mi Mensaje",
    "zip.error.empty": "Por favor ingresa un código postal",
    "zip.error.invalid":
      "Por favor ingresa un código postal válido de 5 dígitos",
    "zip.error.notFound":
      "Aún no tenemos datos para este código postal. Estamos trabajando en agregar todos los códigos postales de EE.UU.",
    "zip.error.notFoundLink": "Encuentra el sitio web electoral de tu estado",
    "multiState.prompt":
      "Este código postal abarca varios estados. ¿En qué estado vas a votar?",
    "state.nextElection": "Próxima Elección",
    "state.registrationDeadlines": "Fechas Límite de Registro",
    "state.online": "En línea",
    "state.byMail": "Por correo",
    "state.inPerson": "En persona",
    "state.earlyVoting": "Votación Anticipada",
    "state.viewSampleBallot": "Ver boleta de muestra →",
    "state.countyOffice": "Oficina electoral del condado →",
    "prompt.title": "Tu Mensaje Personalizado",
    "prompt.description":
      "Copia este mensaje y pégalo como tu primer mensaje en cualquier chatbot de IA",
    "prompt.copy": "Copiar al Portapapeles",
    "prompt.copied": "¡Copiado!",
    "chat.title": "Investiga Tu Boleta con IA",
    "chat.inputPlaceholder": "Pregunta sobre candidatos, temas o tu boleta...",
    "chat.send": "Enviar",
    "chat.pathA": "Chatear en este sitio",
    "chat.pathB": "Copiar mensaje para cualquier chatbot",
    "chat.thinking": "Pensando...",
    "chat.error": "Chat no disponible. Usa la opción de copiar/pegar abajo.",
    "tips.title": "Consejos para Usar Esta Herramienta",
    "tips.1":
      'Puedes decir "No sé" o "No estoy seguro/a" — la IA explicará más y te ayudará a entender',
    "tips.2":
      'Pídele que investigue algo ("¿Puedes buscar el historial de votación de este candidato?")',
    "tips.3":
      'Haz preguntas en cualquier momento ("¿Qué hace realmente este cargo?" o "¿Por qué importa esto?")',
    "tips.4":
      "Importante: La IA puede cometer errores. Este es un punto de partida para investigar. La IA te enlazará a fuentes oficiales para que puedas verificar lo que te importa.",
    "profile.upload": "Subir Perfil de Votante",
    "profile.download": "Descargar Perfil de Votante",
    "profile.uploadLabel":
      "Sube un perfil de votante guardado para personalizar tu investigación",
    "footer.credit": "Creado por un humano usando herramientas de IA",
    "footer.share":
      "Comparte esta herramienta con amigos y familiares para ayudarles a investigar su boleta",
    "lang.toggle": "English",
  },
};

export function t(key: TranslationKey, lang: Language): string {
  return TRANSLATIONS[lang][key] ?? TRANSLATIONS.en[key] ?? key;
}
