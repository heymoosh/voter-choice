import type { StateData, Election } from "@/types/election";
import type { LiveElectionData } from "@/types/liveElection";
import { BALLOT_PROMPT_TEXT } from "./ballotPrompt";
import { BALLOT_PROMPT_TEXT_ES } from "./ballotPrompt.es";
import { BALLOT_PROMPT_TEXT_VI } from "./ballotPrompt.vi";
import { BALLOT_PROMPT_TEXT_ZH } from "./ballotPrompt.zh";
import { BALLOT_PROMPT_TEXT_AR } from "./ballotPrompt.ar";
import { findNextElection, getDeadlineStatus } from "./electionUtils";
import { formatDateLocale } from "./i18n/formatDate";
import type { Locale } from "./i18n/types";

/**
 * Build the full customized prompt for a voter.
 * Combines the locale-appropriate ballot prompt with a locale-aware context block.
 * Accepts both static StateData and enriched LiveElectionData.
 */
export function buildPrompt(
  stateData: StateData | LiveElectionData,
  zip: string,
  locale: Locale = "en",
): string {
  const PROMPT_MAP: Record<Locale, string> = {
    en: BALLOT_PROMPT_TEXT,
    es: BALLOT_PROMPT_TEXT_ES,
    vi: BALLOT_PROMPT_TEXT_VI,
    zh: BALLOT_PROMPT_TEXT_ZH,
    ar: BALLOT_PROMPT_TEXT_AR,
  };
  const promptText = PROMPT_MAP[locale] ?? BALLOT_PROMPT_TEXT;
  const contextBlock = buildContextBlock(stateData, zip, locale);
  return `${promptText}\n\n---\n\n${contextBlock}`;
}

/**
 * Build the state-specific pre-filled context block.
 * Supports both static StateData and enriched LiveElectionData.
 * Labels are in the specified locale; injected data values remain in English.
 */
export function buildContextBlock(
  stateData: StateData | LiveElectionData,
  zip: string,
  locale: Locale = "en",
): string {
  const nextElection = findNextElection(stateData.elections);
  const { registration, earlyVoting, votingRules, resources } = stateData;

  if (locale === "es") {
    return buildContextBlockEs(
      stateData,
      zip,
      nextElection,
      registration,
      earlyVoting,
      votingRules,
      resources,
    );
  }

  if (locale === "vi") {
    return buildContextBlockVi(
      stateData,
      zip,
      nextElection,
      registration,
      earlyVoting,
      votingRules,
      resources,
    );
  }

  if (locale === "zh") {
    return buildContextBlockZh(
      stateData,
      zip,
      nextElection,
      registration,
      earlyVoting,
      votingRules,
      resources,
    );
  }

  if (locale === "ar") {
    return buildContextBlockAr(
      stateData,
      zip,
      nextElection,
      registration,
      earlyVoting,
      votingRules,
      resources,
    );
  }

  return buildContextBlockEn(
    stateData,
    zip,
    nextElection,
    registration,
    earlyVoting,
    votingRules,
    resources,
  );
}

// ---------------------------------------------------------------------------
// English context block
// ---------------------------------------------------------------------------

function buildContextBlockEn(
  stateData: StateData | LiveElectionData,
  zip: string,
  nextElection: Election | null,
  registration: StateData["registration"],
  earlyVoting: StateData["earlyVoting"],
  votingRules: StateData["votingRules"],
  resources: StateData["resources"],
): string {
  const locale: Locale = "en";

  const electionInfo = nextElection
    ? formatElectionInfo(nextElection, locale)
    : "No upcoming elections found — check your state election website for updates.";

  const onlineReg = registration.online.available
    ? formatDeadlineLabel(registration.online.deadline, locale)
    : "Not available";

  const byMailReg =
    formatDeadlineLabel(registration.byMail.deadline, locale) +
    (registration.byMail.sincePostmarked
      ? " — postmark date"
      : " — received date");

  const inPersonReg = formatDeadlineLabel(
    registration.inPerson.deadline,
    locale,
  );

  const earlyVotingInfo =
    earlyVoting.available && earlyVoting.startDate && earlyVoting.endDate
      ? `${formatDateLocale(earlyVoting.startDate, locale)} through ${formatDateLocale(earlyVoting.endDate, locale)}${earlyVoting.notes ? ` (${earlyVoting.notes})` : ""}`
      : "Not available — absentee voting only";

  const voterIdInfo = votingRules.idRequired
    ? `Required. Accepted IDs: ${votingRules.acceptedIds.join(", ")}`
    : "Not required";

  // Phase 3: enrich with live data if available
  const liveData = stateData as LiveElectionData;
  const districtsLine = liveData.districts
    ? ` (${[liveData.districts.county, liveData.districts.congressional, liveData.districts.stateSenate, liveData.districts.stateHouse].filter(Boolean).join(", ")})`
    : "";

  const pollingLine = liveData.pollingLocation
    ? `\n- **My polling place:** ${liveData.pollingLocation.name}, ${liveData.pollingLocation.address}${liveData.pollingLocation.hours ? ` — Hours: ${liveData.pollingLocation.hours}` : ""}`
    : "";

  const contestsLine =
    liveData.ballotContests && liveData.ballotContests.length > 0
      ? `\n- **My ballot contests:** ${liveData.ballotContests.map((c) => `${c.name} (${c.candidates.map((cand) => cand.name).join(", ")})`).join("; ")}`
      : "";

  return `Hi! I'm voting in **${stateData.stateName}**. My zip code is **${zip}**${districtsLine}.

Here's what I know about my upcoming election:
- **Election:** ${electionInfo}
- **Registration deadlines:** Online by ${onlineReg}, by mail by ${byMailReg}, in person by ${inPersonReg}
- **Early voting:** ${earlyVotingInfo}
- **Voter ID:** ${voterIdInfo}
- **Phones at polls:** ${votingRules.phonesAtPollsDetail}${pollingLine}${contestsLine}
- **My sample ballot:** ${resources.sampleBallotLookup}
- **My county election office:** ${resources.countyElectionLookup}

Help me with my ballot.`;
}

// ---------------------------------------------------------------------------
// Spanish context block
// ---------------------------------------------------------------------------

function buildContextBlockEs(
  stateData: StateData | LiveElectionData,
  zip: string,
  nextElection: Election | null,
  registration: StateData["registration"],
  earlyVoting: StateData["earlyVoting"],
  votingRules: StateData["votingRules"],
  resources: StateData["resources"],
): string {
  const locale: Locale = "es";

  const electionInfo = nextElection
    ? formatElectionInfo(nextElection, locale)
    : "No se encontraron elecciones próximas — consulta el sitio web electoral de tu estado.";

  const onlineReg = registration.online.available
    ? formatDeadlineLabel(registration.online.deadline, locale)
    : "No disponible";

  const byMailReg =
    formatDeadlineLabel(registration.byMail.deadline, locale) +
    (registration.byMail.sincePostmarked
      ? " — fecha de matasellos"
      : " — fecha de recepción");

  const inPersonReg = formatDeadlineLabel(
    registration.inPerson.deadline,
    locale,
  );

  const earlyVotingInfo =
    earlyVoting.available && earlyVoting.startDate && earlyVoting.endDate
      ? `del ${formatDateLocale(earlyVoting.startDate, locale)} al ${formatDateLocale(earlyVoting.endDate, locale)}${earlyVoting.notes ? ` (${earlyVoting.notes})` : ""}`
      : "No disponible — solo voto en ausencia";

  const voterIdInfo = votingRules.idRequired
    ? `Requerida. [accepted IDs in English: ${votingRules.acceptedIds.join(", ")}]`
    : "No requerida";

  // Phase 3: enrich with live data if available
  const liveDataEs = stateData as LiveElectionData;
  const districtsLineEs = liveDataEs.districts
    ? ` (${[liveDataEs.districts.county, liveDataEs.districts.congressional, liveDataEs.districts.stateSenate, liveDataEs.districts.stateHouse].filter(Boolean).join(", ")})`
    : "";

  const pollingLineEs = liveDataEs.pollingLocation
    ? `\n- **Mi lugar de votación:** ${liveDataEs.pollingLocation.name}, ${liveDataEs.pollingLocation.address}`
    : "";

  const contestsLineEs =
    liveDataEs.ballotContests && liveDataEs.ballotContests.length > 0
      ? `\n- **Mis contiendas en la boleta:** ${liveDataEs.ballotContests.map((c) => `${c.name} (${c.candidates.map((cand) => cand.name).join(", ")})`).join("; ")}`
      : "";

  return `¡Hola! Voy a votar en **${stateData.stateName}**. Mi código postal es **${zip}**${districtsLineEs}.

Esto es lo que sé sobre mi próxima elección:
- **Elección:** ${electionInfo}
- **Fechas límite de registro:** En línea antes del ${onlineReg}, por correo antes del ${byMailReg}, en persona antes del ${inPersonReg}
- **Votación anticipada:** ${earlyVotingInfo}
- **Identificación para votar:** ${voterIdInfo}
- **Teléfonos en las casillas:** ${votingRules.phonesAtPollsDetail}${pollingLineEs}${contestsLineEs}
- **Mi boleta de muestra:** ${resources.sampleBallotLookup}
- **Mi oficina electoral del condado:** ${resources.countyElectionLookup}

Ayúdame con mi boleta.`;
}

// ---------------------------------------------------------------------------
// Vietnamese context block
// ---------------------------------------------------------------------------

function buildContextBlockVi(
  stateData: StateData | LiveElectionData,
  zip: string,
  nextElection: Election | null,
  registration: StateData["registration"],
  earlyVoting: StateData["earlyVoting"],
  votingRules: StateData["votingRules"],
  resources: StateData["resources"],
): string {
  const locale: Locale = "vi";

  const electionInfo = nextElection
    ? `${nextElection.name} vào ${formatDateLocale(nextElection.date, locale)}`
    : "Không tìm thấy cuộc bầu cử sắp tới — hãy kiểm tra trang web bầu cử của tiểu bang bạn.";

  const onlineReg = registration.online.available
    ? formatDeadlineLabel(registration.online.deadline, locale)
    : "Không có";

  const byMailReg =
    formatDeadlineLabel(registration.byMail.deadline, locale) +
    (registration.byMail.sincePostmarked
      ? " — ngày dấu bưu điện"
      : " — ngày nhận");

  const inPersonReg = formatDeadlineLabel(
    registration.inPerson.deadline,
    locale,
  );

  const earlyVotingInfo =
    earlyVoting.available && earlyVoting.startDate && earlyVoting.endDate
      ? `từ ${formatDateLocale(earlyVoting.startDate, locale)} đến ${formatDateLocale(earlyVoting.endDate, locale)}${earlyVoting.notes ? ` (${earlyVoting.notes})` : ""}`
      : "Không có — chỉ bỏ phiếu vắng mặt";

  const voterIdInfo = votingRules.idRequired
    ? `Bắt buộc. [Giấy tờ được chấp nhận (tiếng Anh): ${votingRules.acceptedIds.join(", ")}]`
    : "Không bắt buộc";

  const liveDataVi = stateData as LiveElectionData;
  const districtsLineVi = liveDataVi.districts
    ? ` (${[liveDataVi.districts.county, liveDataVi.districts.congressional, liveDataVi.districts.stateSenate, liveDataVi.districts.stateHouse].filter(Boolean).join(", ")})`
    : "";

  const pollingLineVi = liveDataVi.pollingLocation
    ? `\n- **Địa điểm bỏ phiếu của tôi:** ${liveDataVi.pollingLocation.name}, ${liveDataVi.pollingLocation.address}`
    : "";

  const contestsLineVi =
    liveDataVi.ballotContests && liveDataVi.ballotContests.length > 0
      ? `\n- **Các cuộc đua trên phiếu bầu của tôi:** ${liveDataVi.ballotContests.map((c) => `${c.name} (${c.candidates.map((cand) => cand.name).join(", ")})`).join("; ")}`
      : "";

  return `Xin chào! Tôi sẽ bỏ phiếu ở **${stateData.stateName}**. Mã bưu chính của tôi là **${zip}**${districtsLineVi}.

Đây là những gì tôi biết về cuộc bầu cử sắp tới của mình:
- **Cuộc bầu cử:** ${electionInfo}
- **Thời hạn đăng ký:** Trực tuyến trước ${onlineReg}, qua thư trước ${byMailReg}, trực tiếp trước ${inPersonReg}
- **Bỏ phiếu sớm:** ${earlyVotingInfo}
- **Giấy tờ tùy thân để bỏ phiếu:** ${voterIdInfo}
- **Điện thoại tại địa điểm bỏ phiếu:** ${votingRules.phonesAtPollsDetail}${pollingLineVi}${contestsLineVi}
- **Phiếu bầu mẫu của tôi:** ${resources.sampleBallotLookup}
- **Văn phòng bầu cử quận của tôi:** ${resources.countyElectionLookup}

Hãy giúp tôi với phiếu bầu của mình.`;
}

// ---------------------------------------------------------------------------
// Chinese context block
// ---------------------------------------------------------------------------

function buildContextBlockZh(
  stateData: StateData | LiveElectionData,
  zip: string,
  nextElection: Election | null,
  registration: StateData["registration"],
  earlyVoting: StateData["earlyVoting"],
  votingRules: StateData["votingRules"],
  resources: StateData["resources"],
): string {
  const locale: Locale = "zh";

  const electionInfo = nextElection
    ? `${nextElection.name}，${formatDateLocale(nextElection.date, locale)}`
    : "未找到即将举行的选举——请查看你所在州的选举网站。";

  const onlineReg = registration.online.available
    ? formatDeadlineLabel(registration.online.deadline, locale)
    : "不适用";

  const byMailReg =
    formatDeadlineLabel(registration.byMail.deadline, locale) +
    (registration.byMail.sincePostmarked ? "（邮戳日期）" : "（收到日期）");

  const inPersonReg = formatDeadlineLabel(
    registration.inPerson.deadline,
    locale,
  );

  const earlyVotingInfo =
    earlyVoting.available && earlyVoting.startDate && earlyVoting.endDate
      ? `${formatDateLocale(earlyVoting.startDate, locale)}至${formatDateLocale(earlyVoting.endDate, locale)}${earlyVoting.notes ? `（${earlyVoting.notes}）` : ""}`
      : "不适用——仅缺席投票";

  const voterIdInfo = votingRules.idRequired
    ? `必须提供。[接受的证件（英文）: ${votingRules.acceptedIds.join("、")}]`
    : "无需提供";

  const liveDataZh = stateData as LiveElectionData;
  const districtsLineZh = liveDataZh.districts
    ? ` (${[liveDataZh.districts.county, liveDataZh.districts.congressional, liveDataZh.districts.stateSenate, liveDataZh.districts.stateHouse].filter(Boolean).join("、")})`
    : "";

  const pollingLineZh = liveDataZh.pollingLocation
    ? `\n- **我的投票地点：** ${liveDataZh.pollingLocation.name}，${liveDataZh.pollingLocation.address}`
    : "";

  const contestsLineZh =
    liveDataZh.ballotContests && liveDataZh.ballotContests.length > 0
      ? `\n- **我的选票项目：** ${liveDataZh.ballotContests.map((c) => `${c.name}（${c.candidates.map((cand) => cand.name).join("、")}）`).join("；")}`
      : "";

  return `你好！我将在**${stateData.stateName}**投票。我的邮政编码是**${zip}**${districtsLineZh}。

以下是我对即将到来的选举的了解：
- **选举：** ${electionInfo}
- **登记截止日期：** 网络登记截止${onlineReg}，邮件登记截止${byMailReg}，现场登记截止${inPersonReg}
- **提前投票：** ${earlyVotingInfo}
- **选民身份证件：** ${voterIdInfo}
- **投票站使用手机：** ${votingRules.phonesAtPollsDetail}${pollingLineZh}${contestsLineZh}
- **我的样本选票：** ${resources.sampleBallotLookup}
- **我所在县的选举办公室：** ${resources.countyElectionLookup}

请帮我了解我的选票。`;
}

// ---------------------------------------------------------------------------
// Arabic context block
// ---------------------------------------------------------------------------

function buildContextBlockAr(
  stateData: StateData | LiveElectionData,
  zip: string,
  nextElection: Election | null,
  registration: StateData["registration"],
  earlyVoting: StateData["earlyVoting"],
  votingRules: StateData["votingRules"],
  resources: StateData["resources"],
): string {
  const locale: Locale = "ar";

  const electionInfo = nextElection
    ? `${nextElection.name} بتاريخ ${formatDateLocale(nextElection.date, locale)}`
    : "لم تُعثر على انتخابات قادمة — يرجى مراجعة موقع انتخابات ولايتك.";

  const onlineReg = registration.online.available
    ? formatDeadlineLabel(registration.online.deadline, locale)
    : "غير متاح";

  const byMailReg =
    formatDeadlineLabel(registration.byMail.deadline, locale) +
    (registration.byMail.sincePostmarked
      ? " — تاريخ ختم البريد"
      : " — تاريخ الاستلام");

  const inPersonReg = formatDeadlineLabel(
    registration.inPerson.deadline,
    locale,
  );

  const earlyVotingInfo =
    earlyVoting.available && earlyVoting.startDate && earlyVoting.endDate
      ? `من ${formatDateLocale(earlyVoting.startDate, locale)} حتى ${formatDateLocale(earlyVoting.endDate, locale)}${earlyVoting.notes ? ` (${earlyVoting.notes})` : ""}`
      : "غير متاح — التصويت الغيابي فقط";

  const voterIdInfo = votingRules.idRequired
    ? `مطلوبة. [الوثائق المقبولة بالإنجليزية: ${votingRules.acceptedIds.join(", ")}]`
    : "غير مطلوبة";

  const liveDataAr = stateData as LiveElectionData;
  const districtsLineAr = liveDataAr.districts
    ? ` (${[liveDataAr.districts.county, liveDataAr.districts.congressional, liveDataAr.districts.stateSenate, liveDataAr.districts.stateHouse].filter(Boolean).join(", ")})`
    : "";

  const pollingLineAr = liveDataAr.pollingLocation
    ? `\n- **مركز اقتراعي:** ${liveDataAr.pollingLocation.name}، ${liveDataAr.pollingLocation.address}`
    : "";

  const contestsLineAr =
    liveDataAr.ballotContests && liveDataAr.ballotContests.length > 0
      ? `\n- **مسابقات الاقتراع الخاصة بي:** ${liveDataAr.ballotContests.map((c) => `${c.name} (${c.candidates.map((cand) => cand.name).join("، ")})`).join("؛ ")}`
      : "";

  return `مرحباً! سأصوّت في **${stateData.stateName}**. رمزي البريدي هو **${zip}**${districtsLineAr}.

إليك ما أعرفه عن انتخاباتي القادمة:
- **الانتخابات:** ${electionInfo}
- **مواعيد التسجيل:** عبر الإنترنت بحلول ${onlineReg}، بالبريد بحلول ${byMailReg}، حضورياً بحلول ${inPersonReg}
- **التصويت المبكر:** ${earlyVotingInfo}
- **هوية الناخب:** ${voterIdInfo}
- **الهواتف في مراكز الاقتراع:** ${votingRules.phonesAtPollsDetail}${pollingLineAr}${contestsLineAr}
- **نموذج ورقة اقتراعي:** ${resources.sampleBallotLookup}
- **مكتب انتخابات مقاطعتي:** ${resources.countyElectionLookup}

ساعدني في اقتراعي.`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatElectionInfo(election: Election, locale: Locale): string {
  const dateStr = formatDateLocale(election.date, locale);
  const typeStr =
    election.isPrimary && election.primaryType
      ? `${election.primaryType} primary`
      : election.type;
  return `${election.name} on ${dateStr} (${typeStr})`;
}

function formatDeadlineLabel(deadline: string | null, locale: Locale): string {
  const notAvailableMap: Partial<Record<Locale, string>> = {
    es: "No disponible",
    vi: "Không có",
    zh: "不适用",
    ar: "غير متاح",
  };
  if (!deadline) return notAvailableMap[locale] ?? "Not available";
  const info = getDeadlineStatus(deadline);
  return `${info.label} (${formatDateLocale(deadline, locale)})`;
}
