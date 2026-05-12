import type { StateData } from "@/types/state";
import type { OpenStatesCandidateContext } from "@/lib/openstates/types";
import type { CivicElectionInfo } from "@/lib/civic/types";
import type { VoterIdInfo } from "@/data/voter-id/index";
import { getBallotPrompt } from "@/lib/i18n/prompts";
import type { Language } from "@/lib/i18n/translations";

const LOCALE_MAP: Record<Language, string> = {
  en: "en-US",
  es: "es-ES",
  vi: "vi-VN",
  zh: "zh-CN",
  ar: "ar-SA",
};

function formatDate(date: string, language: Language = "en"): string {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  const locale = LOCALE_MAP[language] ?? "en-US";

  // Chinese uses a specific format: YYYY年M月D日
  if (language === "zh") {
    return new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    }).format(parsed);
  }

  // Vietnamese: D tháng M, YYYY
  if (language === "vi") {
    return new Intl.DateTimeFormat("vi-VN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    }).format(parsed);
  }

  // Arabic: D MMMM YYYY
  if (language === "ar") {
    return new Intl.DateTimeFormat("ar-SA", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
      numberingSystem: "latn",
    }).format(parsed);
  }

  return new Intl.DateTimeFormat(locale, {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

function getNextElection(
  stateData: StateData,
): StateData["elections"][number] | null {
  const today = new Date();
  const upcoming = stateData.elections
    .map((election) => ({
      election,
      time: new Date(`${election.date}T00:00:00`).getTime(),
    }))
    .filter(
      ({ time }) => !Number.isNaN(time) && time >= today.setHours(0, 0, 0, 0),
    )
    .sort((left, right) => left.time - right.time);

  return upcoming[0]?.election ?? stateData.elections[0] ?? null;
}

function describeDeadline(label: string, deadline: string | null): string {
  if (!deadline) {
    return `${label}: not available`;
  }

  return `${label}: ${formatDate(deadline)}`;
}

function describeDeadlineDate(
  deadline: string | null,
  language: Language,
): string {
  if (!deadline) {
    const notAvailable: Record<Language, string> = {
      en: "not available",
      es: "no disponible",
      vi: "không có",
      zh: "不可用",
      ar: "غير متاح",
    };
    return notAvailable[language] ?? "not available";
  }

  return formatDate(deadline, language);
}

function buildContextBlock(
  stateData: StateData,
  zip: string,
  language: Language = "en",
): string {
  const election = getNextElection(stateData);
  const registration = stateData.registration;
  const earlyVoting = stateData.earlyVoting;
  const voterId = stateData.votingRules.idRequired
    ? `Required. ${stateData.votingRules.acceptedIds.join("; ")}`
    : "Not required.";
  const phonePolicy = stateData.votingRules.phonesAtPollsDetail
    ? `${stateData.votingRules.phonesAtPolls}: ${stateData.votingRules.phonesAtPollsDetail}`
    : stateData.votingRules.phonesAtPolls;

  if (language === "es") {
    const electionLine = election
      ? `- **Elección:** ${election.name} el ${formatDate(election.date, "es")}`
      : `- **Elección:** no se encontraron elecciones próximas`;
    const typeLine = election
      ? `- **Tipo de elección:** ${election.type}${election.primaryType ? ` (primaria ${election.primaryType})` : ""}`
      : "- **Tipo de elección:** no disponible";
    const regLine = `- **Fechas límite de registro:** En línea antes del ${describeDeadlineDate(registration.online.deadline, "es")}, por correo antes del ${describeDeadlineDate(registration.byMail.deadline, "es")} (${registration.byMail.sincePostmarked ? "fecha de matasellos" : "fecha de recepción"}), en persona antes del ${describeDeadlineDate(registration.inPerson.deadline, "es")}`;
    const earlyLine = earlyVoting.available
      ? `- **Votación anticipada:** Del ${formatDate(earlyVoting.startDate ?? "", "es")} al ${formatDate(earlyVoting.endDate ?? "", "es")}${earlyVoting.notes ? ` (${earlyVoting.notes})` : ""}`
      : "- **Votación anticipada:** No disponible";

    return [
      `¡Hola! Voy a votar en **${stateData.stateName}**. Mi código postal es **${zip}**.`,
      "",
      "Esto es lo que sé sobre mi próxima elección:",
      electionLine,
      typeLine,
      regLine,
      earlyLine,
      `- **Identificación para votar:** ${stateData.votingRules.idRequired ? `Requerida. ${stateData.votingRules.acceptedIds.join("; ")}` : "No requerida."}`,
      `- **Teléfonos en las casillas:** ${phonePolicy}`,
      `- **Mi boleta de muestra:** ${stateData.resources.sampleBallotLookup}`,
      `- **Mi oficina electoral del condado:** ${stateData.resources.countyElectionLookup}`,
      "",
      "Ayúdame con mi boleta.",
    ].join("\n");
  }

  if (language === "vi") {
    const electionLine = election
      ? `- **Cuộc bầu cử:** ${election.name} vào ${formatDate(election.date, "vi")}`
      : `- **Cuộc bầu cử:** không tìm thấy cuộc bầu cử sắp tới`;
    const typeLine = election
      ? `- **Loại bầu cử:** ${election.type}${election.primaryType ? ` (bầu cử sơ bộ ${election.primaryType})` : ""}`
      : "- **Loại bầu cử:** không có";
    const regLine = `- **Thời hạn đăng ký:** Trực tuyến trước ${describeDeadlineDate(registration.online.deadline, "vi")}, qua thư trước ${describeDeadlineDate(registration.byMail.deadline, "vi")} (${registration.byMail.sincePostmarked ? "ngày đóng dấu bưu điện" : "ngày nhận"}), trực tiếp trước ${describeDeadlineDate(registration.inPerson.deadline, "vi")}`;
    const earlyLine = earlyVoting.available
      ? `- **Bỏ phiếu sớm:** Từ ${formatDate(earlyVoting.startDate ?? "", "vi")} đến ${formatDate(earlyVoting.endDate ?? "", "vi")}${earlyVoting.notes ? ` (${earlyVoting.notes})` : ""}`
      : "- **Bỏ phiếu sớm:** Không có";

    return [
      `Xin chào! Tôi sẽ bỏ phiếu ở **${stateData.stateName}**. Mã zip của tôi là **${zip}**.`,
      "",
      "Đây là những gì tôi biết về cuộc bầu cử sắp tới:",
      electionLine,
      typeLine,
      regLine,
      earlyLine,
      `- **Yêu cầu ID cử tri:** ${stateData.votingRules.idRequired ? `Bắt buộc. ${stateData.votingRules.acceptedIds.join("; ")}` : "Không bắt buộc."}`,
      `- **Điện thoại tại phòng bỏ phiếu:** ${phonePolicy}`,
      `- **Mẫu phiếu bầu của tôi:** ${stateData.resources.sampleBallotLookup}`,
      `- **Văn phòng bầu cử quận của tôi:** ${stateData.resources.countyElectionLookup}`,
      "",
      "Hãy giúp tôi với phiếu bầu của mình.",
    ].join("\n");
  }

  if (language === "zh") {
    const electionLine = election
      ? `- **选举：** ${election.name}，日期：${formatDate(election.date, "zh")}`
      : `- **选举：** 未找到即将举行的选举`;
    const typeLine = election
      ? `- **选举类型：** ${election.type}${election.primaryType ? `（${election.primaryType}初选）` : ""}`
      : "- **选举类型：** 不可用";
    const regLine = `- **登记截止日期：** 网络登记截止 ${describeDeadlineDate(registration.online.deadline, "zh")}，邮件登记截止 ${describeDeadlineDate(registration.byMail.deadline, "zh")}（${registration.byMail.sincePostmarked ? "以邮戳日期为准" : "以收件日期为准"}），现场登记截止 ${describeDeadlineDate(registration.inPerson.deadline, "zh")}`;
    const earlyLine = earlyVoting.available
      ? `- **提前投票：** ${formatDate(earlyVoting.startDate ?? "", "zh")} 至 ${formatDate(earlyVoting.endDate ?? "", "zh")}${earlyVoting.notes ? `（${earlyVoting.notes}）` : ""}`
      : "- **提前投票：** 不可用";

    return [
      `你好！我将在 **${stateData.stateName}** 投票。我的邮政编码是 **${zip}**。`,
      "",
      "以下是我了解到的关于即将举行选举的信息：",
      electionLine,
      typeLine,
      regLine,
      earlyLine,
      `- **选民身份证要求：** ${stateData.votingRules.idRequired ? `必须提供。${stateData.votingRules.acceptedIds.join("；")}` : "不需要。"}`,
      `- **投票站手机政策：** ${phonePolicy}`,
      `- **我的样本选票：** ${stateData.resources.sampleBallotLookup}`,
      `- **我所在县的选举办公室：** ${stateData.resources.countyElectionLookup}`,
      "",
      "请帮助我处理我的选票。",
    ].join("\n");
  }

  if (language === "ar") {
    const electionLine = election
      ? `- **الانتخابات:** ${election.name} بتاريخ ${formatDate(election.date, "ar")}`
      : `- **الانتخابات:** لم يتم العثور على انتخابات قادمة`;
    const typeLine = election
      ? `- **نوع الانتخابات:** ${election.type}${election.primaryType ? ` (الانتخابات التمهيدية ${election.primaryType})` : ""}`
      : "- **نوع الانتخابات:** غير متاح";
    const regLine = `- **مواعيد التسجيل:** عبر الإنترنت قبل ${describeDeadlineDate(registration.online.deadline, "ar")}، بالبريد قبل ${describeDeadlineDate(registration.byMail.deadline, "ar")} (${registration.byMail.sincePostmarked ? "تاريخ ختم البريد" : "تاريخ الاستلام"})، شخصياً قبل ${describeDeadlineDate(registration.inPerson.deadline, "ar")}`;
    const earlyLine = earlyVoting.available
      ? `- **التصويت المبكر:** من ${formatDate(earlyVoting.startDate ?? "", "ar")} حتى ${formatDate(earlyVoting.endDate ?? "", "ar")}${earlyVoting.notes ? ` (${earlyVoting.notes})` : ""}`
      : "- **التصويت المبكر:** غير متاح";

    return [
      `مرحباً! سأدلي بصوتي في **${stateData.stateName}**. رمزي البريدي هو **${zip}**.`,
      "",
      "إليك ما أعرفه عن الانتخابات القادمة:",
      electionLine,
      typeLine,
      regLine,
      earlyLine,
      `- **متطلبات هوية الناخب:** ${stateData.votingRules.idRequired ? `مطلوبة. ${stateData.votingRules.acceptedIds.join("؛ ")}` : "غير مطلوبة."}`,
      `- **الهواتف في مراكز الاقتراع:** ${phonePolicy}`,
      `- **نموذج بطاقة اقتراعي:** ${stateData.resources.sampleBallotLookup}`,
      `- **مكتب الانتخابات في مقاطعتي:** ${stateData.resources.countyElectionLookup}`,
      "",
      "ساعدني في بطاقة اقتراعي.",
    ].join("\n");
  }

  const electionLine = election
    ? `- Election: ${election.name} on ${formatDate(election.date)}`
    : `- Election: no upcoming election found`;
  const typeLine = election
    ? `- Election type: ${election.type}${election.primaryType ? ` (${election.primaryType} primary)` : ""}`
    : "- Election type: not available";

  return [
    `Hi! I'm voting in **${stateData.stateName}**. My zip code is **${zip}**.`,
    "Here's what I know about my upcoming election:",
    electionLine,
    typeLine,
    `- Registration deadlines: ${describeDeadline("online", registration.online.deadline)}, ${describeDeadline("by mail", registration.byMail.deadline)} (sincePostmarked: ${registration.byMail.sincePostmarked ? "postmarked" : "received"}), ${describeDeadline("in person", registration.inPerson.deadline)}`,
    earlyVoting.available
      ? `- Early voting: ${formatDate(earlyVoting.startDate ?? "")} through ${formatDate(earlyVoting.endDate ?? "")}${earlyVoting.notes ? ` (${earlyVoting.notes})` : ""}`
      : "- Early voting: not available",
    `- Voter ID: ${voterId}`,
    `- Phones at polls: ${phonePolicy}`,
    `- My sample ballot: ${stateData.resources.sampleBallotLookup}`,
    `- My county election office: ${stateData.resources.countyElectionLookup}`,
    "",
    "Help me with my ballot.",
  ].join("\n");
}

function buildOpenStatesContext(
  candidateContext?: OpenStatesCandidateContext | null,
): string {
  if (!candidateContext) {
    return "";
  }

  const officeBits = [
    candidateContext.officeLabel
      ? `Office: ${candidateContext.officeLabel}`
      : null,
    candidateContext.jurisdictionName
      ? `Jurisdiction: ${candidateContext.jurisdictionName}`
      : null,
    candidateContext.incumbent ? "Incumbent: yes" : "Incumbent: no",
  ].filter(Boolean);
  const voteLine = candidateContext.recentVoteSummary
    ? `Recent voting record: ${candidateContext.recentVoteSummary}`
    : null;
  const sourceLine = candidateContext.sourceUrls.length
    ? `Sources: ${candidateContext.sourceUrls.join(", ")}`
    : null;

  return [
    "OpenStates enrichment:",
    `- Candidate: ${candidateContext.displayName}`,
    `- Identity: ${candidateContext.personId}${candidateContext.primaryParty ? ` (${candidateContext.primaryParty})` : ""}`,
    ...officeBits.map((bit) => `- ${bit}`),
    voteLine ? `- ${voteLine}` : null,
    sourceLine ? `- ${sourceLine}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function buildCivicContextBlock(
  civicData: CivicElectionInfo,
  voterIdInfo: VoterIdInfo | null,
  zip: string,
  language: Language,
): string {
  const lines: string[] = [];

  // Districts
  const districts = civicData.districts;
  const districtParts = [
    civicData.county ? civicData.county : null,
    districts?.congressional
      ? `Congressional: ${districts.congressional}`
      : null,
    districts?.stateSenate ? `State Senate: ${districts.stateSenate}` : null,
    districts?.stateHouse ? `State House: ${districts.stateHouse}` : null,
  ].filter(Boolean);

  const zipLine = districtParts.length
    ? `${zip} (${districtParts.join(", ")})`
    : zip;

  const greetings: Record<Language, string> = {
    en: `Hi! I'm voting. My zip code is **${zipLine}**.`,
    es: `¡Hola! Voy a votar. Mi código postal es **${zipLine}**.`,
    vi: `Xin chào! Tôi sẽ bỏ phiếu. Mã zip của tôi là **${zipLine}**.`,
    zh: `你好！我将投票。我的邮政编码是 **${zipLine}**。`,
    ar: `مرحباً! سأدلي بصوتي. رمزي البريدي هو **${zipLine}**.`,
  };

  const electionIntros: Partial<Record<Language, string>> = {
    en: "Here's what I know about my upcoming election:",
    vi: "Đây là những gì tôi biết về cuộc bầu cử sắp tới:",
    zh: "以下是我了解到的关于即将举行选举的信息：",
    ar: "إليك ما أعرفه عن الانتخابات القادمة:",
  };

  lines.push(greetings[language]);
  if (language !== "es") {
    lines.push("");
    if (electionIntros[language]) {
      lines.push(electionIntros[language]!);
    }
  } else {
    lines.push("");
  }

  // Election
  if (civicData.election) {
    const dateStr = civicData.election.date;
    const formattedDate = formatDate(dateStr, language);

    const electionLabels: Record<Language, string> = {
      en: "Election",
      es: "Elección",
      vi: "Cuộc bầu cử",
      zh: "选举",
      ar: "الانتخابات",
    };
    const electionPreps: Record<Language, string> = {
      en: "on",
      es: "el",
      vi: "vào",
      zh: "，日期：",
      ar: "بتاريخ",
    };

    const label = electionLabels[language];
    const prep = electionPreps[language];
    lines.push(
      language === "zh"
        ? `- **${label}：** ${civicData.election.name}${prep}${formattedDate}`
        : `- **${label}:** ${civicData.election.name} ${prep} ${formattedDate}`,
    );
  }

  // Polling location
  if (civicData.pollingLocation) {
    const loc = civicData.pollingLocation;
    const locationStr = loc.name ? `${loc.name}, ${loc.address}` : loc.address;
    const pollingLabels: Record<Language, string> = {
      en: "Polling place",
      es: "Lugar de votación",
      vi: "Địa điểm bỏ phiếu",
      zh: "投票地点",
      ar: "مركز الاقتراع",
    };
    const label = pollingLabels[language];
    lines.push(
      language === "zh"
        ? `- **${label}：** ${locationStr}${loc.pollingHours ? `（${loc.pollingHours}）` : ""}`
        : `- **${label}:** ${locationStr}${loc.pollingHours ? ` (${loc.pollingHours})` : ""}`,
    );
  }

  // Ballot contests (top 5 to keep prompt manageable)
  const contests = civicData.ballotContests.slice(0, 5);
  if (contests.length > 0) {
    const ballotLabels: Record<Language, string> = {
      en: "My ballot includes:",
      es: "Mi boleta incluye:",
      vi: "Phiếu bầu của tôi bao gồm:",
      zh: "我的选票包含：",
      ar: "بطاقة اقتراعي تتضمن:",
    };
    lines.push(`- ${ballotLabels[language]}`);
    for (const contest of contests) {
      const candidateNames =
        contest.candidates?.map((c) => c.name).join(", ") ?? "";
      lines.push(
        `  - ${contest.title}${candidateNames ? `: ${candidateNames}` : ""}`,
      );
    }
  }

  // Voter ID
  if (voterIdInfo) {
    const voterIdLabels: Record<Language, string> = {
      en: "Voter ID",
      es: "Identificación para votar",
      vi: "Yêu cầu ID cử tri",
      zh: "选民身份证",
      ar: "هوية الناخب",
    };
    const idSummary = voterIdInfo.voterIdRequired
      ? language === "es"
        ? `Requerida. ${voterIdInfo.acceptedIds.slice(0, 3).join("; ")}`
        : language === "vi"
          ? `Bắt buộc. ${voterIdInfo.acceptedIds.slice(0, 3).join("; ")}`
          : language === "zh"
            ? `必须提供。${voterIdInfo.acceptedIds.slice(0, 3).join("；")}`
            : language === "ar"
              ? `مطلوبة. ${voterIdInfo.acceptedIds.slice(0, 3).join("؛ ")}`
              : `Required. ${voterIdInfo.acceptedIds.slice(0, 3).join("; ")}`
      : language === "es"
        ? "No requerida."
        : language === "vi"
          ? "Không bắt buộc."
          : language === "zh"
            ? "不需要。"
            : language === "ar"
              ? "غير مطلوبة."
              : "Not required.";
    const label = voterIdLabels[language];
    lines.push(
      language === "zh"
        ? `- **${label}：** ${idSummary}`
        : `- **${label}:** ${idSummary}`,
    );
  }

  lines.push("");

  const closings: Record<Language, string> = {
    en: "Help me with my ballot.",
    es: "Ayúdame con mi boleta.",
    vi: "Hãy giúp tôi với phiếu bầu của mình.",
    zh: "请帮助我处理我的选票。",
    ar: "ساعدني في بطاقة اقتراعي.",
  };
  lines.push(closings[language]);

  return lines.join("\n");
}

export function buildFullPrompt(
  stateData: StateData,
  zip: string,
  candidateContext?: OpenStatesCandidateContext | null,
  language: Language = "en",
  civicData?: CivicElectionInfo | null,
  voterIdInfo?: VoterIdInfo | null,
): string {
  const basePrompt = getBallotPrompt(language);
  const openStatesBlock = buildOpenStatesContext(candidateContext);

  // If civic data is available, use it for a richer prompt
  if (civicData) {
    const civicBlock = buildCivicContextBlock(
      civicData,
      voterIdInfo ?? null,
      zip,
      language,
    );
    return [basePrompt, civicBlock, openStatesBlock]
      .filter(Boolean)
      .join("\n\n");
  }

  return [
    basePrompt,
    buildContextBlock(stateData, zip, language),
    openStatesBlock,
  ]
    .filter(Boolean)
    .join("\n\n");
}
