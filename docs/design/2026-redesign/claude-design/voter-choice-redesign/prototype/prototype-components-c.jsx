/* ====================================================
   VOTER CHOICE · Pass C components
   ====================================================
   See COMPONENT_MAP.md for repo targets. Each component
   here is a leaf that views compose; all data is repo-shaped
   so the port is a 1:1 swap (mock → fetch).
   ==================================================== */

const { useState: useStateC, useEffect: useEffectC, useRef: useRefC } = React;

/* ============ DeadlineMeter ============
   Maps to: (new — recommended src/components/DeadlineMeter.tsx)
   Powered by: src/lib/getDeadlineStatus.ts (repo)

   Renders one row per deadline with a color status (passed/red/
   yellow/green) and a days-left label. Used inside PollingInfoCard
   and on home as a compact strip.

   props:
     rows: DeadlineStatus[] (subset — { labelKey, date, daysLeft, color })
     compact: boolean — true on home strip, false in workspace card */
function DeadlineMeter({ rows, compact, stacked }) {
  const { t, lang } = useI18n();

  function fmtLabel(daysLeft) {
    if (daysLeft < 0) return t("deadline.passed");
    if (daysLeft === 0) return t("deadline.today");
    return t("deadline.daysLeft", { n: daysLeft });
  }
  function fmtDate(iso) {
    const d = new Date(iso + "T00:00:00");
    if (isNaN(d)) return iso;
    return d.toLocaleDateString(lang === "es" ? "es-US" : "en-US", {
      month: "short",
      day: "numeric",
    });
  }

  return (
    <ul
      className={
        "dl-meter" + (compact ? " compact" : "") + (stacked ? " stacked" : "")
      }
      aria-label="Election deadlines"
    >
      {rows.map((row) => (
        <li key={row.labelKey} className={"dl-row " + row.color}>
          <div className="dl-dot" aria-hidden="true" />
          <div className="dl-text">
            <div className="dl-lab">{t(row.labelKey)}</div>
            <div className="dl-date">{fmtDate(row.date)}</div>
          </div>
          <div className="dl-status" aria-label={fmtLabel(row.daysLeft)}>
            {fmtLabel(row.daysLeft)}
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ============ PollingInfoCard ============
   Maps to: (new — recommended src/components/PollingInfoCard.tsx)

   The card in the workspace that surfaces your polling place,
   precinct, hours, ID requirements, and deadline countdowns.
   Previously this data only appeared on the print sheet.

   props:
     pollingInfo: from POLLING_INFO (precinct, hours, etc.)
     stateData:   StateElectionData
     rows:        DeadlineStatus[]   (from getDeadlineRows) */
function PollingInfoCard({ pollingInfo, stateData, rows, compact }) {
  const { t } = useI18n();
  // Default to expanded — the card is useful immediately. The toggle
  // is for users who want to collapse it after first read.
  const [expanded, setExpanded] = useStateC(true);

  return (
    <section className="poll-card" aria-labelledby="poll-card-ttl">
      <header className="poll-card-head">
        <div>
          <div className="poll-card-eyebrow">{t("polling.cardTitle")}</div>
          <h3 id="poll-card-ttl">{pollingInfo.name}</h3>
        </div>
        {compact && (
          <button
            className="poll-card-toggle"
            onClick={() => setExpanded((e) => !e)}
            aria-expanded={expanded}
            aria-controls="poll-card-body"
          >
            {expanded ? "▴" : "▾"}
          </button>
        )}
      </header>

      {expanded && (
        <>
          <div className="poll-card-grid" id="poll-card-body">
            <div className="poll-cell">
              <div className="k">{t("polling.precinct")}</div>
              <div className="v">{pollingInfo.precinct}</div>
            </div>
            <div className="poll-cell">
              <div className="k">{t("polling.hours")}</div>
              <div className="v">{pollingInfo.hours}</div>
            </div>
            <div className="poll-cell wide">
              <div className="k">Address</div>
              <div className="v">{pollingInfo.address}</div>
            </div>
            <div className="poll-cell">
              <div className="k">{t("polling.bring")}</div>
              <div className="v">{pollingInfo.bring}</div>
            </div>
            <div className="poll-cell">
              <div className="k">{t("polling.earlyVotingWindow")}</div>
              <div className="v">{pollingInfo.earlyWindow}</div>
            </div>
          </div>

          <div className="poll-card-deadlines">
            <DeadlineMeter rows={rows} compact={false} stacked={true} />
          </div>

          <div className="poll-card-actions">
            <a
              className="poll-link"
              href={stateData.resources.pollingPlaceLookup}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("polling.directions")} →
            </a>
            <a
              className="poll-link"
              href={stateData.registration.registrationCheckUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("deadline.checkRegistration")}
            </a>
            <button
              className="poll-link"
              onClick={() => downloadIcsForElection(stateData)}
            >
              {t("polling.addedToCalendar")} ↓
            </button>
          </div>

          <footer className="poll-card-foot">
            <small>{t("polling.cardSource")}</small>
          </footer>
        </>
      )}
    </section>
  );
}

/* Calendar export.
   Includes LOCATION (polling address), a useful DESCRIPTION, and
   a same-day morning VALARM so the calendar app reminds the voter
   on Election Day. Without LOCATION the event is useless on a
   phone — earlier version omitted it. */
function downloadIcsForElection(stateData, pollingInfo) {
  const el = stateData.elections[0];
  const date = el.date.replace(/-/g, "");
  const acceptedId = stateData.votingRules.acceptedIds?.[0] || "photo ID";
  const placeLine =
    pollingInfo?.name && pollingInfo?.address
      ? `Polling place: ${pollingInfo.name} — ${pollingInfo.address}`
      : pollingInfo?.address
        ? `Polling place: ${pollingInfo.address}`
        : "";
  const description = [
    placeLine,
    pollingInfo?.hours ? `Hours: ${pollingInfo.hours}` : "",
    `Bring: ${acceptedId}`,
    "",
    "Drafted on Voter Choice.",
  ]
    .filter(Boolean)
    .join("\\n");

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Voter Choice//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:vc-${el.id}@voterchoice.app`,
    `DTSTAMP:${date}T120000Z`,
    `DTSTART;VALUE=DATE:${date}`,
    `SUMMARY:Vote — ${el.name}`,
    pollingInfo?.address ? `LOCATION:${pollingInfo.address}` : "",
    `DESCRIPTION:${description}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "TRIGGER:-PT12H",
    "DESCRIPTION:Election Day tomorrow — bring your ID",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
  const blob = new Blob([ics], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "election-day.ics";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/* ============ ResumeNudge ============
   Maps to: (lives on src/app/page.tsx — composition into the
            existing hero. Not a separate file in repo.)

   Appears below the address card on home when localStorage has
   a prior draft. Surfaces the count of decided races + a
   primary CTA to resume.

   props:
     saved: { issues, decisions, address }
     totalRaces: number
     onResume:    () => void
     onStartOver: () => void */
function ResumeNudge({ saved, totalRaces, onResume, onStartOver }) {
  const { t } = useI18n();
  const decided = Object.keys(saved.decisions || {}).length;
  const hasDraft = decided > 0 || (saved.issues || []).length > 0;
  if (!hasDraft) return null;

  return (
    <aside
      className="resume-nudge"
      role="region"
      aria-label="Resume your session"
    >
      <div className="rn-badge">{t("landing.returningBadge")}</div>
      <h3 className="rn-headline">{t("landing.returningHeadline")}</h3>
      <p className="rn-sub">
        {t("landing.returningSubtext", { decided, total: totalRaces })}
      </p>
      <div className="rn-actions">
        <button className="rn-resume" onClick={onResume}>
          {t("landing.returningResume")}
        </button>
        <button className="rn-over" onClick={onStartOver}>
          {t("landing.returningStartOver")}
        </button>
      </div>
    </aside>
  );
}

/* ============ HowItWorksWalkthrough ============
   Maps to: (lives on src/app/page.tsx — composition into the
            existing hero.)

   Three-step explainer pulled from translations.landing.step{1,2,3}.
   Renders below the hero, above the footer. */
function HowItWorksWalkthrough() {
  const { t } = useI18n();
  return (
    <section className="hiw" aria-labelledby="hiw-title">
      <div className="hiw-inner">
        <header className="hiw-head">
          <div className="eyebrow">{t("landing.howItWorksTitle")}</div>
          <h2 id="hiw-title">From address to printed ballot in three steps.</h2>
          <p className="hiw-sub">{t("landing.howItWorksSubtext")}</p>
        </header>
        <ol className="hiw-steps">
          {[1, 2, 3].map((n) => (
            <li key={n} className="hiw-step">
              <div className="hiw-num">{String(n).padStart(2, "0")}</div>
              <h4 className="hiw-step-ttl">{t(`landing.step${n}Title`)}</h4>
              <p className="hiw-step-desc">{t(`landing.step${n}Desc`)}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ============ ErrorBanner ============
   Generic inline error/notice — used by AI timeout in chat and
   anywhere a non-fatal error needs to surface inline. Modeled
   on the .be-foot warning treatment in prototype.css. */
function ErrorBanner({
  tone = "warn",
  title,
  body,
  primary,
  secondary,
  onClose,
}) {
  return (
    <div className={"err-banner " + tone} role="alert">
      <div className="err-icon" aria-hidden="true">
        {tone === "error" ? "⨯" : "!"}
      </div>
      <div className="err-body">
        {title && <div className="err-title">{title}</div>}
        {body && <div className="err-text">{body}</div>}
        {(primary || secondary) && (
          <div className="err-actions">
            {primary && (
              <button className="err-primary" onClick={primary.onClick}>
                {primary.label}
              </button>
            )}
            {secondary && (
              <button className="err-secondary" onClick={secondary.onClick}>
                {secondary.label}
              </button>
            )}
          </div>
        )}
      </div>
      {onClose && (
        <button className="err-close" onClick={onClose} aria-label="Dismiss">
          ×
        </button>
      )}
    </div>
  );
}

/* ============ LanguageToggle ============
   Maps to: src/components/LanguageToggle.tsx (variant="inline")
   Wires the .app-nav .lang button to i18n state. */
function LanguageToggle() {
  const { lang, setLang } = useI18n();
  return (
    <button
      className="lang"
      data-testid="language-toggle"
      onClick={() => setLang(lang === "en" ? "es" : "en")}
      aria-label={lang === "en" ? "Switch to Spanish" : "Cambiar a inglés"}
      title={lang === "en" ? "Cambiar a español" : "Switch to English"}
    >
      <span className={"lang-pip " + (lang === "en" ? "on" : "off")}>EN</span>
      <span className="lang-sep" aria-hidden="true">
        ·
      </span>
      <span className={"lang-pip " + (lang === "es" ? "on" : "off")}>ES</span>
    </button>
  );
}

/* ============ AppNav (overridden — adds Settings + LanguageToggle) ============
   The base AppNav lives in prototype-components.jsx. This override
   wraps it to add the Settings cog and wire the language toggle.
   In the repo, this overlay lives on Navigation.tsx as additional
   children. */
function AppNavWithChrome({
  onBrandClick,
  onOpenSettings,
  current,
  onNavigate,
}) {
  const { t } = useI18n();
  return (
    <nav className="app-nav" data-current={current || "app"}>
      <div
        className="brand"
        onClick={onBrandClick}
        role="link"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" && onBrandClick) onBrandClick();
        }}
      >
        <span className="mark" aria-hidden="true">
          V
        </span>
        <span>Voter Choice</span>
      </div>
      <div className="links">
        <a
          onClick={() => onNavigate && onNavigate("howitworks")}
          role="link"
          tabIndex={0}
        >
          {t("nav.howItWorks")}
        </a>
        <a
          onClick={() => onNavigate && onNavigate("about")}
          role="link"
          tabIndex={0}
        >
          {t("nav.about")}
        </a>
        <a
          onClick={() => onNavigate && onNavigate("methodology")}
          role="link"
          tabIndex={0}
        >
          {t("nav.methodology")}
        </a>
        <a
          onClick={() => onNavigate && onNavigate("privacy")}
          role="link"
          tabIndex={0}
        >
          {t("nav.privacy")}
        </a>
      </div>
      <div className="nav-right">
        <LanguageToggle />
        <button
          className="nav-cog"
          onClick={onOpenSettings}
          aria-label={t("nav.settings")}
          title={t("nav.settings")}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>
    </nav>
  );
}

/* ============ PollingStatusBar ============
   Slim sticky strip directly under the app nav. Always visible
   across the workspace surface — escapes the rail (which is hidden
   on mobile and is the wrong IA bucket for reference content).

   Collapsed   : pin name · "X days until Election Day" · Details ▾
   Expanded    : a four-cell grid (Address / Hours / Bring / Early
                 voting) + a full-width DeadlineMeter + action links.

   Replaces: the old PollingInfoCard in the left rail.

   Repo target: (new — recommended src/components/PollingStatusBar.tsx,
   mounted between Navigation.tsx and the 3-pane workspace.) */
/* PollingStatusBar — pulls polling place from POLLING_INFO
   (PollingLocation shape, /api/civic), and derives `bring` +
   early voting window from `stateData` (StateElectionData).
   This matches the actual data flow in repo: Civic API gives us
   the location; state data gives us the voting rules. */
function PollingStatusBar({ pollingInfo, stateData, rows }) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useStateC(false);
  const [idsExpanded, setIdsExpanded] = useStateC(false);
  const electionRow = rows.find((r) => r.labelKey === "deadline.electionDay");
  const days = electionRow ? electionRow.daysLeft : null;

  // Source: stateData.votingRules.acceptedIds (StateElectionData).
  // We show the full list — the user has to actually bring one of these,
  // so "TX driver license + 6 more" isn't helpful. Compact list inline,
  // with a show-more affordance if there are >3 items.
  const acceptedIds = stateData.votingRules.acceptedIds || [];
  const PREVIEW_COUNT = 3;
  const visibleIds = idsExpanded
    ? acceptedIds
    : acceptedIds.slice(0, PREVIEW_COUNT);
  const hiddenCount = acceptedIds.length - PREVIEW_COUNT;

  // Derived: early-voting window from stateData.earlyVoting
  function fmtRange(startISO, endISO) {
    const opts = { month: "short", day: "numeric" };
    const locale = lang === "es" ? "es-US" : "en-US";
    const start = new Date(startISO + "T00:00:00").toLocaleDateString(
      locale,
      opts,
    );
    const end = new Date(endISO + "T00:00:00").toLocaleDateString(locale, opts);
    return `${start} – ${end}`;
  }
  const earlyWindowText = stateData.earlyVoting.available
    ? fmtRange(stateData.earlyVoting.startDate, stateData.earlyVoting.endDate)
    : "Not available";

  const countdownText =
    days == null
      ? t("deadline.electionDay")
      : days < 0
        ? t("deadline.passed")
        : days === 0
          ? t("deadline.today")
          : lang === "es"
            ? `${days} días para el día de elecciones`
            : `${days} days until Election Day`;

  return (
    <div className={"poll-bar " + (open ? "open" : "")}>
      <button
        className="poll-bar-inner"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <div className="pb-left">
          <span className="pb-pin" aria-hidden="true">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </span>
          <span className="pb-name">{pollingInfo.name}</span>
          {pollingInfo.precinct && (
            <>
              <span className="pb-sep" aria-hidden="true">
                ·
              </span>
              <span className="pb-precinct">
                Precinct {pollingInfo.precinct}
              </span>
            </>
          )}
        </div>
        <div className="pb-right">
          <span
            className={"pb-count " + (electionRow ? electionRow.color : "")}
          >
            <span className="pb-count-dot" aria-hidden="true"></span>
            {countdownText}
          </span>
          <span className="pb-toggle" aria-hidden="true">
            {open ? "Hide details ▴" : "Details ▾"}
          </span>
        </div>
      </button>

      {open && (
        <div
          className="poll-bar-panel"
          role="region"
          aria-label={t("polling.cardTitle")}
        >
          {/* Primary actions row — visible immediately when expanded.
              Was previously buried at the bottom of the panel; promoted
              here so the user can find them without scanning. */}
          <div className="pbp-actions">
            <a
              className="pbp-act"
              href={stateData.registration.registrationCheckUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="pbp-act-ico" aria-hidden="true">
                ✓
              </span>
              {t("deadline.checkRegistration")}
            </a>
            <button
              className="pbp-act"
              onClick={() => downloadIcsForElection(stateData, pollingInfo)}
            >
              <span className="pbp-act-ico" aria-hidden="true">
                ↓
              </span>
              {t("polling.addedToCalendar")}
            </button>
            <a
              className="pbp-act"
              href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(pollingInfo.address)}`}
              target="_blank"
              rel="noopener noreferrer"
              title={`Directions to ${pollingInfo.name}`}
            >
              <span className="pbp-act-ico" aria-hidden="true">
                →
              </span>
              {t("polling.directions")}
            </a>
            <span className="pbp-source">{t("polling.cardSource")}</span>
          </div>

          <div className="pbp-grid">
            <div className="pbp-cell">
              <div className="pbp-k">Address</div>
              <div className="pbp-v">{pollingInfo.address}</div>
              {pollingInfo.notes && (
                <div className="pbp-sub">{pollingInfo.notes}</div>
              )}
            </div>
            <div className="pbp-cell">
              <div className="pbp-k">{t("polling.hours")}</div>
              <div className="pbp-v">{pollingInfo.hours}</div>
              <div className="pbp-sub">
                {t("polling.earlyVotingWindow")}: {earlyWindowText}
              </div>
            </div>
            <div className="pbp-cell">
              <div className="pbp-k">{t("polling.bring")}</div>
              <div className="pbp-v pbp-bring">
                <span className="pbp-bring-lead">Any one of these:</span>
                <ul className="pbp-bring-list">
                  {visibleIds.map((id) => (
                    <li key={id}>{id}</li>
                  ))}
                </ul>
                {hiddenCount > 0 && (
                  <button
                    type="button"
                    className="pbp-bring-toggle"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIdsExpanded((v) => !v);
                    }}
                  >
                    {idsExpanded
                      ? "Show fewer ▴"
                      : `Show ${hiddenCount} more accepted IDs ▾`}
                  </button>
                )}
              </div>
              <div className="pbp-sub">Phones prohibited within 100 ft</div>
            </div>
            <div className="pbp-cell pbp-deadlines">
              <div className="pbp-k">Deadlines</div>
              <DeadlineMeter rows={rows} compact={false} stacked={true} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, {
  DeadlineMeter,
  PollingInfoCard,
  PollingStatusBar,
  ResumeNudge,
  HowItWorksWalkthrough,
  ErrorBanner,
  LanguageToggle,
  AppNavWithChrome,
  downloadIcsForElection,
});
