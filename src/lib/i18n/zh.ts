import type { Translations } from "./types";

export const zh: Translations = {
  hero: {
    headline: "了解你的投票选项",
    subtitle:
      "输入你的邮政编码，获取个性化的 AI 选票研究提示。将其粘贴到任何免费 AI 聊天机器人中——Claude、ChatGPT、Gemini 或 Grok——获得选票上每项职位和议题的个性化导览。",
    chatbotLabel: "打开",
  },
  zipForm: {
    label: "输入你的邮政编码",
    placeholder: "例：73301",
    submitButton: "查询我的选票",
  },
  errors: {
    emptyZip: "请输入邮政编码",
    invalidZip: "请输入有效的5位邮政编码",
    zipNotFound: {
      heading: "未找到邮政编码",
      message:
        "我们目前没有该邮政编码的数据。我们正在努力添加所有美国邮政编码。",
      linkText: "查找你所在州的选举网站",
    },
    multiState: "该邮政编码涵盖多个州。你将在哪个州投票？",
    deadlinesPassed:
      "本次选举的选民登记截止日期已过。在部分州，你仍可在选举日当天登记。",
    noElections: (state: string) =>
      `未找到 ${state} 即将举行的选举。请查看你所在州的选举网站了解最新信息。`,
    loadFailed: "加载州数据失败。请重试。",
  },
  stateInfo: {
    title: "你的选举信息",
    election: "选举",
    electionDate: "日期",
    registrationDeadlines: "登记截止日期",
    online: "网络登记",
    byMail: "邮件登记",
    inPerson: "现场登记",
    postmark: "邮戳日期",
    received: "收到日期",
    earlyVoting: "提前投票",
    earlyVotingFrom: "从",
    earlyVotingThrough: "至",
    earlyVotingNotAvailable: "不适用——仅缺席投票",
    voterId: "选民身份证件",
    voterIdRequired: "必须提供",
    voterIdNotRequired: "无需提供",
    acceptedIds: "接受的证件",
    phonesAtPolls: "投票站使用手机",
    sampleBallot: "样本选票",
    countyOffice: "县选举办公室",
    noUpcomingElection: "未找到即将举行的选举——请查看你所在州的选举网站。",
  },
  deadline: {
    passed: "已截止",
    daysLeft: (n: number) => `还有 ${n} 天`,
    today: "今天截止",
  },
  prompt: {
    instructions:
      "复制此提示并粘贴到任何免费 AI 聊天机器人中，开始研究你的选票。",
    copyButton: "复制到剪贴板",
    copiedButton: "已复制！",
    fallbackInstructions: "选择上方所有文字（Ctrl+A 或 Cmd+A）并手动复制。",
  },
  tips: {
    heading: "对话技巧",
    item1:
      '你可以说"我不知道"或"我还不确定我的立场"——AI 会进一步解释，帮你理清思路。',
    item2:
      '你可以让 AI 为你研究某个问题（例如"你能查一下这位候选人的投票记录吗？"）。',
    item3:
      '你可以随时提问（"这个职位实际上做什么？"或"为什么这件事很重要？"）。',
    item4: "最后，AI 会给你一份摘要，你可以打印出来带到投票站。",
    chatbotNote:
      "无论你使用 Claude、ChatGPT、Gemini、Grok 还是其他任何 AI 聊天机器人，这些技巧都适用。",
  },
  footer: {
    shareHeading: "分享此工具",
    shareText:
      "认识想要理性投票的朋友吗？将此页面分享给你的朋友、家人或社区。它适用于任何州和任何选举。",
    attribution:
      "由一个使用 AI 工具的人创建，因为每个人都应该了解自己投票的内容。",
  },
  stateSelector: {
    prompt: "该邮政编码涵盖多个州。你将在哪个州投票？",
  },
  loading: "正在查询你的选举信息……",
  accessibility: {
    skipToContent: "跳转到主要内容",
    languageChanged: "语言已切换为中文",
    loadingElectionInfo: "正在加载选举信息",
  },
  languageToggle: {
    label: "语言",
    switchToEnglish: "切换到英语",
    switchToSpanish: "切换到西班牙语",
    switchToVietnamese: "切换到越南语",
    switchToChinese: "切换到中文",
    switchToArabic: "切换到阿拉伯语",
  },
  liveData: {
    pollingLocation: "投票地点",
    ballotContests: "选票上的选举项目",
    candidateDetail: {
      viewRecord: "查看投票记录",
      votingRecord: "投票记录",
      topDonors: "主要捐助者",
      endorsements: "背书支持",
    },
    loading: "正在加载选举数据...",
    attribution:
      "选举数据来自 Google Civic Information 和通过 Anthropic 进行的实时网络搜索。",
    lastUpdated: "更新于",
    errors: {
      apiPartial: "部分选举数据暂时不可用。显示的信息是最新的。",
      apiFull:
        "我们在加载实时选举数据时遇到问题。以下是我们所知道的关于在你所在州投票的信息。",
    },
  },
  phase5: {
    chat: {
      ctaButton: "用AI研究我的选票",
      privacyNotice:
        "您的对话仅保存在您的浏览器中——我们不存储它。如果您关闭或刷新此页面，您的对话将丢失。请在离开前下载您的选票和选民档案。",
      inputPlaceholder: "输入您的消息...",
      sendButton: "发送",
      budgetNotice70:
        "本月晚些时候免费AI聊天可能受到限制。您可以使用复制粘贴选项。",
      budgetNotice90:
        "本月免费AI聊天即将用尽。请考虑使用复制粘贴选项以获得不间断的体验。",
      chatDisabledMessage:
        "我们的免费AI聊天已达到本月限额。您仍然可以研究选票——复制下面的提示并粘贴到任何免费AI聊天机器人。",
      sessionLimitMessage:
        "为保持此工具对所有人免费，我们限制每天的会话数。您可以通过复制下面的提示继续研究。",
      loadingMessage: "思考中...",
    },
    ballot: {
      sectionHeading: "创建我的选票",
      pasteAreaLabel: "将AI选票输出粘贴到此处",
      pasteInstructions:
        "在AI对话后，复制[我的选票]部分并粘贴到此处以生成可下载的选票。",
      parseErrorMessage:
        "我们无法读取该格式。请尝试仅复制AI对话中的[我的选票]部分，或在下面手动输入您的选择。",
      manualEntryHeading: "手动输入选票选择",
      manualAddRaceButton: "添加选举项目",
      downloadButton: "下载/打印我的选票",
      previewHeading: "选票预览",
      disclaimer:
        "这是您的个人参考，而非官方选票。请在您所在州的选举办公室核实所有信息。",
    },
    profile: {
      uploadLabel: "回头选民？上传您的选民档案",
      uploadPrivacyNotice: "您的档案仅用于本次会话，不存储在我们的服务器上。",
      confirmationMessage: "选民档案已加载。这将包含在您的AI对话中。",
      downloadButton: "下载我的选民档案",
      downloadNote: "将此文件保存在您在下次选举前能找到的地方。",
      sizeError: "文件太大。选民档案必须小于10KB。",
      typeError: "请上传.txt文件。",
    },
    alignment: {
      strongLabel: "高度匹配",
      mixedLabel: "部分匹配",
      weakLabel: "匹配较低",
      expandButton: "展开详情",
      collapseButton: "收起详情",
      parseError: "无法为此回复生成匹配分数——请尝试再次要求AI为候选人评分。",
      overallLabel: "匹配度",
    },
  },
};
