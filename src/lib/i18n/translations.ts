export type Language = "en" | "es" | "vi" | "zh" | "ar";

export interface Translations {
  // Language toggle
  languageToggleLabel: string;
  languageToggleAnnouncement: string;

  // Hero section
  heroEyebrow: string;
  heroTitle: string;
  heroCopy: string;
  chatbotLinksLabel: string;

  // Zip code form
  zipLabel: string;
  zipPlaceholder: string;
  submitButton: string;
  submitButtonLoading: string;

  // Error messages
  errorEmptyZip: string;
  errorInvalidZip: string;
  errorZipNotFound: string;
  errorRegistrationPassed: string;
  errorNoElection: (stateName: string) => string;

  // State selector
  stateSelectorEyebrow: string;
  stateSelectorTitle: string;

  // State info card
  stateSnapshotEyebrow: string;
  updatedLabel: string;
  electionLabel: string;
  registrationLabel: string;
  earlyVotingLabel: string;
  votingRulesLabel: string;
  noElectionData: string;
  noEarlyVoting: string;
  earlyVotingThrough: string;
  phonesProhibited: string;
  phonesPolicyVaries: string;
  registrationCheckPrefix: string;
  registrationCheckSuffix: string;

  // Deadline status
  daysLeft: (days: number) => string;
  deadlinePassed: string;
  deadlineNotAvailable: string;

  // Prompt section
  promptEyebrow: string;
  promptInstructions: string;
  copyButton: string;
  copyButtonCopied: string;

  // Copy confirmation
  copyConfirmation: string;

  // Tips section
  tipsTitle: string;
  tips: string[];
  tipsWarning: string;

  // Footer
  footerShare: string;
  footerAttribution: string;

  // Accessibility
  skipToContent: string;

  // Phase 3: Polling location
  pollingLocationLabel: string;
  pollingHoursLabel: string;

  // Phase 3: Ballot contests
  ballotContestsLabel: string;

  // Phase 3: Candidate enrichment
  candidateExpand: string;
  candidateCollapse: string;
  candidateVotingRecord: string;
  candidateTopDonors: string;
  candidateEndorsements: string;
  candidateIssuePositions: string;
  candidateSources: string;
  candidateEnrichmentError: string;

  // Phase 3: API errors
  apiPartialError: string;
  apiFullError: string;
  stateElectionOfficeLinkText: string;

  // Phase 3: Data attribution
  dataAttributionText: string;
  dataAttributionVerify: string;
  updatedAtLabel: string;

  // Phase 3: Voter ID
  voterIdLabel: string;
  voterIdRequiredText: string;
  voterIdNotRequiredText: string;
  voterIdExceptionsLabel: string;
  voterIdVerifyNote: string;

  // Phase 5: Chat window
  chatCta: string;
  chatWindowTitle: string;
  chatPrivacyNotice: string;
  chatInputPlaceholder: string;
  chatSend: string;
  chatBudgetNotice70: string;
  chatBudgetNotice90: string;
  chatDisabledMessage: string;

  // Phase 5: Ballot download
  ballotSectionTitle: string;
  downloadBallotBtn: string;
  ballotPasteLabel: string;
  ballotPastePlaceholder: string;
  ballotPasteBtn: string;
  ballotParseError: string;
  ballotManualEntryTitle: string;
  ballotNote: string;

  // Phase 5: Voter profile
  uploadProfileLabel: string;
  uploadProfileConfirm: string;
  profileSessionNote: string;
  profileUploadTypeError: string;
  profileUploadSizeError: string;
  profileDownloadNote: string;
  downloadProfileBtn: string;

  // Phase 5: Alignment banners
  alignmentStrong: string;
  alignmentMixed: string;
  alignmentWeak: string;
  alignmentExpand: string;
  alignmentCollapse: string;

  // Phase 6: Issue Ranking
  issueRankingTitle: string;
  issueRankingSubtitle: string;
  issueRankSkipButton: string;
  issueRankConfirmButton: string;
  issueRankInstructions: string;
  issueRankTopPriorities: string;

  // Phase 6: Concern Disambiguation
  concernDisambiguationTitle: string;
  concernDisambiguationPlaceholder: string;
  concernDisambiguationSubmit: string;
  concernMappingTitle: string;
  concernConfirmButton: string;
  concernSkipButton: string;
  concernPrivacyNote: string;

  // Phase 6: Polis Overlay
  polisOverlayCountyLabel: string;
  polisOverlayDescription: string;
  polisPrivacyDisclosure: string;
}

export const en: Translations = {
  // Language toggle
  languageToggleLabel: "English",
  languageToggleAnnouncement: "Language changed to English",

  // Hero section
  heroEyebrow: "Voter Choice",
  heroTitle:
    "Ballot research, with local election context and candidate history.",
  heroCopy:
    "Enter a zip code to see your state election context, a copyable prompt, and any available candidate enrichment. Copy the prompt and paste it into any free AI chatbot to start researching your ballot.",
  chatbotLinksLabel: "Works with any AI chatbot:",

  // Zip code form
  zipLabel: "Zip code",
  zipPlaceholder: "Enter your 5-digit zip code",
  submitButton: "Research ballot",
  submitButtonLoading: "Loading...",

  // Error messages
  errorEmptyZip: "Please enter a zip code.",
  errorInvalidZip: "Please enter a valid 5-digit zip code.",
  errorZipNotFound:
    "We don't have data for this zip code yet. We're working on adding all U.S. zip codes.",
  errorRegistrationPassed:
    "Registration deadlines for this election have passed. You may still be able to vote if you're already registered.",
  errorNoElection: (stateName: string) =>
    `No upcoming elections found for ${stateName}. Check your state election website for updates.`,

  // State selector
  stateSelectorEyebrow: "This zip spans multiple states",
  stateSelectorTitle: "Which state are you voting in?",

  // State info card
  stateSnapshotEyebrow: "State snapshot",
  updatedLabel: "Updated",
  electionLabel: "Election",
  registrationLabel: "Registration",
  earlyVotingLabel: "Early voting",
  votingRulesLabel: "Voting rules",
  noElectionData: "No election data",
  noEarlyVoting: "Not available",
  earlyVotingThrough: "through",
  phonesProhibited: "Phones are prohibited at the polls.",
  phonesPolicyVaries: "Phone policy varies or is allowed.",
  registrationCheckPrefix: "Check",
  registrationCheckSuffix: "before Election Day.",

  // Deadline status
  daysLeft: (days: number) => `${days} day${days === 1 ? "" : "s"} left`,
  deadlinePassed: "Passed",
  deadlineNotAvailable: "Not available",

  // Prompt section
  promptEyebrow: "Customized prompt",
  promptInstructions:
    "Copy this prompt and paste it as your first message in any AI chatbot.",
  copyButton: "Copy to Clipboard",
  copyButtonCopied: "Copied!",

  // Copy confirmation
  copyConfirmation: "Prompt copied",

  // Tips section
  tipsTitle: "Tips for your conversation",
  tips: [
    'You can say "I don\'t know" or "I\'m not sure where I stand" — the AI will explain more and help you figure it out.',
    'You can ask it to research something for you ("Can you look up this candidate\'s voting record?").',
    "You're not taking a test. You're having a conversation. The AI works with you.",
    "At the end, it'll give you a summary you can write down or print and take to the polls.",
  ],
  tipsWarning:
    "AI can make mistakes. This is a research starting point. The tool will link you to official sources so you can double-check anything that matters to you.",

  // Footer
  footerShare: "Share this tool",
  footerAttribution: "Created by a human using AI tools",

  // Accessibility
  skipToContent: "Skip to main content",

  // Phase 3: Polling location
  pollingLocationLabel: "Your polling place",
  pollingHoursLabel: "Hours",

  // Phase 3: Ballot contests
  ballotContestsLabel: "Your ballot",

  // Phase 3: Candidate enrichment
  candidateExpand: "View voting record",
  candidateCollapse: "Hide details",
  candidateVotingRecord: "Voting record",
  candidateTopDonors: "Top donors",
  candidateEndorsements: "Endorsements",
  candidateIssuePositions: "Issue positions",
  candidateSources: "Sources",
  candidateEnrichmentError: "Candidate information temporarily unavailable.",

  // Phase 3: API errors
  apiPartialError:
    "Some election data is temporarily unavailable. The information shown is current.",
  apiFullError:
    "We're having trouble loading live election data. Here's what we know about voting in {stateName}. Visit your state election office for current dates and deadlines.",
  stateElectionOfficeLinkText: "State election office",

  // Phase 3: Data attribution
  dataAttributionText:
    "Election data from Google Civic Information and live web search via Anthropic.",
  dataAttributionVerify: "Verify at",
  updatedAtLabel: "Updated",

  // Phase 3: Voter ID
  voterIdLabel: "Voter ID requirement",
  voterIdRequiredText: "Photo ID required",
  voterIdNotRequiredText: "No photo ID required",
  voterIdExceptionsLabel: "Exceptions",
  voterIdVerifyNote:
    "Verify current requirements at your state election office.",

  // Phase 5: Chat window
  chatCta: "Research My Ballot Here",
  chatWindowTitle: "AI Ballot Research",
  chatPrivacyNotice:
    "Your conversation stays in your browser only — we don't store it. If you close or refresh this page, your conversation will be lost. Download your ballot and voter profile before leaving.",
  chatInputPlaceholder: "Type your message...",
  chatSend: "Send",
  chatBudgetNotice70:
    "Free AI chat may be limited later this month. You can always use the copy-paste option.",
  chatBudgetNotice90:
    "Free AI chat is running low this month. Consider using the copy-paste option for an uninterrupted experience.",
  chatDisabledMessage:
    "Our free AI chat has reached its monthly limit. You can still research your ballot — copy the prompt below and paste it into any free AI chatbot (Claude, ChatGPT, Gemini, Grok).",

  // Phase 5: Ballot download
  ballotSectionTitle: "Your Ballot",
  downloadBallotBtn: "Download My Ballot",
  ballotPasteLabel:
    "Paste your AI-generated ballot output here to build your printable ballot.",
  ballotPastePlaceholder:
    "Paste the 'MY BALLOT' section from your AI conversation...",
  ballotPasteBtn: "Build My Ballot",
  ballotParseError:
    "We couldn't read that format. Try copying just the 'MY BALLOT' section from your AI conversation, or enter your choices manually below.",
  ballotManualEntryTitle: "Enter My Choices Manually",
  ballotNote:
    "This is your personal reference, not an official ballot. Verify all information at your state election office.",

  // Phase 5: Voter profile
  uploadProfileLabel: "Returning voter? Upload your voter profile.",
  uploadProfileConfirm:
    "Profile loaded! This will be included in your AI conversation so you don't have to start from scratch.",
  profileSessionNote:
    "Your profile is used for this session only and is not stored on our servers.",
  profileUploadTypeError: "Please upload a .txt file.",
  profileUploadSizeError:
    "File is too large. Voter profiles should be under 10KB.",
  profileDownloadNote:
    "Save this file somewhere you'll find it before the next election. When you come back, upload it so you don't have to start from scratch.",
  downloadProfileBtn: "Download My Voter Profile",

  // Phase 5: Alignment banners
  alignmentStrong: "Strong alignment",
  alignmentMixed: "Mixed alignment",
  alignmentWeak: "Weak alignment",
  alignmentExpand: "Expand breakdown",
  alignmentCollapse: "Collapse",

  // Phase 6: Issue Ranking
  issueRankingTitle: "What issues matter most to you?",
  issueRankingSubtitle:
    "Drag or use arrow keys to rank in order of priority (top = most important).",
  issueRankSkipButton: "Skip ranking",
  issueRankConfirmButton: "Confirm my priorities",
  issueRankInstructions:
    "Use arrow keys and Space to reorder. Your top 3 will be highlighted.",
  issueRankTopPriorities: "Your top priorities",

  // Phase 6: Concern Disambiguation
  concernDisambiguationTitle: "Anything specific you want the AI to know?",
  concernDisambiguationPlaceholder:
    "e.g., 'I rent and can't afford housing in my city,' or 'my kid has Type 1 diabetes'",
  concernDisambiguationSubmit: "Map to issues",
  concernMappingTitle: "We heard — here's how we mapped your concerns:",
  concernConfirmButton: "Confirm and continue",
  concernSkipButton: "Skip this step",
  concernPrivacyNote:
    "Your text is sent to our AI to map issues. It is never logged or stored.",

  // Phase 6: Polis Overlay
  polisOverlayCountyLabel: "Of voters in your county who ranked their issues",
  polisOverlayDescription: "Anonymous county-level count",
  polisPrivacyDisclosure:
    "When you rank an issue, we anonymously add to a county-level count that other voters can see. We never store your zip code, your ranking sequence, or anything else — just '+1 in [county] for [issue].'",
};

export const es: Translations = {
  // Language toggle
  languageToggleLabel: "Español",
  languageToggleAnnouncement: "Idioma cambiado a español",

  // Hero section
  heroEyebrow: "Voter Choice",
  heroTitle:
    "Investigación electoral con contexto local y historial de candidatos.",
  heroCopy:
    "Ingresa tu código postal para ver el contexto electoral de tu estado, un prompt listo para copiar, y cualquier información disponible sobre candidatos. Copia el prompt y pégalo en cualquier chatbot de IA gratuito para empezar a investigar tu boleta.",
  chatbotLinksLabel: "Funciona con cualquier chatbot de IA:",

  // Zip code form
  zipLabel: "Código postal",
  zipPlaceholder: "Ingresa tu código postal de 5 dígitos",
  submitButton: "Investigar boleta",
  submitButtonLoading: "Cargando...",

  // Error messages
  errorEmptyZip: "Por favor ingresa un código postal.",
  errorInvalidZip: "Por favor ingresa un código postal válido de 5 dígitos.",
  errorZipNotFound:
    "Aún no tenemos datos para este código postal. Estamos trabajando en agregar todos los códigos postales de EE.UU.",
  errorRegistrationPassed:
    "Las fechas límite de registro para esta elección ya pasaron. Es posible que puedas votar si ya estás registrado.",
  errorNoElection: (stateName: string) =>
    `No se encontraron elecciones próximas para ${stateName}. Consulta el sitio web electoral de tu estado para actualizaciones.`,

  // State selector
  stateSelectorEyebrow: "Este código postal abarca varios estados",
  stateSelectorTitle: "¿En qué estado vas a votar?",

  // State info card
  stateSnapshotEyebrow: "Resumen estatal",
  updatedLabel: "Actualizado",
  electionLabel: "Elección",
  registrationLabel: "Registro",
  earlyVotingLabel: "Votación anticipada",
  votingRulesLabel: "Reglas de votación",
  noElectionData: "Sin datos de elección",
  noEarlyVoting: "No disponible",
  earlyVotingThrough: "al",
  phonesProhibited:
    "Los teléfonos están prohibidos en las casillas de votación.",
  phonesPolicyVaries: "La política de teléfonos varía o está permitida.",
  registrationCheckPrefix: "Consulta",
  registrationCheckSuffix: "antes del día de elección.",

  // Deadline status
  daysLeft: (days: number) => `Quedan ${days} día${days === 1 ? "" : "s"}`,
  deadlinePassed: "Pasado",
  deadlineNotAvailable: "No disponible",

  // Prompt section
  promptEyebrow: "Prompt personalizado",
  promptInstructions:
    "Copia este prompt y pégalo como tu primer mensaje en cualquier chatbot de IA.",
  copyButton: "Copiar al portapapeles",
  copyButtonCopied: "¡Copiado!",

  // Copy confirmation
  copyConfirmation: "Prompt copiado",

  // Tips section
  tipsTitle: "Consejos para tu conversación",
  tips: [
    'Puedes decir "No sé" o "No estoy seguro/a de mi posición" — la IA te explicará más y te ayudará a decidir.',
    'Puedes pedirle que investigue algo por ti ("¿Puedes buscar el historial de votación de este candidato?").',
    "No estás siendo evaluado/a. Estás teniendo una conversación. La IA trabaja contigo.",
    "Al final, te dará un resumen que puedes anotar o imprimir para llevar a las urnas.",
  ],
  tipsWarning:
    "La IA puede cometer errores. Este es un punto de partida para tu investigación. La herramienta te enlazará a fuentes oficiales para que puedas verificar cualquier cosa que sea importante para ti.",

  // Footer
  footerShare: "Comparte esta herramienta",
  footerAttribution: "Creado por una persona usando herramientas de IA",

  // Accessibility
  skipToContent: "Ir al contenido principal",

  // Phase 3: Polling location
  pollingLocationLabel: "Tu lugar de votación",
  pollingHoursLabel: "Horario",

  // Phase 3: Ballot contests
  ballotContestsLabel: "Tu boleta electoral",

  // Phase 3: Candidate enrichment
  candidateExpand: "Ver historial de votación",
  candidateCollapse: "Ocultar detalles",
  candidateVotingRecord: "Historial de votación",
  candidateTopDonors: "Principales donantes",
  candidateEndorsements: "Respaldos",
  candidateIssuePositions: "Posiciones en temas clave",
  candidateSources: "Fuentes",
  candidateEnrichmentError:
    "Información del candidato temporalmente no disponible.",

  // Phase 3: API errors
  apiPartialError:
    "Algunos datos electorales no están disponibles temporalmente. La información que se muestra es actual.",
  apiFullError:
    "Tenemos problemas para cargar datos electorales en tiempo real. Aquí está lo que sabemos sobre votar en {stateName}. Visita la oficina electoral de tu estado para fechas y plazos actuales.",
  stateElectionOfficeLinkText: "Oficina electoral del estado",

  // Phase 3: Data attribution
  dataAttributionText:
    "Datos electorales de Google Civic Information y búsqueda web en tiempo real via Anthropic.",
  dataAttributionVerify: "Verifica en",
  updatedAtLabel: "Actualizado",

  // Phase 3: Voter ID
  voterIdLabel: "Requisito de identificación",
  voterIdRequiredText: "Se requiere identificación con foto",
  voterIdNotRequiredText: "No se requiere identificación con foto",
  voterIdExceptionsLabel: "Excepciones",
  voterIdVerifyNote:
    "Verifica los requisitos actuales en la oficina electoral de tu estado.",

  // Phase 5: Chat window
  chatCta: "Investigar Mi Boleta Aquí",
  chatWindowTitle: "Investigación de Boleta con IA",
  chatPrivacyNotice:
    "Tu conversación se queda solo en tu navegador — no la almacenamos. Si cierras o recargas esta página, tu conversación se perderá. Descarga tu boleta y perfil de votante antes de salir.",
  chatInputPlaceholder: "Escribe tu mensaje...",
  chatSend: "Enviar",
  chatBudgetNotice70:
    "El chat de IA gratuito puede ser limitado más adelante este mes. Siempre puedes usar la opción de copiar y pegar.",
  chatBudgetNotice90:
    "El chat de IA gratuito está llegando a su límite este mes. Considera usar la opción de copiar y pegar.",
  chatDisabledMessage:
    "Nuestro chat de IA gratuito ha alcanzado su límite mensual. Copia el prompt a continuación y pégalo en cualquier chatbot de IA gratuito.",

  // Phase 5: Ballot download
  ballotSectionTitle: "Tu Boleta",
  downloadBallotBtn: "Descargar Mi Boleta",
  ballotPasteLabel:
    "Pega el resultado de tu IA aquí para construir tu boleta imprimible.",
  ballotPastePlaceholder:
    "Pega la sección 'MY BALLOT' de tu conversación de IA...",
  ballotPasteBtn: "Construir Mi Boleta",
  ballotParseError:
    "No pudimos leer ese formato. Intenta copiar solo la sección 'MY BALLOT' o ingresa tus opciones manualmente.",
  ballotManualEntryTitle: "Ingresar Mis Opciones Manualmente",
  ballotNote:
    "Este es tu referencia personal, no una boleta oficial. Verifica toda la información en la oficina electoral de tu estado.",

  // Phase 5: Voter profile
  uploadProfileLabel: "¿Votante que regresa? Carga tu perfil de votante.",
  uploadProfileConfirm:
    "¡Perfil cargado! Esto se incluirá en tu conversación de IA.",
  profileSessionNote:
    "Tu perfil se usa solo para esta sesión y no se almacena en nuestros servidores.",
  profileUploadTypeError: "Por favor carga un archivo .txt.",
  profileUploadSizeError:
    "El archivo es demasiado grande. Los perfiles deben ser menos de 10KB.",
  profileDownloadNote:
    "Guarda este archivo en un lugar que puedas encontrar antes de las próximas elecciones.",
  downloadProfileBtn: "Descargar Mi Perfil de Votante",

  // Phase 5: Alignment banners
  alignmentStrong: "Fuerte alineación",
  alignmentMixed: "Alineación mixta",
  alignmentWeak: "Alineación débil",
  alignmentExpand: "Ver desglose",
  alignmentCollapse: "Colapsar",

  // Phase 6: Issue Ranking
  issueRankingTitle: "¿Qué temas te importan más?",
  issueRankingSubtitle:
    "Arrastra o usa las teclas de flecha para ordenar por prioridad (arriba = más importante).",
  issueRankSkipButton: "Omitir clasificación",
  issueRankConfirmButton: "Confirmar mis prioridades",
  issueRankInstructions:
    "Usa las teclas de flecha y Espacio para reordenar. Tus 3 principales se destacarán.",
  issueRankTopPriorities: "Tus principales prioridades",

  // Phase 6: Concern Disambiguation
  concernDisambiguationTitle: "¿Algo específico que quieras que sepa la IA?",
  concernDisambiguationPlaceholder:
    "por ejemplo, 'Rento y no puedo pagar la vivienda en mi ciudad,' o 'mi hijo tiene diabetes tipo 1'",
  concernDisambiguationSubmit: "Mapear a temas",
  concernMappingTitle: "Te escuchamos — así mapeamos tus preocupaciones:",
  concernConfirmButton: "Confirmar y continuar",
  concernSkipButton: "Omitir este paso",
  concernPrivacyNote:
    "Tu texto se envía a nuestra IA para mapear temas. Nunca se registra ni almacena.",

  // Phase 6: Polis Overlay
  polisOverlayCountyLabel:
    "De votantes en tu condado que clasificaron sus temas",
  polisOverlayDescription: "Conteo anónimo a nivel de condado",
  polisPrivacyDisclosure:
    "Cuando clasificas un tema, añadimos anónimamente a un conteo a nivel de condado que otros votantes pueden ver. Nunca almacenamos tu código postal, tu secuencia de clasificación, ni nada más — solo '+1 en [condado] para [tema].'",
};

export const vi: Translations = {
  // Language toggle
  languageToggleLabel: "Tiếng Việt",
  languageToggleAnnouncement: "Đã chuyển sang tiếng Việt",

  // Hero section
  heroEyebrow: "Voter Choice",
  heroTitle:
    "Nghiên cứu phiếu bầu với bối cảnh bầu cử địa phương và lịch sử ứng cử viên.",
  heroCopy:
    "Nhập mã zip để xem bối cảnh bầu cử của tiểu bang bạn, câu lệnh có thể sao chép, và thông tin về ứng cử viên. Sao chép câu lệnh và dán vào bất kỳ chatbot AI miễn phí nào để bắt đầu nghiên cứu phiếu bầu.",
  chatbotLinksLabel: "Dùng được với bất kỳ chatbot AI nào:",

  // Zip code form
  zipLabel: "Mã zip",
  zipPlaceholder: "Nhập mã zip 5 chữ số của bạn",
  submitButton: "Nghiên cứu phiếu bầu",
  submitButtonLoading: "Đang tải...",

  // Error messages
  errorEmptyZip: "Vui lòng nhập mã zip.",
  errorInvalidZip: "Vui lòng nhập mã zip hợp lệ gồm 5 chữ số.",
  errorZipNotFound:
    "Chúng tôi chưa có dữ liệu cho mã zip này. Chúng tôi đang làm việc để thêm tất cả mã zip của Hoa Kỳ.",
  errorRegistrationPassed:
    "Thời hạn đăng ký cho cuộc bầu cử này đã qua. Bạn vẫn có thể bỏ phiếu nếu đã đăng ký.",
  errorNoElection: (stateName: string) =>
    `Không tìm thấy cuộc bầu cử sắp tới cho ${stateName}. Kiểm tra trang web bầu cử tiểu bang của bạn để cập nhật.`,

  // State selector
  stateSelectorEyebrow: "Mã zip này bao gồm nhiều tiểu bang",
  stateSelectorTitle: "Bạn đang bỏ phiếu ở tiểu bang nào?",

  // State info card
  stateSnapshotEyebrow: "Thông tin tiểu bang",
  updatedLabel: "Cập nhật",
  electionLabel: "Cuộc bầu cử",
  registrationLabel: "Đăng ký",
  earlyVotingLabel: "Bỏ phiếu sớm",
  votingRulesLabel: "Quy định bỏ phiếu",
  noElectionData: "Không có dữ liệu bầu cử",
  noEarlyVoting: "Không có",
  earlyVotingThrough: "đến",
  phonesProhibited: "Điện thoại bị cấm tại phòng bỏ phiếu.",
  phonesPolicyVaries: "Chính sách điện thoại khác nhau hoặc được phép.",
  registrationCheckPrefix: "Kiểm tra",
  registrationCheckSuffix: "trước Ngày Bầu Cử.",

  // Deadline status
  daysLeft: (days: number) => `Còn ${days} ngày`,
  deadlinePassed: "Đã qua",
  deadlineNotAvailable: "Không có",

  // Prompt section
  promptEyebrow: "Câu lệnh tùy chỉnh",
  promptInstructions:
    "Sao chép câu lệnh này và dán vào tin nhắn đầu tiên trong bất kỳ chatbot AI nào.",
  copyButton: "Sao chép vào Clipboard",
  copyButtonCopied: "Đã sao chép!",

  // Copy confirmation
  copyConfirmation: "Đã sao chép câu lệnh",

  // Tips section
  tipsTitle: "Mẹo cho cuộc trò chuyện của bạn",
  tips: [
    'Bạn có thể nói "Tôi không biết" hoặc "Tôi chưa chắc quan điểm của mình" — AI sẽ giải thích thêm và giúp bạn tìm ra.',
    'Bạn có thể yêu cầu AI nghiên cứu điều gì đó cho bạn ("Bạn có thể tra cứu hồ sơ bỏ phiếu của ứng cử viên này không?").',
    "Bạn không đang thi. Bạn đang trò chuyện. AI làm việc cùng với bạn.",
    "Cuối cùng, AI sẽ cung cấp bản tóm tắt bạn có thể ghi lại hoặc in để mang theo khi bỏ phiếu.",
  ],
  tipsWarning:
    "AI có thể mắc lỗi. Đây là điểm khởi đầu nghiên cứu. Công cụ sẽ liên kết bạn đến các nguồn chính thức để bạn có thể kiểm tra lại những gì quan trọng với bạn.",

  // Footer
  footerShare: "Chia sẻ công cụ này",
  footerAttribution: "Được tạo bởi con người sử dụng công cụ AI",

  // Accessibility
  skipToContent: "Chuyển đến nội dung chính",

  // Phase 3: Polling location
  pollingLocationLabel: "Địa điểm bỏ phiếu của bạn",
  pollingHoursLabel: "Giờ mở cửa",

  // Phase 3: Ballot contests
  ballotContestsLabel: "Phiếu bầu của bạn",

  // Phase 3: Candidate enrichment
  candidateExpand: "Xem hồ sơ bỏ phiếu",
  candidateCollapse: "Ẩn chi tiết",
  candidateVotingRecord: "Hồ sơ bỏ phiếu",
  candidateTopDonors: "Nhà tài trợ hàng đầu",
  candidateEndorsements: "Sự ủng hộ",
  candidateIssuePositions: "Lập trường về các vấn đề",
  candidateSources: "Nguồn",
  candidateEnrichmentError: "Thông tin ứng cử viên tạm thời không có.",

  // Phase 3: API errors
  apiPartialError:
    "Một số dữ liệu bầu cử tạm thời không có. Thông tin hiển thị là hiện tại.",
  apiFullError:
    "Chúng tôi gặp sự cố khi tải dữ liệu bầu cử trực tiếp. Đây là những gì chúng tôi biết về việc bỏ phiếu ở {stateName}. Truy cập văn phòng bầu cử tiểu bang của bạn để biết ngày và thời hạn hiện tại.",
  stateElectionOfficeLinkText: "Văn phòng bầu cử tiểu bang",

  // Phase 3: Data attribution
  dataAttributionText:
    "Dữ liệu bầu cử từ Google Civic Information và tìm kiếm web trực tiếp qua Anthropic.",
  dataAttributionVerify: "Xác minh tại",
  updatedAtLabel: "Cập nhật",

  // Phase 3: Voter ID
  voterIdLabel: "Yêu cầu ID cử tri",
  voterIdRequiredText: "Yêu cầu ID có ảnh",
  voterIdNotRequiredText: "Không yêu cầu ID có ảnh",
  voterIdExceptionsLabel: "Ngoại lệ",
  voterIdVerifyNote:
    "Xác minh các yêu cầu hiện tại tại văn phòng bầu cử tiểu bang của bạn.",

  // Phase 5: Chat window
  chatCta: "Nghiên Cứu Phiếu Bầu Của Tôi Tại Đây",
  chatWindowTitle: "Nghiên Cứu Phiếu Bầu bằng AI",
  chatPrivacyNotice:
    "Cuộc trò chuyện của bạn chỉ lưu trong trình duyệt — chúng tôi không lưu trữ. Nếu bạn đóng hoặc tải lại trang, cuộc trò chuyện sẽ mất. Hãy tải xuống phiếu bầu và hồ sơ cử tri trước khi rời.",
  chatInputPlaceholder: "Nhập tin nhắn...",
  chatSend: "Gửi",
  chatBudgetNotice70:
    "Chat AI miễn phí có thể bị giới hạn sau trong tháng này. Bạn luôn có thể sử dụng tùy chọn sao chép và dán.",
  chatBudgetNotice90:
    "Chat AI miễn phí sắp hết hạn mức trong tháng này. Hãy xem xét sử dụng tùy chọn sao chép và dán.",
  chatDisabledMessage:
    "Chat AI miễn phí của chúng tôi đã đạt giới hạn hàng tháng. Sao chép prompt bên dưới và dán vào bất kỳ chatbot AI miễn phí nào.",

  // Phase 5: Ballot download
  ballotSectionTitle: "Phiếu Bầu Của Bạn",
  downloadBallotBtn: "Tải Xuống Phiếu Bầu Của Tôi",
  ballotPasteLabel:
    "Dán kết quả AI của bạn vào đây để tạo phiếu bầu có thể in.",
  ballotPastePlaceholder:
    "Dán phần 'MY BALLOT' từ cuộc trò chuyện AI của bạn...",
  ballotPasteBtn: "Tạo Phiếu Bầu Của Tôi",
  ballotParseError:
    "Chúng tôi không thể đọc định dạng đó. Hãy thử sao chép phần 'MY BALLOT' hoặc nhập thủ công.",
  ballotManualEntryTitle: "Nhập Lựa Chọn Của Tôi Thủ Công",
  ballotNote:
    "Đây là tài liệu tham khảo cá nhân của bạn, không phải phiếu bầu chính thức.",

  // Phase 5: Voter profile
  uploadProfileLabel: "Cử tri quay lại? Tải lên hồ sơ cử tri của bạn.",
  uploadProfileConfirm:
    "Đã tải hồ sơ! Điều này sẽ được đưa vào cuộc trò chuyện AI của bạn.",
  profileSessionNote:
    "Hồ sơ của bạn chỉ được sử dụng cho phiên này và không được lưu trên máy chủ của chúng tôi.",
  profileUploadTypeError: "Vui lòng tải lên tệp .txt.",
  profileUploadSizeError: "Tệp quá lớn. Hồ sơ cử tri phải dưới 10KB.",
  profileDownloadNote:
    "Lưu tệp này ở nơi bạn có thể tìm thấy trước kỳ bầu cử tiếp theo.",
  downloadProfileBtn: "Tải Xuống Hồ Sơ Cử Tri Của Tôi",

  // Phase 5: Alignment banners
  alignmentStrong: "Phù hợp mạnh",
  alignmentMixed: "Phù hợp hỗn hợp",
  alignmentWeak: "Phù hợp yếu",
  alignmentExpand: "Xem chi tiết",
  alignmentCollapse: "Thu gọn",

  // Phase 6: Issue Ranking
  issueRankingTitle: "Những vấn đề nào quan trọng nhất với bạn?",
  issueRankingSubtitle:
    "Kéo hoặc dùng phím mũi tên để sắp xếp theo thứ tự ưu tiên (trên cùng = quan trọng nhất).",
  issueRankSkipButton: "Bỏ qua xếp hạng",
  issueRankConfirmButton: "Xác nhận ưu tiên của tôi",
  issueRankInstructions:
    "Dùng phím mũi tên và Cách để sắp xếp lại. 3 ưu tiên hàng đầu sẽ được làm nổi bật.",
  issueRankTopPriorities: "Ưu tiên hàng đầu của bạn",

  // Phase 6: Concern Disambiguation
  concernDisambiguationTitle: "Có điều gì cụ thể bạn muốn AI biết không?",
  concernDisambiguationPlaceholder:
    "ví dụ: 'Tôi thuê nhà và không đủ tiền mua nhà ở thành phố,' hoặc 'con tôi bị tiểu đường tuýp 1'",
  concernDisambiguationSubmit: "Ánh xạ thành vấn đề",
  concernMappingTitle:
    "Chúng tôi đã nghe — đây là cách chúng tôi ánh xạ mối quan tâm của bạn:",
  concernConfirmButton: "Xác nhận và tiếp tục",
  concernSkipButton: "Bỏ qua bước này",
  concernPrivacyNote:
    "Văn bản của bạn được gửi đến AI để ánh xạ vấn đề. Nó không bao giờ được ghi lại hay lưu trữ.",

  // Phase 6: Polis Overlay
  polisOverlayCountyLabel: "Trong số cử tri ở quận của bạn đã xếp hạng vấn đề",
  polisOverlayDescription: "Đếm ẩn danh cấp quận",
  polisPrivacyDisclosure:
    "Khi bạn xếp hạng một vấn đề, chúng tôi ẩn danh thêm vào số đếm cấp quận mà các cử tri khác có thể thấy. Chúng tôi không bao giờ lưu trữ mã zip, thứ tự xếp hạng, hoặc bất cứ thứ gì khác — chỉ '+1 ở [quận] cho [vấn đề].'",
};

export const zh: Translations = {
  // Language toggle
  languageToggleLabel: "中文",
  languageToggleAnnouncement: "语言已切换为中文",

  // Hero section
  heroEyebrow: "Voter Choice",
  heroTitle: "选票研究，提供本地选举背景和候选人历史记录。",
  heroCopy:
    "输入邮政编码，查看你所在州的选举背景、可复制的提示词，以及候选人的相关信息。复制提示词并粘贴到任何免费AI聊天机器人中，开始研究你的选票。",
  chatbotLinksLabel: "适用于任何AI聊天机器人：",

  // Zip code form
  zipLabel: "邮政编码",
  zipPlaceholder: "输入你的5位邮政编码",
  submitButton: "研究选票",
  submitButtonLoading: "加载中...",

  // Error messages
  errorEmptyZip: "请输入邮政编码。",
  errorInvalidZip: "请输入有效的5位邮政编码。",
  errorZipNotFound:
    "我们目前还没有此邮政编码的数据。我们正在努力覆盖所有美国邮政编码。",
  errorRegistrationPassed:
    "此次选举的登记截止日期已过。如果你已经登记，仍然可以投票。",
  errorNoElection: (stateName: string) =>
    `未找到${stateName}即将举行的选举。请查看你所在州的选举网站获取最新信息。`,

  // State selector
  stateSelectorEyebrow: "此邮政编码跨越多个州",
  stateSelectorTitle: "你在哪个州投票？",

  // State info card
  stateSnapshotEyebrow: "州信息概览",
  updatedLabel: "更新时间",
  electionLabel: "选举",
  registrationLabel: "登记",
  earlyVotingLabel: "提前投票",
  votingRulesLabel: "投票规则",
  noElectionData: "无选举数据",
  noEarlyVoting: "不可用",
  earlyVotingThrough: "至",
  phonesProhibited: "投票站内禁止使用手机。",
  phonesPolicyVaries: "手机政策因地而异或允许使用。",
  registrationCheckPrefix: "请查看",
  registrationCheckSuffix: "在选举日之前。",

  // Deadline status
  daysLeft: (days: number) => `还剩 ${days} 天`,
  deadlinePassed: "已过期",
  deadlineNotAvailable: "不可用",

  // Prompt section
  promptEyebrow: "定制提示词",
  promptInstructions: "复制此提示词并粘贴为任何AI聊天机器人的第一条消息。",
  copyButton: "复制到剪贴板",
  copyButtonCopied: "已复制！",

  // Copy confirmation
  copyConfirmation: "提示词已复制",

  // Tips section
  tipsTitle: "对话建议",
  tips: [
    '你可以说"我不知道"或"我还没确定立场"——AI会进一步解释并帮助你弄清楚。',
    '你可以让它为你研究某事（"你能查一下这位候选人的投票记录吗？"）。',
    "这不是考试，而是一次对话。AI会配合你。",
    "最后，它会给你一份总结，你可以记下来或打印出来带去投票站。",
  ],
  tipsWarning:
    "AI可能会犯错。这只是研究的起点。该工具会为你提供官方来源链接，以便你核实任何重要信息。",

  // Footer
  footerShare: "分享此工具",
  footerAttribution: "由人类使用AI工具创建",

  // Accessibility
  skipToContent: "跳至主要内容",

  // Phase 3: Polling location
  pollingLocationLabel: "你的投票地点",
  pollingHoursLabel: "开放时间",

  // Phase 3: Ballot contests
  ballotContestsLabel: "你的选票",

  // Phase 3: Candidate enrichment
  candidateExpand: "查看投票记录",
  candidateCollapse: "隐藏详情",
  candidateVotingRecord: "投票记录",
  candidateTopDonors: "主要捐款人",
  candidateEndorsements: "背书支持",
  candidateIssuePositions: "议题立场",
  candidateSources: "来源",
  candidateEnrichmentError: "候选人信息暂时不可用。",

  // Phase 3: API errors
  apiPartialError: "部分选举数据暂时不可用。显示的信息是最新的。",
  apiFullError:
    "我们在加载实时选举数据时遇到问题。以下是我们了解到的关于在{stateName}投票的信息。请访问你所在州的选举办公室获取最新日期和截止日期。",
  stateElectionOfficeLinkText: "州选举办公室",

  // Phase 3: Data attribution
  dataAttributionText:
    "选举数据来自Google Civic Information和通过Anthropic进行的实时网络搜索。",
  dataAttributionVerify: "核实于",
  updatedAtLabel: "更新时间",

  // Phase 3: Voter ID
  voterIdLabel: "选民身份证要求",
  voterIdRequiredText: "需要附照片身份证",
  voterIdNotRequiredText: "不需要附照片身份证",
  voterIdExceptionsLabel: "例外情况",
  voterIdVerifyNote: "请在你所在州的选举办公室核实当前要求。",

  // Phase 5: Chat window
  chatCta: "在此处研究我的选票",
  chatWindowTitle: "AI 选票研究",
  chatPrivacyNotice:
    "您的对话仅保留在您的浏览器中——我们不会存储它。如果您关闭或刷新此页面，对话将丢失。离开前请下载您的选票和选民档案。",
  chatInputPlaceholder: "输入您的消息...",
  chatSend: "发送",
  chatBudgetNotice70:
    "本月晚些时候免费AI聊天可能受到限制。您始终可以使用复制粘贴选项。",
  chatBudgetNotice90: "本月免费AI聊天即将达到限额。请考虑使用复制粘贴选项。",
  chatDisabledMessage:
    "我们的免费AI聊天已达到本月限额。请复制下面的提示并粘贴到任何免费AI聊天机器人中。",

  // Phase 5: Ballot download
  ballotSectionTitle: "您的选票",
  downloadBallotBtn: "下载我的选票",
  ballotPasteLabel: "将您的AI生成的选票内容粘贴到此处以创建可打印选票。",
  ballotPastePlaceholder: "粘贴AI对话中的'MY BALLOT'部分...",
  ballotPasteBtn: "生成我的选票",
  ballotParseError:
    "我们无法读取该格式。请尝试只复制'MY BALLOT'部分，或在下方手动输入您的选择。",
  ballotManualEntryTitle: "手动输入我的选择",
  ballotNote: "这是您的个人参考资料，不是官方选票。",

  // Phase 5: Voter profile
  uploadProfileLabel: "回头客？上传您的选民档案。",
  uploadProfileConfirm: "档案已加载！这将包含在您的AI对话中。",
  profileSessionNote: "您的档案仅用于本次会话，不会存储在我们的服务器上。",
  profileUploadTypeError: "请上传.txt文件。",
  profileUploadSizeError: "文件太大。选民档案应小于10KB。",
  profileDownloadNote: "将此文件保存在下次选举前能找到的地方。",
  downloadProfileBtn: "下载我的选民档案",

  // Phase 5: Alignment banners
  alignmentStrong: "高度契合",
  alignmentMixed: "部分契合",
  alignmentWeak: "契合度低",
  alignmentExpand: "查看详情",
  alignmentCollapse: "收起",

  // Phase 6: Issue Ranking
  issueRankingTitle: "哪些议题对您最重要？",
  issueRankingSubtitle: "拖动或使用方向键按优先顺序排列（顶部 = 最重要）。",
  issueRankSkipButton: "跳过排名",
  issueRankConfirmButton: "确认我的优先事项",
  issueRankInstructions: "使用方向键和空格键重新排序。您的前3项将被突出显示。",
  issueRankTopPriorities: "您的主要优先事项",

  // Phase 6: Concern Disambiguation
  concernDisambiguationTitle: "有什么具体的事情想让AI知道吗？",
  concernDisambiguationPlaceholder:
    '例如："我在租房，在城里买不起房"，或"我的孩子患有1型糖尿病"',
  concernDisambiguationSubmit: "映射到议题",
  concernMappingTitle: "我们听到了 — 以下是我们映射您关切的方式：",
  concernConfirmButton: "确认并继续",
  concernSkipButton: "跳过此步骤",
  concernPrivacyNote:
    "您的文字被发送给我们的AI以映射议题。它永远不会被记录或存储。",

  // Phase 6: Polis Overlay
  polisOverlayCountyLabel: "在您所在县对议题进行排名的选民中",
  polisOverlayDescription: "县级匿名计数",
  polisPrivacyDisclosure:
    '当您对议题进行排名时，我们会匿名将其添加到其他选民可以看到的县级计数中。我们从不存储您的邮政编码、排名顺序或其他任何内容——只是"[县]中+1个[议题]"。',
};

export const ar: Translations = {
  // Language toggle
  languageToggleLabel: "العربية",
  languageToggleAnnouncement: "تم تغيير اللغة إلى العربية",

  // Hero section
  heroEyebrow: "Voter Choice",
  heroTitle:
    "البحث في بطاقة الاقتراع مع السياق الانتخابي المحلي وتاريخ المرشحين.",
  heroCopy:
    "أدخل الرمز البريدي للاطلاع على السياق الانتخابي لولايتك، وعبارة موجهة قابلة للنسخ، وأي معلومات متاحة عن المرشحين. انسخ العبارة وألصقها في أي روبوت دردشة ذكاء اصطناعي مجاني لبدء البحث في بطاقة اقتراعك.",
  chatbotLinksLabel: "يعمل مع أي روبوت دردشة ذكاء اصطناعي:",

  // Zip code form
  zipLabel: "الرمز البريدي",
  zipPlaceholder: "أدخل رمزك البريدي المكون من 5 أرقام",
  submitButton: "البحث في بطاقة الاقتراع",
  submitButtonLoading: "جارٍ التحميل...",

  // Error messages
  errorEmptyZip: "يرجى إدخال الرمز البريدي.",
  errorInvalidZip: "يرجى إدخال رمز بريدي صحيح مكون من 5 أرقام.",
  errorZipNotFound:
    "ليس لدينا بيانات لهذا الرمز البريدي حتى الآن. نعمل على إضافة جميع الرموز البريدية الأمريكية.",
  errorRegistrationPassed:
    "انتهت مواعيد تسجيل هذه الانتخابات. قد تتمكن من التصويت إذا كنت مسجلاً بالفعل.",
  errorNoElection: (stateName: string) =>
    `لم يتم العثور على انتخابات قادمة في ${stateName}. راجع موقع الانتخابات في ولايتك للحصول على آخر المستجدات.`,

  // State selector
  stateSelectorEyebrow: "هذا الرمز البريدي يشمل ولايات متعددة",
  stateSelectorTitle: "في أي ولاية ستصوت؟",

  // State info card
  stateSnapshotEyebrow: "ملخص الولاية",
  updatedLabel: "تاريخ التحديث",
  electionLabel: "الانتخابات",
  registrationLabel: "التسجيل",
  earlyVotingLabel: "التصويت المبكر",
  votingRulesLabel: "قواعد التصويت",
  noElectionData: "لا توجد بيانات انتخابية",
  noEarlyVoting: "غير متاح",
  earlyVotingThrough: "حتى",
  phonesProhibited: "يُحظر استخدام الهواتف في مراكز الاقتراع.",
  phonesPolicyVaries: "سياسة الهواتف تتفاوت أو مسموح بها.",
  registrationCheckPrefix: "تحقق من",
  registrationCheckSuffix: "قبل يوم الانتخابات.",

  // Deadline status
  daysLeft: (days: number) => `${days} يوم متبقٍ`,
  deadlinePassed: "انتهى",
  deadlineNotAvailable: "غير متاح",

  // Prompt section
  promptEyebrow: "عبارة موجهة مخصصة",
  promptInstructions:
    "انسخ هذه العبارة الموجهة وألصقها كأول رسالة في أي روبوت دردشة ذكاء اصطناعي.",
  copyButton: "نسخ إلى الحافظة",
  copyButtonCopied: "تم النسخ!",

  // Copy confirmation
  copyConfirmation: "تم نسخ العبارة الموجهة",

  // Tips section
  tipsTitle: "نصائح لمحادثتك",
  tips: [
    'يمكنك قول "لا أعرف" أو "لست متأكداً من موقفي" — سيشرح الذكاء الاصطناعي أكثر ويساعدك على التوصل إلى إجابة.',
    'يمكنك أن تطلب منه البحث في شيء ما ("هل يمكنك الاطلاع على سجل تصويت هذا المرشح؟").',
    "أنت لست في امتحان. أنت في محادثة. الذكاء الاصطناعي يعمل معك.",
    "في النهاية، سيعطيك ملخصاً يمكنك كتابته أو طباعته وأخذه إلى مركز الاقتراع.",
  ],
  tipsWarning:
    "قد يرتكب الذكاء الاصطناعي أخطاء. هذه نقطة بداية للبحث. ستوفر الأداة روابط لمصادر رسمية حتى تتمكن من التحقق من أي معلومات مهمة.",

  // Footer
  footerShare: "شارك هذه الأداة",
  footerAttribution: "أُنشئت بواسطة إنسان باستخدام أدوات الذكاء الاصطناعي",

  // Accessibility
  skipToContent: "انتقل إلى المحتوى الرئيسي",

  // Phase 3: Polling location
  pollingLocationLabel: "مركز الاقتراع الخاص بك",
  pollingHoursLabel: "ساعات العمل",

  // Phase 3: Ballot contests
  ballotContestsLabel: "بطاقة اقتراعك",

  // Phase 3: Candidate enrichment
  candidateExpand: "عرض سجل التصويت",
  candidateCollapse: "إخفاء التفاصيل",
  candidateVotingRecord: "سجل التصويت",
  candidateTopDonors: "أبرز المانحين",
  candidateEndorsements: "التأييدات",
  candidateIssuePositions: "مواقف من القضايا",
  candidateSources: "المصادر",
  candidateEnrichmentError: "معلومات المرشح غير متاحة مؤقتاً.",

  // Phase 3: API errors
  apiPartialError:
    "بعض البيانات الانتخابية غير متاحة مؤقتاً. المعلومات المعروضة محدثة.",
  apiFullError:
    "نواجه مشكلة في تحميل البيانات الانتخابية المباشرة. إليك ما نعرفه عن التصويت في {stateName}. تفضل بزيارة مكتب الانتخابات في ولايتك للحصول على التواريخ والمواعيد النهائية الحالية.",
  stateElectionOfficeLinkText: "مكتب الانتخابات بالولاية",

  // Phase 3: Data attribution
  dataAttributionText:
    "بيانات الانتخابات من Google Civic Information والبحث المباشر على الإنترنت عبر Anthropic.",
  dataAttributionVerify: "تحقق من",
  updatedAtLabel: "تاريخ التحديث",

  // Phase 3: Voter ID
  voterIdLabel: "متطلبات هوية الناخب",
  voterIdRequiredText: "بطاقة هوية بصورة مطلوبة",
  voterIdNotRequiredText: "لا تُشترط بطاقة هوية بصورة",
  voterIdExceptionsLabel: "الاستثناءات",
  voterIdVerifyNote: "تحقق من المتطلبات الحالية في مكتب الانتخابات بولايتك.",

  // Phase 5: Chat window
  chatCta: "ابحث في بطاقة اقتراعي هنا",
  chatWindowTitle: "بحث بطاقة الاقتراع بالذكاء الاصطناعي",
  chatPrivacyNotice:
    "تبقى محادثتك في متصفحك فقط — لا نخزنها. إذا أغلقت الصفحة أو أعدت تحميلها، ستُفقد المحادثة. نزّل بطاقة اقتراعك وملفك الشخصي للناخبين قبل المغادرة.",
  chatInputPlaceholder: "اكتب رسالتك...",
  chatSend: "إرسال",
  chatBudgetNotice70:
    "قد يكون الدردشة بالذكاء الاصطناعي المجانية محدودة لاحقًا هذا الشهر. يمكنك دائمًا استخدام خيار النسخ واللصق.",
  chatBudgetNotice90:
    "الدردشة بالذكاء الاصطناعي المجانية تقترب من حدها هذا الشهر. فكر في استخدام خيار النسخ واللصق.",
  chatDisabledMessage:
    "وصلت دردشة الذكاء الاصطناعي المجانية لدينا إلى حدها الشهري. انسخ الموجه أدناه والصقه في أي روبوت دردشة ذكاء اصطناعي مجاني.",

  // Phase 5: Ballot download
  ballotSectionTitle: "بطاقة اقتراعك",
  downloadBallotBtn: "تنزيل بطاقة اقتراعي",
  ballotPasteLabel:
    "الصق نتيجة الذكاء الاصطناعي هنا لإنشاء بطاقة اقتراع قابلة للطباعة.",
  ballotPastePlaceholder: "الصق قسم 'MY BALLOT' من محادثة الذكاء الاصطناعي...",
  ballotPasteBtn: "إنشاء بطاقة اقتراعي",
  ballotParseError:
    "لم نتمكن من قراءة هذا التنسيق. حاول نسخ قسم 'MY BALLOT' فقط أو أدخل خياراتك يدويًا.",
  ballotManualEntryTitle: "إدخال اختياراتي يدويًا",
  ballotNote: "هذه ملاحظاتك الشخصية، وليست بطاقة اقتراع رسمية.",

  // Phase 5: Voter profile
  uploadProfileLabel: "ناخب عائد؟ حمّل ملفك الشخصي للناخبين.",
  uploadProfileConfirm:
    "تم تحميل الملف الشخصي! سيتم تضمينه في محادثة الذكاء الاصطناعي.",
  profileSessionNote:
    "يُستخدم ملفك الشخصي لهذه الجلسة فقط ولا يُخزن على خوادمنا.",
  profileUploadTypeError: "يرجى تحميل ملف .txt.",
  profileUploadSizeError:
    "الملف كبير جدًا. يجب أن تكون الملفات الشخصية للناخبين أقل من 10 كيلوبايت.",
  profileDownloadNote: "احفظ هذا الملف في مكان ستجده قبل الانتخابات القادمة.",
  downloadProfileBtn: "تنزيل ملفي الشخصي للناخبين",

  // Phase 5: Alignment banners
  alignmentStrong: "توافق قوي",
  alignmentMixed: "توافق مختلط",
  alignmentWeak: "توافق ضعيف",
  alignmentExpand: "عرض التفاصيل",
  alignmentCollapse: "طي",

  // Phase 6: Issue Ranking
  issueRankingTitle: "ما هي القضايا الأكثر أهمية بالنسبة لك؟",
  issueRankingSubtitle:
    "اسحب أو استخدم مفاتيح الأسهم للترتيب حسب الأولوية (الأعلى = الأكثر أهمية).",
  issueRankSkipButton: "تخطي الترتيب",
  issueRankConfirmButton: "تأكيد أولوياتي",
  issueRankInstructions:
    "استخدم مفاتيح الأسهم والمسافة لإعادة الترتيب. سيتم تمييز أهم 3 أولويات.",
  issueRankTopPriorities: "أولوياتك الرئيسية",

  // Phase 6: Concern Disambiguation
  concernDisambiguationTitle:
    "هل هناك شيء محدد تريد أن يعرفه الذكاء الاصطناعي؟",
  concernDisambiguationPlaceholder:
    "مثال: 'أنا أستأجر ولا أستطيع تحمل تكاليف السكن في مدينتي'، أو 'طفلي مصاب بداء السكري من النوع الأول'",
  concernDisambiguationSubmit: "تعيين إلى قضايا",
  concernMappingTitle: "سمعنا — إليك كيف رسمنا مخاوفك:",
  concernConfirmButton: "تأكيد والمتابعة",
  concernSkipButton: "تخطي هذه الخطوة",
  concernPrivacyNote:
    "يُرسل نصك إلى الذكاء الاصطناعي لدينا لتعيين القضايا. لا يُسجَّل أو يُخزَّن أبدًا.",

  // Phase 6: Polis Overlay
  polisOverlayCountyLabel: "من الناخبين في مقاطعتك ممن رتّبوا قضاياهم",
  polisOverlayDescription: "عدد مجهول على مستوى المقاطعة",
  polisPrivacyDisclosure:
    "عندما تُرتّب قضية، نضيف بشكل مجهول إلى عدد على مستوى المقاطعة يمكن للناخبين الآخرين رؤيته. لا نخزن رمزك البريدي أو تسلسل ترتيبك أو أي شيء آخر — فقط '+1 في [المقاطعة] لـ [القضية].'",
};

export const translations: Record<Language, Translations> = {
  en,
  es,
  vi,
  zh,
  ar,
};
