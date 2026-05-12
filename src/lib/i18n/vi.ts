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
};
