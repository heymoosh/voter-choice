export type Language = "en" | "es" | "vi" | "zh" | "ar";
export const RTL_LANGUAGES = new Set<Language>(["ar"]);

export const translations = {
  en: {
    // Hero
    heroHeadline: "Know What You're Voting For",
    heroSubtitle:
      "Enter your zip code to get a customized AI prompt that walks you through every race and issue on your ballot. Copy it into any free AI chatbot — no account required.",
    worksWith: "Works with:",
    // Zip form
    zipLabel: "Enter your 5-digit zip code",
    zipPlaceholder: "e.g. 73301",
    zipSubmit: "Look Up",
    zipError: "Please enter a zip code",
    zipErrorInvalid: "Please enter a valid 5-digit zip code",
    // Not found
    notFoundPrefix: "We don't have data for zip code",
    notFoundSuffix:
      "We're working on adding all U.S. zip codes. In the meantime, find your state election office at",
    // State selector
    stateSelectorPrompt:
      "This zip code spans multiple states. Which state are you voting in?",
    // State info card
    nextElection: "Next Election",
    noElection: "No upcoming elections found for",
    noElectionSuffix: "Check",
    noElectionSuffix2: "for updates.",
    registrationDeadlines: "Registration Deadlines",
    onlineLabel: "Online",
    byMailLabel: "By Mail",
    inPersonLabel: "In Person",
    sameDayReg: "Same-day registration available",
    checkRegistration: "Check your registration:",
    earlyVoting: "Early Voting",
    votingRules: "Voting Rules",
    voterId: "Voter ID:",
    voterIdRequired: "Required",
    voterIdNotRequired: "Not required",
    phonesAtPolls: "Phones at polls:",
    resources: "Resources",
    stateElectionWebsite: "State election website",
    countyElectionOffice: "Find your county election office",
    sampleBallot: "Look up your sample ballot",
    dataLastUpdated: "Data last updated:",
    // Deadline status
    passed: "Passed",
    // Prompt output
    yourPrompt: "Your Customized Prompt",
    promptInstructions:
      "Copy this prompt and paste it as your first message in any AI chatbot (Claude, ChatGPT, Gemini, Grok, etc.)",
    copyToClipboard: "Copy to Clipboard",
    copied: "✓ Copied!",
    copiedConfirmation: "Copied to clipboard!",
    fallbackCopy: "Select all text in the box and press",
    fallbackCopyOr: "/",
    fallbackCopyEnd: "to copy.",
    // Tips
    tipsHeading: "Tips for Using This Prompt",
    tip1: 'You can say "I don\'t know" or "I\'m not sure where I stand" — the AI will explain more and help you figure it out.',
    tip2: 'You can ask it to research something for you: "Can you look up this candidate\'s voting record?"',
    tip3: 'You can ask questions anytime: "What does this position actually do?" or "Why does this matter?"',
    tip4: "You're not taking a test. You're having a conversation. The AI works with you.",
    tip5: "At the end, it'll give you a summary you can write down or print and take to the polls.",
    tipsImportant: "Important:",
    tipsDisclaimer:
      "AI can make mistakes. This is a research starting point. The tool will link you to official sources so you can double-check anything that matters to you.",
    // Footer
    shareThis: "Share this tool:",
    shareOnX: "X / Twitter",
    shareOnFacebook: "Facebook",
    shareViaEmail: "Email",
    footerAttribution:
      "Created by a human using AI tools, because everyone deserves to know what they're actually voting for.",
    // Language toggle
    switchTo: "Español",
    languageChanged: "Language changed to English",
    // Screen reader / accessibility
    skipToMain: "Skip to main content",
    lookupFormLabel: "Zip code lookup form",
    zipInputLabel: "Zip code",
    promptOutputLabel: "Customized ballot research prompt",
    copyPromptLabel: "Copy prompt to clipboard",
    shareOnXLabel: "Share on X / Twitter",
    shareOnFacebookLabel: "Share on Facebook",
    shareViaEmailLabel: "Share via email",
    switchLangAriaLabel: "Switch to Spanish",
    // Context block labels (for generatePrompt)
    contextGreeting: (stateName: string, zip: string) =>
      `Hi! I'm voting in **${stateName}**. My zip code is **${zip}**.`,
    contextIntro: "Here's what I know about my upcoming election:",
    contextElection: "Election",
    contextElectionType: "Election type",
    contextRegistration: "Registration deadlines",
    contextEarlyVoting: "Early voting",
    contextVoterId: "Voter ID",
    contextPhones: "Phones at polls",
    contextSampleBallot: "My sample ballot",
    contextCounty: "My county election office",
    contextClosing: "Help me with my ballot.",
    contextNoElection: (website: string) =>
      `No upcoming elections found. Check ${website} for updates.`,
    contextOnline: (date: string, url: string) => `Online by ${date} (${url})`,
    contextOnlineNA: "Online registration not available",
    contextByMail: (date: string, postmark: string) =>
      `By mail by ${date} (${postmark})`,
    contextByMailPostmark: "postmark date",
    contextByMailReceived: "received date",
    contextInPerson: (date: string) => `In person by ${date}`,
    contextEarlyVotingDates: (start: string, end: string) =>
      `${start} through ${end}`,
    contextEarlyVotingNA: "Not available — absentee voting only",
    contextVoterIdRequired: (ids: string) => `Required. Accepted IDs: ${ids}`,
    contextVoterIdNA: "Not required",
    contextElectionTypePrimary: (type: string) => `${type} primary`,
    // Phase 3: Real ballot data
    loadingElectionData: "Loading election data...",
    pollingLocation: "Polling Location",
    pollingLocationNotAvailable: "Polling location not available",
    ballotContests: "Ballot Contests",
    ballotContestsEmpty: "No ballot contests available",
    candidateDetail: "Candidate Details",
    viewVotingRecord: "View voting record",
    loadingCandidateInfo: "Loading candidate info...",
    votingRecord: "Voting Record",
    topDonors: "Top Donors",
    endorsements: "Endorsements",
    apiPartialError:
      "Some election data is temporarily unavailable. The information shown is current.",
    apiFullError:
      "We're having trouble loading live election data. Here's what we know about voting in your state. Visit your state election office for current dates and deadlines.",
    dataAttribution:
      "Election data from Google Civic Information and live web search via Anthropic.",
    verifyAt: "Verify at",
    lastUpdated: "Updated",
    districts: "Your Districts",
    county: "County",
    congressionalDistrict: "Congressional District",
    stateSenateDistrict: "State Senate District",
    stateHouseDistrict: "State House District",
    // Context block (Phase 3 additions)
    contextDistricts: (county: string, cd: string) => `(${county}, ${cd})`,
    contextPollingPlace: "My polling place",
    contextBallotContests: "Races on my ballot",
    contextVoterIdVerify: "Verify current requirements at",
  },
  es: {
    // Hero
    heroHeadline: "Conoce por qué estás votando",
    heroSubtitle:
      "Ingresa tu código postal para obtener un mensaje de IA personalizado que te guía por cada cargo e iniciativa en tu boleta. Cópialo en cualquier chatbot de IA gratuito — sin necesidad de cuenta.",
    worksWith: "Funciona con:",
    // Zip form
    zipLabel: "Ingresa tu código postal de 5 dígitos",
    zipPlaceholder: "ej. 73301",
    zipSubmit: "Buscar",
    zipError: "Por favor ingresa un código postal",
    zipErrorInvalid: "Por favor ingresa un código postal válido de 5 dígitos",
    // Not found
    notFoundPrefix: "Aún no tenemos datos para el código postal",
    notFoundSuffix:
      "Estamos trabajando para agregar todos los códigos postales de EE.UU. Mientras tanto, encuentra tu oficina electoral estatal en",
    // State selector
    stateSelectorPrompt:
      "Este código postal abarca varios estados. ¿En qué estado vas a votar?",
    // State info card
    nextElection: "Próxima Elección",
    noElection: "No se encontraron elecciones próximas para",
    noElectionSuffix: "Consulta",
    noElectionSuffix2: "para más información.",
    registrationDeadlines: "Fechas Límite de Registro",
    onlineLabel: "En línea",
    byMailLabel: "Por correo",
    inPersonLabel: "En persona",
    sameDayReg: "Registro el mismo día disponible",
    checkRegistration: "Verifica tu registro:",
    earlyVoting: "Votación Anticipada",
    votingRules: "Reglas de Votación",
    voterId: "Identificación para votar:",
    voterIdRequired: "Requerida",
    voterIdNotRequired: "No requerida",
    phonesAtPolls: "Teléfonos en las casillas:",
    resources: "Recursos",
    stateElectionWebsite: "Sitio web electoral del estado",
    countyElectionOffice: "Encuentra tu oficina electoral del condado",
    sampleBallot: "Consulta tu boleta de muestra",
    dataLastUpdated: "Datos actualizados:",
    // Deadline status
    passed: "Pasó",
    // Prompt output
    yourPrompt: "Tu Mensaje Personalizado",
    promptInstructions:
      "Copia este mensaje y pégalo como tu primer mensaje en cualquier chatbot de IA (Claude, ChatGPT, Gemini, Grok, etc.)",
    copyToClipboard: "Copiar al Portapapeles",
    copied: "✓ ¡Copiado!",
    copiedConfirmation: "¡Copiado al portapapeles!",
    fallbackCopy: "Selecciona todo el texto en el cuadro y presiona",
    fallbackCopyOr: "/",
    fallbackCopyEnd: "para copiar.",
    // Tips
    tipsHeading: "Consejos para Usar Este Mensaje",
    tip1: 'Puedes decir "No sé" o "No estoy seguro/a de mi posición" — la IA te explicará más y te ayudará a descubrirlo.',
    tip2: 'Puedes pedirle que investigue algo por ti: "¿Puedes buscar el historial de votación de este candidato?"',
    tip3: 'Puedes hacer preguntas en cualquier momento: "¿Qué hace realmente este cargo?" o "¿Por qué es importante esto?"',
    tip4: "No estás en un examen. Estás teniendo una conversación. La IA trabaja contigo.",
    tip5: "Al final, te dará un resumen que puedes anotar o imprimir y llevar a las urnas.",
    tipsImportant: "Importante:",
    tipsDisclaimer:
      "La IA puede cometer errores. Este es un punto de partida para investigar. La herramienta te enlazará a fuentes oficiales para que puedas verificar cualquier cosa que te importe.",
    // Footer
    shareThis: "Comparte esta herramienta:",
    shareOnX: "X / Twitter",
    shareOnFacebook: "Facebook",
    shareViaEmail: "Correo electrónico",
    footerAttribution: "Creado por una persona usando herramientas de IA",
    // Language toggle
    switchTo: "English",
    languageChanged: "Idioma cambiado a español",
    // Screen reader / accessibility
    skipToMain: "Saltar al contenido principal",
    lookupFormLabel: "Formulario de búsqueda por código postal",
    zipInputLabel: "Código postal",
    promptOutputLabel: "Mensaje personalizado de investigación electoral",
    copyPromptLabel: "Copiar mensaje al portapapeles",
    shareOnXLabel: "Compartir en X / Twitter",
    shareOnFacebookLabel: "Compartir en Facebook",
    shareViaEmailLabel: "Compartir por correo electrónico",
    switchLangAriaLabel: "Cambiar a inglés",
    // Context block labels (for generatePrompt)
    contextGreeting: (stateName: string, zip: string) =>
      `¡Hola! Voy a votar en **${stateName}**. Mi código postal es **${zip}**.`,
    contextIntro: "Esto es lo que sé sobre mi próxima elección:",
    contextElection: "Elección",
    contextElectionType: "Tipo de elección",
    contextRegistration: "Fechas límite de registro",
    contextEarlyVoting: "Votación anticipada",
    contextVoterId: "Identificación para votar",
    contextPhones: "Teléfonos en las casillas",
    contextSampleBallot: "Mi boleta de muestra",
    contextCounty: "Mi oficina electoral del condado",
    contextClosing: "Ayúdame con mi boleta.",
    contextNoElection: (website: string) =>
      `No se encontraron elecciones próximas. Consulta ${website} para más información.`,
    contextOnline: (date: string, url: string) =>
      `En línea antes del ${date} (${url})`,
    contextOnlineNA: "Registro en línea no disponible",
    contextByMail: (date: string, postmark: string) =>
      `Por correo antes del ${date} (${postmark})`,
    contextByMailPostmark: "fecha de matasellos",
    contextByMailReceived: "fecha de recepción",
    contextInPerson: (date: string) => `En persona antes del ${date}`,
    contextEarlyVotingDates: (start: string, end: string) =>
      `Del ${start} al ${end}`,
    contextEarlyVotingNA: "No disponible — solo voto en ausencia",
    contextVoterIdRequired: (ids: string) => `Requerida. [${ids}]`,
    contextVoterIdNA: "No requerida",
    contextElectionTypePrimary: (type: string) => `primaria (${type})`,
    // Phase 3: Real ballot data
    loadingElectionData: "Cargando datos electorales...",
    pollingLocation: "Lugar de Votación",
    pollingLocationNotAvailable: "Lugar de votación no disponible",
    ballotContests: "Contiendas en la Boleta",
    ballotContestsEmpty: "No hay contiendas disponibles",
    candidateDetail: "Detalles del Candidato",
    viewVotingRecord: "Ver historial de votación",
    loadingCandidateInfo: "Cargando información del candidato...",
    votingRecord: "Historial de Votación",
    topDonors: "Principales Donantes",
    endorsements: "Endorsos",
    apiPartialError:
      "Algunos datos electorales no están disponibles temporalmente. La información mostrada está actualizada.",
    apiFullError:
      "Tenemos problemas para cargar los datos electorales en vivo. Aquí está lo que sabemos sobre votar en tu estado. Visita la oficina electoral de tu estado para fechas y plazos actuales.",
    dataAttribution:
      "Datos electorales de Google Civic Information y búsqueda web en vivo via Anthropic.",
    verifyAt: "Verifica en",
    lastUpdated: "Actualizado",
    districts: "Tus Distritos",
    county: "Condado",
    congressionalDistrict: "Distrito Congresional",
    stateSenateDistrict: "Distrito del Senado Estatal",
    stateHouseDistrict: "Distrito de la Cámara Estatal",
    // Context block (Phase 3 additions)
    contextDistricts: (county: string, cd: string) => `(${county}, ${cd})`,
    contextPollingPlace: "Mi lugar de votación",
    contextBallotContests: "Contiendas en mi boleta",
    contextVoterIdVerify: "Verifica los requisitos actuales en",
  },
  vi: {
    // Hero
    heroHeadline: "Biết Bạn Đang Bỏ Phiếu Cho Điều Gì",
    heroSubtitle:
      "Nhập mã zip của bạn để nhận một lời nhắc AI tùy chỉnh hướng dẫn bạn qua từng cuộc đua và vấn đề trên phiếu bầu của bạn. Sao chép vào bất kỳ chatbot AI miễn phí nào — không cần tài khoản.",
    worksWith: "Hoạt động với:",
    // Zip form
    zipLabel: "Nhập mã zip 5 chữ số của bạn",
    zipPlaceholder: "ví dụ: 73301",
    zipSubmit: "Tra Cứu",
    zipError: "Vui lòng nhập mã zip",
    zipErrorInvalid: "Vui lòng nhập mã zip 5 chữ số hợp lệ",
    // Not found
    notFoundPrefix: "Chúng tôi không có dữ liệu cho mã zip",
    notFoundSuffix:
      "Chúng tôi đang thêm tất cả các mã zip Hoa Kỳ. Trong thời gian đó, hãy tìm văn phòng bầu cử tiểu bang của bạn tại",
    // State selector
    stateSelectorPrompt:
      "Mã zip này nằm ở nhiều tiểu bang. Bạn đang bỏ phiếu ở tiểu bang nào?",
    // State info card
    nextElection: "Cuộc Bầu Cử Tiếp Theo",
    noElection: "Không tìm thấy cuộc bầu cử sắp tới cho",
    noElectionSuffix: "Kiểm tra",
    noElectionSuffix2: "để cập nhật.",
    registrationDeadlines: "Hạn Chót Đăng Ký",
    onlineLabel: "Trực Tuyến",
    byMailLabel: "Qua Thư",
    inPersonLabel: "Trực Tiếp",
    sameDayReg: "Đăng ký cùng ngày có sẵn",
    checkRegistration: "Kiểm tra đăng ký của bạn:",
    earlyVoting: "Bỏ Phiếu Sớm",
    votingRules: "Quy Tắc Bỏ Phiếu",
    voterId: "Chứng Minh Thư Khi Bỏ Phiếu:",
    voterIdRequired: "Bắt buộc",
    voterIdNotRequired: "Không bắt buộc",
    phonesAtPolls: "Điện Thoại Tại Phòng Bỏ Phiếu:",
    resources: "Tài Nguyên",
    stateElectionWebsite: "Trang web bầu cử tiểu bang",
    countyElectionOffice: "Tìm văn phòng bầu cử quận của bạn",
    sampleBallot: "Tra cứu phiếu bầu mẫu của bạn",
    dataLastUpdated: "Dữ liệu được cập nhật lần cuối:",
    // Deadline status
    passed: "Đã Qua",
    // Prompt output
    yourPrompt: "Lời Nhắc Tùy Chỉnh Của Bạn",
    promptInstructions:
      "Sao chép lời nhắc này và dán làm tin nhắn đầu tiên của bạn trong bất kỳ chatbot AI nào (Claude, ChatGPT, Gemini, Grok, v.v.)",
    copyToClipboard: "Sao Chép Vào Clipboard",
    copied: "✓ Đã Sao Chép!",
    copiedConfirmation: "Đã sao chép vào clipboard!",
    fallbackCopy: "Chọn tất cả văn bản trong hộp và nhấn",
    fallbackCopyOr: "/",
    fallbackCopyEnd: "để sao chép.",
    // Tips
    tipsHeading: "Mẹo Sử Dụng Lời Nhắc Này",
    tip1: 'Bạn có thể nói "Tôi không biết" hoặc "Tôi chưa chắc mình đứng ở đâu" — AI sẽ giải thích thêm và giúp bạn tìm ra.',
    tip2: 'Bạn có thể yêu cầu nó nghiên cứu điều gì đó cho bạn: "Bạn có thể tra cứu lịch sử bỏ phiếu của ứng viên này không?"',
    tip3: 'Bạn có thể đặt câu hỏi bất cứ lúc nào: "Vị trí này thực sự làm gì?" hoặc "Tại sao điều này quan trọng?"',
    tip4: "Bạn không đang thi kiểm tra. Bạn đang có một cuộc trò chuyện. AI làm việc cùng bạn.",
    tip5: "Cuối cùng, nó sẽ cho bạn một bản tóm tắt bạn có thể ghi lại hoặc in và mang đến phòng bỏ phiếu.",
    tipsImportant: "Quan trọng:",
    tipsDisclaimer:
      "AI có thể mắc lỗi. Đây là điểm khởi đầu nghiên cứu. Công cụ sẽ liên kết bạn đến các nguồn chính thức để bạn có thể kiểm tra lại bất cứ điều gì quan trọng với bạn.",
    // Footer
    shareThis: "Chia sẻ công cụ này:",
    shareOnX: "X / Twitter",
    shareOnFacebook: "Facebook",
    shareViaEmail: "Email",
    footerAttribution:
      "Được tạo bởi một người sử dụng các công cụ AI, vì mọi người đều xứng đáng biết mình thực sự đang bỏ phiếu cho điều gì.",
    // Language selector
    switchTo: "English",
    languageChanged: "Đã chuyển ngôn ngữ sang Tiếng Việt",
    // Screen reader / accessibility
    skipToMain: "Bỏ qua đến nội dung chính",
    lookupFormLabel: "Biểu mẫu tra cứu mã zip",
    zipInputLabel: "Mã zip",
    promptOutputLabel: "Lời nhắc nghiên cứu phiếu bầu tùy chỉnh",
    copyPromptLabel: "Sao chép lời nhắc vào clipboard",
    shareOnXLabel: "Chia sẻ trên X / Twitter",
    shareOnFacebookLabel: "Chia sẻ trên Facebook",
    shareViaEmailLabel: "Chia sẻ qua email",
    switchLangAriaLabel: "Chuyển sang tiếng Việt",
    // Context block labels
    contextGreeting: (stateName: string, zip: string) =>
      `Xin chào! Tôi sẽ bỏ phiếu ở **${stateName}**. Mã zip của tôi là **${zip}**.`,
    contextIntro: "Đây là những gì tôi biết về cuộc bầu cử sắp tới của mình:",
    contextElection: "Cuộc bầu cử",
    contextElectionType: "Loại bầu cử",
    contextRegistration: "Hạn chót đăng ký",
    contextEarlyVoting: "Bỏ phiếu sớm",
    contextVoterId: "Chứng minh thư bỏ phiếu",
    contextPhones: "Điện thoại tại phòng bỏ phiếu",
    contextSampleBallot: "Phiếu bầu mẫu của tôi",
    contextCounty: "Văn phòng bầu cử quận của tôi",
    contextClosing: "Hãy giúp tôi với phiếu bầu của mình.",
    contextNoElection: (website: string) =>
      `Không tìm thấy cuộc bầu cử sắp tới. Kiểm tra ${website} để biết thêm thông tin.`,
    contextOnline: (date: string, url: string) =>
      `Trực tuyến trước ngày ${date} (${url})`,
    contextOnlineNA: "Không có đăng ký trực tuyến",
    contextByMail: (date: string, postmark: string) =>
      `Qua thư trước ngày ${date} (${postmark})`,
    contextByMailPostmark: "ngày đóng dấu bưu điện",
    contextByMailReceived: "ngày nhận",
    contextInPerson: (date: string) => `Trực tiếp trước ngày ${date}`,
    contextEarlyVotingDates: (start: string, end: string) =>
      `Từ ${start} đến ${end}`,
    contextEarlyVotingNA: "Không có — chỉ bỏ phiếu vắng mặt",
    contextVoterIdRequired: (ids: string) =>
      `Bắt buộc. Các loại giấy tờ: [${ids}]`,
    contextVoterIdNA: "Không bắt buộc",
    contextElectionTypePrimary: (type: string) => `bầu cử sơ bộ (${type})`,
    // Phase 3
    loadingElectionData: "Đang tải dữ liệu bầu cử...",
    pollingLocation: "Địa Điểm Bỏ Phiếu",
    pollingLocationNotAvailable: "Không có thông tin địa điểm bỏ phiếu",
    ballotContests: "Các Cuộc Đua Trên Phiếu Bầu",
    ballotContestsEmpty: "Không có cuộc đua nào",
    candidateDetail: "Chi Tiết Ứng Viên",
    viewVotingRecord: "Xem lịch sử bỏ phiếu",
    loadingCandidateInfo: "Đang tải thông tin ứng viên...",
    votingRecord: "Lịch Sử Bỏ Phiếu",
    topDonors: "Nhà Tài Trợ Hàng Đầu",
    endorsements: "Chứng Thực",
    apiPartialError:
      "Một số dữ liệu bầu cử tạm thời không khả dụng. Thông tin hiển thị là hiện tại.",
    apiFullError:
      "Chúng tôi đang gặp sự cố khi tải dữ liệu bầu cử trực tiếp. Đây là những gì chúng tôi biết về việc bỏ phiếu ở tiểu bang của bạn. Hãy truy cập văn phòng bầu cử tiểu bang của bạn để biết ngày và hạn chót hiện tại.",
    dataAttribution:
      "Dữ liệu bầu cử từ Google Civic Information và tìm kiếm web trực tiếp qua Anthropic.",
    verifyAt: "Xác minh tại",
    lastUpdated: "Cập nhật",
    districts: "Các Khu Vực Của Bạn",
    county: "Quận",
    congressionalDistrict: "Khu Vực Quốc Hội",
    stateSenateDistrict: "Khu Vực Thượng Viện Tiểu Bang",
    stateHouseDistrict: "Khu Vực Hạ Viện Tiểu Bang",
    contextDistricts: (county: string, cd: string) => `(${county}, ${cd})`,
    contextPollingPlace: "Địa điểm bỏ phiếu của tôi",
    contextBallotContests: "Các cuộc đua trên phiếu bầu của tôi",
    contextVoterIdVerify: "Xác minh yêu cầu hiện tại tại",
  },
  zh: {
    // Hero
    heroHeadline: "了解您正在投票支持什么",
    heroSubtitle:
      "输入您的邮政编码，获取个性化的AI提示，引导您了解选票上的每一场竞选和议题。复制到任何免费的AI聊天机器人中——无需账户。",
    worksWith: "适用于：",
    // Zip form
    zipLabel: "输入您的5位邮政编码",
    zipPlaceholder: "例如：73301",
    zipSubmit: "查询",
    zipError: "请输入邮政编码",
    zipErrorInvalid: "请输入有效的5位邮政编码",
    // Not found
    notFoundPrefix: "我们没有邮政编码的数据",
    notFoundSuffix:
      "我们正在添加所有美国邮政编码。与此同时，请访问以下网址找到您的州选举办公室",
    // State selector
    stateSelectorPrompt: "此邮政编码跨越多个州。您在哪个州投票？",
    // State info card
    nextElection: "下次选举",
    noElection: "未找到即将举行的选举，针对",
    noElectionSuffix: "查看",
    noElectionSuffix2: "获取更新。",
    registrationDeadlines: "注册截止日期",
    onlineLabel: "在线",
    byMailLabel: "邮寄",
    inPersonLabel: "亲自",
    sameDayReg: "可当天注册",
    checkRegistration: "检查您的注册：",
    earlyVoting: "提前投票",
    votingRules: "投票规则",
    voterId: "投票者ID：",
    voterIdRequired: "必需",
    voterIdNotRequired: "不需要",
    phonesAtPolls: "投票站手机：",
    resources: "资源",
    stateElectionWebsite: "州选举网站",
    countyElectionOffice: "查找您的县选举办公室",
    sampleBallot: "查阅您的样本选票",
    dataLastUpdated: "数据最后更新：",
    // Deadline status
    passed: "已过期",
    // Prompt output
    yourPrompt: "您的个性化提示",
    promptInstructions:
      "复制此提示，将其粘贴为您在任何AI聊天机器人（Claude、ChatGPT、Gemini、Grok等）中的第一条消息",
    copyToClipboard: "复制到剪贴板",
    copied: "✓ 已复制！",
    copiedConfirmation: "已复制到剪贴板！",
    fallbackCopy: "选择框中的所有文字，然后按",
    fallbackCopyOr: "/",
    fallbackCopyEnd: "进行复制。",
    // Tips
    tipsHeading: "使用此提示的技巧",
    tip1: '你可以说"我不知道"或"我不确定我的立场"——AI会进一步解释，帮助你弄清楚。',
    tip2: '你可以要求它为你研究一些事情："你能查一下这位候选人的投票记录吗？"',
    tip3: '你可以随时提问："这个职位实际上是做什么的？"或"为什么这很重要？"',
    tip4: "你不是在参加考试。你在进行一次对话。AI与你一起工作。",
    tip5: "最后，它会给你一个总结，你可以记下来或打印出来带到投票站。",
    tipsImportant: "重要：",
    tipsDisclaimer:
      "AI可能会犯错误。这是一个研究起点。该工具会为你链接到官方来源，以便你可以仔细核查任何对你重要的事情。",
    // Footer
    shareThis: "分享此工具：",
    shareOnX: "X / Twitter",
    shareOnFacebook: "Facebook",
    shareViaEmail: "电子邮件",
    footerAttribution:
      "由一个使用AI工具的人创建，因为每个人都应该了解自己实际上在为什么投票。",
    // Language selector
    switchTo: "English",
    languageChanged: "语言已切换为中文",
    // Screen reader / accessibility
    skipToMain: "跳到主要内容",
    lookupFormLabel: "邮政编码查询表格",
    zipInputLabel: "邮政编码",
    promptOutputLabel: "个性化投票研究提示",
    copyPromptLabel: "将提示复制到剪贴板",
    shareOnXLabel: "在X / Twitter上分享",
    shareOnFacebookLabel: "在Facebook上分享",
    shareViaEmailLabel: "通过电子邮件分享",
    switchLangAriaLabel: "切换到中文",
    // Context block labels
    contextGreeting: (stateName: string, zip: string) =>
      `你好！我将在 **${stateName}** 投票。我的邮政编码是 **${zip}**。`,
    contextIntro: "以下是我对即将到来的选举的了解：",
    contextElection: "选举",
    contextElectionType: "选举类型",
    contextRegistration: "注册截止日期",
    contextEarlyVoting: "提前投票",
    contextVoterId: "选民ID",
    contextPhones: "投票站手机",
    contextSampleBallot: "我的样本选票",
    contextCounty: "我的县选举办公室",
    contextClosing: "请帮助我了解我的选票。",
    contextNoElection: (website: string) =>
      `未找到即将举行的选举。请查看 ${website} 获取更多信息。`,
    contextOnline: (date: string, url: string) => `在线截止 ${date}（${url}）`,
    contextOnlineNA: "不提供在线注册",
    contextByMail: (date: string, postmark: string) =>
      `邮寄截止 ${date}（${postmark}）`,
    contextByMailPostmark: "邮戳日期",
    contextByMailReceived: "收件日期",
    contextInPerson: (date: string) => `亲自截止 ${date}`,
    contextEarlyVotingDates: (start: string, end: string) =>
      `${start} 至 ${end}`,
    contextEarlyVotingNA: "不适用——仅缺席投票",
    contextVoterIdRequired: (ids: string) => `必需。接受的证件：[${ids}]`,
    contextVoterIdNA: "不需要",
    contextElectionTypePrimary: (type: string) => `初选（${type}）`,
    // Phase 3
    loadingElectionData: "正在加载选举数据...",
    pollingLocation: "投票地点",
    pollingLocationNotAvailable: "投票地点不可用",
    ballotContests: "选票竞选",
    ballotContestsEmpty: "没有可用的竞选",
    candidateDetail: "候选人详情",
    viewVotingRecord: "查看投票记录",
    loadingCandidateInfo: "正在加载候选人信息...",
    votingRecord: "投票记录",
    topDonors: "主要捐款人",
    endorsements: "背书",
    apiPartialError: "部分选举数据暂时不可用。显示的信息是最新的。",
    apiFullError:
      "我们在加载实时选举数据时遇到问题。以下是我们关于在您的州投票的了解。请访问您的州选举办公室获取最新日期和截止日期。",
    dataAttribution:
      "选举数据来自Google公民信息和通过Anthropic的实时网络搜索。",
    verifyAt: "验证于",
    lastUpdated: "更新",
    districts: "您的选区",
    county: "县",
    congressionalDistrict: "国会选区",
    stateSenateDistrict: "州参议院选区",
    stateHouseDistrict: "州众议院选区",
    contextDistricts: (county: string, cd: string) => `（${county}，${cd}）`,
    contextPollingPlace: "我的投票地点",
    contextBallotContests: "我选票上的竞选",
    contextVoterIdVerify: "在以下网址验证当前要求",
  },
  ar: {
    // Hero
    heroHeadline: "اعرف ما تصوّت عليه",
    heroSubtitle:
      "أدخل الرمز البريدي للحصول على موجّه ذكاء اصطناعي مخصّص يرشدك عبر كل سباق وقضية في بطاقة اقتراعك. انسخه في أي روبوت دردشة ذكاء اصطناعي مجاني — لا حاجة لحساب.",
    worksWith: "يعمل مع:",
    // Zip form
    zipLabel: "أدخل رمزك البريدي المكوّن من 5 أرقام",
    zipPlaceholder: "مثال: 73301",
    zipSubmit: "بحث",
    zipError: "يرجى إدخال رمز بريدي",
    zipErrorInvalid: "يرجى إدخال رمز بريدي صحيح مكوّن من 5 أرقام",
    // Not found
    notFoundPrefix: "ليس لدينا بيانات للرمز البريدي",
    notFoundSuffix:
      "نحن نعمل على إضافة جميع الرموز البريدية الأمريكية. في غضون ذلك، ابحث عن مكتب انتخابات ولايتك على",
    // State selector
    stateSelectorPrompt:
      "يمتد هذا الرمز البريدي على عدة ولايات. في أي ولاية ستصوّت؟",
    // State info card
    nextElection: "الانتخابات القادمة",
    noElection: "لم يتم العثور على انتخابات قادمة لـ",
    noElectionSuffix: "تحقق من",
    noElectionSuffix2: "للحصول على تحديثات.",
    registrationDeadlines: "مواعيد التسجيل",
    onlineLabel: "عبر الإنترنت",
    byMailLabel: "بالبريد",
    inPersonLabel: "شخصياً",
    sameDayReg: "يتوفر التسجيل في نفس اليوم",
    checkRegistration: "تحقق من تسجيلك:",
    earlyVoting: "التصويت المبكر",
    votingRules: "قواعد التصويت",
    voterId: "هوية الناخب:",
    voterIdRequired: "مطلوبة",
    voterIdNotRequired: "غير مطلوبة",
    phonesAtPolls: "الهواتف في مراكز الاقتراع:",
    resources: "الموارد",
    stateElectionWebsite: "موقع انتخابات الولاية",
    countyElectionOffice: "ابحث عن مكتب انتخابات مقاطعتك",
    sampleBallot: "اطلع على نموذج بطاقة اقتراعك",
    dataLastUpdated: "آخر تحديث للبيانات:",
    // Deadline status
    passed: "انقضى",
    // Prompt output
    yourPrompt: "موجّهك المخصّص",
    promptInstructions:
      "انسخ هذا الموجّه والصقه كرسالتك الأولى في أي روبوت دردشة ذكاء اصطناعي (Claude، ChatGPT، Gemini، Grok، إلخ)",
    copyToClipboard: "نسخ إلى الحافظة",
    copied: "✓ تم النسخ!",
    copiedConfirmation: "تم النسخ إلى الحافظة!",
    fallbackCopy: "حدد كل النص في المربع واضغط",
    fallbackCopyOr: "/",
    fallbackCopyEnd: "للنسخ.",
    // Tips
    tipsHeading: "نصائح لاستخدام هذا الموجّه",
    tip1: 'يمكنك قول "لا أعرف" أو "لست متأكداً من موقفي" — سيشرح الذكاء الاصطناعي المزيد ويساعدك على معرفة ذلك.',
    tip2: 'يمكنك أن تطلب منه البحث عن شيء ما نيابةً عنك: "هل يمكنك البحث في سجل تصويت هذا المرشح؟"',
    tip3: 'يمكنك طرح أسئلة في أي وقت: "ماذا تفعل هذه الوظيفة بالفعل؟" أو "لماذا هذا مهم؟"',
    tip4: "أنت لست في اختبار. أنت في محادثة. الذكاء الاصطناعي يعمل معك.",
    tip5: "في النهاية، سيعطيك ملخصاً يمكنك تدوينه أو طباعته وأخذه إلى مركز الاقتراع.",
    tipsImportant: "مهم:",
    tipsDisclaimer:
      "قد يرتكب الذكاء الاصطناعي أخطاء. هذه نقطة بداية للبحث. ستربطك الأداة بالمصادر الرسمية حتى تتمكن من التحقق من أي شيء مهم بالنسبة لك.",
    // Footer
    shareThis: "شارك هذه الأداة:",
    shareOnX: "X / تويتر",
    shareOnFacebook: "فيسبوك",
    shareViaEmail: "البريد الإلكتروني",
    footerAttribution:
      "أنشأه إنسان باستخدام أدوات الذكاء الاصطناعي، لأن الجميع يستحق معرفة ما يصوّت عليه فعلاً.",
    // Language selector
    switchTo: "English",
    languageChanged: "تم تغيير اللغة إلى العربية",
    // Screen reader / accessibility
    skipToMain: "تخطى إلى المحتوى الرئيسي",
    lookupFormLabel: "نموذج البحث بالرمز البريدي",
    zipInputLabel: "الرمز البريدي",
    promptOutputLabel: "موجّه بحث الاقتراع المخصّص",
    copyPromptLabel: "نسخ الموجّه إلى الحافظة",
    shareOnXLabel: "مشاركة على X / تويتر",
    shareOnFacebookLabel: "مشاركة على فيسبوك",
    shareViaEmailLabel: "مشاركة عبر البريد الإلكتروني",
    switchLangAriaLabel: "التبديل إلى العربية",
    // Context block labels
    contextGreeting: (stateName: string, zip: string) =>
      `مرحباً! سأصوّت في ولاية **${stateName}**. رمزي البريدي هو **${zip}**.`,
    contextIntro: "إليك ما أعرفه عن انتخاباتي القادمة:",
    contextElection: "الانتخابات",
    contextElectionType: "نوع الانتخابات",
    contextRegistration: "مواعيد التسجيل",
    contextEarlyVoting: "التصويت المبكر",
    contextVoterId: "هوية الناخب",
    contextPhones: "الهواتف في مراكز الاقتراع",
    contextSampleBallot: "نموذج بطاقة اقتراعي",
    contextCounty: "مكتب انتخابات مقاطعتي",
    contextClosing: "ساعدني في بطاقة اقتراعي.",
    contextNoElection: (website: string) =>
      `لم يتم العثور على انتخابات قادمة. تحقق من ${website} لمزيد من المعلومات.`,
    contextOnline: (date: string, url: string) =>
      `عبر الإنترنت قبل ${date} (${url})`,
    contextOnlineNA: "التسجيل عبر الإنترنت غير متاح",
    contextByMail: (date: string, postmark: string) =>
      `بالبريد قبل ${date} (${postmark})`,
    contextByMailPostmark: "تاريخ الطابع البريدي",
    contextByMailReceived: "تاريخ الاستلام",
    contextInPerson: (date: string) => `شخصياً قبل ${date}`,
    contextEarlyVotingDates: (start: string, end: string) =>
      `من ${start} إلى ${end}`,
    contextEarlyVotingNA: "غير متاح — التصويت الغيابي فقط",
    contextVoterIdRequired: (ids: string) =>
      `مطلوبة. الوثائق المقبولة: [${ids}]`,
    contextVoterIdNA: "غير مطلوبة",
    contextElectionTypePrimary: (type: string) =>
      `الانتخابات التمهيدية (${type})`,
    // Phase 3
    loadingElectionData: "جارٍ تحميل بيانات الانتخابات...",
    pollingLocation: "موقع مركز الاقتراع",
    pollingLocationNotAvailable: "موقع مركز الاقتراع غير متاح",
    ballotContests: "سباقات بطاقة الاقتراع",
    ballotContestsEmpty: "لا توجد سباقات متاحة",
    candidateDetail: "تفاصيل المرشح",
    viewVotingRecord: "عرض سجل التصويت",
    loadingCandidateInfo: "جارٍ تحميل معلومات المرشح...",
    votingRecord: "سجل التصويت",
    topDonors: "أبرز المانحين",
    endorsements: "التأييدات",
    apiPartialError:
      "بعض بيانات الانتخابات غير متاحة مؤقتاً. المعلومات المعروضة محدّثة.",
    apiFullError:
      "نواجه مشكلة في تحميل بيانات الانتخابات الحية. إليك ما نعرفه عن التصويت في ولايتك. تفضل بزيارة مكتب انتخابات ولايتك للاطلاع على التواريخ والمواعيد الحالية.",
    dataAttribution:
      "بيانات الانتخابات من Google Civic Information والبحث الفوري على الويب عبر Anthropic.",
    verifyAt: "تحقق على",
    lastUpdated: "محدّث",
    districts: "دوائرك الانتخابية",
    county: "المقاطعة",
    congressionalDistrict: "الدائرة الكونغرسية",
    stateSenateDistrict: "دائرة مجلس الشيوخ الولائي",
    stateHouseDistrict: "دائرة مجلس النواب الولائي",
    contextDistricts: (county: string, cd: string) => `(${county}، ${cd})`,
    contextPollingPlace: "موقع مركز اقتراعي",
    contextBallotContests: "سباقات في بطاقة اقتراعي",
    contextVoterIdVerify: "تحقق من المتطلبات الحالية على",
  },
} as const;

export type TranslationMap = (typeof translations)["en"];
export type TranslationKey = keyof TranslationMap;

// Returns the raw translation value (may be string or function)
export function t(
  lang: Language,
  key: TranslationKey,
): TranslationMap[TranslationKey] {
  return translations[lang][key] as TranslationMap[TranslationKey];
}

// Returns a guaranteed string (for string-only keys)
export function tStr(lang: Language, key: TranslationKey): string {
  const val = translations[lang][key];
  if (typeof val === "string") return val;
  return String(val);
}

// Returns a string for days-left status label
export function daysLeftLabel(lang: Language, n: number): string {
  if (lang === "es") {
    return `Quedan ${n} día${n === 1 ? "" : "s"}`;
  }
  if (lang === "vi") {
    return `Còn ${n} ngày`;
  }
  if (lang === "zh") {
    return `还有 ${n} 天`;
  }
  if (lang === "ar") {
    if (n === 1) return `يوم واحد متبقي`;
    if (n === 2) return `يومان متبقيان`;
    return `${n} أيام متبقية`;
  }
  return `${n} day${n === 1 ? "" : "s"} left`;
}
