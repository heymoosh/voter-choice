import type { Translations } from "./types";

export const vi: Translations = {
  hero: {
    headline: "Hiểu rõ điều bạn đang bỏ phiếu",
    subtitle:
      "Nhập mã bưu chính của bạn để nhận câu lệnh nghiên cứu phiếu bầu cá nhân hóa bằng AI. Dán vào bất kỳ chatbot AI miễn phí nào — Claude, ChatGPT, Gemini, hoặc Grok — để được hướng dẫn chi tiết về mọi cuộc đua và vấn đề trên lá phiếu của bạn.",
    chatbotLabel: "Mở",
  },
  zipForm: {
    label: "Nhập mã bưu chính của bạn",
    placeholder: "vd. 73301",
    submitButton: "Tra cứu phiếu bầu của tôi",
  },
  errors: {
    emptyZip: "Vui lòng nhập mã bưu chính",
    invalidZip: "Vui lòng nhập mã bưu chính hợp lệ gồm 5 chữ số",
    zipNotFound: {
      heading: "Không tìm thấy mã bưu chính",
      message:
        "Chúng tôi chưa có dữ liệu cho mã bưu chính này. Chúng tôi đang nỗ lực bổ sung tất cả mã bưu chính của Hoa Kỳ.",
      linkText: "Tìm trang web bầu cử của tiểu bang bạn",
    },
    multiState:
      "Mã bưu chính này bao gồm nhiều tiểu bang. Bạn sẽ bỏ phiếu ở tiểu bang nào?",
    deadlinesPassed:
      "Thời hạn đăng ký cho cuộc bầu cử này đã qua. Bạn vẫn có thể đăng ký vào Ngày Bầu Cử ở một số tiểu bang.",
    noElections: (state: string) =>
      `Không tìm thấy cuộc bầu cử sắp tới cho ${state}. Hãy kiểm tra trang web bầu cử của tiểu bang bạn để biết thêm thông tin.`,
    loadFailed: "Không thể tải dữ liệu tiểu bang. Vui lòng thử lại.",
  },
  stateInfo: {
    title: "Thông tin bầu cử của bạn",
    election: "Cuộc bầu cử",
    electionDate: "Ngày",
    registrationDeadlines: "Thời hạn đăng ký",
    online: "Trực tuyến",
    byMail: "Qua thư",
    inPerson: "Trực tiếp",
    postmark: "ngày dấu bưu điện",
    received: "ngày nhận",
    earlyVoting: "Bỏ phiếu sớm",
    earlyVotingFrom: "từ",
    earlyVotingThrough: "đến",
    earlyVotingNotAvailable: "Không có — chỉ bỏ phiếu vắng mặt",
    voterId: "Giấy tờ tùy thân để bỏ phiếu",
    voterIdRequired: "Bắt buộc",
    voterIdNotRequired: "Không bắt buộc",
    acceptedIds: "Giấy tờ được chấp nhận",
    phonesAtPolls: "Điện thoại tại địa điểm bỏ phiếu",
    sampleBallot: "Phiếu bầu mẫu",
    countyOffice: "Văn phòng bầu cử quận",
    noUpcomingElection:
      "Không tìm thấy cuộc bầu cử sắp tới — hãy kiểm tra trang web bầu cử của tiểu bang bạn.",
  },
  deadline: {
    passed: "Đã qua",
    daysLeft: (n: number) => `Còn ${n} ngày`,
    today: "Hết hạn hôm nay",
  },
  prompt: {
    instructions:
      "Sao chép câu lệnh này và dán vào bất kỳ chatbot AI miễn phí nào để bắt đầu nghiên cứu phiếu bầu của bạn.",
    copyButton: "Sao chép vào khay nhớ tạm",
    copiedButton: "Đã sao chép!",
    fallbackInstructions:
      "Chọn tất cả văn bản ở trên (Ctrl+A hoặc Cmd+A) và sao chép thủ công.",
  },
  tips: {
    heading: "Mẹo cho cuộc trò chuyện của bạn",
    item1:
      'Bạn có thể nói "Tôi không biết" hoặc "Tôi chưa chắc về quan điểm của mình" — AI sẽ giải thích thêm và giúp bạn tìm hiểu.',
    item2:
      'Bạn có thể nhờ AI nghiên cứu điều gì đó cho bạn (vd. "Bạn có thể tra cứu lịch sử bỏ phiếu của ứng viên này không?").',
    item3:
      'Bạn có thể đặt câu hỏi bất cứ lúc nào ("Vị trí này thực sự làm gì?" hoặc "Tại sao điều này quan trọng?").',
    item4:
      "Cuối cùng, AI sẽ cung cấp cho bạn một bản tóm tắt mà bạn có thể in và mang đến điểm bỏ phiếu.",
    chatbotNote:
      "Những mẹo này áp dụng cho dù bạn dùng Claude, ChatGPT, Gemini, Grok hay bất kỳ chatbot AI nào khác.",
  },
  footer: {
    shareHeading: "Chia sẻ công cụ này",
    shareText:
      "Bạn biết ai muốn bỏ phiếu có hiểu biết không? Chia sẻ trang này với bạn bè, gia đình hoặc cộng đồng của bạn. Nó hoạt động cho mọi tiểu bang và mọi cuộc bầu cử.",
    attribution:
      "Được tạo ra bởi một người sử dụng các công cụ AI, vì mọi người đều xứng đáng biết họ thực sự đang bỏ phiếu cho điều gì.",
  },
  stateSelector: {
    prompt:
      "Mã bưu chính này bao gồm nhiều tiểu bang. Bạn sẽ bỏ phiếu ở tiểu bang nào?",
  },
  loading: "Đang tra cứu thông tin bầu cử của bạn…",
  accessibility: {
    skipToContent: "Chuyển đến nội dung chính",
    languageChanged: "Đã đổi ngôn ngữ sang Tiếng Việt",
    loadingElectionInfo: "Đang tải thông tin bầu cử",
  },
  languageToggle: {
    label: "Ngôn ngữ",
    switchToEnglish: "Chuyển sang Tiếng Anh",
    switchToSpanish: "Chuyển sang Tiếng Tây Ban Nha",
    switchToVietnamese: "Chuyển sang Tiếng Việt",
    switchToChinese: "Chuyển sang Tiếng Trung",
    switchToArabic: "Chuyển sang Tiếng Ả Rập",
  },
  liveData: {
    pollingLocation: "Địa điểm bỏ phiếu",
    ballotContests: "Các cuộc đua trên phiếu bầu",
    candidateDetail: {
      viewRecord: "Xem lịch sử bỏ phiếu",
      votingRecord: "Lịch sử bỏ phiếu",
      topDonors: "Nhà tài trợ hàng đầu",
      endorsements: "Sự ủng hộ",
    },
    loading: "Đang tải dữ liệu bầu cử...",
    attribution:
      "Dữ liệu bầu cử từ Google Civic Information và tìm kiếm web trực tiếp qua Anthropic.",
    lastUpdated: "Cập nhật",
    errors: {
      apiPartial:
        "Một số dữ liệu bầu cử tạm thời không khả dụng. Thông tin hiện tại được hiển thị.",
      apiFull:
        "Chúng tôi đang gặp khó khăn khi tải dữ liệu bầu cử trực tiếp. Đây là những gì chúng tôi biết về việc bỏ phiếu ở tiểu bang của bạn.",
    },
  },
  phase5: {
    chat: {
      ctaButton: "Nghiên cứu phiếu bầu của tôi với AI",
      privacyNotice:
        "Cuộc trò chuyện của bạn chỉ ở trong trình duyệt — chúng tôi không lưu trữ. Nếu bạn đóng hoặc làm mới trang này, cuộc trò chuyện sẽ mất. Tải xuống phiếu bầu và hồ sơ cử tri trước khi rời.",
      inputPlaceholder: "Nhập tin nhắn của bạn...",
      sendButton: "Gửi",
      budgetNotice70:
        "Chat AI miễn phí có thể bị giới hạn vào cuối tháng này. Bạn luôn có thể dùng tùy chọn sao chép và dán.",
      budgetNotice90:
        "Chat AI miễn phí sắp hết trong tháng này. Hãy cân nhắc dùng tùy chọn sao chép và dán.",
      chatDisabledMessage:
        "Chat AI miễn phí của chúng tôi đã đạt giới hạn tháng. Bạn vẫn có thể nghiên cứu phiếu bầu — sao chép prompt bên dưới và dán vào bất kỳ chatbot AI miễn phí nào.",
      sessionLimitMessage:
        "Để giữ công cụ này miễn phí cho mọi người, chúng tôi giới hạn số phiên mỗi ngày. Bạn có thể tiếp tục nghiên cứu bằng cách sao chép prompt bên dưới.",
      loadingMessage: "Đang suy nghĩ...",
    },
    ballot: {
      sectionHeading: "Tạo phiếu bầu của tôi",
      pasteAreaLabel: "Dán kết quả AI về phiếu bầu vào đây",
      pasteInstructions:
        "Sau cuộc trò chuyện AI, sao chép phần 'PHIẾU BẦU CỦA TÔI' và dán vào đây.",
      parseErrorMessage:
        "Chúng tôi không thể đọc định dạng đó. Hãy thử sao chép chỉ phần 'PHIẾU BẦU CỦA TÔI' hoặc nhập thủ công bên dưới.",
      manualEntryHeading: "Nhập lựa chọn phiếu bầu thủ công",
      manualAddRaceButton: "Thêm cuộc đua",
      downloadButton: "Tải xuống / In phiếu bầu của tôi",
      previewHeading: "Xem trước phiếu bầu",
      disclaimer:
        "Đây là tài liệu tham khảo cá nhân, không phải phiếu bầu chính thức.",
    },
    profile: {
      uploadLabel: "Cử tri trở lại? Tải lên hồ sơ cử tri của bạn",
      uploadPrivacyNotice:
        "Hồ sơ của bạn chỉ được dùng cho phiên này và không được lưu trên máy chủ của chúng tôi.",
      confirmationMessage:
        "Hồ sơ cử tri đã được tải. Điều này sẽ được đưa vào cuộc trò chuyện AI của bạn.",
      downloadButton: "Tải xuống hồ sơ cử tri của tôi",
      downloadNote:
        "Lưu tệp này ở nơi bạn có thể tìm thấy trước cuộc bầu cử tiếp theo.",
      sizeError: "Tệp quá lớn. Hồ sơ cử tri phải nhỏ hơn 10KB.",
      typeError: "Vui lòng tải lên tệp .txt.",
    },
    alignment: {
      strongLabel: "Sự liên kết mạnh",
      mixedLabel: "Sự liên kết hỗn hợp",
      weakLabel: "Sự liên kết yếu",
      expandButton: "Mở rộng chi tiết",
      collapseButton: "Thu gọn chi tiết",
      parseError:
        "Không thể tạo điểm liên kết cho phản hồi này — thử yêu cầu AI chấm điểm các ứng cử viên lại.",
      overallLabel: "Sự liên kết",
    },
  },
  phase6: {
    issueRanking: {
      heading: "Xếp hạng ưu tiên của bạn",
      subheading:
        "Kéo các vấn đề bên dưới theo thứ tự ưu tiên — quan trọng nhất ở trên.",
      skipButton: "Bỏ qua — nghiên cứu không có ưu tiên",
      confirmButton: "Đây là các ưu tiên của tôi",
      ariaGrabbed: "Đã nắm. Dùng phím mũi tên để sắp xếp lại, Dấu cách để thả.",
      ariaDropped: (position: number, total: number) =>
        `Đã thả. Hiện tại ở vị trí ${position} trên ${total}.`,
    },
    concernDisambiguation: {
      heading: "Còn điều gì khác trong tâm trí bạn không?",
      placeholder:
        "ví dụ: 'Tôi thuê nhà và không thể đủ tiền thuê nhà ở thành phố của mình'",
      submitButton: "Ánh xạ đến các vấn đề",
      skipButton: "Bỏ qua — chỉ dùng xếp hạng của tôi",
      confirmButton: "Xác nhận và tiếp tục",
      editButton: "Chỉnh sửa câu trả lời của tôi",
      weHeard: "Chúng tôi đã nghe:",
      mappingTo: "Ánh xạ đến các vấn đề chúng tôi theo dõi:",
      noMatchesFound:
        "Không phát hiện vấn đề cụ thể nào. Bạn có thể thêm thủ công hoặc bỏ qua.",
    },
    polisOverlay: {
      countyLabel: "Trong số cử tri ở quận của bạn đã xếp hạng vấn đề của họ",
      privacyNotice:
        "Khi bạn xếp hạng một vấn đề, chúng tôi thêm ẩn danh vào số đếm cấp quận. Chúng tôi không bao giờ lưu trữ mã bưu chính hoặc thứ tự xếp hạng của bạn.",
    },
  },
};
