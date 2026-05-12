/**
 * Translation store for i18n support.
 * Adding a new language requires only:
 *   1. Adding to the Language union type
 *   2. Adding a new record implementing the Translations interface
 */

export type Language = "en" | "es" | "vi" | "zh" | "ar";

export interface Translations {
  // Skip to content
  skipToContent: string;

  // Header
  appName: string;

  // Hero section
  heroHeadline: string;
  heroHeadlineHighlight: string;
  heroSubtitle: string;
  heroSubtitleNote: string;
  heroChatbotsLabel: string;

  // Chatbot descriptions
  chatbotDescClaude: string;
  chatbotDescChatGPT: string;
  chatbotDescGemini: string;
  chatbotDescGrok: string;

  // ZipForm
  zipInputLabel: string;
  zipInputPlaceholder: string;
  zipSubmitButton: string;
  zipSubmitLoading: string;
  zipErrorEmpty: string;
  zipErrorInvalid: string;

  // Not found message
  notFoundTitle: string;
  notFoundBody: string;
  notFoundLink: string;

  // State info
  stateInfoAriaLabel: string;
  noElectionFound: string;
  noElectionMessage: string;
  noElectionLink: string;
  deadlinePassedMessage: string;
  deadlinePassedLink: string;
  registrationDeadlinesHeading: string;
  onlineRegistrationLabel: string;
  onlineRegistrationNotAvailable: string;
  byMailLabel: string;
  inPersonLabel: string;
  sameDayAvailable: string;
  sameDayDetail: string;
  postmarkNote: string;
  receivedNote: string;
  earlyVotingHeading: string;
  earlyVotingNotAvailable: string;
  earlyVotingFallback: string;
  votingRulesHeading: string;
  photoIdLabel: string;
  photoIdRequired: string;
  photoIdNotRequired: string;
  phonesAtPollsLabel: string;
  officialResourcesHeading: string;
  stateElectionWebsiteLink: string;
  sampleBallotLink: string;
  countyElectionLink: string;

  // Deadline status
  deadlineStatusOpen: string;
  deadlineStatusClosingSoon: string;
  deadlineStatusUrgent: string;
  deadlineStatusPassed: string;
  deadlineNotAvailable: string;
  deadlineLabelToday: string;
  deadlineLabel1Day: string;

  // State selector
  stateSelectorPrompt: string;
  stateSelectorButton: string;

  // Prompt output
  promptOutputSectionLabel: string;
  promptOutputHeading: string;
  promptOutputInstructions: string;
  promptOutputHowTo: string;
  copyButton: string;
  copyButtonCopied: string;
  copyConfirmation: string;
  copyFallback: string;
  promptTextAreaLabel: string;

  // Tips section
  tipsSectionHeading: string;
  tip1Heading: string;
  tip1Body: string;
  tip2Heading: string;
  tip2Body: string;
  tip3Heading: string;
  tip3Body: string;
  tip4Heading: string;
  tip4Body: string;
  tip5Heading: string;
  tip5Body: string;

  // Footer
  footerCredit: string;

  // Language toggle
  languageToggleLabel: string;
  languageToggleAnnouncement: string;

  // Phase 3: Live data
  pollingLocationHeading: string;
  ballotContestsHeading: string;
  viewVotingRecord: string;
  candidateLoading: string;
  electionDataLoading: string;
  apiPartialError: string;
  apiFullError: string;
  dataAttribution: string;
  dataUpdated: string;
  voterIdVerifyNote: string;
}

export const en: Translations = {
  // Skip to content
  skipToContent: "Skip to main content",

  // Header
  appName: "Voter Choice",

  // Hero section
  heroHeadline: "Know what you're voting for.",
  heroHeadlineHighlight: "In minutes.",
  heroSubtitle:
    "Enter your zip code to get a personalized AI ballot research prompt. Paste it into any free AI chatbot and get a nonpartisan walkthrough of every race and issue on your specific ballot.",
  heroSubtitleNote:
    "No account needed. No data stored. Works with any AI chatbot.",
  heroChatbotsLabel: "Supported AI chatbots",

  // Chatbot descriptions
  chatbotDescClaude: "by Anthropic",
  chatbotDescChatGPT: "by OpenAI",
  chatbotDescGemini: "by Google",
  chatbotDescGrok: "by xAI",

  // ZipForm
  zipInputLabel: "Your zip code",
  zipInputPlaceholder: "e.g. 73301",
  zipSubmitButton: "Look up my ballot",
  zipSubmitLoading: "Looking up...",
  zipErrorEmpty: "Please enter a zip code",
  zipErrorInvalid: "Please enter a valid 5-digit zip code",

  // Not found message
  notFoundTitle: "Zip code not found",
  notFoundBody:
    "We don't have data for zip code {zip} yet. We're working on adding all U.S. zip codes.",
  notFoundLink: "Find your state election website",

  // State info
  stateInfoAriaLabel: "Election information for {state}",
  noElectionFound: "No upcoming elections found",
  noElectionMessage:
    "No upcoming elections found for {state}. Check the {state} election website for updates.",
  noElectionLink: "{state} election website",
  deadlinePassedMessage:
    "Registration deadlines for this election have passed.",
  deadlinePassedLink: "your registration status",
  registrationDeadlinesHeading: "Voter Registration Deadlines",
  onlineRegistrationLabel: "Online registration",
  onlineRegistrationNotAvailable: "Not available",
  byMailLabel: "By mail",
  inPersonLabel: "In person",
  sameDayAvailable: "Same-day registration available",
  sameDayDetail: "You can register on Election Day",
  postmarkNote: "Postmark by this date",
  receivedNote: "Must be received by this date",
  earlyVotingHeading: "Early Voting",
  earlyVotingNotAvailable: "Not available",
  earlyVotingFallback:
    "Early voting not available. Absentee voting may be available.",
  votingRulesHeading: "Voting Rules",
  photoIdLabel: "Photo ID: ",
  photoIdRequired: "Required",
  photoIdNotRequired: "Not required",
  phonesAtPollsLabel: "Phones at polls: ",
  officialResourcesHeading: "Official Resources",
  stateElectionWebsiteLink: "{state} Election Website",
  sampleBallotLink: "Sample Ballot Lookup",
  countyElectionLink: "County Election Office",

  // Deadline status
  deadlineStatusOpen: "Open",
  deadlineStatusClosingSoon: "Closing Soon",
  deadlineStatusUrgent: "Urgent",
  deadlineStatusPassed: "Passed",
  deadlineNotAvailable: "Not available",
  deadlineLabelToday: "Today — Last Day",
  deadlineLabel1Day: "1 day left",

  // State selector
  stateSelectorPrompt:
    "This zip code spans multiple states. Which state are you voting in?",
  stateSelectorButton: "I'm voting in {state}",

  // Prompt output
  promptOutputSectionLabel: "Customized ballot research prompt",
  promptOutputHeading: "Your Customized Ballot Research Prompt",
  promptOutputInstructions:
    "Copy this prompt and paste it as your first message in any AI chatbot",
  promptOutputHowTo:
    "How to use: Copy below → open any free AI chatbot → paste as your first message",
  copyButton: "Copy to Clipboard",
  copyButtonCopied: "Copied!",
  copyConfirmation: "✓ Copied to clipboard!",
  copyFallback:
    "Clipboard not available. The text is selected — press Ctrl+C / Cmd+C to copy.",
  promptTextAreaLabel:
    "Ballot research prompt — read only, use copy button above",

  // Tips section
  tipsSectionHeading: "Tips for using your prompt effectively",
  tip1Heading: 'Say "I don\'t know" anytime',
  tip1Body:
    "The AI will explain more and help you figure out where you stand — you're not being tested.",
  tip2Heading: "Ask it to research things",
  tip2Body:
    '"Can you look up this candidate\'s voting record?" or "Who funds this ballot measure?" — it\'ll dig in.',
  tip3Heading: "Ask questions",
  tip3Body:
    '"What does this position actually do?" or "Why does this matter?" — no question is too basic.',
  tip4Heading: "Print your summary",
  tip4Body:
    "Many states ban phones at the polling place. Print or write down your choices before you go.",
  tip5Heading: "AI can make mistakes",
  tip5Body:
    "This is a research starting point. The AI will link you to official sources so you can verify anything that matters.",

  // Footer
  footerCredit:
    "Created by a human using AI tools — because everyone deserves to know what they're actually voting for.",

  // Language toggle
  languageToggleLabel: "Switch to Español",
  languageToggleAnnouncement: "Language changed to English",

  // Phase 3: Live data
  pollingLocationHeading: "Your Polling Location",
  ballotContestsHeading: "Races on Your Ballot",
  viewVotingRecord: "View voting record",
  candidateLoading: "Loading candidate information...",
  electionDataLoading: "Loading election data...",
  apiPartialError:
    "Some election data is temporarily unavailable. The information shown is current. Visit your",
  apiFullError:
    "We're having trouble loading live election data. Here's what we know about voting in your state. Visit your state election office for current dates and deadlines.",
  dataAttribution:
    "Election data from Google Civic Information and live web search via Anthropic.",
  dataUpdated: "Updated",
  voterIdVerifyNote:
    "Verify current requirements at your state election office.",
};

export const es: Translations = {
  // Skip to content
  skipToContent: "Ir al contenido principal",

  // Header
  appName: "Voter Choice",

  // Hero section
  heroHeadline: "Conoce por qué vas a votar.",
  heroHeadlineHighlight: "En minutos.",
  heroSubtitle:
    "Ingresa tu código postal para obtener un prompt personalizado de investigación electoral. Pégalo en cualquier chatbot de IA gratuito y obtén un resumen no partidista de cada candidato y tema en tu boleta.",
  heroSubtitleNote:
    "Sin cuenta. Sin datos guardados. Funciona con cualquier chatbot de IA.",
  heroChatbotsLabel: "Chatbots de IA compatibles",

  // Chatbot descriptions
  chatbotDescClaude: "por Anthropic",
  chatbotDescChatGPT: "por OpenAI",
  chatbotDescGemini: "por Google",
  chatbotDescGrok: "por xAI",

  // ZipForm
  zipInputLabel: "Tu código postal",
  zipInputPlaceholder: "ej. 73301",
  zipSubmitButton: "Buscar mi boleta",
  zipSubmitLoading: "Buscando...",
  zipErrorEmpty: "Por favor ingresa un código postal",
  zipErrorInvalid: "Por favor ingresa un código postal válido de 5 dígitos",

  // Not found message
  notFoundTitle: "Código postal no encontrado",
  notFoundBody:
    "Aún no tenemos datos para el código postal {zip}. Estamos trabajando para incluir todos los códigos postales de EE.UU.",
  notFoundLink: "Encuentra el sitio web electoral de tu estado",

  // State info
  stateInfoAriaLabel: "Información electoral para {state}",
  noElectionFound: "No se encontraron elecciones próximas",
  noElectionMessage:
    "No se encontraron elecciones próximas para {state}. Consulta el sitio web electoral de {state} para más información.",
  noElectionLink: "Sitio web electoral de {state}",
  deadlinePassedMessage:
    "Las fechas límite de registro para esta elección ya pasaron.",
  deadlinePassedLink: "tu estado de registro",
  registrationDeadlinesHeading: "Fechas límite de registro para votar",
  onlineRegistrationLabel: "Registro en línea",
  onlineRegistrationNotAvailable: "No disponible",
  byMailLabel: "Por correo",
  inPersonLabel: "En persona",
  sameDayAvailable: "Registro el mismo día disponible",
  sameDayDetail: "Puedes registrarte el día de las elecciones",
  postmarkNote: "Fecha de matasellos de correos",
  receivedNote: "Debe recibirse antes de esta fecha",
  earlyVotingHeading: "Votación anticipada",
  earlyVotingNotAvailable: "No disponible",
  earlyVotingFallback:
    "La votación anticipada no está disponible. Es posible que el voto por correo esté disponible.",
  votingRulesHeading: "Reglas de votación",
  photoIdLabel: "Identificación con foto: ",
  photoIdRequired: "Requerida",
  photoIdNotRequired: "No requerida",
  phonesAtPollsLabel: "Teléfonos en las casillas: ",
  officialResourcesHeading: "Recursos oficiales",
  stateElectionWebsiteLink: "Sitio web electoral de {state}",
  sampleBallotLink: "Buscar boleta de muestra",
  countyElectionLink: "Oficina electoral del condado",

  // Deadline status
  deadlineStatusOpen: "Abierto",
  deadlineStatusClosingSoon: "Cierra pronto",
  deadlineStatusUrgent: "Urgente",
  deadlineStatusPassed: "Vencido",
  deadlineNotAvailable: "No disponible",
  deadlineLabelToday: "Hoy — Último día",
  deadlineLabel1Day: "Queda 1 día",

  // State selector
  stateSelectorPrompt:
    "Este código postal abarca varios estados. ¿En qué estado vas a votar?",
  stateSelectorButton: "Voy a votar en {state}",

  // Prompt output
  promptOutputSectionLabel: "Prompt personalizado de investigación electoral",
  promptOutputHeading: "Tu Prompt Personalizado de Investigación Electoral",
  promptOutputInstructions:
    "Copia este prompt y pégalo como tu primer mensaje en cualquier chatbot de IA",
  promptOutputHowTo:
    "Cómo usarlo: Copia abajo → abre cualquier chatbot de IA gratuito → pégalo como tu primer mensaje",
  copyButton: "Copiar al portapapeles",
  copyButtonCopied: "¡Copiado!",
  copyConfirmation: "✓ ¡Copiado al portapapeles!",
  copyFallback:
    "Portapapeles no disponible. El texto está seleccionado — presiona Ctrl+C / Cmd+C para copiar.",
  promptTextAreaLabel:
    "Prompt de investigación electoral — solo lectura, usa el botón de copiar",

  // Tips section
  tipsSectionHeading: "Consejos para usar tu prompt de manera efectiva",
  tip1Heading: 'Di "No sé" cuando quieras',
  tip1Body:
    "La IA te explicará más y te ayudará a entender tu postura — no te está evaluando.",
  tip2Heading: "Pídele que investigue",
  tip2Body:
    '"¿Puedes buscar el historial de votación de este candidato?" o "¿Quién financia esta propuesta?" — lo investigará.',
  tip3Heading: "Haz preguntas",
  tip3Body:
    '"¿Qué hace realmente este cargo?" o "¿Por qué esto importa?" — ninguna pregunta es demasiado básica.',
  tip4Heading: "Imprime tu resumen",
  tip4Body:
    "Muchos estados prohíben los teléfonos en el lugar de votación. Imprime o anota tus opciones antes de ir.",
  tip5Heading: "La IA puede cometer errores",
  tip5Body:
    "Este es un punto de partida para tu investigación. La IA te enlazará a fuentes oficiales para que puedas verificar lo que importa.",

  // Footer
  footerCredit:
    "Creado por una persona usando herramientas de IA — porque todos merecen saber por qué votan realmente.",

  // Language toggle
  languageToggleLabel: "Switch to English",
  languageToggleAnnouncement: "Idioma cambiado a español",

  // Phase 3: Live data
  pollingLocationHeading: "Tu lugar de votación",
  ballotContestsHeading: "Candidaturas en tu boleta",
  viewVotingRecord: "Ver historial de votación",
  candidateLoading: "Cargando información del candidato...",
  electionDataLoading: "Cargando datos electorales...",
  apiPartialError:
    "Algunos datos electorales no están disponibles temporalmente. La información que se muestra está actualizada. Visita tu",
  apiFullError:
    "Tenemos problemas para cargar los datos electorales en vivo. Aquí está lo que sabemos sobre votar en tu estado. Visita tu oficina electoral estatal para fechas y plazos actuales.",
  dataAttribution:
    "Datos electorales de Google Civic Information y búsqueda web en vivo a través de Anthropic.",
  dataUpdated: "Actualizado",
  voterIdVerifyNote:
    "Verifica los requisitos actuales en tu oficina electoral estatal.",
};

export const vi: Translations = {
  // Skip to content
  skipToContent: "Chuyển đến nội dung chính",

  // Header
  appName: "Voter Choice",

  // Hero section
  heroHeadline: "Biết bạn đang bỏ phiếu cho điều gì.",
  heroHeadlineHighlight: "Chỉ trong vài phút.",
  heroSubtitle:
    "Nhập mã zip của bạn để nhận câu lệnh nghiên cứu bầu cử AI được cá nhân hóa. Dán vào bất kỳ chatbot AI miễn phí nào và nhận hướng dẫn phi đảng phái về từng cuộc đua và vấn đề trên lá phiếu của bạn.",
  heroSubtitleNote:
    "Không cần tài khoản. Không lưu dữ liệu. Hoạt động với mọi chatbot AI.",
  heroChatbotsLabel: "Các chatbot AI được hỗ trợ",

  // Chatbot descriptions
  chatbotDescClaude: "bởi Anthropic",
  chatbotDescChatGPT: "bởi OpenAI",
  chatbotDescGemini: "bởi Google",
  chatbotDescGrok: "bởi xAI",

  // ZipForm
  zipInputLabel: "Mã zip của bạn",
  zipInputPlaceholder: "vd. 73301",
  zipSubmitButton: "Tra cứu lá phiếu của tôi",
  zipSubmitLoading: "Đang tra cứu...",
  zipErrorEmpty: "Vui lòng nhập mã zip",
  zipErrorInvalid: "Vui lòng nhập mã zip hợp lệ gồm 5 chữ số",

  // Not found message
  notFoundTitle: "Không tìm thấy mã zip",
  notFoundBody:
    "Chúng tôi chưa có dữ liệu cho mã zip {zip}. Chúng tôi đang làm việc để thêm tất cả mã zip tại Hoa Kỳ.",
  notFoundLink: "Tìm trang web bầu cử của tiểu bang bạn",

  // State info
  stateInfoAriaLabel: "Thông tin bầu cử cho {state}",
  noElectionFound: "Không tìm thấy cuộc bầu cử sắp tới",
  noElectionMessage:
    "Không tìm thấy cuộc bầu cử sắp tới cho {state}. Hãy kiểm tra trang web bầu cử của {state} để biết thêm thông tin.",
  noElectionLink: "Trang web bầu cử của {state}",
  deadlinePassedMessage: "Thời hạn đăng ký cho cuộc bầu cử này đã qua.",
  deadlinePassedLink: "tình trạng đăng ký của bạn",
  registrationDeadlinesHeading: "Thời hạn Đăng ký Cử tri",
  onlineRegistrationLabel: "Đăng ký trực tuyến",
  onlineRegistrationNotAvailable: "Không có sẵn",
  byMailLabel: "Qua thư",
  inPersonLabel: "Trực tiếp",
  sameDayAvailable: "Đăng ký cùng ngày có sẵn",
  sameDayDetail: "Bạn có thể đăng ký vào Ngày Bầu cử",
  postmarkNote: "Dấu bưu điện trước ngày này",
  receivedNote: "Phải nhận được trước ngày này",
  earlyVotingHeading: "Bỏ Phiếu Sớm",
  earlyVotingNotAvailable: "Không có sẵn",
  earlyVotingFallback:
    "Bỏ phiếu sớm không có sẵn. Bỏ phiếu qua thư có thể có sẵn.",
  votingRulesHeading: "Quy tắc Bỏ Phiếu",
  photoIdLabel: "Ảnh CMND: ",
  photoIdRequired: "Bắt buộc",
  photoIdNotRequired: "Không bắt buộc",
  phonesAtPollsLabel: "Điện thoại tại phòng bầu cử: ",
  officialResourcesHeading: "Tài nguyên Chính thức",
  stateElectionWebsiteLink: "Trang web Bầu cử {state}",
  sampleBallotLink: "Tra cứu Lá Phiếu Mẫu",
  countyElectionLink: "Văn phòng Bầu cử Quận",

  // Deadline status
  deadlineStatusOpen: "Mở",
  deadlineStatusClosingSoon: "Sắp đóng",
  deadlineStatusUrgent: "Khẩn cấp",
  deadlineStatusPassed: "Đã qua",
  deadlineNotAvailable: "Không có sẵn",
  deadlineLabelToday: "Hôm nay — Ngày cuối cùng",
  deadlineLabel1Day: "Còn 1 ngày",

  // State selector
  stateSelectorPrompt:
    "Mã zip này nằm trên nhiều tiểu bang. Bạn đang bỏ phiếu ở tiểu bang nào?",
  stateSelectorButton: "Tôi bỏ phiếu ở {state}",

  // Prompt output
  promptOutputSectionLabel: "Câu lệnh nghiên cứu bầu cử được cá nhân hóa",
  promptOutputHeading: "Câu Lệnh Nghiên Cứu Bầu Cử Được Cá Nhân Hóa Của Bạn",
  promptOutputInstructions:
    "Sao chép câu lệnh này và dán làm tin nhắn đầu tiên của bạn trong bất kỳ chatbot AI nào",
  promptOutputHowTo:
    "Cách sử dụng: Sao chép bên dưới → mở bất kỳ chatbot AI miễn phí → dán làm tin nhắn đầu tiên",
  copyButton: "Sao chép vào Bộ nhớ đệm",
  copyButtonCopied: "Đã sao chép!",
  copyConfirmation: "✓ Đã sao chép vào bộ nhớ đệm!",
  copyFallback:
    "Bộ nhớ đệm không khả dụng. Văn bản đã được chọn — nhấn Ctrl+C / Cmd+C để sao chép.",
  promptTextAreaLabel:
    "Câu lệnh nghiên cứu bầu cử — chỉ đọc, dùng nút sao chép ở trên",

  // Tips section
  tipsSectionHeading: "Mẹo sử dụng câu lệnh của bạn hiệu quả",
  tip1Heading: 'Nói "Tôi không biết" bất cứ lúc nào',
  tip1Body:
    "AI sẽ giải thích thêm và giúp bạn tìm ra lập trường của mình — bạn không bị kiểm tra.",
  tip2Heading: "Yêu cầu nghiên cứu",
  tip2Body:
    '"AI có thể tra cứu hồ sơ bỏ phiếu của ứng viên không?" hoặc "Ai tài trợ cho điều luật này?" — AI sẽ tìm hiểu.',
  tip3Heading: "Đặt câu hỏi",
  tip3Body:
    '"Vị trí này thực sự làm gì?" hoặc "Tại sao điều này quan trọng?" — không có câu hỏi nào quá cơ bản.',
  tip4Heading: "In tóm tắt của bạn",
  tip4Body:
    "Nhiều tiểu bang cấm điện thoại tại phòng bầu cử. In hoặc ghi lại lựa chọn của bạn trước khi đi.",
  tip5Heading: "AI có thể mắc lỗi",
  tip5Body:
    "Đây là điểm khởi đầu nghiên cứu. AI sẽ liên kết bạn đến các nguồn chính thức để bạn có thể xác minh bất kỳ điều gì quan trọng.",

  // Footer
  footerCredit:
    "Được tạo bởi con người sử dụng công cụ AI — vì mọi người đều xứng đáng biết mình thực sự đang bỏ phiếu cho điều gì.",

  // Language toggle
  languageToggleLabel: "Chọn ngôn ngữ",
  languageToggleAnnouncement: "Đã chuyển ngôn ngữ sang Tiếng Việt",

  // Phase 3: Live data
  pollingLocationHeading: "Địa Điểm Bỏ Phiếu Của Bạn",
  ballotContestsHeading: "Các Cuộc Đua Trên Lá Phiếu Của Bạn",
  viewVotingRecord: "Xem hồ sơ bỏ phiếu",
  candidateLoading: "Đang tải thông tin ứng viên...",
  electionDataLoading: "Đang tải dữ liệu bầu cử...",
  apiPartialError:
    "Một số dữ liệu bầu cử tạm thời không khả dụng. Thông tin hiển thị là hiện tại. Hãy truy cập",
  apiFullError:
    "Chúng tôi đang gặp sự cố khi tải dữ liệu bầu cử trực tiếp. Đây là những gì chúng tôi biết về việc bỏ phiếu tại tiểu bang của bạn. Hãy truy cập văn phòng bầu cử tiểu bang của bạn để biết ngày và thời hạn hiện tại.",
  dataAttribution:
    "Dữ liệu bầu cử từ Google Civic Information và tìm kiếm web trực tiếp qua Anthropic.",
  dataUpdated: "Cập nhật",
  voterIdVerifyNote:
    "Xác minh yêu cầu hiện tại tại văn phòng bầu cử tiểu bang của bạn.",
};

export const zh: Translations = {
  // Skip to content
  skipToContent: "跳到主要内容",

  // Header
  appName: "Voter Choice",

  // Hero section
  heroHeadline: "了解你在投什么票。",
  heroHeadlineHighlight: "几分钟搞定。",
  heroSubtitle:
    "输入你的邮政编码，获取个性化的 AI 选票研究提示词。粘贴到任意免费 AI 聊天机器人，获取对你选票上每个选举和议题的无党派解读。",
  heroSubtitleNote: "无需账户。不存储数据。适用于任何 AI 聊天机器人。",
  heroChatbotsLabel: "支持的 AI 聊天机器人",

  // Chatbot descriptions
  chatbotDescClaude: "由 Anthropic 提供",
  chatbotDescChatGPT: "由 OpenAI 提供",
  chatbotDescGemini: "由 Google 提供",
  chatbotDescGrok: "由 xAI 提供",

  // ZipForm
  zipInputLabel: "你的邮政编码",
  zipInputPlaceholder: "例如 73301",
  zipSubmitButton: "查询我的选票",
  zipSubmitLoading: "查询中...",
  zipErrorEmpty: "请输入邮政编码",
  zipErrorInvalid: "请输入有效的 5 位邮政编码",

  // Not found message
  notFoundTitle: "未找到邮政编码",
  notFoundBody:
    "我们还没有邮政编码 {zip} 的数据。我们正在努力添加所有美国邮政编码。",
  notFoundLink: "查找你所在州的选举网站",

  // State info
  stateInfoAriaLabel: "{state} 的选举信息",
  noElectionFound: "未找到即将举行的选举",
  noElectionMessage:
    "未找到 {state} 即将举行的选举。请查看 {state} 选举网站获取更新。",
  noElectionLink: "{state} 选举网站",
  deadlinePassedMessage: "本次选举的选民登记截止日期已过。",
  deadlinePassedLink: "你的登记状态",
  registrationDeadlinesHeading: "选民登记截止日期",
  onlineRegistrationLabel: "在线登记",
  onlineRegistrationNotAvailable: "不可用",
  byMailLabel: "邮寄",
  inPersonLabel: "现场",
  sameDayAvailable: "当天登记可用",
  sameDayDetail: "你可以在选举日登记",
  postmarkNote: "邮戳日期",
  receivedNote: "必须在此日期前收到",
  earlyVotingHeading: "提前投票",
  earlyVotingNotAvailable: "不可用",
  earlyVotingFallback: "提前投票不可用。缺席投票可能可用。",
  votingRulesHeading: "投票规则",
  photoIdLabel: "照片身份证件：",
  photoIdRequired: "必须出示",
  photoIdNotRequired: "无需出示",
  phonesAtPollsLabel: "投票站内使用手机：",
  officialResourcesHeading: "官方资源",
  stateElectionWebsiteLink: "{state} 选举网站",
  sampleBallotLink: "样本选票查询",
  countyElectionLink: "县选举办公室",

  // Deadline status
  deadlineStatusOpen: "开放",
  deadlineStatusClosingSoon: "即将截止",
  deadlineStatusUrgent: "紧急",
  deadlineStatusPassed: "已截止",
  deadlineNotAvailable: "不可用",
  deadlineLabelToday: "今天 — 最后一天",
  deadlineLabel1Day: "还剩 1 天",

  // State selector
  stateSelectorPrompt: "此邮政编码跨越多个州。你在哪个州投票？",
  stateSelectorButton: "我在 {state} 投票",

  // Prompt output
  promptOutputSectionLabel: "个性化选票研究提示词",
  promptOutputHeading: "你的个性化选票研究提示词",
  promptOutputInstructions:
    "复制此提示词并粘贴为任何 AI 聊天机器人的第一条消息",
  promptOutputHowTo:
    "使用方法：复制下方内容 → 打开任意免费 AI 聊天机器人 → 粘贴为第一条消息",
  copyButton: "复制到剪贴板",
  copyButtonCopied: "已复制！",
  copyConfirmation: "✓ 已复制到剪贴板！",
  copyFallback: "剪贴板不可用。文本已选中 — 按 Ctrl+C / Cmd+C 复制。",
  promptTextAreaLabel: "选票研究提示词 — 只读，请使用上方复制按钮",

  // Tips section
  tipsSectionHeading: "有效使用提示词的技巧",
  tip1Heading: '随时说"我不知道"',
  tip1Body: "AI 会进一步解释并帮助你找到立场 — 这不是测试。",
  tip2Heading: "让它研究问题",
  tip2Body:
    '"能查一下这位候选人的投票记录吗？" 或 "谁在资助这项投票提案？" — 它会深入研究。',
  tip3Heading: "提问",
  tip3Body: '"这个职位实际上做什么？" 或 "为什么这很重要？" — 没有问题太基础。',
  tip4Heading: "打印你的摘要",
  tip4Body: "许多州禁止在投票站使用手机。去之前打印或写下你的选择。",
  tip5Heading: "AI 可能出错",
  tip5Body: "这是研究的起点。AI 会链接官方来源，方便你核实重要信息。",

  // Footer
  footerCredit:
    "由人类使用 AI 工具创建 — 因为每个人都有权了解自己真正在投什么票。",

  // Language toggle
  languageToggleLabel: "选择语言",
  languageToggleAnnouncement: "语言已切换为中文",

  // Phase 3: Live data
  pollingLocationHeading: "你的投票站",
  ballotContestsHeading: "你选票上的选举",
  viewVotingRecord: "查看投票记录",
  candidateLoading: "正在加载候选人信息...",
  electionDataLoading: "正在加载选举数据...",
  apiPartialError: "部分选举数据暂时不可用。显示的信息是最新的。请访问你的",
  apiFullError:
    "加载实时选举数据时遇到问题。以下是我们了解到的关于在你所在州投票的信息。请访问你的州选举办公室获取当前日期和截止日期。",
  dataAttribution:
    "选举数据来自 Google Civic Information 和通过 Anthropic 的实时网络搜索。",
  dataUpdated: "更新于",
  voterIdVerifyNote: "请在你的州选举办公室核实当前要求。",
};

export const ar: Translations = {
  // Skip to content
  skipToContent: "انتقل إلى المحتوى الرئيسي",

  // Header
  appName: "Voter Choice",

  // Hero section
  heroHeadline: "اعرف ما تصوّت عليه.",
  heroHeadlineHighlight: "في دقائق.",
  heroSubtitle:
    "أدخل رمزك البريدي للحصول على موجّه بحث انتخابي مخصص بالذكاء الاصطناعي. الصقه في أي روبوت دردشة ذكاء اصطناعي مجاني واحصل على شرح غير حزبي لكل سباق وقضية في ورقة اقتراعك.",
  heroSubtitleNote: "لا حاجة لحساب. لا تخزين للبيانات. يعمل مع أي روبوت دردشة.",
  heroChatbotsLabel: "روبوتات الدردشة المدعومة",

  // Chatbot descriptions
  chatbotDescClaude: "من Anthropic",
  chatbotDescChatGPT: "من OpenAI",
  chatbotDescGemini: "من Google",
  chatbotDescGrok: "من xAI",

  // ZipForm
  zipInputLabel: "رمزك البريدي",
  zipInputPlaceholder: "مثال: 73301",
  zipSubmitButton: "ابحث عن ورقة اقتراعي",
  zipSubmitLoading: "جارٍ البحث...",
  zipErrorEmpty: "يرجى إدخال الرمز البريدي",
  zipErrorInvalid: "يرجى إدخال رمز بريدي صحيح من 5 أرقام",

  // Not found message
  notFoundTitle: "الرمز البريدي غير موجود",
  notFoundBody:
    "ليس لدينا بيانات للرمز البريدي {zip} حتى الآن. نعمل على إضافة جميع الرموز البريدية الأمريكية.",
  notFoundLink: "ابحث عن موقع انتخابات ولايتك",

  // State info
  stateInfoAriaLabel: "معلومات الانتخابات لـ {state}",
  noElectionFound: "لم يُعثر على انتخابات قادمة",
  noElectionMessage:
    "لم يُعثر على انتخابات قادمة في {state}. تحقق من موقع انتخابات {state} للاطلاع على التحديثات.",
  noElectionLink: "موقع انتخابات {state}",
  deadlinePassedMessage: "انتهت مواعيد تسجيل الناخبين لهذه الانتخابات.",
  deadlinePassedLink: "حالة تسجيلك",
  registrationDeadlinesHeading: "مواعيد تسجيل الناخبين",
  onlineRegistrationLabel: "التسجيل الإلكتروني",
  onlineRegistrationNotAvailable: "غير متاح",
  byMailLabel: "بالبريد",
  inPersonLabel: "حضورياً",
  sameDayAvailable: "التسجيل في يوم الانتخابات متاح",
  sameDayDetail: "يمكنك التسجيل في يوم الانتخابات",
  postmarkNote: "ختم البريد قبل هذا التاريخ",
  receivedNote: "يجب الاستلام قبل هذا التاريخ",
  earlyVotingHeading: "التصويت المبكر",
  earlyVotingNotAvailable: "غير متاح",
  earlyVotingFallback:
    "التصويت المبكر غير متاح. قد يكون التصويت بالبريد متاحاً.",
  votingRulesHeading: "قواعد التصويت",
  photoIdLabel: "بطاقة هوية بصورة: ",
  photoIdRequired: "مطلوبة",
  photoIdNotRequired: "غير مطلوبة",
  phonesAtPollsLabel: "الهواتف في مراكز التصويت: ",
  officialResourcesHeading: "الموارد الرسمية",
  stateElectionWebsiteLink: "موقع انتخابات {state}",
  sampleBallotLink: "البحث عن ورقة اقتراع نموذجية",
  countyElectionLink: "مكتب انتخابات المقاطعة",

  // Deadline status
  deadlineStatusOpen: "مفتوح",
  deadlineStatusClosingSoon: "يوشك على الإغلاق",
  deadlineStatusUrgent: "عاجل",
  deadlineStatusPassed: "انتهى",
  deadlineNotAvailable: "غير متاح",
  deadlineLabelToday: "اليوم — آخر يوم",
  deadlineLabel1Day: "يوم واحد متبقٍّ",

  // State selector
  stateSelectorPrompt:
    "يمتد هذا الرمز البريدي على عدة ولايات. في أي ولاية ستصوّت؟",
  stateSelectorButton: "سأصوّت في {state}",

  // Prompt output
  promptOutputSectionLabel: "موجّه بحث انتخابي مخصص",
  promptOutputHeading: "موجّه بحثك الانتخابي المخصص",
  promptOutputInstructions:
    "انسخ هذا الموجّه والصقه كأول رسالة في أي روبوت دردشة ذكاء اصطناعي",
  promptOutputHowTo:
    "كيفية الاستخدام: انسخ أدناه ← افتح أي روبوت دردشة مجاني ← الصق كأول رسالة",
  copyButton: "نسخ إلى الحافظة",
  copyButtonCopied: "تم النسخ!",
  copyConfirmation: "✓ تم النسخ إلى الحافظة!",
  copyFallback: "الحافظة غير متاحة. النص محدد — اضغط Ctrl+C / Cmd+C للنسخ.",
  promptTextAreaLabel:
    "موجّه البحث الانتخابي — للقراءة فقط، استخدم زر النسخ أعلاه",

  // Tips section
  tipsSectionHeading: "نصائح لاستخدام موجّهك بفعالية",
  tip1Heading: 'قل "لا أعرف" في أي وقت',
  tip1Body:
    "سيشرح الذكاء الاصطناعي أكثر ويساعدك في تحديد موقفك — لا أحد يختبرك.",
  tip2Heading: "اطلب منه البحث",
  tip2Body:
    '"هل يمكنك البحث عن سجل تصويت هذا المرشح؟" أو "من يموّل هذا الاقتراح؟" — سيتعمق في الموضوع.',
  tip3Heading: "اطرح أسئلة",
  tip3Body:
    '"ما الذي يفعله هذا المنصب فعلياً؟" أو "لماذا هذا مهم؟" — لا يوجد سؤال بسيط جداً.',
  tip4Heading: "اطبع ملخصك",
  tip4Body:
    "تحظر كثير من الولايات الهواتف في مراكز التصويت. اطبع خياراتك أو اكتبها قبل الذهاب.",
  tip5Heading: "قد يخطئ الذكاء الاصطناعي",
  tip5Body:
    "هذه نقطة بداية للبحث. سيربطك الذكاء الاصطناعي بالمصادر الرسمية لتتمكن من التحقق من أي شيء مهم.",

  // Footer
  footerCredit:
    "أنشأه إنسان باستخدام أدوات الذكاء الاصطناعي — لأن كل شخص يستحق معرفة ما يصوّت عليه فعلاً.",

  // Language toggle
  languageToggleLabel: "اختر اللغة",
  languageToggleAnnouncement: "تم تغيير اللغة إلى العربية",

  // Phase 3: Live data
  pollingLocationHeading: "مركز تصويتك",
  ballotContestsHeading: "السباقات في ورقة اقتراعك",
  viewVotingRecord: "عرض سجل التصويت",
  candidateLoading: "جارٍ تحميل معلومات المرشح...",
  electionDataLoading: "جارٍ تحميل بيانات الانتخابات...",
  apiPartialError:
    "بعض بيانات الانتخابات غير متاحة مؤقتاً. المعلومات المعروضة محدّثة. تفضل بزيارة",
  apiFullError:
    "نواجه مشكلة في تحميل بيانات الانتخابات المباشرة. إليك ما نعرفه عن التصويت في ولايتك. تفضل بزيارة مكتب انتخابات ولايتك للاطلاع على التواريخ والمواعيد الحالية.",
  dataAttribution:
    "بيانات الانتخابات من Google Civic Information والبحث المباشر على الويب عبر Anthropic.",
  dataUpdated: "آخر تحديث",
  voterIdVerifyNote: "تحقق من المتطلبات الحالية في مكتب انتخابات ولايتك.",
};

/**
 * Get a translation string for the given language and key.
 */
export function getTranslation(
  lang: Language,
  key: keyof Translations,
): string {
  const map: Record<Language, Translations> = { en, es, vi, zh, ar };
  return (map[lang] ?? en)[key];
}

/**
 * Replace {placeholder} tokens in a translation string.
 */
export function interpolate(
  template: string,
  values: Record<string, string>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? `{${key}}`);
}
