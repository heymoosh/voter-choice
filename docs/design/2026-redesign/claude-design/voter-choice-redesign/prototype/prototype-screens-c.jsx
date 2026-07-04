/* ====================================================
   VOTER CHOICE · Pass C screens
   ====================================================
   • SettingsPanel       — language + BYOK + data
   • GeocodeFailView     — address didn't resolve
   • NoContestedView     — Civic returned 0 races (maps to BallotLookupNeeded.tsx)
   • AITimeoutBanner     — inline in chat
   • AboutPage / MethodologyPage / PrivacyPage — static info pages
   ==================================================== */

const {
  useState: useStateSC,
  useRef: useRefSC,
  useEffect: useEffectSC,
} = React;

/* ============ BYOK storage helpers ============
   Mirror src/lib/anthropic-client-byok.ts in repo. Same
   STORAGE_KEY so a port doesn't lose the user's saved key. */
const BYOK_STORAGE_KEY = "voter-choice:byok-anthropic-key";

function getByokKey() {
  try {
    return localStorage.getItem(BYOK_STORAGE_KEY);
  } catch (e) {
    return null;
  }
}
function setByokKey(key) {
  try {
    localStorage.setItem(BYOK_STORAGE_KEY, key);
  } catch (e) {}
}
function removeByokKey() {
  try {
    localStorage.removeItem(BYOK_STORAGE_KEY);
  } catch (e) {}
}
function maskKey(k) {
  if (!k) return "";
  if (k.length < 12) return k;
  return k.slice(0, 7) + "…" + k.slice(-4);
}

/* ============ SettingsPanel ============
   Slide-in drawer opened from the nav-cog. Three sections:
     1. Language     — wraps LanguageToggle
     2. BYOK         — Anthropic key input, save/clear, status
     3. Your data    — export profile, reset everything

   Repo target: (new — recommended src/components/SettingsPanel.tsx
   composing the existing LanguageToggle + BYOK utilities.) */
function SettingsPanel({
  open,
  onClose,
  onResetAll,
  onExportProfile,
  onResumeProfile,
}) {
  const { t, lang, setLang } = useI18n();
  const [keyDraft, setKeyDraft] = useStateSC("");
  const [savedKey, setSavedKey] = useStateSC(null);
  const [status, setStatus] = useStateSC(null); // {tone, text}
  const drawerRef = useRefSC(null);

  useEffectSC(() => {
    if (!open) return;
    setSavedKey(getByokKey());
    setKeyDraft("");
    setStatus(null);
    // Focus management: move focus into drawer on open
    setTimeout(() => {
      const el = drawerRef.current?.querySelector("button, input, a");
      if (el) el.focus();
    }, 50);
  }, [open]);

  // Esc to close
  useEffectSC(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function saveKey() {
    const k = keyDraft.trim();
    if (!k.startsWith("sk-ant-")) {
      setStatus({
        tone: "error",
        text: "Doesn\u2019t look like an Anthropic key (should start with sk-ant-).",
      });
      return;
    }
    setByokKey(k);
    setSavedKey(k);
    setKeyDraft("");
    setStatus({ tone: "ok", text: t("settings.byokSaved") });
  }
  function clearKey() {
    removeByokKey();
    setSavedKey(null);
    setStatus({ tone: "ok", text: t("settings.byokRemoved") });
  }

  return (
    <div
      className="sx-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="sx-ttl"
    >
      <aside
        className="sx-drawer"
        ref={drawerRef}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="sx-head">
          <h2 id="sx-ttl">{t("settings.title")}</h2>
          <button className="sx-x" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        {/* — Language — */}
        <section className="sx-section">
          <h3 className="sx-section-ttl">{t("settings.langSection")}</h3>
          <div className="sx-lang-grid">
            <button
              className={"sx-lang-opt " + (lang === "en" ? "on" : "")}
              onClick={() => setLang("en")}
              aria-pressed={lang === "en"}
            >
              <span className="sx-lang-flag" aria-hidden="true">
                EN
              </span>
              <span>{t("settings.langEn")}</span>
            </button>
            <button
              className={"sx-lang-opt " + (lang === "es" ? "on" : "")}
              onClick={() => setLang("es")}
              aria-pressed={lang === "es"}
            >
              <span className="sx-lang-flag" aria-hidden="true">
                ES
              </span>
              <span>{t("settings.langEs")}</span>
            </button>
          </div>
        </section>

        {/* — BYOK — */}
        <section className="sx-section">
          <h3 className="sx-section-ttl">{t("settings.byokSection")}</h3>
          <p className="sx-help">{t("settings.byokHelp")}</p>
          {savedKey ? (
            <div className="sx-byok-saved">
              <div className="sx-byok-row">
                <span className="sx-byok-lab">Saved key</span>
                <code className="sx-byok-mask">{maskKey(savedKey)}</code>
              </div>
              <button className="sx-btn danger" onClick={clearKey}>
                {t("settings.byokClear")}
              </button>
            </div>
          ) : (
            <div className="sx-byok-input">
              <input
                type="password"
                placeholder={t("settings.byokPlaceholder")}
                value={keyDraft}
                onChange={(e) => setKeyDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveKey();
                }}
                spellCheck="false"
                autoComplete="off"
                aria-label={t("settings.byokSection")}
              />
              <button
                className="sx-btn primary"
                onClick={saveKey}
                disabled={!keyDraft.trim()}
              >
                {t("settings.byokSave")}
              </button>
            </div>
          )}
          {status && (
            <div className={"sx-status " + status.tone} role="status">
              {status.text}
            </div>
          )}
        </section>

        {/* — Your data — */}
        <section className="sx-section">
          <h3 className="sx-section-ttl">{t("settings.dataSection")}</h3>
          <ul className="sx-data-actions">
            <li>
              <button
                className="sx-row-btn"
                onClick={() => {
                  onResumeProfile && onResumeProfile();
                  onClose();
                }}
              >
                <span>{t("settings.dataResume")}</span>
                <span className="arr">↑</span>
              </button>
            </li>
            <li>
              <button
                className="sx-row-btn"
                onClick={() => {
                  onExportProfile && onExportProfile();
                }}
              >
                <span>{t("settings.dataExport")}</span>
                <span className="arr">↓</span>
              </button>
            </li>
            <li>
              <button
                className="sx-row-btn danger"
                onClick={() => {
                  onResetAll();
                  onClose();
                }}
              >
                <span>{t("settings.dataReset")}</span>
                <span className="arr">×</span>
              </button>
            </li>
          </ul>
        </section>

        <footer className="sx-foot">
          <a
            className="sx-foot-link"
            onClick={() => {
              window.__navigate && window.__navigate("privacy");
              onClose();
            }}
          >
            {t("settings.privacyLink")}
          </a>
          <a
            className="sx-foot-link"
            onClick={() => {
              window.__navigate && window.__navigate("methodology");
              onClose();
            }}
          >
            {t("settings.methodologyLink")}
          </a>
          <a
            className="sx-foot-link"
            onClick={() => {
              window.__navigate && window.__navigate("about");
              onClose();
            }}
          >
            {t("settings.aboutLink")}
          </a>
        </footer>
      </aside>
    </div>
  );
}

/* ============ GeocodeFailView ============
   Renders BEFORE the workspace if the address can't be resolved.
   Repo target: (new — recommended src/components/GeocodeFailNotice.tsx;
   today the repo throws via the api/civic route and surfaces errors
   inside AddressInput.tsx.) */
function GeocodeFailView({ address, onEditAddress, onContinueWithZip }) {
  const { t } = useI18n();
  return (
    <>
      <div className="gf-wrap">
        <div className="gf-card">
          <div className="gf-eyebrow">Address lookup failed</div>
          <h2>{t("errors.geocodeFailTitle")}</h2>
          <p className="gf-body">{t("errors.geocodeFailBody")}</p>
          <div className="gf-attempted">
            <span className="lab">You entered</span>
            <code>{address || "(empty)"}</code>
          </div>
          <div className="gf-actions">
            <button className="gf-primary" onClick={onEditAddress}>
              ← {t("errors.geocodeFailRetry")}
            </button>
            <button className="gf-secondary" onClick={onContinueWithZip}>
              {t("errors.geocodeFailSkip")} →
            </button>
          </div>
          <p className="gf-tip">
            <b>Tip:</b> if you just typed a ZIP, add a street like{" "}
            <code>5750 Hartwick Rd, Houston TX 77057</code>. If you typed a full
            address, double-check the state abbreviation and ZIP.
          </p>
        </div>
      </div>
    </>
  );
}

/* ============ NoContestedView ============
   Maps to: src/components/BallotLookupNeeded.tsx (already in repo).

   Shown when Civic returns zero contests. Lets the user paste / upload
   their sample ballot text. Mock-only here — file parsing is the repo's
   job via /api/extract-ballot. */
function NoContestedView({
  stateData,
  county = "Harris County",
  onBallotConfirmed,
  onBack,
}) {
  const { t } = useI18n();
  const [text, setText] = useStateSC("");
  const [uploadedFile, setUploadedFile] = useStateSC(null);
  const [processing, setProcessing] = useStateSC(false);
  const [processingStep, setProcessingStep] = useStateSC(0);
  const trimmed = text.trim();
  const fileInputRef = useRefSC(null);

  /* Processing state — multi-step mockup so the user knows the AI
     is doing real work on their ballot file (which can take 10+ s
     in the real /api/extract-ballot route). Without this, users
     assume the app is hung. */
  const STEPS = [
    "Reading your file…",
    "Finding the contested races…",
    "Cross-referencing with state records…",
    "Building your ballot…",
  ];

  function beginProcessing(source) {
    setProcessing(true);
    setProcessingStep(0);
    // Walk the steps every ~2s to simulate the real backend. In
    // production this is driven by /api/extract-ballot streaming
    // status updates.
    let i = 0;
    const interval = setInterval(() => {
      i += 1;
      if (i >= STEPS.length) {
        clearInterval(interval);
        setTimeout(() => {
          setProcessing(false);
          onBallotConfirmed(source);
        }, 800);
      } else {
        setProcessingStep(i);
      }
    }, 2000);
  }

  function onFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFile(file);
    beginProcessing(`[uploaded: ${file.name}]`);
  }
  function onPasteConfirm() {
    beginProcessing(trimmed);
  }

  return (
    <>
      <div className="nc-wrap" data-testid="ballot-lookup-needed">
        <div className="nc-card">
          {processing ? (
            <NoContestedProcessing
              file={uploadedFile}
              steps={STEPS}
              currentStep={processingStep}
            />
          ) : (
            <>
              <header className="nc-head">
                <div className="nc-eyebrow">Sample ballot needed</div>
                <h2>{t("errors.noContestedTitle")}</h2>
                <p className="nc-body">{t("errors.noContestedBody")}</p>
              </header>

              <ul className="nc-links">
                <li>
                  <a
                    href={stateData.resources.sampleBallotLookup}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t("errors.noContestedFindBallot", {
                      state: stateData.stateName,
                    })}
                  </a>
                </li>
                <li>
                  <a
                    href={stateData.resources.countyElectionLookup}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t("errors.noContestedCountyOffice", { county })}
                  </a>
                </li>
              </ul>

              {/* PRIMARY path — upload. Big, obvious dropzone-style
                  button so the user can't miss it. Above the paste
                  textarea because uploading is faster + lower-friction
                  for users who already have a PDF from the county. */}
              <div className="nc-upload-card">
                <div className="nc-upload-eyebrow">
                  <span className="nc-upload-num">1</span>
                  <span>Upload your sample ballot</span>
                </div>
                <button
                  type="button"
                  className="nc-upload-btn"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <span className="nc-upload-ico" aria-hidden="true">
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </span>
                  <span className="nc-upload-lab">
                    <span className="nc-upload-main">
                      Choose a .txt or .pdf file
                    </span>
                    <span className="nc-upload-sub">
                      From your county elections office, or any sample ballot
                      text
                    </span>
                  </span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.pdf,text/plain,application/pdf"
                  onChange={onFileChange}
                  style={{ display: "none" }}
                />
              </div>

              <div className="nc-or">
                <span>or</span>
              </div>

              {/* SECONDARY path — paste. Below upload because typing/pasting
                  is slower and more error-prone, but still useful for users
                  who copied text from a state website. */}
              <div className="nc-paste-card">
                <div className="nc-upload-eyebrow">
                  <span className="nc-upload-num">2</span>
                  <span>Paste the ballot text instead</span>
                </div>
                <textarea
                  className="nc-paste-area"
                  rows={7}
                  maxLength={12000}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Paste text copied from your official sample ballot here…"
                  aria-label={t("errors.noContestedPaste")}
                />
                <button
                  className="nc-primary"
                  disabled={!trimmed}
                  onClick={onPasteConfirm}
                >
                  {t("errors.noContestedConfirm")}
                </button>
              </div>

              {onBack && (
                <div className="nc-foot">
                  <button className="nc-back" onClick={onBack}>
                    ← Back to address
                  </button>
                  <p className="nc-privacy">
                    Privacy: don't paste your name, address, phone, or email —
                    only the ballot text.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

/* ============ NoContestedProcessing ============
   Multi-step progress UI shown while /api/extract-ballot is running.
   In the real backend this is driven by streaming status updates;
   in the prototype it auto-advances every ~2s. */
function NoContestedProcessing({ file, steps, currentStep }) {
  return (
    <div className="nc-processing">
      <header className="nc-proc-head">
        <div className="nc-eyebrow">Processing your ballot…</div>
        <h2>Reading your file. This usually takes 10–30 seconds.</h2>
        {file && (
          <p className="nc-proc-file">
            <span className="nc-proc-file-ico" aria-hidden="true">
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
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </span>
            <code>{file.name}</code>
            <span className="nc-proc-file-size">
              · {Math.round(file.size / 1024)} KB
            </span>
          </p>
        )}
      </header>

      <ol className="nc-proc-steps">
        {steps.map((step, i) => {
          const status =
            i < currentStep ? "done" : i === currentStep ? "active" : "pending";
          return (
            <li key={step} className={"nc-proc-step " + status}>
              <span className="nc-proc-step-ico" aria-hidden="true">
                {status === "done" && "✓"}
                {status === "active" && (
                  <span className="nc-proc-spinner"></span>
                )}
                {status === "pending" && "○"}
              </span>
              <span className="nc-proc-step-lab">{step}</span>
            </li>
          );
        })}
      </ol>

      <p className="nc-proc-hint">
        Anthropic is reading the ballot, extracting contested races, and
        cross-referencing them with state records. Don't refresh — your progress
        is auto-saved on this device.
      </p>
    </div>
  );
}

/* ============ AITimeoutBanner ============
   Inline message bubble (.msg.ai-error) you slot into the chat
   center when an AI call times out or errors. Doesn't kill state.
   Repo target: pattern lives in ChatPanel.tsx today as plain text;
   this gives it a proper component. */
function AITimeoutBanner({ onRetry, onHandoff }) {
  const { t } = useI18n();
  return (
    <div className="msg ai-error" role="alert">
      <div className="who">Voter Choice · system</div>
      <div className="bubble">
        <ErrorBanner
          tone="warn"
          title={t("errors.aiTimeoutTitle")}
          body={t("errors.aiTimeoutBody")}
          primary={{ label: t("errors.aiTimeoutRetry"), onClick: onRetry }}
          secondary={{
            label: t("errors.aiTimeoutHandoff"),
            onClick: onHandoff,
          }}
        />
      </div>
    </div>
  );
}

/* ============ About / Methodology / Privacy ============
   Static in-prototype pages. Repo target: src/app/about/page.tsx,
   src/app/methodology/page.tsx, src/app/privacy/page.tsx
   (privacy/page.tsx exists in repo already — content mirrors that). */
function StaticPage({ title, eyebrow, children, onBack }) {
  return (
    <div className="sp-wrap">
      <div className="sp-inner">
        <button className="sp-back" onClick={onBack}>
          ← Back
        </button>
        <div className="sp-eyebrow">{eyebrow}</div>
        <h1 className="sp-title">{title}</h1>
        <article className="sp-article">{children}</article>
      </div>
    </div>
  );
}

function AboutPage({ onBack }) {
  return (
    <StaticPage
      onBack={onBack}
      eyebrow="About Voter Choice"
      title="A free, non-partisan ballot research tool."
    >
      <p>
        Voter Choice is built and operated by <b>Gray Bird LLC</b>, a small
        independent shop. We made it because the gap between "what a candidate
        says in their ads" and "what they actually voted on" has gotten wider
        every cycle. We thought voters deserved a tool that closes it.
      </p>

      <h2>What we do</h2>
      <p>
        For every race on your ballot, we pull the <b>actual voting record</b>{" "}
        of incumbents (Congress.gov, state legislatures), the{" "}
        <b>funding picture</b> (FEC, OpenSecrets, state ethics commissions), and
        the <b>editorially-curated context</b> behind each vote (CAN2026 case
        files). We score how each candidate aligns with the issues YOU told us
        matter, vote by vote.
      </p>

      <h2>What we don't do</h2>
      <ul>
        <li>
          <b>No accounts.</b> No sign-up, no email, no password.
        </li>
        <li>
          <b>No tracking.</b> No analytics, no telemetry, no pixels.
        </li>
        <li>
          <b>No endorsement.</b> We don't tell you who to vote for. We show you
          what the candidates have done. The final choice is yours.
        </li>
        <li>
          <b>No data hoarding.</b> Your address, draft picks, and chat history
          live in your browser. If you close the tab and didn't save a profile,
          it's gone.
        </li>
      </ul>

      <h2>Who pays for this?</h2>
      <p>
        Server costs, Anthropic API budget, and the editorial work behind
        CAN2026 case files are funded by <b>Gray Bird LLC</b> and a small set of
        individual donors who explicitly do not buy a say in editorial. We
        publish a quarterly funding statement.
      </p>
      <p>
        When our community AI budget runs out, you can bring your own Anthropic
        API key (Settings → BYOK) or hand off to any chatbot with a portable
        prompt. We'd rather pause than monetize you.
      </p>

      <h2>Get in touch</h2>
      <p>
        Reach Gray Bird LLC at{" "}
        <a href="mailto:muxin.li.pro@gmail.com">
          <code>muxin.li.pro@gmail.com</code>
        </a>
        . We answer.
      </p>
    </StaticPage>
  );
}

function MethodologyPage({ onBack }) {
  return (
    <StaticPage
      onBack={onBack}
      eyebrow="Methodology"
      title="How we score candidates."
    >
      <h2>Step 1 · Issues come from you</h2>
      <p>
        Every score in this app traces back to <b>your own words</b>. When you
        type your concerns in the cold open, we extract canonical issues + a
        directional stance ("favors lower drug prices"). You confirm, rename, or
        remove before any scoring happens. We don't pre-bake an issue list and
        check boxes against it.
      </p>

      <h2>Step 2 · Votes come from official roll-call data</h2>
      <ul>
        <li>
          Federal:{" "}
          <a
            href="https://www.congress.gov/roll-call-votes"
            target="_blank"
            rel="noopener noreferrer"
          >
            Congress.gov roll-call votes
          </a>
          .
        </li>
        <li>
          State: per-state legislative reporting (e.g.{" "}
          <a
            href="https://capitol.texas.gov"
            target="_blank"
            rel="noopener noreferrer"
          >
            Texas Legislature
          </a>
          ).
        </li>
      </ul>
      <p>
        For each issue, our editorial team selects 2–5 "case file" votes — the
        bills that most directly test the issue. Every score on a candidate card
        is computed from these case file votes only. If we don't have a curated
        case file for an issue × jurisdiction, the score reads{" "}
        <i>"thin record"</i> instead of guessing.
      </p>

      <h2>Step 3 · Donor data comes from FEC + state filings</h2>
      <ul>
        <li>
          Federal candidates:{" "}
          <a
            href="https://www.fec.gov"
            target="_blank"
            rel="noopener noreferrer"
          >
            FEC
          </a>{" "}
          +{" "}
          <a
            href="https://www.opensecrets.org"
            target="_blank"
            rel="noopener noreferrer"
          >
            OpenSecrets
          </a>
          .
        </li>
        <li>
          State candidates: state ethics commissions (e.g. Texas Ethics
          Commission).
        </li>
        <li>
          <b>Named issue PACs</b> are editorially vetted — we only break a PAC
          out separately if it has a public stated agenda we can cite.
        </li>
      </ul>

      <h2>Step 4 · "With you / against you" is your stance vs. the vote</h2>
      <p>
        If you said you favor lower drug prices, a vote FOR Medicare drug-price
        negotiation reads "WITH YOU." A vote AGAINST reads "AGAINST YOU." When
        the record is mixed, we show the raw vote — never a softened summary.
      </p>

      <h2>AI's role</h2>
      <p>
        The AI's job is to <b>route + summarize</b>, not to invent. It pulls
        from our structured database (votes, donors, narratives) and presents
        them. It does not generate vote claims. If a vote isn't in our database,
        we don't show it.
      </p>

      <h2>Mistakes</h2>
      <p>
        We will make them. When we do, we publish a correction and update the
        case file. Every claim links to a primary source so you can verify
        yourself. If you find one, email{" "}
        <a href="mailto:muxin.li.pro@gmail.com">
          <code>muxin.li.pro@gmail.com</code>
        </a>
        .
      </p>
    </StaticPage>
  );
}

function TipJarPage({ onBack }) {
  const links = [
    {
      label: "GitHub Sponsors",
      url: "https://github.com/sponsors/heymoosh",
      note: "One-time or monthly. Card or PayPal. Receipts from GitHub.",
      preferred: true,
    },
    {
      label: "Open Collective",
      url: "https://opencollective.com/voter-choice",
      note: "Transparent ledger — every dollar in & out is public.",
    },
    {
      label: "Stripe payment link",
      url: "https://buy.stripe.com/your-link-here",
      note: "Direct one-time card payment. No account needed.",
    },
  ];

  return (
    <StaticPage
      onBack={onBack}
      eyebrow="Tip jar"
      title="Voter Choice runs on a small AI budget. Tips keep it free."
    >
      <p>
        Voter Choice is built and operated by <b>Gray Bird LLC</b>. There are no
        ads, no tracking, no accounts, and no data sales. Server costs, the
        Anthropic API budget, and the editorial work behind CAN2026 case files
        are paid for by <b>Gray Bird LLC</b> and small individual contributions.
      </p>
      <p>
        If Voter Choice helped you make a real decision, a tip helps keep the
        community AI budget alive for the next voter. We&rsquo;d rather pause
        than monetize you.
      </p>

      <h2>Where it goes</h2>
      <ul>
        <li>
          <b>Anthropic API spend</b> — the chat budget that runs out.
        </li>
        <li>
          <b>Server + hosting</b> — Vercel + a small Redis instance for
          rate-limiting.
        </li>
        <li>
          <b>Editorial</b> — CAN2026 case files take real research hours.
        </li>
        <li>Anything left over rolls forward to the next election cycle.</li>
      </ul>

      <h2>How to chip in</h2>
      <ul className="tip-list">
        {links.map((link) => (
          <li
            key={link.label}
            className={"tip-link " + (link.preferred ? "preferred" : "")}
          >
            <a href={link.url} target="_blank" rel="noopener noreferrer">
              <span className="tip-link-name">
                {link.label}
                {link.preferred && (
                  <span className="tip-pref-tag">Preferred</span>
                )}
              </span>
              <span className="tip-link-note">{link.note}</span>
              <span className="tip-link-arrow" aria-hidden="true">
                →
              </span>
            </a>
          </li>
        ))}
      </ul>

      <h2>What we DON&rsquo;T do</h2>
      <ul>
        <li>
          <b>No payment processor lives in Voter Choice itself.</b> We
          don&rsquo;t handle your card data — every link above takes you to a
          third-party platform you already trust.
        </li>
        <li>
          <b>No donor lists, no donor walls.</b> If you tip, you stay anonymous
          on Voter Choice.
        </li>
        <li>
          <b>No editorial influence for tipping.</b> Tips don&rsquo;t buy a say
          in the methodology, the case files, or the candidate scores.
        </li>
        <li>
          <b>No upsell.</b> The tip jar lives in three places: this page, the
          budget-exhaustion handoff, and the Settings drawer. Nowhere else.
        </li>
      </ul>

      <h2>Funding transparency</h2>
      <p>
        We publish a quarterly funding statement at{" "}
        <code>voterchoice.app/funding</code> (rolling out alongside the 2026
        launch). It shows every dollar in and out, by category, with no
        aggregation tricks.
      </p>
    </StaticPage>
  );
}

function PrivacyPage({ onBack }) {
  return (
    <StaticPage
      onBack={onBack}
      eyebrow="Privacy policy"
      title="What stays here, what doesn't."
    >
      <p className="sp-meta">Effective April 12, 2026 · Gray Bird LLC</p>

      <h2>Minimal data collection</h2>
      <p>
        We do not use analytics, telemetry, tracking pixels, accounts, or
        sign-ups. The app stores your <b>language preference</b>,{" "}
        <b>draft ballot picks</b>, and (optionally) a{" "}
        <b>bring-your-own Anthropic key</b> in your browser's localStorage. None
        of this leaves your device unless you take an action that explicitly
        sends it.
      </p>

      <h2>Your address</h2>
      <p>
        If you enter your street address, it may be used for autocomplete
        (Google Places) in your browser and is sent to the{" "}
        <b>Google Civic Information API</b> through our server for polling-place
        and contest lookup. We do not intentionally log or store your address,
        and we do not include it in the AI chat prompt.
      </p>

      <h2>Chat conversations</h2>
      <p>
        Chat exists in browser memory while the page is open. It is not
        intentionally stored, logged, or persisted by our servers. Messages are
        sent to the <b>Anthropic API</b> for processing. Don't type your name,
        exact address, phone, email, or other identifying details into chat. See{" "}
        <a
          href="https://www.anthropic.com/policies/privacy"
          target="_blank"
          rel="noopener noreferrer"
        >
          Anthropic's privacy policy
        </a>
        .
      </p>

      <h2>Bring-your-own key (BYOK)</h2>
      <p>
        If you save your own Anthropic API key in Settings, it is stored in your
        browser's localStorage <i>only</i> and is sent directly from your
        browser to <code>api.anthropic.com</code>. It does not pass through our
        server on any code path.
      </p>

      <h2>What we cannot provide</h2>
      <p>
        We do not create or store a combined record of who you are, where you
        live, and what you said in chat. If anyone asked us for "who said what
        and where they live," we wouldn't have that combined record to give
        them. This does not prevent disclosure by Google, Anthropic, Vercel,
        GitHub, or other infrastructure providers under their own policies.
      </p>

      <h2>Voter profile uploads</h2>
      <p>
        If you upload a saved profile (.txt) to resume a session, it's used in
        the current browser session and is not stored on our servers. If you use
        the built-in AI chat, profile content is sent to Anthropic as context.
      </p>

      <h2>Rate limiting</h2>
      <p>
        To prevent abuse, we use IP-based rate limiting. If durable safeguards
        are configured, counters may be stored in a Redis-compatible service. IP
        addresses are not intentionally logged for voter profiling or shared.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about this policy?{" "}
        <a href="mailto:muxin.li.pro@gmail.com">
          <code>muxin.li.pro@gmail.com</code>
        </a>
        .
      </p>
    </StaticPage>
  );
}

Object.assign(window, {
  SettingsPanel,
  GeocodeFailView,
  NoContestedView,
  AITimeoutBanner,
  AboutPage,
  MethodologyPage,
  PrivacyPage,
  TipJarPage,
  // BYOK helpers — exposed for app wiring
  getByokKey,
  setByokKey,
  removeByokKey,
  BYOK_STORAGE_KEY,
});
