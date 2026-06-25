// @ts-nocheck
"use client";
/* AUTO-GENERATED: VERBATIM concatenation of prototype/*.jsx (UI only) in HTML
   load order. Data layer lives in ./data (imported below) so the mock seams
   can be replaced with real API data. createRoot stripped; App exported. */
import React from "react";
import {
  RACES, RACE_PATTERNS, ALIGNMENT_SCORES, PROPOSITION_DETAIL,
  PROPOSITION_KIND_META, SAMPLE_LONGFORM, POLLING_INFO, PARTY_META,
  STATE_ELECTION_DATA, TODAY_ISO,
  getRacePatternsForRace, getCandidatePatterns, getAlignmentScoresForRace,
  getAlignmentEntryForCandidate, getScoreForIssue, getCandidateParty,
  computeDeadlineRow, getDeadlineRows,
  applyRealRaces, setRealStateCode, getRealStateCode, getRealElectionType,
  getCandidateResearch, setCandidateResearch,
  getBallotLogistics, setBallotLogistics,
  getLowConfidenceExtraction, setLowConfidenceExtraction,
  getRealStateResources,
} from "./data";
import {
  loadAllRaceData,
  fetchBallotFromAddress,
  fetchBallotFromText,
  fetchBallotFromFile,
  racesSpanMultipleParties,
  filterRacesByParty,
  streamChatReply,
  buildRaceChatSystemPrompt,
  getChatSessionId,
  fetchCandidateResearch,
  deriveDistrictCode,
  PROP_SECTIONS,
  applyRealStateResources,
} from "./realData";
import { buildThemeExtractionPrompt } from "../lib/prompts/theme-extraction";
import { parseThemeExtraction } from "../lib/prompts/parse-theme-extraction";
import { getFallbackStateData, getStateData, findUpcomingElection } from "../lib/getStateData";
import { getStateRule } from "../lib/state-rules/lookup";
import {
  useGooglePlacesAutocomplete,
  getPlacesApiKey,
} from "../lib/useGooglePlacesAutocomplete";

/* ==================== prototype-shared.jsx ==================== */
/* ====================================================
   VOTER CHOICE · shared primitives (design-system core)
   ====================================================
   The single source of truth for cross-cutting LOGIC that more than
   one component needs. Loaded FIRST (before components/screens/views)
   so every script references the same implementation as a bare global
   — change it here, it changes everywhere.

   This is the "shared language" layer of the design system: formatting,
   candidate identity / blind-mode labelling, and peer-funding
   comparison. Presentation primitives (FundingMixBars, DeadlineMeter,
   IssueRow, ErrorBanner) live in the component files and compose these.

   Repo targets:
     formatDollars        → REUSE existing src/lib/ballot-utils.ts →
                            formatCurrencyShort (do NOT create a new util)
     getCandidateIdentity → src/lib/candidateIdentity.ts (+ a
                            useCandidateIdentity hook over blind-mode state)
     getPeerComparison    → src/lib/peerComparison.ts
     anonymizeText        → src/lib/anonymizeText.ts (if not already present)
   ==================================================== */

/* ---------- money formatting ----------
   $1.2M / $340k / $512. Used by FunderBars, the Money-trail teaser,
   CompareModal, the print sheet — anywhere a dollar amount renders. */
function formatDollars(n) {
  if (typeof n !== 'number') return '';
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000)     return '$' + Math.round(n / 1_000) + 'k';
  return '$' + n;
}

/* ---------- candidate identity (blind mode) ----------
   ONE place that decides how a candidate is named given blind-mode
   state. Every surface (candidate card, compare, all-votes, chat intro,
   ballot pane) must agree, or the alias leaks. Returns:
     isBlind       — hide the real identity?
     alias         — "A" / "B" / "C"   (positional)
     aliasLabel    — "Candidate A"
     displayName   — what to show as the primary name
     displayLast   — last name (or alias) for inline mentions
     secondary     — role/subtitle line (hidden when blind)
   `revealed` may be a Set, a function (id)=>bool, or omitted. */
function getCandidateIdentity(candidate, opts) {
  const { blindMode = false, revealed, index = 0 } = opts || {};
  const alias = String.fromCharCode(65 + index); // A, B, C…
  const aliasLabel = 'Candidate ' + alias;
  let isRevealed = false;
  if (revealed) {
    isRevealed = typeof revealed === 'function'
      ? !!revealed(candidate.id)
      : !!(revealed.has && revealed.has(candidate.id));
  }
  const isBlind = !!blindMode && !isRevealed;
  const lastName = (candidate.name || '').split(' ').pop();
  return {
    isBlind,
    alias,
    aliasLabel,
    displayName: isBlind ? aliasLabel : candidate.name,
    displayLast: isBlind ? aliasLabel : lastName,
    secondary: isBlind ? 'identity hidden' : (candidate.priorRole || candidate.priorRoleOverride || ''),
  };
}

/* ---------- peer funding comparison ----------
   "2.0× more / less raised than Candidate B" — the SAME thresholds
   everywhere (Money-trail teaser AND the comparison rails inside
   FunderBars). Below 0.85 → less, above 1.18 → more, otherwise null
   (too close to claim a difference).
     total: this candidate's total
     peers: [{ total, aliasOrName }]  (may include self; self is filtered)
   Returns null, or { kind:'more'|'less', multiplier:'2.0', peer, label }. */
function getPeerComparison(total, peers) {
  if (typeof total !== 'number' || total <= 0) return null;
  if (!peers || peers.length < 2) return null;
  const others = peers.filter(p => p.total !== total && p.total > 0);
  if (others.length === 0) return null;
  const peer = others.reduce((a, b) => (b.total > a.total ? b : a), others[0]);
  const ratio = total / peer.total;
  if (ratio < 0.85) {
    const multiplier = (1 / ratio).toFixed(1);
    return { kind: 'less', multiplier, peer, label: `${multiplier}× less than ${peer.aliasOrName}` };
  }
  if (ratio > 1.18) {
    const multiplier = ratio.toFixed(1);
    return { kind: 'more', multiplier, peer, label: `${multiplier}× more than ${peer.aliasOrName}` };
  }
  return null;
}

/* ---------- narrative anonymization ----------
   Replace a candidate's last name with their alias in AI narrative
   text when blind. Whole-word only so we don't mangle unrelated text. */
function anonymizeText(text, anonCtx) {
  if (!text || !anonCtx?.blindMode || !anonCtx?.realLastName) return text;
  const alias = anonCtx.alias || 'this candidate';
  const safe = anonCtx.realLastName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp('\\b' + safe + '\\b', 'g'), alias);
}

Object.assign(window, {
  formatDollars,
  getCandidateIdentity,
  getPeerComparison,
  anonymizeText,
  // Back-compat alias used by older call sites.
  __formatDollars: formatDollars,
});

/* ==================== prototype-i18n.jsx ==================== */
/* ====================================================
   VOTER CHOICE · i18n (EN / ES)
   ====================================================
   Maps to: src/lib/i18n.tsx + src/lib/translations.ts (repo).

   PORTABILITY: keys here match the repo's `Translations`
   interface so the port is a 1:1 rename (no merge). When we
   add a new surface to the prototype that needs a translation
   string, we add it under the SAME key the repo's translations
   already use; if we need a new key, we add it here AND flag
   it in COMPONENT_MAP.md as a translations addition.

   We don't ship a full ES dictionary — only the keys the new
   surfaces (Pass C) touch. Repo translations cover the rest.
   ==================================================== */

const I18N_STORAGE_KEY = 'ballot-tool-lang'; // matches repo key

/* Minimal translation set — same KEY SHAPE as repo. Anything not
   listed here falls back to EN. */
const TRANSLATIONS = {
  en: {
    nav: {
      howItWorks: 'How it works',
      theRecord: 'The record',
      about: 'About',
      methodology: 'Methodology',
      privacy: 'Privacy',
      support: 'Support',
      tipJar: 'Tip jar',
      settings: 'Settings',
    },
    landing: {
      returningBadge: 'Been here before?',
      returningHeadline: 'Pick up where you left off.',
      returningSubtext:
        'You have a draft ballot saved on this device — {decided} of {total} races decided. Resume now, or start fresh.',
      returningResume: 'Resume my session →',
      returningStartOver: 'Start over',
      howItWorksTitle: 'How it works',
      howItWorksSubtext: 'Three steps. A few minutes. No account.',
      step1Title: 'Enter your address',
      step1Desc:
        "We pull your representative's history based on address. The address never leaves your device — we look up your representative and discard it.",
      step2Title: 'See what they actually did',
      step2Desc:
        "Voting record on the issues you care about. Donor list. How much they raised and from whom. No news articles, no ads — just the record.",
      step3Title: 'Take it with you',
      step3Desc:
        "Download a one-page ballot for the polling booth. Many polls don't allow phones — print or write it down.",
    },
    deadline: {
      registerOnline: 'Register online',
      registerByMail: 'Register by mail',
      registerInPerson: 'Register in person',
      earlyVotingStarts: 'Early voting starts',
      earlyVotingEnds: 'Early voting ends',
      electionDay: 'Election Day',
      passed: 'Passed',
      today: 'Today (last day)',
      daysLeft: '{n} days left',
      sameDayAvailable: 'Same-day registration available',
      checkRegistration: 'Check your registration →',
    },
    errors: {
      geocodeFailTitle: "We couldn't find that address",
      geocodeFailBody:
        "Google Civic couldn't match the address you entered. Try adding a city + state + ZIP, or just enter your ZIP and we'll look up state-level info.",
      geocodeFailRetry: 'Edit address',
      geocodeFailSkip: 'Continue with ZIP only',
      noContestedTitle: "We couldn't auto-confirm your ballot",
      noContestedBody:
        "Civic returned no contested races for your address. Look up your sample ballot below, then paste or upload it so we know which races to research.",
      noContestedFindBallot: 'Find your sample ballot ({state}) →',
      noContestedCountyOffice: '{county} elections office →',
      noContestedPaste: 'Paste your sample ballot text',
      noContestedConfirm: 'Use this ballot',
      noContestedUpload: 'Upload .txt or .pdf',
      aiTimeoutTitle: 'AI is taking longer than usual',
      aiTimeoutBody:
        "Anthropic responded slowly or the request hit our timeout. Your draft picks are safe — no data was lost.",
      aiTimeoutRetry: 'Try again',
      aiTimeoutHandoff: 'Hand off to another chatbot →',
    },
    settings: {
      title: 'Settings',
      langSection: 'Language',
      langEn: 'English',
      langEs: 'Español',
      byokSection: 'Bring your own Anthropic key',
      byokHelp:
        "Stored only on this device. Sent directly to api.anthropic.com from your browser — never to Voter Choice's server.",
      byokPlaceholder: 'sk-ant-...',
      byokSave: 'Save key',
      byokClear: 'Remove key',
      byokSaved: 'Key saved — chat now uses your account.',
      byokRemoved: 'Key removed — back to the community budget.',
      dataSection: 'Your data on this device',
      dataResume: 'Resume from saved profile (.txt)',
      dataExport: 'Export draft ballot (.txt)',
      dataReset: 'Clear everything on this device',
      privacyLink: 'Privacy policy →',
      methodologyLink: 'Methodology →',
      aboutLink: 'About Voter Choice →',
    },
    polling: {
      cardTitle: 'Your polling info',
      addedToCalendar: 'Add to calendar',
      directions: 'Directions',
      hours: 'Hours',
      bring: 'Bring',
      sampleBallot: 'Sample ballot',
      precinct: 'Precinct',
      earlyVotingWindow: 'Early voting window',
      cardSource: 'Source · Google Civic',
    },
  },
  es: {
    nav: {
      howItWorks: 'Cómo funciona',
      theRecord: 'El registro',
      about: 'Acerca de',
      methodology: 'Metodología',
      privacy: 'Privacidad',
      support: 'Soporte',
      tipJar: 'Propinas',
      settings: 'Ajustes',
    },
    landing: {
      returningBadge: '¿Has estado aquí antes?',
      returningHeadline: 'Retoma donde lo dejaste.',
      returningSubtext:
        'Tienes una boleta en borrador guardada en este dispositivo — {decided} de {total} carreras decididas. Continúa ahora o empieza de nuevo.',
      returningResume: 'Continuar mi sesión →',
      returningStartOver: 'Empezar de nuevo',
      howItWorksTitle: 'Cómo funciona',
      howItWorksSubtext: 'Tres pasos. Unos minutos. Sin cuenta.',
      step1Title: 'Ingresa tu dirección',
      step1Desc:
        'Obtenemos el historial de tu representante según tu dirección. Tu dirección no sale de tu dispositivo — consultamos tu representante y la descartamos.',
      step2Title: 'Mira lo que realmente hicieron',
      step2Desc:
        'Registro de votación sobre los temas que te importan. Lista de donantes. Cuánto recaudaron y de quién. Sin artículos, sin anuncios — solo el registro.',
      step3Title: 'Llévatelo contigo',
      step3Desc:
        'Descarga una boleta de una página para la urna. Muchas casillas no permiten teléfonos — imprímela o escríbela.',
    },
    deadline: {
      registerOnline: 'Registrarse en línea',
      registerByMail: 'Registrarse por correo',
      registerInPerson: 'Registrarse en persona',
      earlyVotingStarts: 'Empieza la votación anticipada',
      earlyVotingEnds: 'Termina la votación anticipada',
      electionDay: 'Día de las elecciones',
      passed: 'Pasado',
      today: 'Hoy (último día)',
      daysLeft: 'Quedan {n} días',
      sameDayAvailable: 'Registro el mismo día disponible',
      checkRegistration: 'Verifica tu registro →',
    },
    errors: {
      geocodeFailTitle: 'No encontramos esa dirección',
      geocodeFailBody:
        'Google Civic no pudo identificar la dirección que ingresaste. Intenta añadir ciudad + estado + código postal, o ingresa solo tu código postal y mostramos información estatal.',
      geocodeFailRetry: 'Editar dirección',
      geocodeFailSkip: 'Continuar solo con código postal',
      noContestedTitle: 'No pudimos confirmar tu boleta',
      noContestedBody:
        'Civic no devolvió carreras para tu dirección. Busca tu boleta de muestra abajo y pégala o súbela para saber qué carreras investigar.',
      noContestedFindBallot: 'Encuentra tu boleta de muestra ({state}) →',
      noContestedCountyOffice: 'Oficina electoral del condado {county} →',
      noContestedPaste: 'Pega el texto de tu boleta de muestra',
      noContestedConfirm: 'Usar esta boleta',
      noContestedUpload: 'Subir .txt o .pdf',
      aiTimeoutTitle: 'La IA está tardando más de lo normal',
      aiTimeoutBody:
        'Anthropic respondió lento o la solicitud alcanzó nuestro tiempo de espera. Tus selecciones están seguras — no se perdieron datos.',
      aiTimeoutRetry: 'Intentar de nuevo',
      aiTimeoutHandoff: 'Continuar en otro chatbot →',
    },
    settings: {
      title: 'Ajustes',
      langSection: 'Idioma',
      langEn: 'English',
      langEs: 'Español',
      byokSection: 'Usa tu propia llave de Anthropic',
      byokHelp:
        'Se almacena solo en este dispositivo. Se envía directo a api.anthropic.com desde tu navegador — nunca al servidor de Voter Choice.',
      byokPlaceholder: 'sk-ant-...',
      byokSave: 'Guardar llave',
      byokClear: 'Quitar llave',
      byokSaved: 'Llave guardada — el chat ahora usa tu cuenta.',
      byokRemoved: 'Llave quitada — volvemos al presupuesto comunitario.',
      dataSection: 'Tus datos en este dispositivo',
      dataResume: 'Continuar desde perfil guardado (.txt)',
      dataExport: 'Exportar boleta en borrador (.txt)',
      dataReset: 'Borrar todo en este dispositivo',
      privacyLink: 'Política de privacidad →',
      methodologyLink: 'Metodología →',
      aboutLink: 'Acerca de Voter Choice →',
    },
    polling: {
      cardTitle: 'Tu información electoral',
      addedToCalendar: 'Añadir al calendario',
      directions: 'Cómo llegar',
      hours: 'Horario',
      bring: 'Llevar',
      sampleBallot: 'Boleta de muestra',
      precinct: 'Precinto',
      earlyVotingWindow: 'Ventana de votación anticipada',
      cardSource: 'Fuente · Google Civic',
    },
  },
};

const I18nContext = React.createContext({ lang: 'en', setLang: () => {}, t: (k) => k });

function I18nProvider({ children }) {
  const [lang, setLangState] = React.useState('en');
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(I18N_STORAGE_KEY);
      if (stored === 'en' || stored === 'es') setLangState(stored);
    } catch (e) {}
  }, []);
  React.useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  const setLang = React.useCallback((next) => {
    setLangState(next);
    try { localStorage.setItem(I18N_STORAGE_KEY, next); } catch (e) {}
  }, []);
  const t = React.useCallback((path, vars) => {
    const get = (obj, p) => p.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj);
    let str = get(TRANSLATIONS[lang], path);
    if (str === undefined) str = get(TRANSLATIONS.en, path);
    if (str === undefined) return path;
    if (vars && typeof str === 'string') {
      Object.entries(vars).forEach(([k, v]) => { str = str.replace(new RegExp('\\{' + k + '\\}', 'g'), v); });
    }
    return str;
  }, [lang]);
  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

function useI18n() { return React.useContext(I18nContext); }

/* ============ NavContext ============
   Lets AppNav (and anything else in the tree) reach back to App-level
   handlers — open Settings, navigate to static pages — without
   prop-drilling through every view. Repo equivalent: the page-level
   handler is hoisted into the App layout via Next.js routing; here we
   inject it into the tree at the root. */
const NavContext = React.createContext({
  openSettings: () => {},
  navigate: () => {},
  current: 'home',
});
function useNav() { return React.useContext(NavContext); }
function NavProvider({ value, children }) {
  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}

Object.assign(window, { I18nProvider, useI18n, TRANSLATIONS, I18N_STORAGE_KEY, NavProvider, useNav, NavContext });

/* ==================== prototype-components.jsx ==================== */
/* ====================================================
   VOTER CHOICE · components
   ====================================================
   See the original design prototype's COMPONENT_MAP.md (git history) for the
   repo target of each component. Inline headers reference the matching file.

   Pattern: each component accepts props shaped like the
   repo's parsed structured-block payload. Design-delta fields
   are marked with [Δ] in the data file and consumed here.
   ==================================================== */

const { useState, useEffect, useRef } = React;

/* ============ AppNav ============
   Maps to: src/components/Navigation.tsx (header strip).
   Pass C: wires Settings cog + LanguageToggle and reads navigation
   handlers from NavContext (provided at App root).

   Repo equivalent: same composition pattern — LanguageToggle slots
   into the right-hand side, settings opens a drawer hoisted at the
   layout level. */
function AppNav({ onBrandClick }) {
  // Defensive: i18n + nav contexts may not exist in storybook-style
  // standalone renders. Default to no-op + EN labels.
  const i18n = (typeof useI18n === 'function') ? useI18n() : { t: (k) => k.split('.').pop() };
  const nav  = (typeof useNav  === 'function') ? useNav()  : { openSettings: () => {}, navigate: () => {}, current: 'home' };
  const { t } = i18n;
  const { openSettings, navigate, current } = nav;

  return (
    <nav className="app-nav" data-current={current || 'home'} aria-label="Main">
      <div
        className="brand"
        onClick={onBrandClick || (() => navigate('home'))}
        role="link"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            (onBrandClick || (() => navigate('home')))();
          }
        }}
        aria-label="Voter Choice home"
      >
        <span className="mark" aria-hidden="true">V</span>
        <span>Voter Choice</span>
      </div>
      <div className="links">
        <a onClick={() => navigate('howitworks')} role="link" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') navigate('howitworks'); }}>{t('nav.howItWorks')}</a>
        <a onClick={() => navigate('methodology')} role="link" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') navigate('methodology'); }}>{t('nav.methodology')}</a>
        <a onClick={() => navigate('about')} role="link" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') navigate('about'); }}>{t('nav.about')}</a>
        <a onClick={() => navigate('privacy')} role="link" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') navigate('privacy'); }}>{t('nav.privacy')}</a>
        <a href="mailto:muxin.li.pro@gmail.com">{t('nav.support')}</a>
      </div>
      <div className="nav-right">
        {typeof LanguageToggle === 'function' && <LanguageToggle />}
        <a className="nav-tip" onClick={() => navigate('tip')} role="link" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') navigate('tip'); }}>{t('nav.tipJar')}</a>
        <button
          className="nav-cog"
          onClick={openSettings}
          aria-label={t('nav.settings')}
          title={t('nav.settings')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>
    </nav>
  );
}

/* ============ AppFooter ============
   Shared footer bar — matches .hp-foot styles used by HomeView.
   Brand + copyright only; all nav links live in the header (AppNav).
   Pass `compact` on the workspace (slim pinned bar); omit it on
   the home page for the full-height layout. */
function AppFooter({ compact }: { compact?: boolean }) {
  return (
    <footer className={"hp-foot" + (compact ? " hp-foot-slim" : "")}>
      <div className="l">Voter Choice</div>
      <div>© 2026 Grey Bird LLC. All Rights Reserved.</div>
    </footer>
  );
}

/* ============ IssueRow ============
   Used in the cold open to render one inferred issue row
   the user can reorder / rename / remove.

   Maps to: src/components/ConcernInterpretation.tsx (one row
   of the interpretation list). The repo today is read-only —
   editing affordances are part of Phase 6 (mid-flow amend).
   Reorder/rename/remove are design-delta in this prototype. */
function IssueRow({ issue, index, total, onMoveUp, onMoveDown, onRename, onRemove, onReorderTo }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(issue.interpretation);
  const rowRef = React.useRef(null);
  const drag = React.useRef({ active: false, startY: 0, dy: 0, currentIdx: index });
  const [dragging, setDragging] = useState(false);
  const [dropIdx, setDropIdx] = useState(null);

  function commit() {
    if (draft.trim()) onRename(draft.trim());
    setEditing(false);
  }

  /* ====== Drag & drop (pointer events — works on touch + mouse).
     Bound to the whole row so on mobile the entire card is a drag
     surface. We bail out if the pointerdown landed on an interactive
     descendant (button / input) so rename + remove still work. */
  function isInteractive(target) {
    return !!target.closest && !!target.closest('button, input, a, textarea, select');
  }
  function onHandleDown(e) {
    if (editing) return;
    if (isInteractive(e.target) && !e.target.closest('.drag-handle, .theme-row')) return;
    // On desktop, only the .drag-handle initiates drag; on mobile the
    // whole row does. We detect "mobile" by viewport — same threshold
    // as the CSS rule that toggles .ord button pointer-events.
    const isMobile = window.matchMedia('(max-width: 640px)').matches;
    if (!isMobile && !e.target.closest('.drag-handle')) return;
    // On mobile, bail if the user tapped a button/input inside the row
    // (rename, remove, edit pencil). The row's pointer-events:none on
    // those is handled in CSS too, but belt-and-suspenders.
    if (isMobile && isInteractive(e.target)) return;
    e.preventDefault();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
    drag.current = { active: true, startY: e.clientY, dy: 0, currentIdx: index, rowH: rowRef.current?.offsetHeight || 80 };
    setDragging(true);
    setDropIdx(index);
  }
  function onHandleMove(e) {
    if (!drag.current.active) return;
    const dy = e.clientY - drag.current.startY;
    drag.current.dy = dy;
    if (rowRef.current) rowRef.current.style.transform = `translateY(${dy}px)`;
    const slots = Math.round(dy / drag.current.rowH);
    const target = Math.max(0, Math.min(total - 1, index + slots));
    if (target !== drag.current.currentIdx) {
      drag.current.currentIdx = target;
      setDropIdx(target);
    }
  }
  function onHandleUp(e) {
    if (!drag.current.active) return;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (_) {}
    const finalIdx = drag.current.currentIdx;
    drag.current.active = false;
    setDragging(false);
    setDropIdx(null);
    if (rowRef.current) rowRef.current.style.transform = '';
    if (finalIdx !== index && onReorderTo) onReorderTo(index, finalIdx);
  }

  return (
    <div
      ref={rowRef}
      className={"theme-row" + (dragging ? ' dragging' : '') + (dropIdx === index && !dragging ? ' drop-target' : '')}
      onPointerDown={onHandleDown}
      onPointerMove={onHandleMove}
      onPointerUp={onHandleUp}
      onPointerCancel={onHandleUp}
    >
      <div className="ord">
        <span
          className="drag-handle"
          aria-label="Drag to re-rank"
          role="button"
        >
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
            <circle cx="6" cy="4" r="1" /><circle cx="10" cy="4" r="1" />
            <circle cx="6" cy="8" r="1" /><circle cx="10" cy="8" r="1" />
            <circle cx="6" cy="12" r="1" /><circle cx="10" cy="12" r="1" />
          </svg>
        </span>
        <div className="ord-arrows">
          <button onClick={onMoveUp} disabled={index === 0} aria-label="Move up">▲</button>
          <button onClick={onMoveDown} disabled={index === total - 1} aria-label="Move down">▼</button>
        </div>
      </div>
      <div className="rank">{index + 1}</div>
      <div className="body">
        <div className="nm">
          {editing ? (
            <input
              className="name-edit"
              value={draft}
              autoFocus
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setDraft(issue.interpretation); setEditing(false); } }}
            />
          ) : (
            <>
              <span>{issue.interpretation}</span>
              <button className="edit-pencil" onClick={() => setEditing(true)}>rename</button>
            </>
          )}
        </div>
        <div className="quotes">
          {(issue.quotes || []).map((q, i) => (
            <div className="quote" key={i}>
              <span className="lab">{q.label}</span>
              <em>"{q.text}"</em>
            </div>
          ))}
        </div>
        {!issue.canonicalIssue && (
          <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--ink-3)', fontStyle: 'italic' }}>
            no voting record data for this topic
          </div>
        )}
      </div>
      <div className="acts">
        <button className="danger" onClick={onRemove}>Remove</button>
      </div>
    </div>
  );
}

/* ====================================================
   CANDIDATE CARD COMPOSITION
   ====================================================
   The hero visual is built from four named sub-components
   that each map cleanly to a repo file:

     CandidateCardHeader   → (new — repo doesn't have this
                              factored out yet; embedded in
                              RacePatterns.tsx)
     AlignmentScoreBanner  → src/components/AlignmentScoreBanner.tsx
     AlignmentDrilldown    → src/components/AlignmentDrilldown.tsx
     FunderBars            → src/components/FunderBars.tsx
   ==================================================== */

/* ============ CandidateCard ============
   Thin wrapper. State (which issue is expanded) lives here so
   the banner and drilldown share one source of truth.

   props (repo-shaped):
     candidate:        RacePatternsCandidate   (id, name, incumbent, ...,
                                                 donorCoalition, totalRaised,
                                                 fundingMix [Δ])
     alignmentEntry:   AlignmentScoresEntry    (candidateId, scores | null, unavailable?)
     userIssues:       ConcernInterpretationEntry[]
     party:            { name, code, pipClass }
     priorRoleOverride?: string                (display polish)
     picked, onPick, onUnpick: control props */
function CandidateCard({ candidate, alignmentEntry, userIssues, party, picked, onPick, onUnpick, onSeeAllVotes, blindMode, globalBlindMode, isRevealed, alias, onReveal, onHide, peerTotals, raceId }) {
  const [expandedIssue, setExpandedIssue] = useState(null);
  /* Progressive disclosure: money trail (funding mix + named PACs +
     industry breakdown) is collapsed by default on mobile, expanded
     on desktop. This keeps the decision UI (header + alignment +
     Pick button) tight on phones while preserving the editorial
     evidence one tap away. */
  const [moneyOpen, setMoneyOpen] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(min-width: 901px)').matches
  );
  const hasAnyScore = !!(alignmentEntry?.scores?.length);
  const totalVotes = alignmentEntry?.issues?.reduce((n, i) => n + (i.contributingVotes?.length || 0), 0) || 0;

  // Anonymization context — passed all the way down so narrative
  // text doesn't leak the candidate's last name in blind mode.
  const anonCtx = { blindMode, realLastName: candidate.name?.split(' ').pop(), alias };

  // Web-research fallback for the alignment block. Read REGARDLESS of blind mode
  // so a no-record candidate's name-free position analysis shows while blinded,
  // exactly like voting records do — otherwise the card sat on a permanent
  // "Looking up public statements…" that never resolved in blind mode. The only
  // name-leak vector, the evidence links (their URLs/summaries can carry the
  // name), is hidden while blinded inside AlignmentIssueRow.
  const research = getCandidateResearch(raceId + '::' + candidate.name);
  const issuePacTeaser = namedIssuePacSummary(candidate.donorCoalition);

  return (
    <div className="cv2-card" data-testid="candidate-card">
      <CandidateCardHeader
        candidate={candidate}
        party={party}
        blindMode={blindMode}
        isRevealed={isRevealed}
        alias={alias}
        onReveal={onReveal}
        onHide={onHide}
      />

      <AlignmentScoreBanner
        candidate={candidate}
        alignmentEntry={alignmentEntry}
        userIssues={userIssues}
        expandedIssue={expandedIssue}
        onToggleIssue={(canonicalIssue) =>
          setExpandedIssue(expandedIssue === canonicalIssue ? null : canonicalIssue)}
        anonCtx={anonCtx}
        research={research}
      />

      {/* See all votes — primary "evidence" CTA, always visible right
          below the alignment summary. */}
      {hasAnyScore && (
        <div className="cv2-see-all-bridge">
          <button
            className="cv2-see-all-inline"
            onClick={onSeeAllVotes}
          >
            See all {totalVotes || ''} votes →
          </button>
        </div>
      )}

      {/* Progressive-disclosure: Money trail block (collapsible). */}
      <div className={"cv2-disclose " + (moneyOpen ? 'open' : '')}>
        <button
          className="cv2-disclose-toggle"
          aria-expanded={moneyOpen}
          aria-controls={`mt-${candidate.id}`}
          onClick={() => setMoneyOpen(v => !v)}
        >
          <span className="cv2-disclose-lab">
            <span className="cv2-disclose-eyebrow">Funding & influence</span>
            <span className="cv2-disclose-title">Money trail</span>
            {/* Two-line summary so the user sees the bottom line
                (total + peer comparison) before the mix breakdown. */}
            <span className="cv2-disclose-summary" data-testid="funding-summary">
              {(typeof candidate.totalRaised === 'number') && (
                <span className="cv2-disclose-stat">
                  <b>{formatDollars(candidate.totalRaised)}</b> raised
                  {(() => {
                    const peer = computePeerLabel(candidate.totalRaised, peerTotals);
                    return peer ? <> <span className="cv2-disclose-peer">· {peer}</span></> : null;
                  })()}
                </span>
              )}
              {candidate.fundingMix && (
                <span className="cv2-disclose-mix">
                  {fundingMixSummary(candidate.fundingMix)}
                </span>
              )}
              {issuePacTeaser && (
                <span className="cv2-disclose-issue-pacs">
                  {issuePacTeaser}
                </span>
              )}
            </span>
          </span>
          <span className="cv2-disclose-chev" aria-hidden="true">
            {moneyOpen ? (
              <>Hide <span className="cv2-disclose-arrow">▴</span></>
            ) : (
              <>Show details <span className="cv2-disclose-arrow">▾</span></>
            )}
          </span>
        </button>
        <div
          id={`mt-${candidate.id}`}
          className="cv2-disclose-body"
          hidden={!moneyOpen}
        >
          <FunderBars
            donorCoalition={candidate.donorCoalition}
            totalRaised={candidate.totalRaised}
            donorDataSource={candidate.donorDataSource}
            donorSource={candidate.donorSource}
            donorUnavailable={candidate.donorUnavailable}
            /* [Δ] design-delta */
            fundingMix={candidate.fundingMix}
            userIssues={userIssues}
            peerTotals={peerTotals}
          />
        </div>
      </div>

      <div className="cv2-actions">
        {picked ? (
          <button className="pick picked" onClick={onUnpick}>
            <span className="ck">✓</span>
            <span>Picked — undo</span>
          </button>
        ) : (
          <button className="pick" onClick={onPick} data-testid="pick-candidate">
            <span className="ck">☐</span>
            <span>Pick {blindMode ? alias : candidate.name.split(' ').pop()}</span>
          </button>
        )}
      </div>
    </div>
  );
}

/* ============ FundingMixBars ============
   SHARED funding-mix visualization: stacked small/large/PAC bar +
   full legend with dollar-threshold descriptors. Used by both the
   candidate-card Money trail AND the Compare modal so the two never
   drift. Previously each surface hand-rolled its own bar markup.

   Repo target: (new — recommended src/components/FundingMixBars.tsx).
   Consolidates what the repo renders inline in FunderBars + the
   compare grid today.

   props:
     mix: { small, large, pac }  (percentages, 0–100) [Δ fundingMix]
     labelMin: hide the inline % label on segments narrower than this
               (default 12) so tiny segments don't show cramped text */
function FundingMixBars({ mix, labelMin = 12 }) {
  if (!mix) return null;
  return (
    <div className="fmix">
      <div className="fmix-bar" role="img" aria-label="Funding by source type">
        <div className="seg small" style={{ flexBasis: mix.small + '%' }}>
          {mix.small >= labelMin && <span className="pct">{mix.small}%</span>}
        </div>
        <div className="seg large" style={{ flexBasis: mix.large + '%' }}>
          {mix.large >= labelMin && <span className="pct">{mix.large}%</span>}
        </div>
        <div className="seg pac" style={{ flexBasis: mix.pac + '%' }}>
          {mix.pac >= labelMin && <span className="pct">{mix.pac}%</span>}
        </div>
      </div>
      <div className="fmix-legend">
        <div><span className="sw small" /> <b>{mix.small}%</b> Small donors <small>&lt;$200</small></div>
        <div><span className="sw large" /> <b>{mix.large}%</b> Large donors <small>≥$200</small></div>
        <div><span className="sw pac" /> <b>{mix.pac}%</b> PACs <small>groups &amp; lobbies</small></div>
      </div>
    </div>
  );
}

/* ============ fundingMixSummary ============
   Inline summary string used by the Money trail disclosure header
   so the user gets a teaser without expanding. Reads from
   candidate.fundingMix [Δ]. All three buckets shown when present
   (small + large + PAC) — earlier version dropped large donors,
   which mis-represents campaigns that lean heavily on large
   individual checks. */
function fundingMixSummary(mix) {
  if (!mix) return 'tap to view';
  const parts = [];
  if (mix.small != null) parts.push(`${mix.small}% small donors`);
  if (mix.large != null) parts.push(`${mix.large}% large donors`);
  if (mix.pac   != null) parts.push(`${mix.pac}% PACs`);
  return parts.join(' · ');
}

function namedIssuePacSummary(donorCoalition) {
  const issuePACs = (donorCoalition || []).filter(slice => slice && slice.isIssuePAC);
  if (issuePACs.length === 0) return null;
  const total = issuePACs.reduce((sum, slice) => (
    sum + (typeof slice.amount === 'number' ? slice.amount : 0)
  ), 0);
  const plural = issuePACs.length === 1 ? 'named issue PAC' : 'named issue PACs';
  const amount = total > 0 ? `${formatDollars(total)} from ` : '';
  return `${amount}${issuePACs.length} ${plural} identified`;
}

/* ============ computePeerLabel ============
   Thin wrapper over the shared getPeerComparison (design-system core).
   Returns just the label string for the Money-trail disclosure teaser. */
function computePeerLabel(totalRaised, peerTotals) {
  const cmp = getPeerComparison(totalRaised, peerTotals);
  return cmp ? cmp.label : null;
}

/* ============ CandidateCardHeader ============ */
function CandidateCardHeader({ candidate, party, blindMode, isRevealed, alias, onReveal, onHide }) {
  const yearsMatch = (candidate.priorRole || '').match(/since (\d{4})/i);
  const years = yearsMatch ? new Date().getFullYear() - parseInt(yearsMatch[1], 10) : 0;
  const isFirstTime = /first-time/i.test(candidate.priorRole || '') || (!yearsMatch && !candidate.incumbent);

  // In blind mode, hide name + party + role + tenure. Show only an alias
  // and a "Reveal who this is" button. Everything below stays visible.
  if (blindMode) {
    return (
      <div className="cv2-head blind">
        <div className="cv2-photo blind" />
        <div className="cv2-id">
          <div className="cv2-name blind">{alias || 'Candidate'}</div>
          <div className="cv2-sub blind">
            <span className="cv2-tag">Identity hidden · judge by record</span>
          </div>
        </div>
        <button className="cv2-reveal" onClick={onReveal} title="Reveal who this is">
          <svg className="reveal-ic" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <span className="lab">Reveal</span>
        </button>
      </div>
    );
  }

  return (
    <div className="cv2-head">
      <div className="cv2-photo" />
      <div className="cv2-id">
        <div className="cv2-name">{candidate.name}</div>
        <div className="cv2-sub">
          {party && <span className={"cv2-pip " + party.pipClass} />}
          {party && <span>{party.name}</span>}
          <span className="cv2-tag">
            {candidate.incumbent ? 'Incumbent' : (isFirstTime ? 'First-time' : 'Challenger')}
          </span>
        </div>
      </div>
      {/* [Fix] When the user is in global blind mode but has
          revealed THIS candidate, expose a Hide button so they
          can re-anonymize this card without flipping the global
          toggle. Sits where the tenure block lives in the
          revealed-but-not-blinded state, so it occupies the
          same column without disrupting the grid. */}
      {isRevealed ? (
        <button className="cv2-reveal hide" onClick={onHide} title="Hide this candidate again">
          <svg className="reveal-ic" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-10-7-10-7a18.45 18.45 0 0 1 5.06-5.94" />
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 7 10 7a18.5 18.5 0 0 1-2.16 3.19" />
            <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
            <line x1="2" y1="2" x2="22" y2="22" />
          </svg>
          <span className="lab">Hide</span>
        </button>
      ) : years > 0 ? (
        <div className="cv2-tenure">
          <div className="num">{years}</div>
          <div className="unit">yrs in office</div>
        </div>
      ) : isFirstTime ? (
        <div className="cv2-tenure no-record">
          <div className="unit unit-lg">No record yet</div>
        </div>
      ) : null}
    </div>
  );
}

/* ============ AlignmentScoreBanner ============
   Maps to: src/components/AlignmentScoreBanner.tsx

   Repo today: renders alignment ratio (e.g. "3 of 5") per
   issue with a chip showing kept/total. Bars + drill-down
   toggle are this prototype's design-delta.

   props:
     candidate, alignmentEntry, userIssues, expandedIssue, onToggleIssue */
function AlignmentScoreBanner({ candidate, alignmentEntry, userIssues, expandedIssue, onToggleIssue, anonCtx, research }) {
  // ── Pillar 2: research_pending + web_search scores rendering ─────────────
  // Three cases for no-record candidates:
  //   (a) research.status === 'loading' → skeleton spinner
  //   (b) research.status === 'done' && research.scores → render web_search rows
  //       in the SAME alignment surface as voting_record rows (via AlignmentIssueRow)
  //   (c) research unavailable / no scores → honest "judge on public statements"
  //
  // The unavailable.reason === 'research_pending' signals the App to fire the
  // POST request (handled in the research useEffect); here we just render the
  // appropriate skeleton/result state.
  if (alignmentEntry?.scores === null && alignmentEntry?.unavailable) {
    const reason = alignmentEntry.unavailable.reason;
    const isPending = reason === 'research_pending';

    // Case (a): loading skeleton
    if (research && research.status === 'loading') {
      return (
        <div className="cv2-issues" data-testid="research-pending-skeleton">
          <div className="cv2-block-head">
            <div className="lab">Aligns with your issues</div>
          </div>
          <div className="cv2-norecord" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              display: 'inline-block', width: '14px', height: '14px',
              border: '2px solid var(--rule, #ddd)',
              borderTopColor: 'var(--civic, #3a6ea8)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }} aria-hidden="true" />
            <span style={{ fontStyle: 'italic', opacity: 0.7, fontSize: '13px' }}>
              Researching public statements…
            </span>
          </div>
        </div>
      );
    }

    // Case (b): research done with structured web_search scores
    if (research && research.status === 'done' && research.scores && research.scores.length > 0) {
      // Build a synthetic alignment entry using the returned structured scores.
      // These are AlignmentScore[] with sourceType:'web_search' — we render
      // them through the same AlignmentIssueRow as voting_record scores, but
      // AlignmentIssueRow handles the visual distinction internally.
      const rowsData = (userIssues || []).map(iss => {
        const score = research.scores.find(s => s.canonicalIssue === iss.canonicalIssue)
          || null;
        return { issue: iss, score };
      });
      return (
        <div className="cv2-issues" data-testid="web-search-alignment-banner">
          <div className="cv2-block-head">
            <div className="lab">Aligns with your issues</div>
            <div style={{ fontSize: '10px', color: 'var(--ink-3, #888)', fontStyle: 'italic' }}>
              Based on public statements — not a voting record
            </div>
          </div>
          {rowsData.map(({ issue, score }) => (
            <AlignmentIssueRow
              key={issue.canonicalIssue}
              issue={issue}
              score={score}
              candidate={candidate}
              isOpen={expandedIssue === issue.canonicalIssue}
              onToggle={() => onToggleIssue(issue.canonicalIssue)}
              anonCtx={anonCtx}
            />
          ))}
        </div>
      );
    }

    // Case (c): no record + not loading → honest fallback
    return (
      <div className="cv2-issues">
        <div className="cv2-block-head">
          <div className="lab">Aligns with your issues</div>
        </div>
        <div className="cv2-norecord">
          {research &&
          (research.status === 'unavailable' ||
            (research.status === 'done' &&
              (!research.scores || research.scores.length === 0))) ? (
            // Research ran but found no citable public statements (the honesty
            // guard drops any source-less claims — common for county-level
            // candidates). Show the honest fallback, NOT a perpetual spinner.
            <>
              <p>We couldn't find citable public statements for this candidate on your issues.</p>
              <p>Judge instead on the candidate's own materials and the donor base below.</p>
            </>
          ) : isPending ? (
            <p>Looking up public statements on your issues…</p>
          ) : (
            <>
              <p>{reason}.</p>
              <p>Judge instead on the public statements they've made and the donor base below.</p>
            </>
          )}
        </div>
      </div>
    );
  }

  // Compute overall average % across the user's issues (only ones with scores)
  const rowsData = (userIssues || []).map(iss => {
    const score = getScoreForIssue(alignmentEntry, iss.canonicalIssue);
    return { issue: iss, score };
  });
  const scored = rowsData.filter(r => r.score && r.score.total > 0);
  const overallPct = scored.length
    ? Math.round(scored.reduce((s, r) => s + (r.score.kept / r.score.total) * 100, 0) / scored.length)
    : null;

  return (
    <div className="cv2-issues">
      <div className="cv2-block-head">
        <div className="lab">Aligns with your issues</div>
        {overallPct !== null && (
          <div className="overall"><b>{overallPct}%</b> avg</div>
        )}
      </div>

      {rowsData.map(({ issue, score }, i) => (
        <AlignmentIssueRow
          key={issue.canonicalIssue || issue.sourceText || i}
          issue={issue}
          score={score}
          candidate={candidate}
          isOpen={expandedIssue === issue.canonicalIssue}
          onToggle={() => onToggleIssue(issue.canonicalIssue)}
          anonCtx={anonCtx}
        />
      ))}
    </div>
  );
}

/* ── single row of the banner (private to AlignmentScoreBanner) ── */
function AlignmentIssueRow({ issue, score, candidate, isOpen, onToggle, anonCtx }) {
  // ── Pillar 2: web_search branch ──────────────────────────────────────────
  // web_search scores have no kept/total voting record. Instead we show a
  // directional indicator keyed to resolvedStance + confidence chip + evidence.
  // Visually distinct from voting_record bars (no %, no vote count).
  //
  // resolvedStance from the structured sub-agent is a 4-value enum:
  //   "in_favor"  → candidate supports the voter's issue   → ALIGNED (green)
  //   "opposed"   → candidate opposes the voter's issue    → OPPOSED (red)
  //   "mixed"     → mixed record                           → MIXED (neutral)
  //   "unclear"   → insufficient evidence                  → no direction badge
  if (score && score.sourceType === 'web_search') {
    const stance = (score.resolvedStance || '').toLowerCase();
    // Structured enum first; fall back to prose heuristic for legacy data.
    var directionLabel = null;
    var directionColor = 'oklch(0.55 0.05 260)'; // neutral blue
    if (stance === 'in_favor') {
      directionLabel = 'ALIGNED';
      directionColor = 'oklch(0.40 0.12 145)'; // green
    } else if (stance === 'opposed') {
      directionLabel = 'OPPOSED';
      directionColor = 'oklch(0.50 0.15 25)'; // red
    } else if (stance === 'mixed') {
      directionLabel = 'MIXED';
      // neutral — no strong directional signal
    } else if (stance === 'unclear') {
      directionLabel = null; // no direction badge — insufficient evidence
    } else {
      // Legacy prose fallback: scan for negative verbs
      var proseAligns = !/\b(oppos|against|repeal|block|ban|cut)\b/i.test(score.resolvedStance || '');
      directionLabel = proseAligns ? 'ALIGNED' : 'OPPOSED';
      directionColor = proseAligns ? 'oklch(0.40 0.12 145)' : 'oklch(0.50 0.15 25)';
    }
    const confidenceChip = score.confidence
      ? score.confidence.charAt(0).toUpperCase() + score.confidence.slice(1)
      : null;
    const evidenceLinks = (score.evidence || []).filter(e => e && e.url);
    const hasEvidence = evidenceLinks.length > 0;

    return (
      <div className="cv2-iss-row" data-testid="web-search-alignment-row">
        {/* Same grid structure as the voting_record path — topic left,
            directional badge right (replaces the % pct column). */}
        <div className="cv2-iss-head">
          <div className="topic">
            <div className="name">{issue.interpretation}</div>
            <div className="meta">
              {stance === 'in_favor' ? 'Supports this position'
                : stance === 'opposed' ? 'Opposes this position'
                : stance === 'mixed' ? 'Mixed record on this issue'
                : stance === 'unclear' ? 'Position unclear — limited public record'
                : score.resolvedStance}
            </div>
            {/* Evidence URLs inline below the meta — keeps the grid clean */}
            {hasEvidence && (anonCtx?.blindMode ? (
              // Blinded: the analysis (name-free) shows, but evidence URLs/summaries
              // can carry the candidate's name — hold them back until reveal.
              <div className="meta" style={{ marginTop: '4px', fontStyle: 'italic', opacity: 0.7 }}>
                Sources shown when you reveal the candidate
              </div>
            ) : (
              <div className="meta" style={{ marginTop: '4px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {evidenceLinks.map((ev, i) => (
                  <a
                    key={i}
                    href={ev.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cv2-evidence-link"
                    data-testid="web-search-evidence-link"
                  >
                    {ev.summary || `Source ${i + 1}`} →
                  </a>
                ))}
              </div>
            ))}
          </div>
          {/* Right column: directional badge + confidence chip, matching the
              position/size of the voting_record .pct column. */}
          <div className="cv2-ws-col">
            {directionLabel && (
              <span className="cv2-ws-badge" style={{ background: directionColor }}>
                {directionLabel}
              </span>
            )}
            {confidenceChip && (
              <span className="cv2-ws-conf">{confidenceChip} conf.</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── voting_record branch (original) ──────────────────────────────────────
  const pct = score && score.total > 0 ? Math.round((score.kept / score.total) * 100) : null;
  const tone = pct === null ? '' : pct >= 65 ? '' : pct >= 50 ? 'mid' : 'low';
  const hasVotes = !!(score?.contributingVotes?.length);

  return (
    <div className={"cv2-iss-row" + (isOpen ? " open" : "") + (hasVotes ? " has-drill" : "")} data-testid="voting-record-alignment-row">
      <button className="cv2-iss-head" onClick={hasVotes ? onToggle : undefined} aria-expanded={isOpen}>
        <div className="topic">
          <div className="name">{issue.interpretation}</div>
          <div className="cv2-bar">
            <div className={"fill " + tone} style={{ width: (pct || 0) + '%' }} />
          </div>
          {score && score.total > 0 ? (
            <div className="meta">
              Aligned on <b>{score.kept}</b> of <b>{score.total}</b> {score.total === 1 ? 'vote' : 'votes'}
              {hasVotes ? '' : ' · detail not yet curated'}
            </div>
          ) : (
            <div className="meta thin">Thin record on this issue</div>
          )}
        </div>
        <div className={"pct " + tone}>
          {pct !== null ? <>{pct}<small>%</small></> : <small>n/a</small>}
          {hasVotes && <span className="chev">{isOpen ? '▴' : '▾'}</span>}
        </div>
      </button>

      {score?.notice && (
        <div className="cv2-iss-notice" role="note" style={{
          fontSize: '11px',
          color: 'var(--ink-3, #888)',
          fontStyle: 'italic',
          padding: '2px 10px 6px',
        }}>
          {score.notice}
        </div>
      )}

      {isOpen && hasVotes && (
        <AlignmentDrilldown score={score} candidate={candidate} anonCtx={anonCtx} />
      )}
    </div>
  );
}

/* ============ AlignmentDrilldown ============
   Maps to: src/components/AlignmentDrilldown.tsx

   Repo today: bill title + voteCast badge + date + source chip.
   This prototype adds curated narrative paragraph (sourced from
   CAN2026 case files) and a "Issue PACs funding this candidate
   on this issue" callout — both marked [Δ].

   props:
     score:     AlignmentScore (canonicalIssue, issueLabel, kept, total,
                                contributingVotes[])
     candidate: RacePatternsCandidate (used to filter donorCoalition
                                       for issue-PAC callout) */
function AlignmentDrilldown({ score, candidate, anonCtx }) {
  const pct = score && score.total > 0 ? Math.round((score.kept / score.total) * 100) : 0;

  // [Δ] Find issue-PACs from this candidate's donorCoalition that
  // alignsWith this canonical issue.
  const issuePacs = (candidate.donorCoalition || []).filter(
    slice => slice.isIssuePAC && (slice.relevantToIssue === score.canonicalIssue || slice.alignsWith === score.canonicalIssue),
  );

  // Anonymize the candidate label used in "Issue PACs funding X on this"
  const candidateLabel = anonCtx?.blindMode
    ? (anonCtx.alias || 'this candidate')
    : candidate.name.split(' ').pop();

  return (
    <div className="cv2-drill">
      <div className="cv2-drill-head">
        <span className="lab">Why {pct}%?</span>
        <span className="meta">Tap a vote →</span>
      </div>

      <div className="cv2-votes">
        {score.contributingVotes.map((v, i) => (
          <ContributingVoteCard key={i} vote={v} anonCtx={anonCtx} />
        ))}
      </div>

      {issuePacs.length > 0 && (
        <div className="cv2-issue-pacs">
          <div className="lab">
            Issue PACs funding {candidateLabel} on this
          </div>
          {issuePacs.map((p, i) => (
            <div className="cv2-issue-pac" key={i}>
              <span className="sw" style={{ background: 'oklch(0.55 0.10 30)' }} />
              <span className="name">{p.label}</span>
              <span className="amt">{formatDollars(p.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── single curated vote card (private to AlignmentDrilldown) ── */
function ContributingVoteCard({ vote, anonCtx }) {
  const voteClass = vote.voteCast === 'with' ? 'yea' : vote.voteCast === 'against' ? 'nay' : 'other';
  const voteLabel = vote.voteCast === 'with' ? 'WITH YOU' : vote.voteCast === 'against' ? 'AGAINST YOU' : '—';
  const narrative = anonymizeText(vote.narrative, anonCtx);
  return (
    <div className="cv2-vote">
      <div className="cv2-vote-head">
        <div className="bill">
          {(() => {
            const hasNum = (vote.billTitle || '').includes(' · ');
            const billNum = hasNum ? vote.billTitle.split(' · ')[0] : '';
            const billTtl = hasNum ? vote.billTitle.split(' · ')[1] : (vote.billTitle || '');
            return (<><span className="num">{billNum}</span><span className="ttl">{billTtl}</span></>);
          })()}
        </div>
        <div className={"vote-badge " + voteClass}>{voteLabel}</div>
      </div>
      <div className="cv2-vote-date">{formatDate(vote.date)}</div>
      {narrative && <p className="cv2-vote-narr">{narrative}</p>}
      {/* Member rationale — synthesized from their press releases via congress-press.
          Label as stated/inferred; never present as verified fact.
          Attribution: congress-press by Derek Willis
          https://github.com/dwillis/congress-press (MIT) */}
      {vote.memberRationale && vote.memberRationale.text && (
        <div className="cv2-member-rationale">
          <div className="cv2-rationale-label">
            {vote.memberRationale.label === 'stated'
              ? "Member's stated reason"
              : "Member's inferred reason"}
          </div>
          <p className="cv2-rationale-text">{vote.memberRationale.text}</p>
          <div className="cv2-rationale-attribution">
            <span className="cv2-rationale-source-label">Based on their press release</span>
            {(vote.memberRationale.sourceUrls || []).slice(0, 2).map((url, si) => (
              <a
                key={si}
                href={url}
                className="cv2-rationale-source-link"
                target="_blank"
                rel="noopener noreferrer"
              >
                {si === 0 ? 'source' : `source ${si + 1}`} ↗
              </a>
            ))}
            <span className="cv2-rationale-dataset">
              via{' '}
              <a
                href="https://github.com/dwillis/congress-press"
                target="_blank"
                rel="noopener noreferrer"
                className="cv2-rationale-credit"
              >
                congress-press by Derek Willis
              </a>
            </span>
          </div>
        </div>
      )}
      <div className="cv2-vote-cite">
        <span className="src-chip">{vote.source.name}</span>
        {vote.source.url && (
          <a href={vote.source.url} className="src-link" target="_blank" rel="noopener noreferrer">
            View roll call →
          </a>
        )}
        {(vote.sources || []).filter(s => s.url !== vote.source.url).map((s, si) => (
          <span key={si}>
            <span className="src-chip">{s.name}</span>
            {s.url && (
              <a href={s.url} className="src-link" target="_blank" rel="noopener noreferrer">
                View summary →
              </a>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ============ FunderBars ============
   Maps to: src/components/FunderBars.tsx

   Repo today: renders donorCoalition as a stacked
   horizontal bar + a list of slices with $.

   This prototype adds two things, both marked [Δ]:
     1. fundingMix money-map (small / large / PAC)
     2. Named issue-PAC rows broken out from the rest
        of donorCoalition (via isIssuePAC flag)

   props:
     donorCoalition:    DonorBucketSlice[] | null
     totalRaised:       number | undefined
     donorDataSource:   "voting_record" | "web_search" | undefined
     donorSource:       SourceRef | undefined
     donorUnavailable:  { reason } | undefined
     fundingMix [Δ]:  { small, large, pac, total, cycle } | undefined */
function FunderBars({ donorCoalition, totalRaised, donorDataSource, donorSource, donorUnavailable, fundingMix, userIssues, peerTotals }) {
  if (!donorCoalition && donorUnavailable) {
    return (
      <div className="cv2-funding" data-testid="funding-unavailable">
        <div className="cv2-block-head"><div className="lab">Funding mix</div></div>
        <p style={{ fontSize: 14, color: 'var(--ink-3)', fontStyle: 'italic', margin: 0 }}>
          {donorUnavailable.reason}.
        </p>
      </div>
    );
  }
  if (!donorCoalition) return null;

  // Separate issue-PACs (named) from generic industry slices.
  const issuePACs = donorCoalition.filter(s => s.isIssuePAC);
  const industries = donorCoalition.filter(s => !s.isIssuePAC);
  const onlyTotalReceipts =
    !fundingMix &&
    issuePACs.length === 0 &&
    industries.length === 1 &&
    industries[0]?.label === 'total_receipts';

  if (onlyTotalReceipts) {
    const total = typeof totalRaised === 'number'
      ? totalRaised
      : industries[0]?.amount;
    return (
      <div className="cv2-funding" data-testid="funding-sparse">
        <div className="cv2-block-head">
          <div className="lab">Funding mix <small className="cv2-sub-lab">details pending</small></div>
          <div className="overall">
            {typeof total === 'number' && <b>{formatDollars(total)}</b>}
          </div>
        </div>
        <p style={{ fontSize: 14, color: 'var(--ink-3)', margin: 0 }}>
          Detailed donor breakdown is not available yet for this candidate. We have total receipts from filings, but not small donor, large donor, PAC, or sector buckets.
        </p>
        {donorSource && (
          <div style={{
            fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--ink-3)',
            letterSpacing: '0.04em', marginTop: 12, textAlign: 'left',
          }}>
            Source: {donorSource.name}
            {donorDataSource === 'web_search' && ' · web search'}
          </div>
        )}
      </div>
    );
  }

  // ── PAC partial-coverage math ─────────────────────────────
  // Three cases:
  //   • fully covered — named-PAC $ ≈ implied PAC total
  //   • partial      — we identify some, not all
  //   • zero         — we have nothing curated, but the candidate
  //                    still takes PAC money (the original gap case)
  const namedPacTotal = issuePACs.reduce((s, p) => s + (p.amount || 0), 0);
  const impliedPacTotal = fundingMix && typeof totalRaised === 'number'
    ? Math.round(totalRaised * (fundingMix.pac / 100))
    : null;
  const uncatPacTotal = impliedPacTotal !== null ? Math.max(0, impliedPacTotal - namedPacTotal) : null;
  const pctIdentified = impliedPacTotal && impliedPacTotal > 0
    ? Math.round((namedPacTotal / impliedPacTotal) * 100)
    : null;

  // Peer comparison — single source of truth (design-system core).
  // We keep the local peerCandidate/peerLabel names the render below
  // expects, but derive them from getPeerComparison so the thresholds
  // never drift from the Money-trail teaser.
  const peerCmp = getPeerComparison(totalRaised, peerTotals);
  const peerCandidate = peerCmp ? peerCmp.peer : null;
  const peerLabel = peerCmp ? { kind: peerCmp.kind, text: peerCmp.label } : null;
  // Scale: total widths in the head-to-head map are normalized to the LARGER of the two totals
  const peerScaleMax = peerCandidate ? Math.max(totalRaised, peerCandidate.total) : totalRaised;

  return (
    <div className="cv2-funding">
      <div className="cv2-block-head">
        <div className="lab">Funding mix <small className="cv2-sub-lab">by source type</small></div>
        <div className="overall">
          {/* When the comparison rails are active, the dollar totals
              live adjacent to their bars — so we drop $$ from the
              header to avoid duplicating it. Keep cycle metadata. */}
          {!(fundingMix && peerCandidate && peerLabel) && totalRaised !== undefined && <b>{formatDollars(totalRaised)}</b>}
          {!(fundingMix && peerCandidate && peerLabel) && totalRaised !== undefined && fundingMix?.cycle && <> · </>}
          {fundingMix?.cycle && <span className="cv2-cycle">{fundingMix.cycle}</span>}
        </div>
      </div>

      {/* [Δ] v4 — Comparison rails.
          Promotes the "X× more/less raised" signal from a tiny pill to a
          headline stat, AND adds a proportional ghost rail for the peer
          right below the main bar — same x-axis, same scale, so the
          length difference reads visually before you read the multiplier.
          The segmented mix-by-source bar is preserved untouched. */}
      {fundingMix && peerCandidate && peerLabel && (() => {
        const isMore = peerLabel.kind === 'more';
        const multiplier = isMore
          ? (totalRaised / peerCandidate.total).toFixed(1)
          : (peerCandidate.total / totalRaised).toFixed(1);
        const maxTotal = Math.max(totalRaised, peerCandidate.total);
        const thisPct = (totalRaised / maxTotal) * 100;
        const peerPct = (peerCandidate.total / maxTotal) * 100;
        // Show a % label only when the segment is wide enough on screen
        const showSegLabel = (segPct) => (segPct * thisPct / 100) >= 8;
        return (
          <div className={"cv2-compare-rails " + peerLabel.kind}>
            {/* Headline — typographic only.
                No arrows, no colored background: "more" / "less"
                is a neutral magnitude fact. Readers decide whether
                raising more (or less) is a good thing. */}
            <div className="cv2-cr-headline">
              <span className="cv2-cr-mult">{multiplier}×</span>
              <span className="cv2-cr-dir">{isMore ? 'MORE' : 'LESS'}</span>
              <span className="cv2-cr-ctx">raised than {peerCandidate.aliasOrName}</span>
            </div>
            <div className="cv2-cr-rail-row this">
              <span className="cv2-cr-total">{formatDollars(totalRaised)}</span>
              <div className="cv2-cr-rail-track">
                <div className="cv2-cr-rail this-rail" style={{ width: thisPct + '%' }} role="img" aria-label="Funding by source type">
                  <div className="seg small" style={{ flexBasis: fundingMix.small + '%' }}>
                    {showSegLabel(fundingMix.small) && <span className="pct">{fundingMix.small}%</span>}
                  </div>
                  <div className="seg large" style={{ flexBasis: fundingMix.large + '%' }}>
                    {showSegLabel(fundingMix.large) && <span className="pct">{fundingMix.large}%</span>}
                  </div>
                  <div className="seg pac" style={{ flexBasis: fundingMix.pac + '%' }}>
                    {showSegLabel(fundingMix.pac) && <span className="pct">{fundingMix.pac}%</span>}
                  </div>
                </div>
              </div>
            </div>
            <div className="cv2-cr-rail-row peer">
              <span className="cv2-cr-total">{formatDollars(peerCandidate.total)}</span>
              <div className="cv2-cr-rail-track">
                <div className="cv2-cr-rail peer-rail" style={{ width: peerPct + '%' }} aria-label={peerCandidate.aliasOrName + ' total raised'} role="img" />
              </div>
            </div>
            <div className="cv2-money-legend cv2-cr-legend">
              <div><span className="sw small" /> <b>{fundingMix.small}%</b> Small donors <small>&lt;$200</small></div>
              <div><span className="sw large" /> <b>{fundingMix.large}%</b> Large donors <small>≥$200</small></div>
              <div><span className="sw pac" /> <b>{fundingMix.pac}%</b> PACs <small>groups &amp; lobbies</small></div>
            </div>
            {/* PAC gloss — plain-English definition that explains both
                what a PAC is and why a high % matters. Always visible
                as a muted footnote, single line typographically. */}
            <p className="cv2-pac-gloss">
              <b>PAC</b> = Political Action Committee — companies, unions, or advocacy groups that pool donations to back candidates. High PAC share signals reliance on organized interests over individual voters.
            </p>
          </div>
        );
      })()}

      {/* Fallback: no peer to compare against — original single money map. */}
      {fundingMix && !(peerCandidate && peerLabel) && (
        <div className="cv2-money-map-wrap">
          <div className="cv2-money-map" role="img" aria-label="Funding by source type">
            <div className="seg small" style={{ flexBasis: fundingMix.small + '%' }}>
              {fundingMix.small >= 12 && <span className="pct">{fundingMix.small}%</span>}
            </div>
            <div className="seg large" style={{ flexBasis: fundingMix.large + '%' }}>
              {fundingMix.large >= 12 && <span className="pct">{fundingMix.large}%</span>}
            </div>
            <div className="seg pac" style={{ flexBasis: fundingMix.pac + '%' }}>
              {fundingMix.pac >= 12 && <span className="pct">{fundingMix.pac}%</span>}
            </div>
          </div>
          <div className="cv2-money-legend">
            <div><span className="sw small" /> <b>{fundingMix.small}%</b> Small donors <small>&lt;$200</small></div>
            <div><span className="sw large" /> <b>{fundingMix.large}%</b> Large donors <small>≥$200</small></div>
            <div><span className="sw pac" /> <b>{fundingMix.pac}%</b> PACs <small>groups &amp; lobbies</small></div>
          </div>
          <p className="cv2-pac-gloss">
            <b>PAC</b> = Political Action Committee — companies, unions, or advocacy groups that pool donations to back candidates. High PAC share signals reliance on organized interests over individual voters.
          </p>
        </div>
      )}

      {/* Named issue-PACs. Subtitle clarifies what this section is. */}
      {issuePACs.length > 0 && (
        <div className="cv2-named-pacs">
          <div className="lab">
            Named issue PACs
            <small className="cv2-sub-lab">organized groups we&rsquo;ve vetted, each with a publicly stated agenda</small>
          </div>
          {issuePACs.map((p, i) => {
            const relevantIssue = p.alignsWith || p.relevantToIssue;
            const userIssue = (userIssues || []).find(
              iss => iss.canonicalIssue === relevantIssue
            );
            const derivedPacStance = userIssue?.stance && p.issuePacStance
              ? (p.issuePacStance === userIssue.stance ? 'with' : 'against')
              : p.pacStance;
            const showAlignment = !!userIssue && !!derivedPacStance;
            const conflictsWithUser = showAlignment && derivedPacStance === 'against';
            return (
              <div className="cv2-pac-row v2" key={i}>
                <div className="cv2-pac-top">
                  <span className="sw" style={{ background: issuePACSwatch(relevantIssue) }} />
                  <span className="name">{p.label}</span>
                  <span className="amt">{formatDollars(p.amount)}</span>
                </div>
                {p.fullName && p.fullName !== p.label && (
                  <div className="cv2-pac-full">{p.fullName}</div>
                )}
                {p.advocates && (
                  <div className="cv2-pac-advocates">{p.advocates}</div>
                )}
                {showAlignment && (
                  <div className={"cv2-pac-flag " + (conflictsWithUser ? 'conflict' : 'align')}>
                    <span className="ic">{conflictsWithUser ? '⚠' : '✓'}</span>
                    <span className="msg">
                      {conflictsWithUser
                        ? <>Conflicts with your priority: <b>{userIssue.interpretation}</b></>
                        : <>Aligns with your priority: <b>{userIssue.interpretation}</b></>}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* [Δ] PAC coverage callout — moved BELOW the named PACs so readers
          first see what we DO have, then learn about what we don't. */}
      {impliedPacTotal !== null && impliedPacTotal > 0 && (
        issuePACs.length === 0 ? (
          <div className="cv2-pac-gap">
            <span className="ic">!</span>
            <span>
              About <b>{formatDollars(impliedPacTotal)}</b> ({fundingMix.pac}%) came from PACs,
              but we haven't yet identified specific issue-PACs behind that money.
              We only name PACs when we can attribute them to a public agenda
              — see the industry breakdown below for the categorical view.
            </span>
          </div>
        ) : pctIdentified !== null && pctIdentified < 75 ? (
          <div className="cv2-pac-gap partial">
            <span className="ic">!</span>
            <span>
              Named PACs above account for <b>{formatDollars(namedPacTotal)}</b> of
              an estimated <b>{formatDollars(impliedPacTotal)}</b> in total PAC money
              ({pctIdentified}%). The remaining <b>{formatDollars(uncatPacTotal)}</b> hasn't
              been editorially curated yet — it may include other issue-PACs we haven't profiled.
              Don't assume the named PACs are the whole picture.
            </span>
          </div>
        ) : null
      )}

      {/* Industry breakdown — same data but grouped differently.
          [Fix] Industries usually only cover the top sectors; the
          remainder is uncategorized small-dollar / unclassified donors.
          We now render that tail explicitly as a final "Unclassified"
          segment + row, so the bar reads as a true 100% and the gap
          isn't silently swallowed. */}
      {industries.length > 0 && (() => {
        const namedIndustryPct = industries.reduce((s, d) => s + (d.percent || 0), 0);
        const namedIndustryAmt = industries.reduce((s, d) => s + (d.amount || 0), 0);
        const otherPct = Math.max(0, 100 - namedIndustryPct);
        const otherAmt = typeof totalRaised === 'number'
          ? Math.max(0, totalRaised - namedIndustryAmt)
          : null;
        const showOther = otherPct >= 2;
        return (
          <div className="cv2-industry">
            <div className="lab">
              Industry breakdown
              <small className="cv2-sub-lab">all contributions grouped by sector (individuals + PACs combined)</small>
            </div>
            <div className="cv2-industry-bar" aria-hidden="true">
              {industries.map((d, i) => (
                <span key={i} style={{ flex: `${d.percent} 1 0`, background: industrySwatch(d.label) }} />
              ))}
              {showOther && (
                <span className="other-seg" style={{ flex: `${otherPct} 1 0` }} />
              )}
            </div>
            <div className="cv2-industry-list">
              {industries.slice(0, 4).map((d, i) => (
                <div className="row" key={i}>
                  <span className="sw" style={{ background: industrySwatch(d.label) }} />
                  <span className="name">{d.label}</span>
                  <span className="pct">{d.percent}%</span>
                  <span className="amt">{formatDollars(d.amount)}</span>
                </div>
              ))}
              {showOther && (
                <div className="row other" key="other">
                  <span className="sw other-sw" />
                  <span className="name">
                    Outside named sectors
                    <small>Mostly small-dollar &amp; individual donations that don&rsquo;t fit a single sector tag. They&rsquo;re counted in the Funding mix bar above.</small>
                  </span>
                  <span className="pct">{otherPct}%</span>
                  <span className="amt">{otherAmt !== null ? formatDollars(otherAmt) : '—'}</span>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {donorSource && (
        <div style={{
          fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--ink-3)',
          letterSpacing: '0.04em', marginTop: 12, textAlign: 'left',
        }}>
          Source: {donorSource.name}
          {donorDataSource === 'web_search' && ' · web search'}
        </div>
      )}
    </div>
  );
}

/* ── render helpers ── */
/* formatDollars + anonymizeText now live in prototype-shared.jsx
   (design-system core) so every surface uses one implementation.
   They're available here as bare globals. */

/* anonymizeText now lives in prototype-shared.jsx (design-system core). */
function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function issuePACSwatch(alignsWith) {
  const map = {
    healthcare_affordability: 'oklch(0.40 0.075 170)',
    reproductive_rights:      'oklch(0.50 0.16 320)',
    environment_climate:      'oklch(0.45 0.10 145)',
    foreign_policy:           'oklch(0.45 0.10 280)',
  };
  return map[alignsWith] || 'oklch(0.55 0.10 30)';
}
/* Industry colors are LABEL-keyed (not index-keyed) so the same
   sector reads the same color everywhere it appears across the
   app — Oil & Gas is always crude-rust, Banking is always navy,
   Healthcare is always sage-teal, etc. Unknown industries fall
   back to a stable hash-picked color from the fallback ring,
   so even uncatalogued sectors don't collide across rows. */
const INDUSTRY_COLORS = {
  'oil & gas':              'oklch(0.42 0.10 35)',    // dark crude
  'banking':                'oklch(0.38 0.10 250)',   // deep navy
  'real estate':            'oklch(0.58 0.06 65)',    // wheat
  'defense':                'oklch(0.42 0.06 115)',   // olive
  'trial lawyers':          'oklch(0.42 0.11 350)',   // burgundy
  'healthcare':             'oklch(0.50 0.09 175)',   // sage teal
  'healthcare workers':     'oklch(0.50 0.09 175)',
  'education':              'oklch(0.50 0.08 295)',   // mauve
  'education · nea':        'oklch(0.50 0.08 295)',
  'tech':                   'oklch(0.55 0.10 220)',   // sky blue
  'construction':           'oklch(0.55 0.10 55)',    // amber
  'energy':                 'oklch(0.62 0.12 90)',    // gold-yellow
  'grassroots small-dollar':'oklch(0.50 0.10 145)',   // meadow green
  'small business assoc':   'oklch(0.58 0.10 25)',    // terracotta
};
const INDUSTRY_FALLBACK = [
  'oklch(0.45 0.08 195)',   // dim cyan
  'oklch(0.50 0.08 330)',   // dusty rose
  'oklch(0.48 0.07 155)',   // moss
  'oklch(0.55 0.08 12)',    // brick
  'oklch(0.45 0.06 270)',   // indigo
  'oklch(0.60 0.08 95)',    // straw
];
function industrySwatch(label) {
  if (!label) return INDUSTRY_FALLBACK[0];
  const key = String(label).trim().toLowerCase();
  if (INDUSTRY_COLORS[key]) return INDUSTRY_COLORS[key];
  // Stable hash so unknown labels keep the same color across renders
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return INDUSTRY_FALLBACK[h % INDUSTRY_FALLBACK.length];
}

/* ============ PropositionCard ============
   No repo target yet — proposition rendering inside ChatPanel
   is freeform AI text today. Worth factoring out in Phase 4
   if propositions get richer than a yes/no toggle. */
function PropositionCard({ race, decision, onVote, onUnvote }) {
  const detail = PROPOSITION_DETAIL[race.id];

  // Judicial retention: one named judge, Yes = retain / No = remove.
  // No mock detail needed — show the question label and a static explanation.
  // A later packet (WP3) will add a similar no-detail branch for non-retention
  // measures using race.measureBody; keep the else-null below so that slot
  // stays clean.
  if (!detail && race.section === 'Judicial Retention') {
    return (
      <div className="prop-card" data-testid="judicial-retention">
        <div className="ttl">{race.label}</div>
        {/* NEEDS KEY: static retention explanation — translate when i18n lands */}
        <p className="sub">
          A retention vote asks whether this judge should stay in office.
          Vote <b>Yes</b> to keep them, <b>No</b> to remove them.
        </p>
        <div className="twobtn">
          <button
            className={decision === 'Yes' ? 'yes-picked' : ''}
            onClick={() => decision === 'Yes' ? onUnvote() : onVote('Yes')}
          >
            {decision === 'Yes' ? '☑ Yes' : 'Yes'}
          </button>
          <button
            className={decision === 'No' ? 'no-picked' : ''}
            onClick={() => decision === 'No' ? onUnvote() : onVote('No')}
          >
            {decision === 'No' ? '☑ No' : 'No'}
          </button>
        </div>
      </div>
    );
  }

  // Non-retention ballot measure with extracted body text (WP3).
  // Renders the official summary verbatim — no AI derivation, no If-yes/If-no grid.
  if (!detail && race.measureBody) {
    return (
      <div className="prop-card" data-testid="measure-body">
        <div className="ttl">{race.label}</div>
        <p className="sub" style={{ whiteSpace: 'pre-wrap' }}>{race.measureBody}</p>
        <div className="twobtn">
          <button
            className={decision === 'Yes' ? 'yes-picked' : ''}
            onClick={() => decision === 'Yes' ? onUnvote() : onVote('Yes')}
          >
            {decision === 'Yes' ? '☑ Yes' : 'Yes'}
          </button>
          <button
            className={decision === 'No' ? 'no-picked' : ''}
            onClick={() => decision === 'No' ? onUnvote() : onVote('No')}
          >
            {decision === 'No' ? '☑ No' : 'No'}
          </button>
        </div>
      </div>
    );
  }

  if (!detail) return null;
  const kindMeta = (window.PROPOSITION_KIND_META || {})[detail.kind] || null;
  return (
    <div className="prop-card">
      <div className="ttl">{race.label}</div>

      {/* Kind banner — the load-bearing thing for binding vs advisory.
          Tone-color flips so advisory looks visually distinct. */}
      {kindMeta && (
        <div className={"prop-kind " + kindMeta.tone}>
          <div className="prop-kind-head">
            <span className="prop-kind-tag">{kindMeta.label}</span>
            {detail.state && <span className="prop-kind-state">{detail.state}</span>}
          </div>
          <p className="prop-kind-blurb">{kindMeta.blurb}</p>
        </div>
      )}

      <p className="sub">{detail.summary}</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13 }}>
        <div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--civic)', marginBottom: 4 }}>If yes</div>
          <div style={{ color: 'var(--ink-2)', lineHeight: 1.5 }}>{detail.ifYes}</div>
        </div>
        <div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--vote-red)', marginBottom: 4 }}>If no</div>
          <div style={{ color: 'var(--ink-2)', lineHeight: 1.5 }}>{detail.ifNo}</div>
        </div>
      </div>

      <div className="twobtn">
        <button
          className={decision === 'Yes' ? 'yes-picked' : ''}
          onClick={() => decision === 'Yes' ? onUnvote() : onVote('Yes')}
        >
          {decision === 'Yes' ? '☑ Yes' : 'Yes'}
        </button>
        <button
          className={decision === 'No' ? 'no-picked' : ''}
          onClick={() => decision === 'No' ? onUnvote() : onVote('No')}
        >
          {decision === 'No' ? '☑ No' : 'No'}
        </button>
      </div>
    </div>
  );
}

/* ============ BallotPane ============
   Maps to: src/components/BallotPane.tsx (already shipped).

   No structural changes from the repo today other than that
   this prototype lets ballot rows be clickable to focus the
   chat — see the data-cursor parity comment in
   COMPONENT_MAP.md (rows are cursor:default in the repo, this
   prototype makes them tappable because tapping is the only
   way to open the chat on mobile in Pattern B). */
function BallotPane({ races, decisions, activeRaceId, address, onSelectRace, onPrint, onSaveProfile, onContinueElsewhere }) {
  const decidedCount = Object.keys(decisions).length;
  const totalCount = races.length;
  const canPrint = decidedCount > 0;

  const sections = {};
  races.forEach(r => {
    if (!sections[r.section]) sections[r.section] = [];
    sections[r.section].push(r);
  });

  return (
    <aside className="ws-ballot">
      <div className="b-head">
        <div className="row">
          <h3>Your ballot</h3>
          <span className="sub">{decidedCount}/{totalCount} · Draft</span>
        </div>
        <address>{address || '—'}</address>
      </div>

      <div className="b-list">
        {Object.entries(sections).map(([section, rs]) => (
          <div key={section}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--ink-3)', padding: '14px 0 4px' }}>{section}</div>
            {rs.map(r => {
              const d = decisions[r.id];
              const isActive = r.id === activeRaceId;
              const isDone = !!d;
              return (
                <div
                  key={r.id}
                  className={"b-row " + (isDone ? "done " : "pending ") + (isActive ? "active " : "")}
                  onClick={() => onSelectRace(r.id)}
                >
                  <div className="ck" />
                  <div>
                    <div className="race">{r.label}</div>
                    <div className="pick">{isDone ? (d.pick + (d.party ? ' (' + d.party + ')' : '')) : (isActive ? 'Deciding now…' : 'Not yet decided')}</div>
                    {d && d.why && <div className="why">"{d.why}"</div>}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="b-foot">
        <button className="primary" disabled={!canPrint} onClick={onPrint}>
          <span>Print my ballot (PDF)</span><span className="arrow">→</span>
        </button>
        <button onClick={onSaveProfile}>
          <span>Save my voting plan (.txt)</span><span className="arrow">↓</span>
        </button>
        <small className="b-foot-note">Your issues and picks — no personal info collected.</small>
        <button onClick={onContinueElsewhere}>
          <span>Continue in another chatbot</span><span className="arrow">↗</span>
        </button>
      </div>
    </aside>
  );
}

/* ============ TweaksPanel ============
   Prototype-only. Not present in the repo.
   Used to A/B the design tokens during early design exploration. */
function TweaksPanel({ tweaks, onChange, hidden, onClose }) {
  const blurbs = {
    'civic|civic|daylight':              'DEFAULT — Plex Serif, civic teal, cream paper.',
    'civic|civic|inkwell':               'Civic, after hours.',
    'civic|constitutional|daylight':     'Plex Serif + navy. Treasury document.',
    'editorial|civic|daylight':          'Editorial serif, teal accent, cream paper.',
    'editorial|civic|inkwell':           'Editorial on ink.',
    'manifesto|civic|daylight':          'Space Grotesk, all-caps, red underline.',
  };
  const key = tweaks.mood + '|' + tweaks.palette + '|' + tweaks.treatment;
  const label = (tweaks.mood[0].toUpperCase() + tweaks.mood.slice(1)) + ' · ' +
    ({civic:'Civic green',constitutional:'Const. ink',newsprint:'Newsprint'})[tweaks.palette] + ' · ' +
    (tweaks.treatment[0].toUpperCase() + tweaks.treatment.slice(1));

  if (hidden) return null;

  return (
    <aside className="tweaks">
      <header>
        <h4>Tweaks</h4>
        <button className="close" onClick={onClose}>×</button>
      </header>
      <div className="body-inner">
        <div className="row">
          <label>Type mood</label>
          <div className="seg">
            <button className={tweaks.mood === 'editorial' ? 'active' : ''} onClick={() => onChange({ mood: 'editorial' })}>Editorial</button>
            <button className={tweaks.mood === 'civic' ? 'active' : ''} onClick={() => onChange({ mood: 'civic' })}>Civic</button>
            <button className={tweaks.mood === 'manifesto' ? 'active' : ''} onClick={() => onChange({ mood: 'manifesto' })}>Manifesto</button>
          </div>
        </div>
        <div className="row">
          <label>Palette</label>
          <div className="seg">
            <button className={tweaks.palette === 'civic' ? 'active' : ''} onClick={() => onChange({ palette: 'civic' })}>Civic green</button>
            <button className={tweaks.palette === 'constitutional' ? 'active' : ''} onClick={() => onChange({ palette: 'constitutional' })}>Const. ink</button>
            <button className={tweaks.palette === 'newsprint' ? 'active' : ''} onClick={() => onChange({ palette: 'newsprint' })}>Newsprint</button>
          </div>
        </div>
        <div className="row">
          <label>Treatment</label>
          <div className="seg two">
            <button className={tweaks.treatment === 'daylight' ? 'active' : ''} onClick={() => onChange({ treatment: 'daylight' })}>Daylight</button>
            <button className={tweaks.treatment === 'inkwell' ? 'active' : ''} onClick={() => onChange({ treatment: 'inkwell' })}>Inkwell</button>
          </div>
        </div>
        <div className="hint"><b>{label}</b><span> — {blurbs[key] || 'explore.'}</span></div>
      </div>
    </aside>
  );
}

Object.assign(window, {
  AppNav,
  IssueRow,
  CandidateCard,
  CandidateCardHeader,
  AlignmentScoreBanner,
  AlignmentDrilldown,
  FunderBars,
  FundingMixBars,
  PropositionCard,
  BallotPane,
  TweaksPanel,
});

/* ==================== prototype-components-c.jsx ==================== */
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
    if (daysLeft < 0) return t('deadline.passed');
    if (daysLeft === 0) return t('deadline.today');
    return t('deadline.daysLeft', { n: daysLeft });
  }
  function fmtDate(iso) {
    const d = new Date(iso + 'T00:00:00');
    if (isNaN(d)) return iso;
    return d.toLocaleDateString(lang === 'es' ? 'es-US' : 'en-US', {
      month: 'short', day: 'numeric',
    });
  }

  return (
    <ul className={"dl-meter" + (compact ? ' compact' : '') + (stacked ? ' stacked' : '')} aria-label="Election deadlines">
      {rows.map(row => (
        <li key={row.labelKey} className={"dl-row " + row.color}>
          <div className="dl-dot" aria-hidden="true" />
          <div className="dl-text">
            <div className="dl-lab">{t(row.labelKey)}</div>
            <div className="dl-date">{fmtDate(row.date)}</div>
          </div>
          <div className="dl-status" aria-label={fmtLabel(row.daysLeft)}>{fmtLabel(row.daysLeft)}</div>
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
          <div className="poll-card-eyebrow">{t('polling.cardTitle')}</div>
          <h3 id="poll-card-ttl">{pollingInfo.name}</h3>
        </div>
        {compact && (
          <button
            className="poll-card-toggle"
            onClick={() => setExpanded(e => !e)}
            aria-expanded={expanded}
            aria-controls="poll-card-body"
          >
            {expanded ? '▴' : '▾'}
          </button>
        )}
      </header>

      {expanded && (
        <>
          <div className="poll-card-grid" id="poll-card-body">
            <div className="poll-cell">
              <div className="k">{t('polling.precinct')}</div>
              <div className="v">{pollingInfo.precinct}</div>
            </div>
            <div className="poll-cell">
              <div className="k">{t('polling.hours')}</div>
              <div className="v">{pollingInfo.hours}</div>
            </div>
            <div className="poll-cell wide">
              <div className="k">Address</div>
              <div className="v">{pollingInfo.address}</div>
            </div>
            <div className="poll-cell">
              <div className="k">{t('polling.bring')}</div>
              <div className="v">{pollingInfo.bring}</div>
            </div>
            <div className="poll-cell">
              <div className="k">{t('polling.earlyVotingWindow')}</div>
              <div className="v">{pollingInfo.earlyWindow}</div>
            </div>
          </div>

          <div className="poll-card-deadlines">
            <DeadlineMeter rows={rows} compact={false} stacked={true} />
          </div>

          <div className="poll-card-actions">
            <a className="poll-link" href={stateData.resources.pollingPlaceLookup} target="_blank" rel="noopener noreferrer">{t('polling.directions')} →</a>
            <a className="poll-link" href={stateData.registration.registrationCheckUrl} target="_blank" rel="noopener noreferrer">{t('deadline.checkRegistration')}</a>
            <button className="poll-link" onClick={() => downloadIcsForElection(stateData)}>
              {t('polling.addedToCalendar')} ↓
            </button>
          </div>

          <footer className="poll-card-foot">
            <small>{t('polling.cardSource')}</small>
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
  // Always export the UPCOMING election — elections[0] is whatever the
  // JSON lists first (often a past primary).
  const el = findUpcomingElection(stateData.elections) || stateData.elections[0];
  if (!el) return;
  const date = el.date.replace(/-/g, '');
  const acceptedId = stateData.votingRules.acceptedIds?.[0] || 'photo ID';
  const placeLine = pollingInfo?.name && pollingInfo?.address
    ? `Polling place: ${pollingInfo.name} — ${pollingInfo.address}`
    : (pollingInfo?.address ? `Polling place: ${pollingInfo.address}` : '');
  const description = [
    placeLine,
    pollingInfo?.hours ? `Hours: ${pollingInfo.hours}` : '',
    `Bring: ${acceptedId}`,
    '',
    'Drafted on Voter Choice.',
  ].filter(Boolean).join('\\n');

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Voter Choice//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:vc-${el.id}@voterchoice.app`,
    `DTSTAMP:${date}T120000Z`,
    `DTSTART;VALUE=DATE:${date}`,
    `SUMMARY:Vote — ${el.name}`,
    pollingInfo?.address ? `LOCATION:${pollingInfo.address}` : '',
    `DESCRIPTION:${description}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'TRIGGER:-PT12H',
    'DESCRIPTION:Election Day tomorrow — bring your ID',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');
  const blob = new Blob([ics], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'election-day.ics';
  document.body.appendChild(a); a.click(); a.remove();
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
    <aside className="resume-nudge" role="region" aria-label="Resume your session">
      <div className="rn-badge">{t('landing.returningBadge')}</div>
      <h3 className="rn-headline">{t('landing.returningHeadline')}</h3>
      <p className="rn-sub">
        {t('landing.returningSubtext', { decided, total: totalRaces })}
      </p>
      <div className="rn-actions">
        <button className="rn-resume" onClick={onResume}>{t('landing.returningResume')}</button>
        <button className="rn-over" onClick={onStartOver}>{t('landing.returningStartOver')}</button>
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
          <div className="eyebrow">{t('landing.howItWorksTitle')}</div>
          <h2 id="hiw-title">From address to printed ballot in three steps.</h2>
          <p className="hiw-sub">{t('landing.howItWorksSubtext')}</p>
        </header>
        <ol className="hiw-steps">
          {[1, 2, 3].map(n => (
            <li key={n} className="hiw-step">
              <div className="hiw-num">{String(n).padStart(2, '0')}</div>
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
function ErrorBanner({ tone = 'warn', title, body, primary, secondary, onClose }) {
  return (
    <div className={"err-banner " + tone} role="alert">
      <div className="err-icon" aria-hidden="true">{tone === 'error' ? '⨯' : '!'}</div>
      <div className="err-body">
        {title && <div className="err-title">{title}</div>}
        {body && <div className="err-text">{body}</div>}
        {(primary || secondary) && (
          <div className="err-actions">
            {primary && <button className="err-primary" onClick={primary.onClick}>{primary.label}</button>}
            {secondary && <button className="err-secondary" onClick={secondary.onClick}>{secondary.label}</button>}
          </div>
        )}
      </div>
      {onClose && (
        <button className="err-close" onClick={onClose} aria-label="Dismiss">×</button>
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
      onClick={() => setLang(lang === 'en' ? 'es' : 'en')}
      aria-label={lang === 'en' ? 'Switch to Spanish' : 'Cambiar a inglés'}
      title={lang === 'en' ? 'Cambiar a español' : 'Switch to English'}
    >
      <span className={"lang-pip " + (lang === 'en' ? 'on' : 'off')}>EN</span>
      <span className="lang-sep" aria-hidden="true">·</span>
      <span className={"lang-pip " + (lang === 'es' ? 'on' : 'off')}>ES</span>
    </button>
  );
}

/* ============ AppNav (overridden — adds Settings + LanguageToggle) ============
   The base AppNav lives in prototype-components.jsx. This override
   wraps it to add the Settings cog and wire the language toggle.
   In the repo, this overlay lives on Navigation.tsx as additional
   children. */
function AppNavWithChrome({ onBrandClick, onOpenSettings, current, onNavigate }) {
  const { t } = useI18n();
  return (
    <nav className="app-nav" data-current={current || 'app'}>
      <div className="brand" onClick={onBrandClick} role="link" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' && onBrandClick) onBrandClick(); }}>
        <span className="mark" aria-hidden="true">V</span>
        <span>Voter Choice</span>
      </div>
      <div className="links">
        <a onClick={() => onNavigate && onNavigate('howitworks')} role="link" tabIndex={0}>{t('nav.howItWorks')}</a>
        <a onClick={() => onNavigate && onNavigate('methodology')} role="link" tabIndex={0}>{t('nav.methodology')}</a>
        <a onClick={() => onNavigate && onNavigate('about')} role="link" tabIndex={0}>{t('nav.about')}</a>
        <a onClick={() => onNavigate && onNavigate('privacy')} role="link" tabIndex={0}>{t('nav.privacy')}</a>
        <a href="mailto:muxin.li.pro@gmail.com">{t('nav.support')}</a>
      </div>
      <div className="nav-right">
        <LanguageToggle />
        <a className="nav-tip" onClick={() => onNavigate && onNavigate('tip')} role="link" tabIndex={0}>{t('nav.tipJar')}</a>
        <button className="nav-cog" onClick={onOpenSettings} aria-label={t('nav.settings')} title={t('nav.settings')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
  const electionRow = rows.find(r => r.labelKey === 'deadline.electionDay');
  const days = electionRow ? electionRow.daysLeft : null;

  // Source: stateData.votingRules.acceptedIds (StateElectionData).
  // We show the full list — the user has to actually bring one of these,
  // so "TX driver license + 6 more" isn't helpful. Compact list inline,
  // with a show-more affordance if there are >3 items.
  const acceptedIds = stateData.votingRules.acceptedIds || [];
  const PREVIEW_COUNT = 3;
  const visibleIds = idsExpanded ? acceptedIds : acceptedIds.slice(0, PREVIEW_COUNT);
  const hiddenCount = acceptedIds.length - PREVIEW_COUNT;

  // Derived: early-voting window from stateData.earlyVoting
  function fmtRange(startISO, endISO) {
    const opts = { month: 'short', day: 'numeric' };
    const locale = lang === 'es' ? 'es-US' : 'en-US';
    const start = new Date(startISO + 'T00:00:00').toLocaleDateString(locale, opts);
    const end   = new Date(endISO   + 'T00:00:00').toLocaleDateString(locale, opts);
    return `${start} – ${end}`;
  }
  const earlyWindowText = stateData.earlyVoting.available
    ? fmtRange(stateData.earlyVoting.startDate, stateData.earlyVoting.endDate)
    : 'Not available';

  const countdownText = days == null
    ? t('deadline.electionDay')
    : days < 0
      ? t('deadline.passed')
      : days === 0
        ? t('deadline.today')
        : (lang === 'es'
            ? `${days} días para el día de elecciones`
            : `${days} days until Election Day`);

  return (
    <div className={"poll-bar " + (open ? 'open' : '')}>
      <button className="poll-bar-inner" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <div className="pb-left">
          <span className="pb-pin" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </span>
          <span className="pb-name">{pollingInfo.name}</span>
          {pollingInfo.precinct && (
            <>
              <span className="pb-sep" aria-hidden="true">·</span>
              <span className="pb-precinct">Precinct {pollingInfo.precinct}</span>
            </>
          )}
          {pollingInfo.district && (
            <>
              <span className="pb-sep" aria-hidden="true">·</span>
              <span className="pb-district" data-testid="district-label">{pollingInfo.district}</span>
            </>
          )}
        </div>
        <div className="pb-right">
          <span className={"pb-count " + (electionRow ? electionRow.color : '')}>
            <span className="pb-count-dot" aria-hidden="true"></span>
            {countdownText}
          </span>
          <span className="pb-toggle" aria-hidden="true">{open ? 'Hide details ▴' : 'Details ▾'}</span>
        </div>
      </button>

      {open && (
        <div className="poll-bar-panel" role="region" aria-label={t('polling.cardTitle')}>
          {/* Primary actions row — visible immediately when expanded.
              Was previously buried at the bottom of the panel; promoted
              here so the user can find them without scanning. */}
          <div className="pbp-actions">
            <a className="pbp-act" href={stateData.registration.registrationCheckUrl} target="_blank" rel="noopener noreferrer">
              <span className="pbp-act-ico" aria-hidden="true">✓</span>
              {t('deadline.checkRegistration')}
            </a>
            <button className="pbp-act" onClick={() => downloadIcsForElection(stateData, pollingInfo)}>
              <span className="pbp-act-ico" aria-hidden="true">↓</span>
              {t('polling.addedToCalendar')}
            </button>
            {pollingInfo.address ? (
              <a
                className="pbp-act"
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(pollingInfo.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                title={`Directions to ${pollingInfo.name}`}
              >
                <span className="pbp-act-ico" aria-hidden="true">→</span>
                {t('polling.directions')}
              </a>
            ) : (
              // No civic polling place → link to the real per-state lookup
              // (county/state site), never the vote.gov register-only page.
              <a
                className="pbp-act"
                href={stateData.resources?.pollingPlaceLookup || stateData.resources?.countyElectionLookup || stateData.resources?.stateElectionWebsite || 'https://vote.gov/'}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="pbp-act-ico" aria-hidden="true">→</span>
                Find your polling place
              </a>
            )}
            <span className="pbp-source">{t('polling.cardSource')}</span>
          </div>

          <div className="pbp-grid">
            <div className="pbp-cell">
              <div className="pbp-k">Address</div>
              <div className="pbp-v">{pollingInfo.address}</div>
              {pollingInfo.notes && <div className="pbp-sub">{pollingInfo.notes}</div>}
            </div>
            <div className="pbp-cell">
              <div className="pbp-k">{t('polling.hours')}</div>
              <div className="pbp-v">{pollingInfo.hours}</div>
              <div className="pbp-sub">{t('polling.earlyVotingWindow')}: {earlyWindowText}</div>
            </div>
            <div className="pbp-cell">
              <div className="pbp-k">{t('polling.bring')}</div>
              <div className="pbp-v pbp-bring">
                {!stateData.votingRules.idRequired ? (
                  <span>{stateData.votingRules.idNote || 'No ID required for most voters.'}</span>
                ) : acceptedIds.length > 0 ? (
                  <>
                    <span className="pbp-bring-lead">Any one of these:</span>
                    <ul className="pbp-bring-list">
                      {visibleIds.map(id => (
                        <li key={id}>{id}</li>
                      ))}
                    </ul>
                    {hiddenCount > 0 && (
                      <button
                        type="button"
                        className="pbp-bring-toggle"
                        onClick={(e) => { e.stopPropagation(); setIdsExpanded(v => !v); }}
                      >
                        {idsExpanded ? 'Show fewer ▴' : `Show ${hiddenCount} more accepted IDs ▾`}
                      </button>
                    )}
                  </>
                ) : (
                  <span>{stateData.votingRules.idNote || 'ID required.'} Confirm the accepted-ID list at your state election office.</span>
                )}
              </div>
              {stateData.votingRules?.phonesAtPollsDetail && (
                <div className="pbp-sub">{stateData.votingRules.phonesAtPollsDetail}</div>
              )}
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

/* ==================== prototype-screens.jsx ==================== */
/* ====================================================
   VOTER CHOICE · Pass B screens
   ====================================================
   New screens + dialogs that complete the interaction set.
   Each is a small standalone component the host view mounts
   conditionally. See COMPONENT_MAP.md for repo targets.
   ==================================================== */

const { useState: useStateS, useEffect: useEffectS, useRef: useRefS } = React;

/* ============ PartyGate ============
   Maps to: src/components/PartyGate.tsx (Phase 5)

   Repo behavior: shown when the user's state has a closed or
   semi-closed primary with party-lock-to-first-round-primary
   rules — i.e. picking a party in Round 1 locks the voter into
   that party for runoffs.

   Behavior is "advisory" (offer a skip) or "blocking" (must
   pick). This demo treats it as advisory.

   Demo trigger: the Tweaks panel has a "Show party gate" toggle
   (added below) so the screen is reachable end-to-end without
   changing the demo election to a primary. */
function PartyGate({ stateName, electionDate, rule, onPick, onSkip }) {
  // Rule-driven copy (src/lib/state-rules): closed → registered-party only;
  // semi-closed → unaffiliated voters may choose; runoff rows → party-lock.
  // The gate only renders when a rule row exists, but keep a generic
  // fallback lede so a missing rule can never produce broken copy.
  const ruleLede = (() => {
    if (!rule) return null;
    if (rule.electionType === 'runoff') {
      return <>This runoff is <b>party-locked</b>: if you voted in a party's first-round primary, you may only vote in that party's runoff. Pick the runoff you're eligible for and we'll research those races.</>;
    }
    if (rule.category === 'closed') {
      return <>{stateName || 'Your state'} holds <b>closed primaries</b> — you vote in the primary of the party you're registered with. Pick your registered party and we'll research those races. The general election is unaffected.</>;
    }
    if (rule.category === 'semi-closed') {
      return <>{stateName || 'Your state'} holds <b>semi-closed primaries</b> — registered party members vote their own party's primary; unaffiliated voters may choose one. Pick the primary you'll vote in and we'll research those races. The general election is unaffected.</>;
    }
    return null;
  })();
  return (
    <>
      <AppNav />
      <div className="pg-wrap">
        <div className="pg-card">
          <div className="pg-eyebrow">{stateName || 'Primary'} primary{electionDate ? ' · ' + electionDate : ''}</div>
          <h2>Pick a party to research.</h2>
          <p className="pg-lede">
            {ruleLede ?? (
              <>Your ballot includes <b>both parties' primary contests</b>. A primary is party-specific — choose the primary you're eligible to vote in and we'll research only those races. The general election is unaffected.</>
            )}
          </p>

          <div className="pg-options">
            <button className="pg-opt dem" onClick={() => onPick('Democratic')}>
              <div className="pg-pip" />
              <div className="pg-l">
                <div className="pg-ttl">Democratic primary</div>
                <div className="pg-sub">Research the Democratic races on your ballot.</div>
              </div>
              <span className="pg-arrow">→</span>
            </button>
            <button className="pg-opt rep" onClick={() => onPick('Republican')}>
              <div className="pg-pip" />
              <div className="pg-l">
                <div className="pg-ttl">Republican primary</div>
                <div className="pg-sub">Research the Republican races on your ballot.</div>
              </div>
              <span className="pg-arrow">→</span>
            </button>
            <button className="pg-opt nope" onClick={onSkip}>
              <div className="pg-l">
                <div className="pg-ttl">Show me everything</div>
                <div className="pg-sub">Don't filter — research all races on the ballot.</div>
              </div>
              <span className="pg-arrow">→</span>
            </button>
          </div>

          {rule?.unaffiliatedPath && (
            <p className="pg-foot">
              {rule.unaffiliatedPath.message}{' '}
              <a href={rule.unaffiliatedPath.reregistrationUrl} target="_blank" rel="noopener noreferrer" className="pg-src">Update your registration</a>
            </p>
          )}
          <p className="pg-foot">
            {rule?.statute ? (
              <>
                {rule.statute.text}{' '}
                {rule.statute.url ? (
                  <a href={rule.statute.url} target="_blank" rel="noopener noreferrer" className="pg-src">({rule.statute.code})</a>
                ) : (
                  <>({rule.statute.code})</>
                )}
              </>
            ) : (
              <>Eligibility rules vary by state.</>
            )}{' '}
            {rule?.externalResources?.sosVoterLookupUrl ? (
              <>Unsure? <a href={rule.externalResources.sosVoterLookupUrl} target="_blank" rel="noopener noreferrer" className="pg-src">Look up your registration</a>.</>
            ) : (
              <>Check your <a href="https://vote.gov/" target="_blank" rel="noopener noreferrer" className="pg-src">state election office</a> if you're unsure which primary you can vote in.</>
            )}
          </p>
        </div>
      </div>
    </>
  );
}

/* ============ AmendmentEditor ============
   Maps to: ConcernInterpretation.tsx + AmendRescoreOffer.tsx (Phase 6)

   Shown as an inline overlay inside the workspace when the user
   clicks "Edit" on the issues list in the left rail. Unlike the
   cold open, this version preserves all decided picks and shows
   how many would be affected by an issue change.

   Submit triggers `onApply(newIssues)` → host runs the rescore
   and shows AmendDeltaMessage in the chat. */
function AmendmentEditor({ issues, decisionsCount, onApply, onCancel }) {
  const [draft, setDraft] = useStateS(issues.map(i => ({ ...i })));
  const [newIssueText, setNewIssueText] = useStateS('');

  function move(idx, dir) {
    const next = [...draft];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    next.forEach((it, i) => { it.rank = i + 1; });
    setDraft(next);
  }
  function rename(idx, interpretation) {
    const next = [...draft];
    next[idx] = { ...next[idx], interpretation };
    setDraft(next);
  }
  function remove(idx) {
    const next = draft.filter((_, i) => i !== idx);
    next.forEach((it, i) => { it.rank = i + 1; });
    setDraft(next);
  }
  /* Multi-slot reorder for the drag handle (same as cold-open). */
  function reorderDraft(from, to) {
    if (from === to) return;
    const next = [...draft];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    next.forEach((it, i) => { it.rank = i + 1; });
    setDraft(next);
  }
  function addNew() {
    if (!newIssueText.trim()) return;
    const next = [...draft, {
      sourceType: 'freeText',
      sourceText: newIssueText.trim(),
      rank: draft.length + 1,
      interpretation: newIssueText.trim(),
      // Heuristic: map to a canonical issue we have data for. Real app would
      // round-trip through the AI for canonicalIssue assignment.
      canonicalIssue: guessCanonicalIssue(newIssueText.trim()),
      stance: '',
      confidence: 'clear',
      quotes: [{ label: 'just added', text: newIssueText.trim() }],
    }];
    setDraft(next);
    setNewIssueText('');
  }

  return (
    <div className="amend-modal">
      <div className="amend-card">
        <header className="amend-head">
          <div>
            <div className="amend-eyebrow">Edit your issues</div>
            <h3>Re-evaluate {decisionsCount} {decisionsCount === 1 ? 'pick' : 'picks'} against new priorities</h3>
          </div>
          <button className="amend-x" onClick={onCancel} aria-label="Close">×</button>
        </header>

        <p className="amend-help">
          Re-rank, rename, remove, or add issues. When you save, I'll re-score every candidate you've already picked and surface any whose score shifts past the noise floor.
        </p>

        <div className="amend-list">
          {draft.map((iss, i) => (
            <IssueRow
              key={iss.canonicalIssue || iss.sourceText || i}
              issue={iss}
              index={i}
              total={draft.length}
              onMoveUp={() => move(i, -1)}
              onMoveDown={() => move(i, 1)}
              onReorderTo={reorderDraft}
              onRename={(name) => rename(i, name)}
              onRemove={() => remove(i)}
            />
          ))}
        </div>

        <div className="amend-add">
          <input
            type="text"
            placeholder="Add a new issue — e.g. clean energy permitting, school book bans, immigration enforcement…"
            value={newIssueText}
            onChange={(e) => setNewIssueText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addNew(); }}
          />
          <button className="amend-add-btn" disabled={!newIssueText.trim()} onClick={addNew}>+ Add</button>
        </div>

        <footer className="amend-foot">
          <button className="amend-cancel" onClick={onCancel}>Cancel</button>
          <button className="amend-apply" disabled={draft.length === 0} onClick={() => onApply(draft)}>
            Apply &amp; re-score →
          </button>
        </footer>
      </div>
    </div>
  );
}

// Quick heuristic mapping for the demo. Real app: AI extraction.
function guessCanonicalIssue(text) {
  const t = text.toLowerCase();
  if (/insulin|drug|medicare|health|hospital/.test(t)) return 'healthcare_affordability';
  if (/rent|housing|cost of living|mortgage/.test(t)) return 'housing_affordability';
  if (/stock|disclosure|congress|trading|term limits/.test(t)) return 'congressional_accountability';
  if (/climate|environment|carbon|emissions/.test(t)) return 'environment_climate';
  if (/abortion|reproductive|roe/.test(t)) return 'reproductive_rights';
  if (/gun|firearm|second amendment/.test(t)) return 'gun_rights_safety';
  if (/immigration|border|asylum/.test(t)) return 'immigration';
  if (/school|education|teacher/.test(t)) return 'education_funding';
  // Fallback — would surface as "Thin record on this issue" everywhere
  return 'unrecognized_issue';
}

/* ============ AmendDeltaMessage ============
   Maps to: src/components/AmendDeltaMessage.tsx (Phase 6)

   A chat bubble inserted after an amend. Lists the races whose
   aggregate alignment % shifted by more than the noise floor.
   Each row has a "Revisit" link that jumps to that race. */
function AmendDeltaMessage({ deltas, onRevisit }) {
  return (
    <div className="msg ai">
      <div className="who">Voter Choice · AI</div>
      <div className="bubble amend-delta">
        <p><b>Re-scored.</b> Here's how your prior picks shift against the new issue list:</p>
        <div className="ad-list">
          {deltas.map((d, i) => {
            const dir = d.newPct > d.oldPct ? 'up' : d.newPct < d.oldPct ? 'down' : 'flat';
            const diff = d.newPct - d.oldPct;
            return (
              <div className={"ad-row " + dir + (d.significant ? ' significant' : '')} key={i}>
                <div className="ad-race">
                  <div className="ad-tag">{d.significant ? 'REVISIT' : 'unchanged'}</div>
                  <div className="ad-name">{d.raceLabel}</div>
                  <div className="ad-pick">Your pick: {d.pick}</div>
                </div>
                <div className="ad-score">
                  <div className="ad-old">{d.oldPct}%</div>
                  <div className="ad-arrow">{dir === 'up' ? '↑' : dir === 'down' ? '↓' : '→'}</div>
                  <div className="ad-new">{d.newPct}%</div>
                  <div className="ad-diff">{diff > 0 ? '+' : ''}{diff} pts</div>
                </div>
                {d.significant && (
                  <button className="ad-revisit" onClick={() => onRevisit(d.raceId)}>Revisit →</button>
                )}
              </div>
            );
          })}
        </div>
        <p className="ad-foot">
          Only races where the change is bigger than 5 pts get a REVISIT flag. The others stay on your ballot as-is.
        </p>
      </div>
    </div>
  );
}

/* ============ AmendRescoreOffer ============
   Maps to: src/components/AmendRescoreOffer.tsx (Phase 6)

   A small follow-up message after AmendDeltaMessage offering
   to walk through revisits in order. */
function AmendRescoreOffer({ revisitCount, onWalkthrough, onDismiss }) {
  if (revisitCount === 0) {
    return (
      <div className="msg ai">
        <div className="who">Voter Choice · AI</div>
        <div className="bubble">
          <p>None of your prior picks crossed the threshold for a revisit. Continue where you left off.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="msg ai">
      <div className="who">Voter Choice · AI</div>
      <div className="bubble">
        <p>Want me to walk you through the {revisitCount} {revisitCount === 1 ? 'race' : 'races'} flagged for revisit, one at a time?</p>
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button className="rescore-yes" onClick={onWalkthrough}>Yes, walk me through them →</button>
          <button className="rescore-no" onClick={onDismiss}>No, I'll come back later</button>
        </div>
      </div>
    </div>
  );
}

/* ============ BudgetExhaustedModal ============
   Maps to: src/components/BudgetExhausted.tsx (Phase 9)

   Shown when the user clicks "Continue in another chatbot" OR
   automatically when the conversation has exceeded a budget
   threshold (mocked: 6+ decisions for demo).

   Renders a portable prompt the user can paste into any
   chatbot (Claude, ChatGPT, Gemini) to continue without losing
   their place. */
function BudgetExhaustedModal({ open, address, issues, decisions, racesRemaining, onClose, onPrint, onSaveProfile }) {
  const [copied, setCopied] = useStateS(false);
  const textareaRef = useRefS(null);

  if (!open) return null;

  const portablePrompt = buildPortablePrompt({ address, issues, decisions, racesRemaining });

  function copyToClipboard() {
    if (textareaRef.current) {
      textareaRef.current.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (e) {}
    }
  }

  return (
    <div className="be-modal-overlay" onClick={onClose}>
      <div className="be-modal" onClick={(e) => e.stopPropagation()}>
        <header className="be-head">
          <div>
            <div className="be-eyebrow">Continue elsewhere · context handoff</div>
            <h3>Take your research with you.</h3>
          </div>
          <button className="be-x" onClick={onClose} aria-label="Close">×</button>
        </header>

        <p className="be-lede">
          You've decided <b>{Object.keys(decisions).length}</b> of {Object.keys(decisions).length + racesRemaining} races. Copy the prompt below and paste it into any chatbot — Claude, ChatGPT, Gemini, Grok — to pick up where you left off. Voter Choice runs on AI budget that costs us money; we'd rather hand you off than burn through ours.
        </p>

        <div className="be-prompt">
          <div className="be-prompt-head">
            <span className="be-prompt-lab">Portable prompt</span>
            <button className="be-copy" onClick={copyToClipboard}>
              {copied ? '✓ Copied' : 'Copy →'}
            </button>
          </div>
          <textarea
            ref={textareaRef}
            className="be-prompt-text"
            readOnly
            value={portablePrompt}
          />
        </div>

        <div className="be-extras">
          <button className="be-ext-btn" onClick={() => onSaveProfile && onSaveProfile()}>
            <span className="be-ext-ic">↓</span>
            Also download my profile as .txt
          </button>
          <button className="be-ext-btn" onClick={() => { onClose(); onPrint && onPrint(); }}>
            <span className="be-ext-ic" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
            </span>
            Print my draft ballot
          </button>
        </div>

        {/* BYOK inline — when AI budget runs out, the user has three
            options: continue elsewhere (portable prompt above), bring
            their own key (here), or tip-jar the next user's session.
            All three live in one modal so the user sees the full
            menu of alternatives, not just "go away to another bot." */}
        <BudgetExhaustedByok onClose={onClose} />

        <footer className="be-foot">
          Your address never leaves this device. The portable prompt above contains your issues + draft picks + the races still to decide — no personally-identifying information.
        </footer>
      </div>
    </div>
  );
}

/* ============ BudgetExhaustedByok ============
   Inline BYOK card inside BudgetExhaustedModal. The Settings drawer
   has the canonical version of this — this one is positioned at the
   handoff moment so the user sees BYOK as an alternative to "leave."

   Repo target: (new — embed into src/components/BudgetExhausted.tsx)
   Shares storage key with src/lib/anthropic-client-byok.ts. */
function BudgetExhaustedByok({ onClose }) {
  const [keyDraft, setKeyDraft] = useStateS('');
  const [savedKey, setSavedKey] = useStateS(null);
  const [status, setStatus] = useStateS(null);

  useEffectS(() => {
    setSavedKey(window.getByokKey ? window.getByokKey() : null);
  }, []);

  function saveKey() {
    const k = keyDraft.trim();
    if (!k.startsWith('sk-ant-')) {
      setStatus({ tone: 'error', text: "Doesn't look like an Anthropic key (should start with sk-ant-)." });
      return;
    }
    if (window.setByokKey) window.setByokKey(k);
    setSavedKey(k);
    setKeyDraft('');
    setStatus({ tone: 'ok', text: 'Saved — resend your last message to use your account.' });
  }
  function clearKey() {
    if (window.removeByokKey) window.removeByokKey();
    setSavedKey(null);
    setStatus({ tone: 'ok', text: 'Removed. Back to the community budget.' });
  }
  function maskKey(k) {
    if (!k) return '';
    return k.length < 12 ? k : k.slice(0, 7) + '…' + k.slice(-4);
  }

  return (
    <section className="be-byok" aria-labelledby="be-byok-ttl">
      <h4 id="be-byok-ttl" className="be-byok-ttl">Have an Anthropic API key? Use it directly in Voter Choice.</h4>
      <p className="be-byok-sub">Your key stays in your browser. Never sent to our server.</p>
      {savedKey ? (
        <div className="be-byok-saved">
          <div className="be-byok-mask">
            <span className="be-byok-lab">Saved key</span>
            <code>{maskKey(savedKey)}</code>
          </div>
          <button className="be-byok-clear" onClick={clearKey}>Remove</button>
        </div>
      ) : (
        <div className="be-byok-row">
          <div className="be-byok-input-wrap">
            <input
              type="password"
              placeholder="sk-ant-..."
              value={keyDraft}
              onChange={(e) => setKeyDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') saveKey(); }}
              spellCheck="false"
              autoComplete="off"
              aria-label="Anthropic API key"
            />
            <span className="be-byok-icon" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
              </svg>
            </span>
          </div>
          <button className="be-byok-save" onClick={saveKey} disabled={!keyDraft.trim()}>
            Save &amp; continue
          </button>
        </div>
      )}
      <p className="be-byok-hint">Starts with sk-ant-.</p>
      {status && <p className={"be-byok-status " + status.tone}>{status.text}</p>}

      {/* Tip-jar mention — italic mono micro-copy, very low key. The
          intent is to acknowledge the community AI budget has a real
          cost, but not to extract anything. NOT REQUIRED is deliberate. */}
      <p className="be-tipjar">
        Voter Choice is free. If it helped, a tip helps keep it free —{' '}
        <a
          onClick={() => { window.__navigate && window.__navigate('tip'); onClose && onClose(); }}
          role="link"
          tabIndex={0}
        >TIP JAR</a> · not required.
      </p>
    </section>
  );
}

function buildPortablePrompt({ address, issues, decisions, racesRemaining }) {
  const issueList = issues.map((i, idx) =>
    `  ${idx + 1}. ${i.interpretation} — ${i.stance || 'stance not yet recorded'}`
  ).join('\n');

  const picks = Object.entries(decisions).map(([raceId, d]) => {
    const r = RACES.find(x => x.id === raceId);
    return `  • ${r?.label || raceId}: ${d.pick}${d.party ? ' (' + d.party + ')' : ''}${d.why ? ' — "' + d.why + '"' : ''}`;
  }).join('\n');

  // [Δ] Include the parsed remaining ballot so the receiving AI doesn't
  // have to re-extract the ballot from the user's address. This is the
  // single biggest accuracy + UX win for handoffs.
  const remainingRaces = RACES.filter(r => !decisions[r.id]);
  const remainingList = remainingRaces.map(r => {
    const cands = (r.candidates && r.candidates.length > 0)
      ? r.candidates.map(c => `${c.name} (${(c.party || '').slice(0, 1)})`).join(' vs. ')
      : '(ballot proposition — yes/no)';
    return `  • [${r.section}] ${r.label} — ${cands}`;
  }).join('\n');

  // Use the real address / state code — never the TX demo constants.
  const sc = getRealStateCode();
  const locationLine = address
    ? `my ballot${sc ? ' in ' + sc : ''} (address: ${address})`
    : sc ? `my ballot in ${sc}` : 'my ballot';

  return `I'm researching ${locationLine}.

I started in Voter Choice (a non-partisan tool that scores candidates on actual voting + donor records). Their AI budget is exhausted — I want to continue this conversation with you.

MY PRIORITIES (in order, with the direction I want):
${issueList}

DECISIONS SO FAR (${Object.keys(decisions).length} of ${Object.keys(decisions).length + racesRemaining} races):
${picks || '  (none yet)'}

STILL TO DECIDE (${racesRemaining} ${racesRemaining === 1 ? 'race' : 'races'}) — already parsed from my ballot:
${remainingList || '  (none — ballot complete)'}

For each remaining race above, please:
  1. Pull the candidates' actual voting records (if incumbents) from Congress.gov / state legislature data
  2. Pull their FEC / OpenSecrets donor breakdowns — break out small-donor % vs PAC %
  3. Score each candidate against my priorities above with SOURCED evidence (bill numbers, donor amounts, links)
  4. If a candidate has no record (first-time candidate), say so explicitly. Don't invent votes or donor amounts.
  5. For propositions, summarize what passing vs failing actually does — not the ballot title.

Start with whichever remaining race you think has the highest stakes. Ask me which race first if you're unsure.`;
}

/* ============ ProfileResumeModal ============
   Maps to: (new — feature on src/app/page.tsx)

   Opened by clicking "Drop your saved .txt profile →" on home.
   For the demo, the "use sample" button is the wired path —
   the file drop is a placeholder. */
function ProfileResumeModal({ open, onClose, onResume }) {
  if (!open) return null;

  return (
    <div className="be-modal-overlay" onClick={onClose}>
      <div className="be-modal pr-modal" onClick={(e) => e.stopPropagation()}>
        <header className="be-head">
          <div>
            <div className="be-eyebrow">Resume from saved profile</div>
            <h3>Drop your .txt profile.</h3>
          </div>
          <button className="be-x" onClick={onClose} aria-label="Close">×</button>
        </header>

        <p className="be-lede">
          If you saved your profile from a previous session, drop the .txt here. Your priorities and draft picks restore. Your address is still kept on this device only.
        </p>

        <div className="pr-dropzone">
          <div className="pr-drop-ic">↓</div>
          <div className="pr-drop-lab">Drop your saved profile here</div>
          <div className="pr-drop-or">or</div>
          <label className="pr-drop-file">
            Choose file…
            <input type="file" accept=".txt" style={{ display: 'none' }} />
          </label>
        </div>

        <div style={{ textAlign: 'center', marginTop: 14 }}>
          <button className="pr-sample" onClick={onResume}>
            Demo: load a sample profile →
          </button>
        </div>

        <footer className="be-foot">
          Your profile lives only on the device you saved it from. We don't store profiles on our servers — they'd just be another tracking vector.
        </footer>
      </div>
    </div>
  );
}

const SAMPLE_RESUME_PROFILE = {
  issues: [
    {
      sourceType: 'freeText',
      sourceText: 'previously saved profile',
      rank: 1,
      interpretation: 'Insulin & drug pricing',
      canonicalIssue: 'healthcare_affordability',
      stance: 'voter favors lower drug prices and Medicare drug-price negotiation',
      confidence: 'clear',
      quotes: [{ label: 'restored', text: 'from your saved .txt profile' }],
    },
    {
      sourceType: 'freeText',
      sourceText: 'previously saved profile',
      rank: 2,
      interpretation: 'Cost of living & rent',
      canonicalIssue: 'housing_affordability',
      stance: 'voter favors stronger rent protections',
      confidence: 'clear',
      quotes: [{ label: 'restored', text: 'from your saved .txt profile' }],
    },
  ],
  decisions: {
    'us-house-tx7': { pick: 'Jordan Hartman', party: 'D', why: 'previously saved — strong on healthcare', candidateName: 'Jordan Hartman' },
    'governor-tx':  { pick: 'Beto O\u2019Rourke', party: 'D', why: 'previously saved — grassroots funding base',  candidateName: 'Beto O\u2019Rourke' },
  },
};

/* ============ CompareModal ============
   Maps to: (new — wired from chat header Compare button)

   Mobile-first redesign: stacked issue-by-issue panels instead of
   a side-by-side table. Each issue row gets full width with two
   bars (Candidate A / B) shown one above the other, so percentages
   are always legible at any viewport.

   Blind mode hides candidate names; reveal toggle at top flips them. */
function CompareModal({ open, race, issues, blindMode, revealedCandidates, onRevealCandidate, onClose }) {
  const [expandedKey, setExpandedKey] = useStateS(null); // `${candidateId}|${canonicalIssue}`
  if (!open) return null;

  const patterns = getRacePatternsForRace(race.id);
  const alignmentBlk = getAlignmentScoresForRace(race.id);
  const candidates = patterns?.candidates || [];

  if (candidates.length < 2) return null;

  function displayLabel(cand, idx) {
    // Single source of truth (design-system core). Adapt its shape to
    // the {primary, secondary, isBlind, alias} this modal already uses.
    const id = getCandidateIdentity(cand, { blindMode, revealed: revealedCandidates, index: idx });
    return {
      primary: id.displayName,
      secondary: id.isBlind ? id.secondary : (cand.priorRole || ''),
      isBlind: id.isBlind,
      alias: id.alias,
    };
  }

  const labels = candidates.map((c, i) => displayLabel(c, i));
  const allBlind = labels.every(l => l.isBlind);
  const anyBlind = labels.some(l => l.isBlind);

  return (
    <div className="be-modal-overlay" onClick={onClose}>
      <div className="cmp-modal v2" onClick={(e) => e.stopPropagation()}>
        <header className="cmp-head">
          <div>
            <div className="be-eyebrow">Side-by-side · {race.label}</div>
            <h3>{allBlind ? 'Same record, same issues — names hidden.' : 'Same record, same issues, both candidates.'}</h3>
          </div>
          <button className="be-x" onClick={onClose} aria-label="Close">×</button>
        </header>

        {/* Top header showing both candidates as A / B with reveal */}
        <div className="cmp-roster">
          {candidates.map((c, i) => {
            const lab = labels[i];
            return (
              <div className={"cmp-roster-card " + (lab.isBlind ? 'blind' : '')} key={c.id}>
                <div className="cmp-alias">Candidate {lab.alias}</div>
                <div className="cmp-roster-name">{lab.primary}</div>
                {!lab.isBlind && lab.secondary && (
                  <div className="cmp-roster-role">{lab.secondary}</div>
                )}
                {lab.isBlind && (
                  <button className="cmp-reveal" onClick={() => onRevealCandidate(c.id)}>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    <span>Reveal</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Per-issue stacked panels */}
        <div className="cmp-issues">
          {issues.map(iss => (
            <div className="cmp-issue-panel" key={iss.canonicalIssue}>
              <div className="cmp-issue-head">
                <div className="cmp-issue-name">{iss.interpretation}</div>
                {iss.stance && (
                  <div className="cmp-issue-stance">{iss.stance}</div>
                )}
              </div>

              {candidates.map((c, ci) => {
                const lab = labels[ci];
                const entry = alignmentBlk?.entries?.find(e => e.candidateId === c.id);
                const score = entry?.scores?.find(s => s.canonicalIssue === iss.canonicalIssue);
                const expandKey = `${c.id}|${iss.canonicalIssue}`;
                const isExpanded = expandedKey === expandKey;
                let body;
                if (!score && entry?.unavailable) {
                  body = <div className="cmp-score-row na">No legislative record</div>;
                } else if (!score) {
                  body = <div className="cmp-score-row na">—</div>;
                } else {
                  const pct = score.total > 0 ? Math.round((score.kept / score.total) * 100) : 0;
                  const tone = pct >= 65 ? '' : pct >= 50 ? 'mid' : 'low';
                  const hasVotes = !!(score.contributingVotes?.length);
                  body = (
                    <>
                      <div className={"cmp-score-row " + tone}>
                        <div className="cmp-bar">
                          <div className={"cmp-bar-fill " + tone} style={{ width: pct + '%' }} />
                        </div>
                        <div className="cmp-pct">{pct}<small>%</small></div>
                        <div className="cmp-meta">{score.kept} of {score.total} votes</div>
                      </div>
                      {hasVotes && (
                        <button
                          className="cmp-expand"
                          onClick={() => setExpandedKey(isExpanded ? null : expandKey)}
                        >
                          {isExpanded ? '▴ Hide votes' : `▾ View the ${score.contributingVotes.length} ${score.contributingVotes.length === 1 ? 'vote' : 'votes'}`}
                        </button>
                      )}
                      {isExpanded && hasVotes && (
                        <div className="cmp-votes">
                          {score.contributingVotes.map((v, vi) => {
                            const cmpHasNum = (v.billTitle || '').includes(' · ');
                            const cmpNum = cmpHasNum ? v.billTitle.split(' · ')[0] : '';
                            const cmpTtl = cmpHasNum ? v.billTitle.split(' · ')[1] : (v.billTitle || '');
                            return (
                              <div className="cmp-vote" key={vi}>
                                <div className="cmp-vote-head">
                                  <span className="cmp-vote-num">{cmpNum}</span>
                                  <span className={"cmp-vote-badge " + (v.voteCast === 'with' ? 'yea' : v.voteCast === 'against' ? 'nay' : 'other')}>
                                    {v.voteCast === 'with' ? 'WITH YOU' : v.voteCast === 'against' ? 'AGAINST YOU' : '—'}
                                  </span>
                                </div>
                                <div className="cmp-vote-ttl">{cmpTtl}</div>
                                {v.narrative && <p className="cmp-vote-narr">{(window.anonymizeText ? window.anonymizeText(v.narrative, { blindMode: lab.isBlind, realLastName: c.name?.split(' ').pop(), alias: lab.primary }) : v.narrative)}</p>}
                                <div className="cmp-vote-cite">
                                  {v.source?.url ? (
                                    <a href={v.source.url} target="_blank" rel="noopener noreferrer">
                                      {v.source.name} →
                                    </a>
                                  ) : (
                                    <span>{v.source?.name || 'Source pending'}</span>
                                  )}
                                  {(v.sources || []).filter(s => s.url !== v.source?.url).map((s, si) => (
                                    <span key={si}>
                                      {s.url ? (
                                        <a href={s.url} className="src-link" target="_blank" rel="noopener noreferrer">
                                          {s.name} →
                                        </a>
                                      ) : (
                                        <span className="src-chip">{s.name}</span>
                                      )}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  );
                }
                return (
                  <div className="cmp-cand-row" key={c.id}>
                    <div className="cmp-cand-tag">{lab.primary}</div>
                    <div className="cmp-cand-body">{body}</div>
                  </div>
                );
              })}
            </div>
          ))}

          {/* Funding mix panel — two horizontal bars stacked */}
          <div className="cmp-issue-panel funding">
            <div className="cmp-issue-head">
              <div className="cmp-issue-name">Funding mix</div>
              <div className="cmp-issue-stance">small / large individual / PAC</div>
            </div>
            {candidates.map((c, ci) => {
              const lab = labels[ci];
              return (
                <div className="cmp-cand-row" key={c.id}>
                  <div className="cmp-cand-tag">
                    {lab.primary}
                    {c.totalRaised && <span className="cmp-total">{window.__formatDollars ? window.__formatDollars(c.totalRaised) : '$' + c.totalRaised}</span>}
                  </div>
                  {c.fundingMix ? (
                    <div className="cmp-money-row">
                      <FundingMixBars mix={c.fundingMix} labelMin={15} />
                    </div>
                  ) : (
                    <div className="cmp-score-row na">—</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {anyBlind && (
          <footer className="cmp-foot">
            <span className="ic">⚠</span>
            <span className="cmp-foot-text">Candidate identities are hidden so you decide on the record. Tap <b>Reveal</b> at the top when you're ready to see who's who.</span>
          </footer>
        )}
      </div>
    </div>
  );
}

/* ============ AllVotesPanel ============
   Opened by clicking "See all votes →" on a candidate card. */
function AllVotesPanel({ open, candidate, alignmentEntry, blindMode, alias, onClose }) {
  const [filter, setFilter] = useStateS('all');
  if (!open || !candidate) return null;

  const anonCtx = { blindMode, realLastName: candidate?.name?.split(' ').pop(), alias };

  const allVotes = [];
  (alignmentEntry?.scores || []).forEach(score => {
    (score.contributingVotes || []).forEach(v => {
      allVotes.push({ ...v, issueLabel: score.issueLabel, canonicalIssue: score.canonicalIssue });
    });
  });

  const issueLabels = [...new Set(allVotes.map(v => v.canonicalIssue))];
  const filtered = filter === 'all' ? allVotes : allVotes.filter(v => v.canonicalIssue === filter);

  const headerName = blindMode ? alias : candidate.name;

  return (
    <div className="be-modal-overlay" onClick={onClose}>
      <div className="av-panel" onClick={(e) => e.stopPropagation()}>
        <header className="av-head">
          <div>
            <div className="be-eyebrow">{headerName} · all curated votes</div>
            <h3>{allVotes.length} votes across {issueLabels.length} of your issues</h3>
          </div>
          <button className="be-x" onClick={onClose} aria-label="Close">×</button>
        </header>

        <div className="av-filters">
          <button className={"av-filter " + (filter === 'all' ? 'active' : '')} onClick={() => setFilter('all')}>
            All <span className="av-filter-ct">{allVotes.length}</span>
          </button>
          {issueLabels.map(ci => {
            const count = allVotes.filter(v => v.canonicalIssue === ci).length;
            const label = allVotes.find(v => v.canonicalIssue === ci).issueLabel;
            return (
              <button key={ci} className={"av-filter " + (filter === ci ? 'active' : '')} onClick={() => setFilter(ci)}>
                {label} <span className="av-filter-ct">{count}</span>
              </button>
            );
          })}
        </div>

        <div className="av-list">
          {filtered.length === 0 && (
            <p style={{ padding: 20, color: 'var(--ink-3)', fontStyle: 'italic' }}>No votes on this issue yet.</p>
          )}
          {filtered.map((v, i) => {
            const avHasNum = (v.billTitle || '').includes(' · ');
            const avNum = avHasNum ? v.billTitle.split(' · ')[0] : '';
            const avTtl = avHasNum ? v.billTitle.split(' · ')[1] : (v.billTitle || '');
            return (
              <div className="av-vote" key={i}>
                <div className="av-vote-head">
                  <div>
                    <div className="av-vote-num">{avNum}</div>
                    <div className="av-vote-ttl">{avTtl}</div>
                  </div>
                  <div className={"vote-badge " + (v.voteCast === 'with' ? 'yea' : v.voteCast === 'against' ? 'nay' : 'other')}>
                    {v.voteCast === 'with' ? 'WITH YOU' : v.voteCast === 'against' ? 'AGAINST YOU' : '—'}
                  </div>
                </div>
                <div className="av-vote-meta">
                  <span className="av-vote-tag">{v.issueLabel}</span>
                  <span>{new Date(v.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
                {v.narrative && <p className="av-vote-narr">{(window.anonymizeText ? window.anonymizeText(v.narrative, anonCtx) : v.narrative)}</p>}
                <div className="av-vote-cite">
                  <span className="src-chip">{v.source.name}</span>
                  {v.source.url && <a className="src-link" href={v.source.url} target="_blank" rel="noopener noreferrer">View roll call →</a>}
                  {(v.sources || []).filter(s => s.url !== v.source.url).map((s, si) => (
                    <span key={si}>
                      <span className="src-chip">{s.name}</span>
                      {s.url && <a className="src-link" href={s.url} target="_blank" rel="noopener noreferrer">View summary →</a>}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Methodology footer — how we know "WITH/AGAINST you" */}
        <footer className="av-method">
          <div className="av-method-head">How we know</div>
          <p>
            <b>"With you" / "against you"</b> is computed by comparing each roll-call vote to your stated stance on the issue this bill touches.
          </p>
          <ul className="av-method-sources">
            <li>
              Vote data:{' '}
              <a href="https://www.congress.gov/roll-call-votes" target="_blank" rel="noopener noreferrer">Congress.gov · federal roll calls</a>{' · '}
              <a href="https://openstates.org" target="_blank" rel="noopener noreferrer">OpenStates · state legislature records</a>
            </li>
            <li>
              Narrative context:{' '}
              <a href="https://can2026.org" target="_blank" rel="noopener noreferrer">CAN2026 case files</a>{' · '}
              <a href="/methodology">our methodology</a>
            </li>
            <li>
              Donor breakdowns:{' '}
              <a href="https://www.opensecrets.org" target="_blank" rel="noopener noreferrer">OpenSecrets</a>{' · '}
              <a href="https://www.fec.gov" target="_blank" rel="noopener noreferrer">FEC committee filings</a>
            </li>
          </ul>
          <p className="av-method-disclaim">
            We don't generate vote claims from AI — if a vote isn't in our database, we don't show it. Every claim on every card links to a primary source.
          </p>
        </footer>
      </div>
    </div>
  );
}

/* Helper used by CompareModal — money formatting now lives in
   prototype-shared.jsx; window.__formatDollars points at it. */

Object.assign(window, {
  PartyGate,
  AmendmentEditor,
  AmendDeltaMessage,
  AmendRescoreOffer,
  BudgetExhaustedModal,
  ProfileResumeModal,
  CompareModal,
  AllVotesPanel,
  SAMPLE_RESUME_PROFILE,
  buildPortablePrompt,
  guessCanonicalIssue,
});

/* ==================== prototype-screens-c.jsx ==================== */
/* ====================================================
   VOTER CHOICE · Pass C screens
   ====================================================
   • SettingsPanel       — language + BYOK + data
   • GeocodeFailView     — address didn't resolve
   • NoContestedView     — Civic returned 0 races (maps to BallotLookupNeeded.tsx)
   • AITimeoutBanner     — inline in chat
   • AboutPage / MethodologyPage / PrivacyPage — static info pages
   ==================================================== */

const { useState: useStateSC, useRef: useRefSC, useEffect: useEffectSC } = React;

/* ============ BYOK storage helpers ============
   Mirror src/lib/anthropic-client-byok.ts in repo. Same
   STORAGE_KEY so a port doesn't lose the user's saved key. */
const BYOK_STORAGE_KEY = 'voter-choice:byok-anthropic-key';

function getByokKey() {
  try { return localStorage.getItem(BYOK_STORAGE_KEY); } catch (e) { return null; }
}
function setByokKey(key) {
  try { localStorage.setItem(BYOK_STORAGE_KEY, key); } catch (e) {}
}
function removeByokKey() {
  try { localStorage.removeItem(BYOK_STORAGE_KEY); } catch (e) {}
}
function maskKey(k) {
  if (!k) return '';
  if (k.length < 12) return k;
  return k.slice(0, 7) + '…' + k.slice(-4);
}

/* ============ SettingsPanel ============
   Slide-in drawer opened from the nav-cog. Three sections:
     1. Language     — wraps LanguageToggle
     2. BYOK         — Anthropic key input, save/clear, status
     3. Your data    — export profile, reset everything

   Repo target: (new — recommended src/components/SettingsPanel.tsx
   composing the existing LanguageToggle + BYOK utilities.) */
function SettingsPanel({ open, onClose, onResetAll, onExportProfile, onResumeProfile }) {
  const { t, lang, setLang } = useI18n();
  const [keyDraft, setKeyDraft] = useStateSC('');
  const [savedKey, setSavedKey] = useStateSC(null);
  const [status, setStatus] = useStateSC(null); // {tone, text}
  const drawerRef = useRefSC(null);

  useEffectSC(() => {
    if (!open) return;
    setSavedKey(getByokKey());
    setKeyDraft('');
    setStatus(null);
    // Focus management: move focus into drawer on open
    setTimeout(() => {
      const el = drawerRef.current?.querySelector('button, input, a');
      if (el) el.focus();
    }, 50);
  }, [open]);

  // Esc to close
  useEffectSC(() => {
    if (!open) return;
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  function saveKey() {
    const k = keyDraft.trim();
    if (!k.startsWith('sk-ant-')) {
      setStatus({ tone: 'error', text: 'Doesn\u2019t look like an Anthropic key (should start with sk-ant-).' });
      return;
    }
    setByokKey(k);
    setSavedKey(k);
    setKeyDraft('');
    setStatus({ tone: 'ok', text: t('settings.byokSaved') });
  }
  function clearKey() {
    removeByokKey();
    setSavedKey(null);
    setStatus({ tone: 'ok', text: t('settings.byokRemoved') });
  }

  return (
    <div className="sx-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="sx-ttl">
      <aside className="sx-drawer" ref={drawerRef} onClick={(e) => e.stopPropagation()}>
        <header className="sx-head">
          <h2 id="sx-ttl">{t('settings.title')}</h2>
          <button className="sx-x" onClick={onClose} aria-label="Close">×</button>
        </header>

        {/* — Language — */}
        <section className="sx-section">
          <h3 className="sx-section-ttl">{t('settings.langSection')}</h3>
          <div className="sx-lang-grid">
            <button
              className={"sx-lang-opt " + (lang === 'en' ? 'on' : '')}
              onClick={() => setLang('en')}
              aria-pressed={lang === 'en'}
            >
              <span className="sx-lang-flag" aria-hidden="true">EN</span>
              <span>{t('settings.langEn')}</span>
            </button>
            <button
              className={"sx-lang-opt " + (lang === 'es' ? 'on' : '')}
              onClick={() => setLang('es')}
              aria-pressed={lang === 'es'}
            >
              <span className="sx-lang-flag" aria-hidden="true">ES</span>
              <span>{t('settings.langEs')}</span>
            </button>
          </div>
        </section>

        {/* — BYOK — */}
        <section className="sx-section">
          <h3 className="sx-section-ttl">{t('settings.byokSection')}</h3>
          <p className="sx-help">{t('settings.byokHelp')}</p>
          {savedKey ? (
            <div className="sx-byok-saved">
              <div className="sx-byok-row">
                <span className="sx-byok-lab">Saved key</span>
                <code className="sx-byok-mask">{maskKey(savedKey)}</code>
              </div>
              <button className="sx-btn danger" onClick={clearKey}>{t('settings.byokClear')}</button>
            </div>
          ) : (
            <div className="sx-byok-input">
              <input
                type="password"
                placeholder={t('settings.byokPlaceholder')}
                value={keyDraft}
                onChange={(e) => setKeyDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') saveKey(); }}
                spellCheck="false"
                autoComplete="off"
                aria-label={t('settings.byokSection')}
              />
              <button className="sx-btn primary" onClick={saveKey} disabled={!keyDraft.trim()}>
                {t('settings.byokSave')}
              </button>
            </div>
          )}
          {status && (
            <div className={"sx-status " + status.tone} role="status">{status.text}</div>
          )}
        </section>

        {/* — Your data — */}
        <section className="sx-section">
          <h3 className="sx-section-ttl">{t('settings.dataSection')}</h3>
          <ul className="sx-data-actions">
            <li>
              <button className="sx-row-btn" onClick={() => { onResumeProfile && onResumeProfile(); onClose(); }}>
                <span>{t('settings.dataResume')}</span><span className="arr">↑</span>
              </button>
            </li>
            <li>
              <button className="sx-row-btn" onClick={() => { onExportProfile && onExportProfile(); }}>
                <span>{t('settings.dataExport')}</span><span className="arr">↓</span>
              </button>
            </li>
            <li>
              <button className="sx-row-btn danger" onClick={() => { onResetAll(); onClose(); }}>
                <span>{t('settings.dataReset')}</span><span className="arr">×</span>
              </button>
            </li>
          </ul>
        </section>

        <footer className="sx-foot">
          <a className="sx-foot-link" onClick={() => { window.__navigate && window.__navigate('privacy'); onClose(); }}>{t('settings.privacyLink')}</a>
          <a className="sx-foot-link" href="/terms">Terms of use →</a>
          <a className="sx-foot-link" onClick={() => { window.__navigate && window.__navigate('methodology'); onClose(); }}>{t('settings.methodologyLink')}</a>
          <a className="sx-foot-link" onClick={() => { window.__navigate && window.__navigate('about'); onClose(); }}>{t('settings.aboutLink')}</a>
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
          <h2>{t('errors.geocodeFailTitle')}</h2>
          <p className="gf-body">{t('errors.geocodeFailBody')}</p>
          <div className="gf-attempted">
            <span className="lab">You entered</span>
            <code>{address || '(empty)'}</code>
          </div>
          <div className="gf-actions">
            <button className="gf-primary" onClick={onEditAddress}>← {t('errors.geocodeFailRetry')}</button>
            <button className="gf-secondary" onClick={onContinueWithZip}>{t('errors.geocodeFailSkip')} →</button>
          </div>
          <p className="gf-tip">
            <b>Tip:</b> if you just typed a ZIP, add a street like <code>123 Main St, Springfield, IL 62701</code>. If you typed a full address, double-check the state abbreviation and ZIP.
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
function NoContestedView({ stateData, county = 'your county', onBallotConfirmed, onBack }) {
  const { t } = useI18n();
  const [text, setText] = useStateSC('');
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
    'Reading your file…',
    'Finding the contested races…',
    'Cross-referencing with state records…',
    'Building your ballot…',
  ];

  // Phase 2b: real extraction. Paste → parseBallotContent (local, no key);
  // file → /api/extract-ballot. Either way → applyRealRaces + detected state,
  // then confirm. The step animation just runs while the real work happens.
  async function beginProcessing(kind, payload, source) {
    setProcessing(true);
    setProcessingStep(0);
    let i = 0;
    const interval = setInterval(() => {
      i += 1;
      if (i < STEPS.length) setProcessingStep(i);
    }, 1100);
    let result;
    try {
      result =
        kind === 'file'
          ? await fetchBallotFromFile(payload)
          : await fetchBallotFromText(payload);
    } catch (e) {
      result = { races: [], stateCode: '' };
    }
    clearInterval(interval);
    setProcessingStep(STEPS.length - 1);
    if (result.races && result.races.length > 0) {
      applyRealRaces(result.races);
      if (result.stateCode) setRealStateCode(result.stateCode);
    }
    // F-E: load real per-state resources (polling-place lookup URL, county
    // election link) so NoContestedView / logistics bar shows the real
    // state URLs instead of the vote.gov fallback. Mirrors handleSubmitAddress.
    if (result.stateCode) await applyRealStateResources(result.stateCode);
    // F-E: derive the congressional district from the ballot's House race
    // label and persist it in BALLOT_LOGISTICS so both the workspace bar
    // and the print view show "NJ-01" instead of "—". Merge defensively
    // so existing civic-sourced logistics fields are preserved.
    if (result.stateCode && result.races && result.races.length > 0) {
      const houseRace = result.races.find(r => /house/i.test(r.label || ''));
      if (houseRace) {
        const district = deriveDistrictCode(houseRace.label, result.stateCode);
        if (district) {
          const cur = getBallotLogistics();
          setBallotLogistics({
            ...(cur || {}),
            congressionalDistrict: district,
            fallbackUrl: 'https://vote.gov/',
            source: (cur && cur.source) || 'fallback',
            pollingPlace: (cur && cur.pollingPlace) || null,
            earlyVoting: (cur && cur.earlyVoting) || null,
          });
        }
      }
    }
    // Pillar 1: propagate low-confidence flag (large-format ballot warning).
    setLowConfidenceExtraction(!!result.lowConfidence);
    setProcessing(false);
    onBallotConfirmed(source);
  }

  function onFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFile(file);
    beginProcessing('file', file, `[uploaded: ${file.name}]`);
  }
  function onPasteConfirm() {
    beginProcessing('text', trimmed, trimmed);
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
                <h2>{t('errors.noContestedTitle')}</h2>
                <p className="nc-body">{t('errors.noContestedBody')}</p>
              </header>

              <ul className="nc-links">
                <li>
                  <a href={stateData.resources.sampleBallotLookup} target="_blank" rel="noopener noreferrer">
                    {t('errors.noContestedFindBallot', { state: stateData.stateName })}
                  </a>
                </li>
                <li>
                  <a href={stateData.resources.countyElectionLookup} target="_blank" rel="noopener noreferrer">
                    {t('errors.noContestedCountyOffice', { county })}
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
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </span>
                  <span className="nc-upload-lab">
                    <span className="nc-upload-main">Choose a .txt or .pdf file</span>
                    <span className="nc-upload-sub">From your county elections office, or any sample ballot text</span>
                  </span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.pdf,text/plain,application/pdf"
                  onChange={onFileChange}
                  /* Visually hidden but still rendered (NOT display:none) — Safari
                     won't open the picker on a programmatic .click() of a
                     display:none file input; this keeps it in the layout. */
                  style={{ position: 'absolute', width: '1px', height: '1px', opacity: 0, overflow: 'hidden', pointerEvents: 'none', margin: '-1px' }}
                />
              </div>

              <div className="nc-or"><span>or</span></div>

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
                  aria-label={t('errors.noContestedPaste')}
                />
                <button
                  className="nc-primary"
                  disabled={!trimmed}
                  onClick={onPasteConfirm}
                >
                  {t('errors.noContestedConfirm')}
                </button>
              </div>

              {onBack && (
                <div className="nc-foot">
                  <button className="nc-back" onClick={onBack}>← Back to address</button>
                  <p className="nc-privacy">Privacy: don't paste your name, address, phone number, or email — only the ballot text.</p>
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
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </span>
            <code>{file.name}</code>
            <span className="nc-proc-file-size">· {Math.round(file.size / 1024)} KB</span>
          </p>
        )}
      </header>

      <ol className="nc-proc-steps">
        {steps.map((step, i) => {
          const status = i < currentStep ? 'done' : i === currentStep ? 'active' : 'pending';
          return (
            <li key={step} className={"nc-proc-step " + status}>
              <span className="nc-proc-step-ico" aria-hidden="true">
                {status === 'done' && '✓'}
                {status === 'active' && <span className="nc-proc-spinner"></span>}
                {status === 'pending' && '○'}
              </span>
              <span className="nc-proc-step-lab">{step}</span>
            </li>
          );
        })}
      </ol>

      <p className="nc-proc-hint">
        Anthropic is reading the ballot, extracting contested races, and
        cross-referencing them with state records. Don't refresh — your
        progress is auto-saved on this device.
      </p>
    </div>
  );
}

/* ============ AITimeoutBanner ============
   Inline message bubble (.msg.ai-error) you slot into the chat
   center when an AI call times out or errors. Doesn't kill state.
   Repo target: pattern lives in ChatPanel.tsx today as plain text;
   this gives it a proper component. */
function AITimeoutBanner({ onRetry, onHandoff, message }) {
  const { t } = useI18n();
  return (
    <div className="msg ai-error" role="alert">
      <div className="who">Voter Choice · system</div>
      <div className="bubble">
        <ErrorBanner
          tone="warn"
          title={t('errors.aiTimeoutTitle')}
          body={message || t('errors.aiTimeoutBody')}
          primary={{ label: t('errors.aiTimeoutRetry'), onClick: onRetry }}
          secondary={{ label: t('errors.aiTimeoutHandoff'), onClick: onHandoff }}
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
        <button className="sp-back" onClick={onBack}>← Back</button>
        <div className="sp-eyebrow">{eyebrow}</div>
        <h1 className="sp-title">{title}</h1>
        <article className="sp-article">{children}</article>
      </div>
    </div>
  );
}

function AboutPage({ onBack }) {
  return (
    <StaticPage onBack={onBack} eyebrow="About Voter Choice" title="A free, non-partisan Congress-assessment tool.">
      <p>Voter Choice is built and operated by <b>Grey Bird LLC</b>, a small independent shop. We made it because the gap between "what a candidate says in their ads" and "what they actually voted on" has gotten wider every cycle. We thought voters deserved a tool that closes it.</p>

      <h2>What we do</h2>
      <p>For every race on your ballot, we pull the <b>actual voting record</b> of incumbents (Congress.gov, state legislatures), the <b>funding picture</b> (FEC, OpenSecrets, state ethics commissions), and the <b>editorially-curated context</b> behind each vote (CAN2026 case files). We score how each candidate aligns with the issues you told us matter, vote by vote.</p>

      <h2>What we don't do</h2>
      <ul>
        <li><b>No accounts.</b> No sign-up, no email, no password.</li>
        <li><b>No tracking.</b> No analytics, no telemetry, no pixels.</li>
        <li><b>No endorsement.</b> We don't tell you who to vote for. We show you what the candidates have done. The final choice is yours.</li>
        <li><b>No data hoarding.</b> Your address, draft picks, and chat history live in your browser. If you close the tab and didn't save a profile, it's gone.</li>
      </ul>

      <h2>Who pays for this?</h2>
      <p>Server costs, Anthropic API budget, and the editorial work behind CAN2026 case files are funded by <b>Grey Bird LLC</b> and a small set of individual donors who explicitly do not buy a say in editorial. We publish a quarterly funding statement.</p>
      <p>When our community AI budget runs out, you can bring your own Anthropic API key (Settings → BYOK) or hand off to any chatbot with a portable prompt. We'd rather pause than monetize you.</p>

      <h2>Get in touch</h2>
      <p>Reach Grey Bird LLC at <a href="mailto:muxin.li.pro@gmail.com"><code>muxin.li.pro@gmail.com</code></a>. We answer.</p>
    </StaticPage>
  );
}

function MethodologyPage({ onBack }) {
  return (
    <StaticPage onBack={onBack} eyebrow="Methodology" title="How we score candidates.">
      <h2>Step 1 · Issues come from you</h2>
      <p>Every score in this app traces back to <b>your own words</b>. When you type your concerns in the cold open, we extract canonical issues + a directional stance ("favors lower drug prices"). You confirm, rename, or remove before any scoring happens. We don't pre-bake an issue list and check boxes against it.</p>

      <h2>Step 2 · Votes come from official roll-call data</h2>
      <ul>
        <li>Federal: <a href="https://www.congress.gov/roll-call-votes" target="_blank" rel="noopener noreferrer">Congress.gov roll-call votes</a>.</li>
        <li>State: per-state legislative reporting via <a href="https://openstates.org" target="_blank" rel="noopener noreferrer">OpenStates</a> and your state legislature's official records.</li>
      </ul>
      <p>For each issue, our editorial team selects 2–5 "case file" votes — the bills that most directly test the issue. Every score on a candidate card is computed from these case file votes only. If we don't have a curated case file for an issue × jurisdiction, the score reads <i>"thin record"</i> instead of guessing.</p>

      <h2>Step 3 · Donor data comes from FEC + state filings</h2>
      <ul>
        <li>Federal candidates: <a href="https://www.fec.gov" target="_blank" rel="noopener noreferrer">FEC</a> + <a href="https://www.opensecrets.org" target="_blank" rel="noopener noreferrer">OpenSecrets</a>.</li>
        <li>State candidates: your state's ethics commission or campaign finance disclosure office.</li>
        <li><b>Named issue PACs</b> are editorially vetted — we only break a PAC out separately if it has a public stated agenda we can cite.</li>
      </ul>

      <h2>Step 4 · "With you / against you" is your stance vs. the vote</h2>
      <p>If you said you favor lower drug prices, a vote FOR Medicare drug-price negotiation reads "WITH YOU." A vote AGAINST reads "AGAINST YOU." When the record is mixed, we show the raw vote — never a softened summary.</p>

      <h2>AI's role</h2>
      <p>The AI's job is to <b>route + summarize</b>, not to invent. It pulls from our structured database (votes, donors, narratives) and presents them. It does not generate vote claims. If a vote isn't in our database, we don't show it.</p>

      <h2>Mistakes</h2>
      <p>We will make them. When we do, we publish a correction and update the case file. Every claim links to a primary source so you can verify yourself. If you find one, email <a href="mailto:muxin.li.pro@gmail.com"><code>muxin.li.pro@gmail.com</code></a>.</p>
    </StaticPage>
  );
}

const TIP_AMOUNTS = [
  { label: '$3',  url: 'https://buy.stripe.com/7sY3cvcQ54cxeL34xc00005' },
  { label: '$5',  url: 'https://buy.stripe.com/4gM6oH6rHdN76exgfU00006' },
  { label: '$10', url: 'https://buy.stripe.com/fZu14n17n4cxauN1l000007' },
  { label: '$25', url: 'https://buy.stripe.com/14AfZheYd9wRbyR4xc00008' },
];

function TipJarPage({ onBack }) {
  return (
    <StaticPage onBack={onBack} eyebrow="Tip jar" title="Keep the community AI budget alive.">
      <ul className="tip-list tip-list--amounts">
        {TIP_AMOUNTS.map(({ label, url }) => (
          <li key={label}>
            <a href={url} target="_blank" rel="noopener noreferrer" className="tip-amount-btn">
              {label}
            </a>
          </li>
        ))}
      </ul>
      <p className="tip-note">One-time card payment · no account needed · Voter Choice never sees your card</p>

      <h2>Where it goes</h2>
      <ul>
        <li><b>Anthropic API spend</b> — the AI chat budget that runs out when too many voters use it at once.</li>
        <li><b>Server + hosting</b> — Vercel + a small Redis instance for rate-limiting.</li>
      </ul>
      <p>Voter Choice is built by <b>Grey Bird LLC</b>. No ads, no tracking, no accounts, no data sales. Tips and small individual contributions are the only revenue.</p>
    </StaticPage>
  );
}

function PrivacyPage({ onBack }) {
  return (
    <StaticPage onBack={onBack} eyebrow="Privacy policy" title="What stays here, what doesn't.">
      <p className="sp-meta">Effective April 12, 2026 · Grey Bird LLC</p>

      <h2>Minimal data collection</h2>
      <p>We do not use analytics, telemetry, tracking pixels, accounts, or sign-ups. Across visits, your browser's localStorage keeps only your <b>language preference</b>, your <b>issues</b>, a <b>county-level location</b> (never your street address), and (optionally) a <b>bring-your-own Anthropic key</b>. Your <b>precise address</b> and your <b>in-progress assessment</b> are kept only for the current browser tab and are cleared when you close it. None of this leaves your device unless you take an action that explicitly sends it.</p>

      <h2>Your address</h2>
      <p>If you enter your street address, it may be used for autocomplete (Google Places) in your browser and is sent to the <b>Google Civic Information API</b> through our server for polling-place and contest lookup. We do not intentionally log or store your address on our servers, and we do not include it in the AI chat prompt. In your browser it is held only for the current tab and cleared when you close it — only a county-level location is kept across visits.</p>

      <h2>Chat conversations</h2>
      <p>Chat exists in browser memory while the page is open. It is not intentionally stored, logged, or persisted by our servers. Messages are sent to the <b>Anthropic API</b> for processing. Don't type your name, exact address, phone, email, or other identifying details into chat. See <a href="https://www.anthropic.com/policies/privacy" target="_blank" rel="noopener noreferrer">Anthropic's privacy policy</a>.</p>

      <h2>Bring-your-own key (BYOK)</h2>
      <p>If you save your own Anthropic API key in Settings, it is stored in your browser's localStorage <i>only</i> and is sent directly from your browser to <code>api.anthropic.com</code>. It does not pass through our server on any code path.</p>

      <h2>What we cannot provide</h2>
      <p>We do not create or store a combined record of who you are, where you live, and what you said in chat. If anyone asked us for "who said what and where they live," we wouldn't have that combined record to give them. This does not prevent disclosure by Google, Anthropic, Vercel, GitHub, or other infrastructure providers under their own policies.</p>

      <h2>Voter profile uploads</h2>
      <p>If you upload a saved profile (.txt) to resume a session, it's used in the current browser session and is not stored on our servers. If you use the built-in AI chat, profile content is sent to Anthropic as context.</p>

      <h2>Rate limiting</h2>
      <p>To prevent abuse, we use IP-based rate limiting. If durable safeguards are configured, counters may be stored in a Redis-compatible service. IP addresses are not intentionally logged for voter profiling or shared.</p>

      <h2>Contact</h2>
      <p>Questions about this policy? <a href="mailto:muxin.li.pro@gmail.com"><code>muxin.li.pro@gmail.com</code></a>.</p>
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
  getByokKey, setByokKey, removeByokKey, BYOK_STORAGE_KEY,
});

/* ==================== prototype-views.jsx ==================== */
/* ====================================================
   VOTER CHOICE · views
   ====================================================
   See the original design prototype's COMPONENT_MAP.md (git history) for repo targets.

   Views own state-shape orchestration and pass repo-shaped
   props down to leaf components (CandidateCard, FunderBars,
   etc.). All data lookups go through the helper functions
   from prototype-data.jsx so the view layer never knows the
   storage layout.
   ==================================================== */

const { useState: useStateV, useEffect: useEffectV, useRef: useRefV } = React;

/* ============ HomeView ============
   Maps to: src/app/page.tsx + src/components/AddressInput.tsx
   Pass C adds: ResumeNudge, HowItWorksWalkthrough, DeadlineMeter strip. */
function HomeView({ savedAddress, savedSession, onSubmit, onResumeFromProfile, onResumeSession, onStartOver, onNavigate, totalRaces = RACES.length }) {
  // Always start the address field empty. We DON'T prefill savedAddress
  // because the user might have typed an exploratory / invalid string
  // last time (or it's stale enough that they'd rather retype). The
  // placeholder shows a realistic example.
  const [addr, setAddr] = useStateV('');
  const [addrWhyOpen, setAddrWhyOpen] = useStateV(false);
  const { t } = useI18n();
  // Phase 2b: restore Google Places autocomplete (the prototype's plain input
  // had none). With the key present the hook mounts a PlaceAutocompleteElement
  // into the container; the <input> becomes the sr-only fallback/ref. No key →
  // plain input.
  const placesContainerRef = useRefV(null);
  const innerInputRef = useRefV(null);
  const hasPlacesKey = !!getPlacesApiKey();
  useGooglePlacesAutocomplete({
    containerRef: placesContainerRef,
    innerInputRef,
    onSelect: setAddr,
    onInputChange: setAddr,
  });
  const hasDraft = savedSession && (
    Object.keys(savedSession.decisions || {}).length > 0 ||
    (savedSession.issues || []).length > 0
  );

  function submit() {
    if (!addr.trim()) return;
    onSubmit(addr.trim());
  }

  return (
    <>
      <AppNav />
      <main id="main-content">
      <section className="hp-hero">
        <div>
          <div className="eyebrow"><span className="star">★</span> November 3, 2026 · America's 250th election</div>
          <h1>Hold Congress to its <em>record.</em></h1>
          <p className="lede">All 435 House seats and 33 Senate seats are on the ballot. Before you vote, see how your incumbents actually voted — and who paid for the campaign.</p>

          <div className="addr-card">
            <label>
              <span className="addr-label-left">
                <span>Your registered address</span>
                <button
                  className="addr-why-btn"
                  onClick={() => setAddrWhyOpen(true)}
                  aria-label="Why do we need your address?"
                  type="button"
                >?</button>
              </span>
              <span className="privacy">Stays on this device</span>
            </label>
            {addrWhyOpen && (
              <div className="be-modal-overlay" onClick={() => setAddrWhyOpen(false)}>
                <div className="addr-why-modal" onClick={(e) => e.stopPropagation()}>
                  <button className="addr-why-close" onClick={() => setAddrWhyOpen(false)} aria-label="Close">×</button>
                  <h4>Why do we need your address?</h4>
                  <p>We use your address to pull local voting information so you know exactly when and where to go vote and what IDs are needed. So you have all the information you need to support or vote against your representative and make a change.</p>
                </div>
              </div>
            )}
            <div className="row">
              {hasPlacesKey && (
                <div
                  ref={placesContainerRef}
                  className="addr-places"
                  style={{ flex: '1 1 auto', minWidth: 0 }}
                />
              )}
              <input
                type="text"
                ref={innerInputRef}
                placeholder="1600 Pennsylvania Ave NW, Washington DC 20500"
                value={addr}
                onChange={(e) => setAddr(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
                style={
                  hasPlacesKey
                    ? { position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }
                    : undefined
                }
              />
              <button className="go" onClick={submit} disabled={!addr.trim()}>Pull my representatives →</button>
            </div>
            <div className="hint">
              <span><span className="dot"></span>No account</span>
              <span><span className="dot"></span>No tracking</span>
              <span><span className="dot"></span>Civic API · address never stored</span>
            </div>
          </div>

          {hasDraft && (
            <ResumeNudge
              saved={savedSession}
              totalRaces={totalRaces}
              onResume={onResumeSession}
              onStartOver={onStartOver}
            />
          )}
        </div>

        <div className="stat-stack">
          <div className="stat">
            <div className="v">6<small>hrs / day</small></div>
            <div className="l">average time a member of Congress spends fundraising, per training materials shown to incoming freshmen.</div>
            <div className="cite">Source · Issue One, 2024 · CBS 60 Minutes</div>
          </div>
          <div className="stat alt">
            <div className="v">94<small>%</small></div>
            <div className="l">of House incumbents who ran for re-election in 2024 won. Without a record check, every November is a coin flip.</div>
            <div className="cite">Source · OpenSecrets · FEC filings</div>
          </div>
        </div>
      </section>

      <HowItWorksWalkthrough />
      </main>

      <AppFooter />
    </>
  );
}

/* ============ LoadingView ============
   Two contexts share the same loader chrome:
   - variant="ballot" (default): the address→ballot step ("Pulling your ballot").
   - variant="analyzing": the post-lock-in step, where we fetch each candidate's
     voting record + funding from the real backend and score it against the
     voter's ranked issues. Reusing the address copy here was wrong — the steps
     describe analysis, not geocoding. */
function LoadingView({ address, onDone, variant = 'ballot' }) {
  const analyzing = variant === 'analyzing';
  const [step, setStep] = useStateV(0);
  const steps = analyzing
    ? [
        'Reading your ranked issues',
        "Pulling each candidate's voting record",
        'Scoring alignment with your issues',
        'Loading donor & funding data',
      ]
    : [
        'Geocoding address',
        'Looking up your precinct',
        'Pulling federal & state races',
        'Loading donor history',
      ];

  useEffectV(() => {
    if (step >= steps.length) {
      const t = setTimeout(onDone, 350);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setStep(s => s + 1), 600);
    return () => clearTimeout(t);
  }, [step]);

  return (
    <>
      <AppNav />
      <div className="loading-screen">
        <div className="loading-card">
          <div className="pulse"></div>
          <h2>{analyzing ? 'Analyzing the candidates.' : 'Pulling your representatives.'}</h2>
          <div className="addr">
            {analyzing ? 'Matching their records to your priorities' : address}
          </div>
          <ul>
            {steps.map((s, i) => (
              <li key={i} className={i < step ? 'done' : (i === step ? 'active' : '')}>
                <span className="ck"></span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}

/* Map the LLM theme-extraction output (parseThemeExtraction → Theme[]) into the
   issue shape the cold-open UI + scoring already consume:
   - IssueRow renders `interpretation` + `quotes:[{label,text}]`
   - toApiIssues() (realData) reads `canonicalIssue` + `interpretation` + `stance`
     to build the /api/race-data call. `canonicalIssue` may be undefined → that
     issue is dropped from scoring (and flagged "not scored" in the row).
   - `stance` stays the model's enum ("in_favor"|"opposed"); toStance() handles it. */
function themesToIssues(themes, userText) {
  return themes.map((t, i) => ({
    sourceType: 'freeText',
    sourceText: userText,
    rank: i + 1,
    interpretation: t.name,
    canonicalIssue: t.canonicalIssue,
    stance: t.stance,
    confidence: 'clear',
    quotes: (t.quotes || []).map((text, qi) => ({ label: qi === 0 ? 'example' : 'and', text })),
  }));
}

/* ============ ColdOpenView ============
   Maps to: src/components/ColdOpenInput.tsx + ConcernInterpretation.tsx

   onLock receives an array of ConcernInterpretationEntry-shaped
   objects (with the design-delta `quotes` field). */
function ColdOpenView({ address, onLock, savedIssues, contextNote }) {
  const [phase, setPhase] = useStateV(savedIssues && savedIssues.length ? 'review' : 'prompt');
  const [draft, setDraft] = useStateV('');
  const [submittedText, setSubmittedText] = useStateV('');
  const [issues, setIssues] = useStateV(savedIssues || []);
  const [thinking, setThinking] = useStateV(false);
  const [error, setError] = useStateV(null);

  function fillSample() { setDraft(SAMPLE_LONGFORM); }

  /* Real LLM extraction: stream /api/chat with the theme-extraction prompt,
     accumulate the reply, parse it to themes, and map them to issues. On ANY
     failure we return to the 'prompt' phase with `draft` intact and show an
     honest error banner — the retry is just clicking Send again. No sample
     fallback (honest-state contract). */
  function send() {
    const userText = draft.trim();
    if (!userText) return;
    setSubmittedText(userText);
    setError(null);
    setThinking(true);
    setPhase('thinking');

    let acc = '';
    streamChatReply(
      {
        messages: [{ role: 'user', content: userText }],
        systemPrompt: buildThemeExtractionPrompt({ userInput: userText }),
        sessionId: getChatSessionId(),
        messageCount: 1,
      },
      {
        onText: (chunk) => { acc += chunk; },
        onDone: () => {
          try {
            const themes = parseThemeExtraction(acc);
            if (!themes.length) {
              setError('I couldn’t pull any issues from that — try adding a bit more about what’s on your mind.');
              setThinking(false);
              setPhase('prompt');
              return;
            }
            setIssues(themesToIssues(themes, userText));
            setThinking(false);
            setPhase('review');
          } catch {
            setError('Something went wrong reading that — please try again.');
            setThinking(false);
            setPhase('prompt');
          }
        },
        onError: (_reason, meta) => {
          const blk = meta?.code ? resolveChatBlock(meta.code) : { budget: false, message: null };
          const msg = blk.budget
            ? 'The AI usage limit has been reached for now — please try again later.'
            : (blk.message || 'I couldn’t read your message just now — please try again.');
          setError(msg);
          setThinking(false);
          setPhase('prompt');
        },
      },
    );
  }

  function moveIssue(idx, dir) {
    const next = [...issues];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    // re-rank (1-based)
    next.forEach((it, i) => { it.rank = i + 1; });
    setIssues(next);
  }

  /* Move a row from `from` to `to` — used by the drag handle.
     Unlike moveIssue() which swaps adjacent rows, this splices so
     a single long drag can travel multiple slots in one motion. */
  function reorderIssue(from, to) {
    if (from === to) return;
    const next = [...issues];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    next.forEach((it, i) => { it.rank = i + 1; });
    setIssues(next);
  }

  function rename(idx, interpretation) {
    const next = [...issues];
    next[idx] = { ...next[idx], interpretation };
    setIssues(next);
  }

  function remove(idx) {
    const next = issues.filter((_, i) => i !== idx);
    next.forEach((it, i) => { it.rank = i + 1; });
    setIssues(next);
  }

  function startOver() {
    setPhase('prompt');
    setDraft(submittedText);
    setSubmittedText('');
    setIssues([]);
    setError(null);
  }

  function lockIn() {
    if (issues.length === 0) return;
    onLock(issues);
  }

  return (
    <>
      <AppNav />
      <div className="coldopen">
        <div className="co-context"><b>{address}</b> · {contextNote || `${RACES.length} ${RACES.length === 1 ? 'race' : 'races'} on your ballot`}</div>

        <div className="msg ai">
          <div className="who">Voter Choice · AI</div>
          <div className="bubble">
            <p>I've pulled your representatives' names. Before I walk you through their record, I want to know what you're judging them on.</p>
            <p style={{ marginTop: '10px' }}><b>What's been on your mind this year?</b> Things you wish Congress would actually do something about. Frustrations, hopes, fights you've watched in your community. Type as much or as little as you want.</p>
          </div>
        </div>

        {phase === 'prompt' && (
          <>
            <div className="co-input">
              <textarea
                placeholder="Things that have been on your mind. Frustrations, hopes, fights you've watched in your community…"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
              <div className="row">
                <span className="hint">Auto-saving to your device · nothing leaves your browser yet</span>
                <button className="send" onClick={send} disabled={!draft.trim()}>Send →</button>
              </div>
              {error && (
                <div style={{ marginTop: '8px', fontSize: '13px', color: 'var(--danger, #b3261e)' }}>{error}</div>
              )}
            </div>
            <div className="starter-chips" style={{ marginTop: '12px', marginLeft: '4px' }}>
              <button className="sc" onClick={fillSample}>Not sure where to start — show me an example</button>
              <button className="sc">Use a starter profile</button>
            </div>
          </>
        )}

        {(phase === 'thinking' || phase === 'review') && (
          <>
            <div className="msg user">
              <div className="who">You</div>
              <div className="bubble">{submittedText}</div>
            </div>

            <div className="msg ai">
              <div className="who">Voter Choice · AI</div>
              <div className="bubble">
                {thinking ? (
                  <p style={{ color: 'var(--ink-2)', fontStyle: 'italic' }}>Reading what you wrote — pulling out the issues I hear…</p>
                ) : (
                  <p>Here are <b>{issues.length} starter issue{issues.length !== 1 ? 's' : ''}</b> to work from. Re-rank, rename, or remove so they match what you care about. Once you lock these in, every candidate's record gets scored against this list, vote by vote.</p>
                )}
              </div>
            </div>

            {phase === 'review' && (
              <div className="themes-card">
                <div className="th-head">
                  <h4>Starter issues — make them yours.</h4>
                  <span className="of">{issues.length} issues · edit freely</span>
                </div>
                <p className="th-sub">Use the arrows to re-rank · click a name to rename · I show my work so you can correct me.</p>

                {issues.map((iss, i) => (
                  <IssueRow
                    key={`${i}-${iss.canonicalIssue || iss.interpretation || iss.sourceText}`}
                    issue={iss}
                    index={i}
                    total={issues.length}
                    onMoveUp={() => moveIssue(i, -1)}
                    onMoveDown={() => moveIssue(i, 1)}
                    onReorderTo={reorderIssue}
                    onRename={(name) => rename(i, name)}
                    onRemove={() => remove(i)}
                  />
                ))}

                <div className="th-foot">
                  <button className="secondary" onClick={startOver}>← Let me rewrite my message</button>
                  <button className="lock" onClick={lockIn} disabled={issues.length === 0}>Lock these in &amp; start the ballot →</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

/* ============ WorkspaceView ============
   Maps to: src/components/ResearchLayout.tsx (the 3-pane shell)
            src/components/BallotToolClient.tsx (state owner)
            src/components/ChatPanel.tsx (center column)
            src/components/BallotPane.tsx (right column)

   This view orchestrates the 3-pane layout and pulls
   structured-block-shaped data from helpers in prototype-data.jsx
   to feed CandidateCard. */
// F8: the chat route's prompt forbids markdown, but the model still emits
// **bold** / *italic* / `code` occasionally, and the bubble renders raw text —
// so strip the common markers at render so the voter never sees literal
// asterisks. Plain prose only.
function stripChatMd(s) {
  if (!s) return s;
  return s
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1$2')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '');
}

// Pass-C: map a server block `code` (surfaced by streamChatReply's onError meta)
// to a chat-specific banner message. Codes NOT in this map (AI_ERROR, unknown,
// missing) intentionally resolve to null → caller keeps the generic
// "AI is taking longer" retry banner. English-only by design (the banner's
// title/retry stay localized via t(); only this body is block-specific).
const CHAT_BLOCK_MESSAGES = {
  RATE_LIMIT_UNAVAILABLE: 'Chat is briefly unavailable — please try again in a moment.',
  DAILY_LIMIT: "You've reached today's chat session limit. Copy your prompt to continue in another chatbot.",
  SESSION_LIMIT: "You've reached this session's message limit.",
  CONCURRENT_LIMIT: 'Too many chat sessions open at once — close other tabs and retry.',
  API_OVERLOADED: 'The AI is busy right now — try again in a moment.',
  API_RATE_LIMIT: 'The AI is busy right now — try again in a moment.',
};

// Budget block codes route to the BudgetExhaustedModal (handoff), not a banner.
const CHAT_BUDGET_CODES = new Set(['BUDGET_SOFT_CLOSE', 'BUDGET_HANDOFF', 'BUDGET_EXHAUSTED']);

// Resolve a block `code` → { budget } (open the budget modal) OR a banner
// `message` string (null = generic retry banner).
function resolveChatBlock(code) {
  if (code && CHAT_BUDGET_CODES.has(code)) return { budget: true, message: null };
  return { budget: false, message: (code && CHAT_BLOCK_MESSAGES[code]) || null };
}

function WorkspaceView({ address, issues, decisions, activeRaceId, onDecide, onUnpick, onSelectRace, onPrint, onEditIssues, onSaveProfile, onContinueElsewhere, budgetExhausted, onOpenByok, onNavigate, chatMessages, onSendChat, chatTimeouts, onRetryChat, onCompare, onSeeAllVotes, amendDeltas, onClearDelta, blindMode, revealedCandidates, onRevealCandidate, onHideCandidate, onToggleBlindMode }) {
  const races = RACES;
  const activeRace = races.find(r => r.id === activeRaceId) || races[0];
  const activeIdx = races.findIndex(r => r.id === activeRace.id);
  const decision = decisions[activeRace.id];

  const [mobileChatOpen, setMobileChatOpen] = useStateV(() => {
    if (typeof window !== 'undefined' && window.__autoOpenChat) {
      window.__autoOpenChat = false;
      return true;
    }
    return false;
  });

  // Fix B: write-in text inputs keyed by "raceId::slotName" so each slot
  // has its own controlled value without hooks inside map callbacks.
  const [writeInTexts, setWriteInTexts] = useStateV({});

  useEffectV(() => { setMobileChatOpen(false); }, [activeRace.id]);

  function selectAndOpenChat(raceId) {
    onSelectRace(raceId);
    setTimeout(() => setMobileChatOpen(true), 0);
  }

  const decidedCount = Object.keys(decisions).length;
  const progressPct = Math.round((decidedCount / races.length) * 100);

  const sections = {};
  races.forEach(r => {
    if (!sections[r.section]) sections[r.section] = [];
    sections[r.section].push(r);
  });

  // Vote-for-N aware. A race elects `voteForN` seats (1 for single-winner);
  // the voter may pick up to that many candidates. Picking an already-picked
  // candidate toggles it off. We only auto-advance once every seat is filled,
  // so a "vote for two" race never strands the voter after a single pick.
  function commitPick(candidate, why) {
    const seats = activeRace.voteForN || 1;
    const prev = decisions[activeRace.id];
    const prevPicks = prev?.picks
      ? prev.picks
      : (prev?.candidateName
          ? [{ candidateName: prev.candidateName, party: prev.party || null, why: prev.why || '' }]
          : []);
    const party = getCandidateParty(activeRace.id, candidate.name)?.code || null;
    const entry = { candidateName: candidate.name, party, why: why.trim() };
    let picks;
    if (prevPicks.some(p => p.candidateName === candidate.name)) {
      picks = prevPicks.filter(p => p.candidateName !== candidate.name); // toggle off
    } else if (seats <= 1) {
      picks = [entry]; // single-seat: replace
    } else if (prevPicks.length < seats) {
      picks = [...prevPicks, entry]; // multi-seat with room: add
    } else {
      picks = [...prevPicks.slice(1), entry]; // full: drop oldest, add (swap)
    }
    if (picks.length === 0) {
      onUnpick(activeRace.id);
      return;
    }
    onDecide(activeRace.id, {
      picks,
      pick: picks.map(p => p.candidateName).join(' + '),
      candidateName: picks[0].candidateName,
      party: picks[0].party,
      why: picks[0].why,
    });
    setMobileChatOpen(false);
    if (picks.length >= seats) {
      setTimeout(() => {
        const nextIdx = races.findIndex((r, i) => i > activeIdx && !decisions[r.id] && r.id !== activeRace.id);
        if (nextIdx >= 0) onSelectRace(races[nextIdx].id);
      }, 600);
    }
  }

  function voteProp(value) {
    onDecide(activeRace.id, { pick: value, party: null, why: '', candidateName: null });
    setMobileChatOpen(false);
    setTimeout(() => {
      const nextIdx = races.findIndex((r, i) => i > activeIdx && !decisions[r.id] && r.id !== activeRace.id);
      if (nextIdx >= 0) onSelectRace(races[nextIdx].id);
    }, 600);
  }

  function skipRace() {
    const nextIdx = (activeIdx + 1) % races.length;
    onSelectRace(races[nextIdx].id);
  }

  // Determine race type: a race is a proposition ONLY when its section is a
  // proposition-type section. An empty candidate list on a Federal/State/County
  // race means the extraction couldn't read the candidates — show an honest
  // "couldn't read" branch instead of mislabelling it a proposition (Fix A).
  const isProposition = PROP_SECTIONS.has(activeRace.section);
  // True when: not a proposition AND the candidate list is empty (extraction gap).
  const isEmptyNonPropRace = !isProposition && (!activeRace.candidates || activeRace.candidates.length === 0);

  // Local state for the chat input field
  const [chatInput, setChatInput] = useStateV('');
  function handleSend() {
    const t = chatInput.trim();
    if (!t) return;
    onSendChat(activeRace.id, t);
    setChatInput('');
  }

  // For choice races, pull rich candidate data via helpers
  const racePatterns  = getRacePatternsForRace(activeRace.id);
  const alignmentBlk  = getAlignmentScoresForRace(activeRace.id);
  const richCandidates = racePatterns?.candidates || [];

  const showResumeBar = !decision && activeRace;

  // Pillar 3: build polling info from live BallotLogistics. When civic
  // returned nothing (no-contest NJ path) logistics.pollingPlace is null →
  // show the honest "Find your polling place at vote.gov" fallback.
  // The congressional district is derived from the ballot extraction's House
  // race label when civic didn't carry a House contest (the NJ case).
  const logistics = getBallotLogistics();
  // Real per-state election data (verified deadlines, early voting, voter
  // ID, statutory polling hours). Async — the fallback shape renders until
  // it resolves; resources overlay applies to both.
  const [realStateData, setRealStateData] = useStateV(null);
  useEffectV(() => {
    let active = true;
    const sc = getRealStateCode();
    if (!sc) { setRealStateData(null); return undefined; }
    getStateData(sc).then((d) => { if (active && d) setRealStateData(d); });
    return () => { active = false; };
  }, [getRealStateCode()]);
  const sdBase = realStateData || getFallbackStateData(getRealStateCode() || '');
  // Prefer the real per-state resources (voter.svrs.nj.gov, county lookup) loaded
  // by applyRealStateResources over getFallbackStateData's vote.gov placeholders.
  const realResWs = getRealStateResources();
  const sd = realResWs ? { ...sdBase, resources: { ...sdBase.resources, ...realResWs } } : sdBase;
  // District: prefer logistics (civic), fall back to ballot extraction.
  const houseRaceWs = races.find(r => /house/i.test(r.label || ''));
  const districtCodeWs = (logistics && logistics.congressionalDistrict)
    || (houseRaceWs ? deriveDistrictCode(houseRaceWs.label, getRealStateCode() || '') : null)
    || '';
  // Early window: prefer logistics, fall back to stateData.
  const earlyWindowWs = (() => {
    if (logistics && logistics.earlyVoting) {
      return `${logistics.earlyVoting.start} – ${logistics.earlyVoting.end}`;
    }
    if (sd.earlyVoting && sd.earlyVoting.available && sd.earlyVoting.startDate) {
      return `${sd.earlyVoting.startDate} – ${sd.earlyVoting.endDate || ''}`;
    }
    return '';
  })();
  const pollingInfoWs = logistics && logistics.pollingPlace ? {
    name: logistics.pollingPlace.name,
    address: logistics.pollingPlace.address,
    hours: logistics.pollingPlace.hours || '',
    notes: logistics.pollingPlace.notes || '',
    precinct: '',
    district: districtCodeWs || '',
    bring: '',
    earlyWindow: earlyWindowWs,
  } : {
    // Honest fallback — no civic place; the panel links to the real per-state
    // polling-place lookup (sd.resources.pollingPlaceLookup), NOT vote.gov.
    name: 'Look up your polling place',
    address: '',
    // Use statutory hours from state data when available (upload/paste path).
    hours: sd?.votingRules?.pollingHours || '',
    notes: '',
    precinct: '',
    district: districtCodeWs || '',
    bring: '',
    earlyWindow: earlyWindowWs,
  };

  return (
    <div className="ws-shell">
      <AppNav />
      <PollingStatusBar
        pollingInfo={pollingInfoWs}
        stateData={sd}
        rows={[]}
      />
      <div className="ws-wrap" data-mobile-chat={mobileChatOpen ? 'open' : 'closed'}>

        {/* LEFT RAIL */}
        <aside className="ws-rail">
          <div className="progress">
            <div className="top"><span>Progress</span><span>{decidedCount} / {races.length}</span></div>
            <div className="big">{progressPct}% decided</div>
            <div className="bar"><div className="fill" style={{ width: progressPct + '%' }}></div></div>
          </div>

          <div className="priorities">
            <div className="top">
              <span className="lab">Your issues</span>
              <button className="edit" onClick={onEditIssues}>Edit</button>
            </div>
            <ol>
              {issues.map(iss => <li key={iss.canonicalIssue}>{iss.interpretation}</li>)}
            </ol>
          </div>

          {Object.entries(sections).map(([section, rs]) => (
            <div key={section}>
              <div className="seclabel">{section}</div>
              <ul className="race-list">
                {rs.map(r => {
                  const isActive = r.id === activeRace.id;
                  const isDone = !!decisions[r.id];
                  return (
                    <li
                      key={r.id}
                      className={(isDone ? 'done ' : '') + (isActive ? 'active' : '')}
                      onClick={() => onSelectRace(r.id)}
                    >
                      <span className="ind"></span>
                      <span>{r.label.replace(/^U\.S\.\s+/, '')}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          {/* NOTE: the prototype duplicated this rail section-list verbatim
              (a copy-paste bug that rendered every race twice). Removed. */}

          <div className="foot">
            <a onClick={() => { if (confirm('Restart session? This clears your draft ballot and issues.')) window.__voterChoiceReset && window.__voterChoiceReset(); }} role="link" tabIndex={0}>Restart session</a>
            <a onClick={() => { const nav = window.__navigate; nav && nav('methodology'); }} role="link" tabIndex={0}>Methodology</a>
          </div>
        </aside>

        {/* CHAT CENTER */}
        <section className="ws-chat">
          <header className="head">
            <button
              className="ws-mobile-back ws-mobile-back-hide-desktop"
              onClick={() => setMobileChatOpen(false)}
              aria-label="Back to ballot"
            >←</button>
            <div className="title">
              <small>Race {activeIdx + 1} of {races.length}</small>
              {activeRace.label}
            </div>
            <div className="h-act">
              {!isProposition && (
                <button
                  className={"blind-toggle " + (blindMode ? 'on' : 'off')}
                  onClick={onToggleBlindMode}
                  title={blindMode ? 'Show candidate names' : 'Hide candidate names'}
                >
                  <svg className="blind-toggle-ic" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    {blindMode ? (
                      <>
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-10-8-10-8a18.45 18.45 0 0 1 5.06-5.94" />
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19" />
                        <path d="M1 1l22 22" />
                      </>
                    ) : (
                      <>
                        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                        <circle cx="12" cy="12" r="3" />
                      </>
                    )}
                  </svg>
                  <span className="lab">{blindMode ? 'Blind' : 'Names'}</span>
                </button>
              )}
              <button onClick={skipRace}>Skip</button>
              {!isProposition && <button onClick={onCompare}>Compare</button>}
            </div>
          </header>

          {/* Pillar 1: non-blocking low-confidence caution. Shown only when the
              uploaded PDF was large-format (dense/tabloid layout) where
              candidate text may be less reliable. Never blocks the ballot. */}
          {getLowConfidenceExtraction() && (
            <div
              className="low-confidence-caution"
              role="status"
              data-testid="low-confidence-caution"
              style={{
                background: 'oklch(0.97 0.04 85)',
                borderLeft: '3px solid oklch(0.75 0.12 85)',
                padding: '10px 14px',
                margin: '0 0 4px',
                fontSize: '13px',
                lineHeight: '1.55',
                color: 'var(--ink-2, #555)',
              }}
            >
              <b>Low confidence — verify names:</b> this ballot's layout is
              large-format or dense, which can affect text recognition. Please
              double-check candidate names against your{' '}
              <a
                href={sd.resources?.sampleBallotLookup || 'https://vote.gov/'}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'inherit', textDecoration: 'underline' }}
              >
                official sample ballot
              </a>
              {' '}before deciding.
            </div>
          )}

          <div className="body">
            {!isProposition && richCandidates.map((cand, idx) => {
              const alignmentEntry = alignmentBlk?.entries?.find(e => e.candidateId === cand.id);
              const party = getCandidateParty(activeRace.id, cand.name);
              const isPicked = decision?.picks
                ? decision.picks.some(p => p.candidateName === cand.name)
                : decision?.candidateName === cand.name;
              const isBlind = blindMode && !revealedCandidates?.has(cand.id);
              const alias = String.fromCharCode(65 + idx); // A, B, C

              // Compute peer totals so each FunderBars can show how much more
              // or less this candidate raised vs the others in the race.
              const peerTotals = richCandidates.map((c, i) => {
                const peerBlind = blindMode && !revealedCandidates?.has(c.id);
                return {
                  id: c.id,
                  total: c.totalRaised || 0,
                  fundingMix: c.fundingMix || null,
                  aliasOrName: peerBlind ? `Candidate ${String.fromCharCode(65 + i)}` : c.name.split(' ').pop(),
                };
              });

              return (
                <div className="msg ai" key={cand.id}>
                  <div className="who">Voter Choice · AI</div>
                  <div className="bubble">
                    {idx === 0 ? (
                      isBlind
                        ? <p>{richCandidates.length} candidate{richCandidates.length === 1 ? '' : 's'} for <b>{activeRace.label}</b>{(activeRace.voteForN || 1) > 1 ? ` — vote for ${activeRace.voteForN}` : ''}. I'm hiding their names so you decide on the record, not the brand. Here's <b>Candidate {alias}</b>:</p>
                        : <p>This is <b>{activeRace.label}</b>{(activeRace.voteForN || 1) > 1 ? `, vote for ${activeRace.voteForN}` : ''}. {richCandidates.length} on your ballot. Here's the {cand.incumbent ? 'incumbent' : 'longer-tenure candidate'} — each percentage is clickable to see the votes behind it.</p>
                    ) : (
                      isBlind
                        ? <p>And <b>Candidate {alias}</b>:</p>
                        : <p>And the {cand.incumbent ? 'incumbent' : (alignmentEntry?.scores === null ? 'challenger — no legislative record yet' : 'challenger')}:</p>
                    )}
                    <CandidateCard
                      candidate={cand}
                      alignmentEntry={alignmentEntry}
                      userIssues={issues}
                      party={party}
                      picked={isPicked}
                      onPick={() => {
                        // F10: only claim a record-based reason when the candidate
                        // actually has a scored voting record. No-record candidates
                        // (challengers, local offices) get an honest neutral note —
                        // never a fabricated "strongest record on X".
                        const hasRecord = !!(alignmentEntry && alignmentEntry.scores && alignmentEntry.scores.length > 0);
                        const topIssue = issues[0]?.interpretation || 'my priorities';
                        const label = isBlind ? `Candidate ${alias}` : cand.name.split(' ').pop();
                        const why = hasRecord
                          ? `${label} — strongest record on ${topIssue}.`
                          : `${label} — my pick; no voting record on file to score.`;
                        commitPick(cand, why);
                      }}
                      onUnpick={() => onUnpick(activeRace.id, cand.name)}
                      onSeeAllVotes={() => onSeeAllVotes({ candidate: cand, alignmentEntry, blindMode: isBlind, alias })}
                      blindMode={isBlind}
                      globalBlindMode={blindMode}
                      isRevealed={blindMode && !isBlind}
                      alias={`Candidate ${alias}`}
                      onReveal={() => onRevealCandidate(cand.id)}
                      onHide={() => onHideCandidate(cand.id)}
                      peerTotals={peerTotals}
                      raceId={activeRace.id}
                    />
                  </div>
                </div>
              );
            })}

            {/* Fix B: write-in affordance for vote-for-N races with open seats.
                Show one selectable "Write-in" entry per remaining open seat
                when the extraction included write_in slots. Each slot has a
                distinct key ("Write-in 1", "Write-in 2") so commitPick's
                toggle logic doesn't conflate them. writeInTexts state is
                declared at WorkspaceView level (no hooks inside map). */}
            {!isProposition && !isEmptyNonPropRace && (activeRace.writeInSlots > 0) && (() => {
              const seats = activeRace.voteForN || 1;
              const writeInSlots = activeRace.writeInSlots;
              // Build distinct write-in slot names so toggle dedup works correctly.
              const writeInNames = Array.from({ length: writeInSlots }, (_, i) =>
                writeInSlots === 1 ? 'Write-in' : `Write-in ${i + 1}`
              );
              return writeInNames.map((wiName) => {
                const isPicked = decision?.picks
                  ? decision.picks.some(p => p.candidateName === wiName)
                  : decision?.candidateName === wiName;
                const wiKey = `${activeRace.id}::${wiName}`;
                const wiText = writeInTexts[wiKey] || '';
                return (
                  <div className="msg ai" key={wiName}>
                    <div className="who">Voter Choice · AI</div>
                    <div className="bubble">
                      <p>
                        <b>✎ Write-in</b> — this race has {seats > 1 ? `${seats} seats` : 'a seat'} open for a write-in candidate.
                        {seats > 1 && ` You can fill up to ${seats} picks total.`}
                      </p>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginTop: '6px' }}>
                        <input
                          type="text"
                          placeholder="Candidate name…"
                          value={wiText}
                          onChange={e => setWriteInTexts(prev => ({ ...prev, [wiKey]: e.target.value }))}
                          style={{
                            flex: '1 1 160px',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            border: '1px solid var(--border, #ddd)',
                            fontSize: '14px',
                          }}
                          aria-label={`Write-in name for ${activeRace.label}`}
                        />
                        <button
                          style={{
                            padding: '6px 14px',
                            borderRadius: '6px',
                            border: '1px solid var(--border, #ddd)',
                            background: isPicked ? 'var(--accent, #2563eb)' : 'transparent',
                            color: isPicked ? '#fff' : 'inherit',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: 600,
                          }}
                          onClick={() => {
                            const name = wiText.trim() || wiName;
                            commitPick({ id: wiName, name }, `${name} — write-in pick.`);
                          }}
                        >
                          {isPicked ? 'Selected ✓' : 'Select write-in'}
                        </button>
                        {isPicked && (
                          <button
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: 'var(--ink-2)' }}
                            onClick={() => onUnpick(activeRace.id, wiName)}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              });
            })()}

            {isProposition && (
              <div className="msg ai">
                <div className="who">Voter Choice · AI</div>
                <div className="bubble">
                  {activeRace.section === 'Judicial Retention' ? (
                    <p>This is a judicial retention question — should this judge stay in office?</p>
                  ) : (
                    <p>This is <b>{activeRace.label}</b>, a ballot proposition. Here's what's at stake:</p>
                  )}
                  <PropositionCard
                    race={activeRace}
                    decision={decision?.pick}
                    onVote={(v) => voteProp(v)}
                    onUnvote={() => onUnpick(activeRace.id)}
                  />
                </div>
              </div>
            )}

            {isEmptyNonPropRace && (
              <div className="msg ai">
                <div className="who">Voter Choice · AI</div>
                <div className="bubble">
                  <p>We couldn't read the candidates for <b>{activeRace.label}</b> — the ballot text for this race may be unclear or missing. Please check your{' '}
                    <a href={sd.resources?.sampleBallotLookup || 'https://vote.gov/'} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>official sample ballot</a>{' '}
                    to see who's running.
                  </p>
                </div>
              </div>
            )}

            {/* Pass-B: appended user/AI chat messages */}
            {(chatMessages?.[activeRace.id] || []).map((msg, i) => (
              <div key={'cm-' + i} className={'msg ' + msg.who}>
                <div className="who">{msg.who === 'user' ? 'You' : 'Voter Choice · AI'}</div>
                <div className="bubble">{msg.who === 'user' ? msg.text : stripChatMd(msg.text)}</div>
              </div>
            ))}

            {/* Pass-C: AI timeout / error inline */}
            {chatTimeouts && chatTimeouts[activeRace.id] && (
              <AITimeoutBanner
                onRetry={() => onRetryChat && onRetryChat(activeRace.id)}
                onHandoff={onContinueElsewhere}
                message={typeof chatTimeouts[activeRace.id] === 'string' ? chatTimeouts[activeRace.id] : undefined}
              />
            )}

            {/* Pass-B: amend delta + rescore offer (shows once after Apply) */}
            {amendDeltas && amendDeltas.length > 0 && (
              <>
                <AmendDeltaMessage
                  deltas={amendDeltas}
                  onRevisit={(rid) => { onSelectRace(rid); onClearDelta(); }}
                />
                <AmendRescoreOffer
                  revisitCount={amendDeltas.filter(d => d.significant).length}
                  onWalkthrough={() => {
                    const first = amendDeltas.find(d => d.significant);
                    if (first) onSelectRace(first.raceId);
                    onClearDelta();
                  }}
                  onDismiss={onClearDelta}
                />
              </>
            )}

            {decision && (
              <div className="msg ai">
                <div className="who">Voter Choice · AI</div>
                <div className="bubble">
                  <p>Logged: <b>{decision.pick}{decision.party ? ` (${decision.party})` : ''}</b> for {activeRace.label}.</p>
                  {decision.why && <p style={{ fontStyle: 'italic', color: 'var(--ink-2)' }}>"{decision.why}"</p>}
                  {(() => {
                    const seats = activeRace.voteForN || 1;
                    const have = decision.picks ? decision.picks.length : 1;
                    const note = { marginTop: '8px', fontSize: '13.5px', color: 'var(--ink-2)' };
                    if (seats > 1 && have < seats) {
                      return <p style={note}>This race elects {seats}. You've picked {have} — choose {seats - have} more above, or move on.</p>;
                    }
                    return <p style={note}>You can edit the note in the ballot pane any time. Or jump to a different race.</p>;
                  })()}
                </div>
              </div>
            )}
          </div>

          <div className="ws-input">
            <div className="chips">
              <button className="chip">Show me {(() => {
                const firstC = richCandidates[0];
                if (!firstC) return 'the incumbent';
                const isFirstBlind = blindMode && !revealedCandidates?.has(firstC.id);
                if (isFirstBlind) return 'Candidate A';
                return firstC.name?.split(' ').pop() || 'the incumbent';
              })()}'s key votes</button>
              <button className="chip">Compare donor bases</button>
              <button className="chip" onClick={skipRace}>Skip — I've decided</button>
            </div>
            <div className="input-row">
              <input
                type="text"
                placeholder={`Ask anything about ${activeRace.label}…`}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
              />
              <button className="send" onClick={handleSend} disabled={!chatInput.trim()}>Send</button>
            </div>
            <div className="meta">
              <span>Auto-saving to your device · nothing leaves your browser</span>
              <span>Race {activeIdx + 1} / {races.length}</span>
            </div>
          </div>
        </section>

        {/* RIGHT BALLOT PANE — primary on mobile */}
        <aside className="ws-ballot">
          {showResumeBar && (
            <div className="ws-mobile-resume" style={{ display: 'none' }} data-show-on-mobile>
              <div className="l">
                <div className="lab">Currently deciding</div>
                <div className="name">{activeRace.label}</div>
              </div>
              <button className="resume" onClick={() => setMobileChatOpen(true)}>Resume <span>→</span></button>
            </div>
          )}
          <style dangerouslySetInnerHTML={{ __html: `
            @media (max-width: 767px) { [data-show-on-mobile] { display: flex !important; } }
          `}} />

          <BallotPaneInner
            races={races}
            decisions={decisions}
            activeRaceId={activeRace.id}
            address={address}
            issues={issues}
            onEditIssues={onEditIssues}
            onSelectRace={selectAndOpenChat}
            onPrint={onPrint}
            onSaveProfile={onSaveProfile}
            onContinueElsewhere={onContinueElsewhere}
            budgetExhausted={budgetExhausted}
            onOpenByok={onOpenByok}
            onNavigate={onNavigate}
          />
        </aside>
      </div>
    </div>
  );
}

/* Inner content for the ballot pane.
   Identical to BallotPane in prototype-components.jsx minus the
   outer <aside>; lets the workspace wrap the Resume bar around it
   for mobile.

   Maps to: src/components/BallotPane.tsx */
function BallotPaneInner({ races, decisions, activeRaceId, address, issues, onEditIssues, onSelectRace, onPrint, onSaveProfile, onContinueElsewhere, budgetExhausted, onOpenByok, onNavigate }) {
  const decidedCount = Object.keys(decisions).length;
  const totalCount = races.length;
  const canPrint = decidedCount > 0;

  const sections = {};
  races.forEach(r => {
    if (!sections[r.section]) sections[r.section] = [];
    sections[r.section].push(r);
  });

  return (
    <>
      <div className="b-head">
        <div className="row">
          <h3>Your ballot</h3>
          <span className="sub">{decidedCount}/{totalCount} · Draft</span>
        </div>
        <address>{address || '—'}</address>
      </div>

      {/* Mobile/tablet edit-issues entry — the left rail (which holds
          "Your issues · Edit" on desktop) is hidden below 1024px, so
          surface the same affordance here. Hidden on desktop via CSS. */}
      {onEditIssues && issues && issues.length > 0 && (
        <div className="b-issues-edit">
          <div className="b-issues-head">
            <span className="b-issues-lab">Your issues</span>
            <button className="b-issues-btn" onClick={onEditIssues}>Edit ranking →</button>
          </div>
          <ol className="b-issues-list">
            {issues.map((iss, i) => (
              <li key={i}><span className="n">{i + 1}</span>{iss.interpretation}</li>
            ))}
          </ol>
        </div>
      )}

      <div className="b-list">
        {Object.entries(sections).map(([section, rs]) => (
          <div key={section}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--ink-3)', padding: '14px 0 4px' }}>{section}</div>
            {rs.map(r => {
              const d = decisions[r.id];
              const isActive = r.id === activeRaceId;
              const isDone = !!d;
              return (
                <div
                  key={r.id}
                  className={"b-row " + (isDone ? "done " : "pending ") + (isActive ? "active " : "")}
                  onClick={() => onSelectRace(r.id)}
                >
                  <div className="ck" />
                  <div>
                    <div className="race">{r.label}</div>
                    <div className="pick">{isDone ? (d.pick + (d.party ? ' (' + d.party + ')' : '')) : (isActive ? 'Deciding now…' : 'Not yet decided')}</div>
                    {d && d.why && <div className="why">"{d.why}"</div>}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {budgetExhausted ? (
        <BudgetExhaustedFoot
          canPrint={canPrint}
          onPrint={onPrint}
          onSaveProfile={onSaveProfile}
          onContinueElsewhere={onContinueElsewhere}
          onOpenByok={onOpenByok}
          onNavigate={onNavigate}
        />
      ) : (
        <div className="b-foot">
          <button className="primary" disabled={!canPrint} onClick={onPrint}>
            <span>Print my ballot (PDF)</span><span className="arrow">→</span>
          </button>
          <button onClick={onSaveProfile}>
            <span>Save my voting plan (.txt)</span><span className="arrow">↓</span>
          </button>
          <small className="b-foot-note">Your issues and picks — no personal info collected.</small>
          <button onClick={onContinueElsewhere}>
            <span>Continue in another chatbot</span><span className="arrow">↗</span>
          </button>
        </div>
      )}
    </>
  );
}

/* ============ BudgetExhaustedFoot ============
   Replaces the normal ballot-pane footer when the community AI
   budget runs out. The complaint about the live app: it claims
   "next steps in right panel" but it's not obvious what to do.
   This makes the two ways to keep going (BYOK / handoff) the
   visually dominant actions, with print/save below and tip-jar
   as a quiet line.

   Repo target: a `budgetExhausted` branch inside BallotPane.tsx's
   footer, driven by the same budget-state signal that opens
   BudgetExhausted.tsx. */
function BudgetExhaustedFoot({ canPrint, onPrint, onSaveProfile, onContinueElsewhere, onOpenByok, onNavigate }) {
  return (
    <div className="b-foot exhausted">
      <div className="bx-banner">
        <span className="bx-banner-dot" aria-hidden="true"></span>
        <div>
          <div className="bx-banner-ttl">Community AI budget used up</div>
          <div className="bx-banner-sub">Your draft is safe. Two ways to keep going:</div>
        </div>
      </div>

      <button className="bx-cta primary" onClick={onOpenByok}>
        <span className="bx-cta-ico" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
          </svg>
        </span>
        <span className="bx-cta-lab">
          <span className="bx-cta-main">Use your own API key</span>
          <span className="bx-cta-sub">Keep chatting here · key stays on device</span>
        </span>
        <span className="arrow">→</span>
      </button>

      <button className="bx-cta" onClick={onContinueElsewhere}>
        <span className="bx-cta-ico" aria-hidden="true">↗</span>
        <span className="bx-cta-lab">
          <span className="bx-cta-main">Continue in another chatbot</span>
          <span className="bx-cta-sub">Copy your research into Claude, ChatGPT, Gemini…</span>
        </span>
        <span className="arrow">→</span>
      </button>

      <div className="bx-secondary">
        <button disabled={!canPrint} onClick={onPrint}>Print ballot →</button>
        <button onClick={onSaveProfile}>Save .txt ↓</button>
      </div>

      <p className="bx-tip">
        Voter Choice is free. A tip keeps the budget alive for the next voter —{' '}
        <a onClick={() => onNavigate && onNavigate('tip')} role="link" tabIndex={0}>Tip jar</a> · not required.
      </p>
    </div>
  );
}

/* ============ PrintView ============
   Maps to: src/components/PrintBallot.tsx (Phase 7 in brief) */
function PrintView({ address, issues, decisions, onBack }) {
  const races = RACES;
  const sections = {};
  races.forEach(r => {
    if (!decisions[r.id]) return;
    if (!sections[r.section]) sections[r.section] = [];
    sections[r.section].push({ race: r, decision: decisions[r.id] });
  });

  const undecided = races.filter(r => !decisions[r.id]);

  // F12: drive the printed logistics from the REAL state (not the TX demo
  // constants). getFallbackStateData returns honest per-state copy (real
  // stateName, empty acceptedIds, vote.gov links).
  const sd = getFallbackStateData(getRealStateCode() || '');
  const houseRace = races.find(r => /house/i.test(r.label || ''));
  // Pillar 3: derive the formatted "NJ-01" style district code from the
  // ballot extraction's House race label. Prefer logistics.congressionalDistrict
  // when available (civic carried it); fall back to ballot label extraction.
  const logisticsPrint = getBallotLogistics();
  const districtLabel = (logisticsPrint && logisticsPrint.congressionalDistrict)
    || (houseRace ? deriveDistrictCode(houseRace.label, getRealStateCode() || '') : null)
    || '';
  const lookupHost = ((sd?.resources?.pollingPlaceLookup || sd?.resources?.stateElectionWebsite || 'https://vote.gov/')
    .replace(/^https?:\/\//, '').replace(/\/$/, ''));
  const acceptedIds = sd?.votingRules?.acceptedIds || [];

  return (
    <>
      <AppNav onBrandClick={onBack} />
      <div className="print-wrap">
        <div className="print-header">
          <h2>Your printable ballot</h2>
          <div className="actions">
            <button onClick={onBack}>← Back to ballot</button>
            <button className="primary" onClick={() => window.print()}>Print / save as PDF</button>
          </div>
        </div>

        <div className="print-sheet">
          <header className="ph-head">
            <div className="l">
              My Ballot
              <small>Voter Choice · voterchoice.app</small>
            </div>
            <div className="r">
              <b>{sd.stateName || getRealStateCode()}</b><br />
              {address}<br />
              Confirm your polling place &amp; hours below
            </div>
          </header>

          <div className="voter-meta">
            <div className="cell"><div className="k">Address</div><div className="v" style={{ fontSize: '12px' }}>{address}</div></div>
            <div className="cell"><div className="k">District</div><div className="v">{districtLabel || '—'}</div></div>
            <div className="cell cell-bring">
              <div className="k">Voter ID</div>
              {!sd.votingRules.idRequired ? (
                <div className="v">{sd.votingRules.idNote || 'No ID required for most voters.'}</div>
              ) : acceptedIds.length > 0 ? (
                <>
                  <div className="v">Bring any one:</div>
                  <ul className="v print-id-list">
                    {acceptedIds.map(id => (
                      <li key={id}>{id}</li>
                    ))}
                  </ul>
                </>
              ) : (
                <div className="v">{sd.votingRules.idNote || 'ID required.'} Confirm the exact accepted-ID list at {lookupHost}.</div>
              )}
            </div>
            <div className="cell"><div className="k">Before you go</div><div className="v">Look up your polling place, hours &amp; early voting at {lookupHost}</div></div>
          </div>

          <div className="ballot-list">
            {Object.entries(sections).map(([section, items]) => (
              <div className="ballot-group" key={section}>
                <div className="gtitle">{section}</div>
                {items.map(({ race, decision }) => {
                  // Multi-seat races (vote-for-N) carry one entry per chosen
                  // candidate; render each as its own checkbox so the printed
                  // ballot has a mark per oval the voter must fill.
                  const picks = decision.picks && decision.picks.length
                    ? decision.picks
                    : [{ candidateName: decision.pick, party: decision.party, why: decision.why }];
                  const seats = race.voteForN || 1;
                  return picks.map((p, pi) => (
                    <div className="br checked" key={race.id + '-' + pi}>
                      <div className="bx"></div>
                      <div>
                        {pi === 0 && <div className="race-name">{race.label}{seats > 1 ? ` — vote for ${seats}` : ''}</div>}
                        <div className="pick-name">
                          {p.candidateName}
                          {p.party && p.party !== '?' && <span className="party">{p.party === 'D' ? 'DEM' : p.party === 'R' ? 'REP' : p.party}</span>}
                        </div>
                        {p.why && <div className="my-note">"{p.why}"</div>}
                      </div>
                    </div>
                  ));
                })}
              </div>
            ))}

            {undecided.length > 0 && (
              <div className="ballot-group">
                <div className="gtitle" style={{ color: 'var(--ink-3)' }}>Decide at the polls</div>
                {undecided.map(race => (
                  <div className="br" key={race.id}>
                    <div className="bx"></div>
                    <div>
                      <div className="race-name">{race.label}</div>
                      <div className="pick-name" style={{ color: 'var(--ink-3)', fontStyle: 'italic', fontWeight: 400 }}>
                        Decide at the polls
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="ballot-group" style={{ marginBottom: 0 }}>
              <div className="gtitle">Issues you cared about</div>
              <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6 }}>
                {issues.map((iss, i) => (
                  <div key={iss.canonicalIssue}>{i + 1}. {iss.interpretation}</div>
                ))}
              </div>
            </div>
          </div>

          <footer className="print-foot">
            <div className="l">
              <b>Built with Voter Choice</b>
              Free · non-partisan · voterchoice.app
            </div>
          </footer>
          <div className="print-serial">
            <span>Generated {new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</span>
            <span>Ref · VC-{Math.random().toString(36).slice(2, 8).toUpperCase()}</span>
            <span>Page 1 of 1</span>
          </div>
        </div>
      </div>
    </>
  );
}

Object.assign(window, {
  HomeView, LoadingView, ColdOpenView, WorkspaceView, PrintView,
});

/* ==================== prototype-app.jsx (createRoot stripped) ==================== */
/* ====================================================
   VOTER CHOICE · root app
   ====================================================
   State machine + routing + persistence + tweaks +
   the Pass-B screen states (party gate, amend editor,
   budget exhausted, profile resume).
   ==================================================== */

const { useState: useStateA, useEffect: useEffectA, useCallback: useCallbackA } = React;

const STORAGE_KEY = 'voter-choice-prototype-v2';
const LEGACY_KEY  = 'voter-choice-prototype-v1';
const TWEAKS_KEY  = 'voter-choice-tweaks-v1';

const DEFAULT_TWEAKS = /*EDITMODE-BEGIN*/{
  "mood": "civic",
  "palette": "civic",
  "treatment": "daylight"
}/*EDITMODE-END*/;

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
    const legacyRaw = localStorage.getItem(LEGACY_KEY);
    if (legacyRaw) {
      const legacy = JSON.parse(legacyRaw);
      return { ...legacy, issues: legacy.themes || [] };
    }
    return null;
  } catch (e) { return null; }
}
function saveState(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
}
function loadTweaks() {
  try {
    const raw = localStorage.getItem(TWEAKS_KEY);
    if (!raw) return DEFAULT_TWEAKS;
    return Object.assign({}, DEFAULT_TWEAKS, JSON.parse(raw));
  } catch (e) { return DEFAULT_TWEAKS; }
}
function saveTweaks(t) {
  try { localStorage.setItem(TWEAKS_KEY, JSON.stringify(t)); } catch (e) {}
}

function App() {
  const saved = loadState();
  const [view, setView] = useStateA(saved?.view || 'home');
  const [address, setAddress] = useStateA(saved?.address || '');
  const [issues, setIssues] = useStateA(saved?.issues || saved?.themes || []);
  const [decisions, setDecisions] = useStateA(saved?.decisions || {});
  const [activeRaceId, setActiveRaceId] = useStateA(saved?.activeRaceId || RACES[0].id);
  // Phase 2: bumped after real race-data lands so the verbatim accessors
  // (which read live module bindings) re-read on the next render.
  const [dataVersion, setDataVersion] = useStateA(0);
  // Phase 2b: the full (unfiltered) multi-party ballot, held while the party
  // gate is shown so the pick can filter from it.
  const [pendingRaces, setPendingRaces] = useStateA(null);

  // Phase 2 resume-refetch: the data module re-inits to mock on every page
  // load, so a RESUMED workspace session (restored from localStorage) must
  // re-fetch real race-data once on mount. The fresh lock-in path already
  // fetches before showing the workspace; this covers the return visit.
  useEffectA(() => {
    if ((saved?.view === 'workspace') && (saved?.issues || []).length > 0) {
      // REAL_STATE_RESOURCES is a module let that resets to null on reload, so
      // re-load the real per-state resources or the workspace logistics revert
      // to the vote.gov fallback on every resume.
      const sc = getRealStateCode();
      if (sc) applyRealStateResources(sc).then(() => setDataVersion((v) => v + 1));
      loadAllRaceData(RACES, saved.issues).then(() => {
        setDataVersion((v) => v + 1);
        preloadAllCandidateResearch(saved.issues);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pass-B modal/screen state
  const [amendOpen, setAmendOpen] = useStateA(false);
  const [budgetOpen, setBudgetOpen] = useStateA(false);
  const [resumeOpen, setResumeOpen] = useStateA(false);
  const [compareOpen, setCompareOpen] = useStateA(false);
  const [allVotesFor, setAllVotesFor] = useStateA(null); // { candidate, alignmentEntry }
  // The most recent amend delta + offer to thread into the chat
  const [amendDeltas, setAmendDeltas] = useStateA(null);
  // Chat input: appended messages (user prompts + mock AI replies)
  const [chatMessages, setChatMessages] = useStateA({}); // keyed by raceId → [{who, text}]

  // Pass-C state
  const [settingsOpen, setSettingsOpen] = useStateA(false);
  // Budget exhaustion — once the community AI budget runs out it stays
  // out for the session. Flips on when the user hits the handoff path;
  // in the repo this is driven by a real budget signal from the API.
  const [budgetExhausted, setBudgetExhausted] = useStateA(false);
  // Post-decision toast — shows once when every race is decided.
  const [toastDismissed, setToastDismissed] = useStateA(false);
  // Per-race AI timeout flags so the chat can surface AITimeoutBanner
  const [chatTimeouts, setChatTimeouts] = useStateA({}); // { [raceId]: true }
  // Saved snapshot used by HomeView's ResumeNudge to decide whether to show
  const savedSession = saved
    ? { issues: saved.issues || [], decisions: saved.decisions || {}, address: saved.address || '' }
    : null;

  // Blind candidate mode — candidates show as Candidate A/B until
  // user explicitly reveals on a per-candidate basis (sticky).
  const [blindMode, setBlindMode] = useStateA(saved?.blindMode !== false);
  const [revealedCandidates, setRevealedCandidates] = useStateA(new Set(saved?.revealedCandidates || []));

  // Pillar 2: on-demand candidate web research (structured endpoint).
  // For the ACTIVE race, POST /api/research-candidate for each REVEALED
  // candidate who has NO DB record (scores === null). Returns per-issue
  // AlignmentScore[] (sourceType:'web_search') — rendered in the same
  // alignment surface as voting_record rows, but with distinct styling.
  //
  // ANONYMITY INVARIANT: NEVER fire for a still-blinded candidate.
  // The request sends the real name server-side only; the returned scores
  // contain no names — they carry canonicalIssue, resolvedStance, confidence,
  // and evidence URLs (which must also be name-free in our mock/test data).
  // The research cache is keyed by `${raceId}::${candidateName}` — this key
  // is never rendered; only the retrieved scores appear in the UI.
  useEffectA(() => {
    if (view !== 'workspace') return;
    const rp = getRacePatternsForRace(activeRaceId);
    const align = getAlignmentScoresForRace(activeRaceId);
    (rp?.candidates || []).forEach((cand, i) => {
      const idn = getCandidateIdentity(cand, { blindMode, revealed: revealedCandidates, index: i });
      if (idn.isBlind) return; // anonymity gate — only research revealed candidates
      const entry = (align?.entries || []).find(e => e.candidateId === cand.id);
      if (entry && entry.scores !== null) return; // already has a real DB record
      const key = activeRaceId + '::' + cand.name;
      if (getCandidateResearch(key)) return; // attempt already recorded — never re-fire
      setCandidateResearch(key, { status: 'loading' });
      setDataVersion(v => v + 1);
      const sc = getRealStateCode();
      // Pass structured issues (canonicalIssue + issueLabel) — the structured
      // endpoint returns per-issue AlignmentScore[] keyed on canonicalIssue.
      const structuredIssues = (issues || [])
        .filter(x => x && x.canonicalIssue)
        .map(x => ({
          canonicalIssue: x.canonicalIssue,
          issueLabel: x.interpretation || x.name || x.canonicalIssue,
        }));
      if (structuredIssues.length === 0) {
        setCandidateResearch(key, { status: 'unavailable' });
        return;
      }
      fetchCandidateResearch({
        candidateName: cand.name,
        jurisdiction: (rp?.race || activeRaceId) + (sc ? ', ' + sc : ''),
        issues: structuredIssues,
        cycle: '2026',
      }).then(res => {
        if (res && res.scores && res.scores.length > 0) {
          setCandidateResearch(key, { status: 'done', scores: res.scores });
        } else {
          setCandidateResearch(key, { status: 'unavailable' });
        }
        setDataVersion(v => v + 1);
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRaceId, blindMode, revealedCandidates, view]);

  // F-A: pre-load research for ALL races' research_pending candidates
  // immediately after loadAllRaceData completes (instead of lazy-firing only
  // for the active race on navigation). Fires in the background — no await —
  // so it never blocks the workspace mount. The cache key dedup guard and
  // `entry.scores !== null` skip prevent duplicate requests.
  //
  // NOTE: No blind-mode gate here. The request sends the real name server-side
  // only; the returned scores are name-free. The per-candidate RENDER still
  // gates on !blindMode (line 666) — the result is simply cached and ready
  // the moment the card is revealed.
  // F-A throttle: pre-load research for ALL no-record candidates, but cap how
  // many /api/research-candidate requests are in flight at once. Un-throttled
  // this fired a burst of 12+ simultaneous LLM web-search calls on workspace
  // load, which hammered the dev server (and the community budget).
  const RESEARCH_PRELOAD_CONCURRENCY = 3;

  function preloadAllCandidateResearch(resolvedIssues) {
    const sc = getRealStateCode();
    const structuredIssues = (resolvedIssues || [])
      .filter(x => x && x.canonicalIssue)
      .map(x => ({
        canonicalIssue: x.canonicalIssue,
        issueLabel: x.interpretation || x.name || x.canonicalIssue,
      }));
    if (structuredIssues.length === 0) return Promise.resolve(); // nothing to research

    // Pass 1 (SYNCHRONOUS, before any await): mark every eligible candidate
    // { status: 'loading' } and build the work queue. Marking up front is what
    // makes the dedup guards correct — both here (line above) and the
    // active-race useEffect skip on `getCandidateResearch(key)` see a queued
    // candidate as in-flight, so navigating to its race never double-fires.
    const queue = [];
    (RACES || []).forEach(race => {
      const rp = getRacePatternsForRace(race.id);
      const align = getAlignmentScoresForRace(race.id);
      (rp?.candidates || []).forEach(cand => {
        if (!cand || !cand.name) return;
        const entry = (align?.entries || []).find(e => e.candidateId === cand.id);
        if (entry && entry.scores !== null) return; // already has a real DB record
        const key = race.id + '::' + cand.name;
        if (getCandidateResearch(key)) return; // already cached or in flight — skip
        setCandidateResearch(key, { status: 'loading' });
        queue.push({
          key,
          candidateName: cand.name,
          jurisdiction: (rp?.race || race.id) + (sc ? ', ' + sc : ''),
        });
      });
    });
    if (queue.length === 0) return Promise.resolve();
    setDataVersion(v => v + 1); // one re-render for all the 'loading' marks

    // Pass 2 (THROTTLED): drain the queue with at most N requests in flight.
    // Returns a promise that resolves once every task has SETTLED, so the
    // lock-in handler can await it on the loading screen before painting cards.
    return new Promise((resolve) => {
      let cursor = 0;
      let completed = 0;
      function runNext() {
        if (cursor >= queue.length) return;
        const task = queue[cursor++];
        fetchCandidateResearch({
          candidateName: task.candidateName,
          jurisdiction: task.jurisdiction,
          issues: structuredIssues,
          cycle: '2026',
        }).then(res => {
          if (res && res.scores && res.scores.length > 0) {
            setCandidateResearch(task.key, { status: 'done', scores: res.scores });
          } else {
            setCandidateResearch(task.key, { status: 'unavailable' });
          }
          setDataVersion(v => v + 1);
        }).finally(() => {
          completed++;
          if (completed >= queue.length) { resolve(); return; }
          runNext(); // free slot → pull the next task
        });
      }
      const workers = Math.min(RESEARCH_PRELOAD_CONCURRENCY, queue.length);
      for (let i = 0; i < workers; i++) runNext();
    });
  }

  const [tweaks, setTweaks] = useStateA(loadTweaks);
  const [tweaksOpen, setTweaksOpen] = useStateA(false);

  useEffectA(() => {
    saveState({ view, address, issues, decisions, activeRaceId, blindMode, revealedCandidates: [...revealedCandidates] });
  }, [view, address, issues, decisions, activeRaceId, blindMode, revealedCandidates]);

  useEffectA(() => {
    document.body.setAttribute('data-mood', tweaks.mood);
    document.body.setAttribute('data-palette', tweaks.palette);
    document.body.setAttribute('data-treatment', tweaks.treatment);
    saveTweaks(tweaks);
  }, [tweaks]);

  useEffectA(() => {
    function onMsg(e) {
      const d = e?.data;
      if (!d || !d.type) return;
      if (d.type === '__activate_edit_mode') setTweaksOpen(true);
      if (d.type === '__deactivate_edit_mode') setTweaksOpen(false);
    }
    window.addEventListener('message', onMsg);
    try { window.parent.postMessage({ type: '__edit_mode_available' }, '*'); } catch (e) {}
    return () => window.removeEventListener('message', onMsg);
  }, []);

  function updateTweaks(patch) {
    setTweaks(prev => {
      const next = { ...prev, ...patch };
      try { window.parent.postMessage({ type: '__edit_mode_set_keys', edits: next }, '*'); } catch (e) {}
      return next;
    });
  }

  function closeTweaks() {
    setTweaksOpen(false);
    try { window.parent.postMessage({ type: '__edit_mode_dismissed' }, '*'); } catch (e) {}
  }

  async function handleSubmitAddress(addr) {
    // Phase 2b REAL flow: hit /api/civic. When Civic has the ballot we use it;
    // when it doesn't (the common case — Google's contest data is sparse), we
    // route to the upload/paste screen (NoContestedView). Either way we detect
    // the state from the address so nothing downstream guesses ("TX" for an NJ
    // address was the prototype's hardcoded mock).
    const trimmed = (addr || '').trim();
    if (trimmed.length < 4) {
      setAddress(trimmed);
      setView('geocodefail');
      return;
    }
    setAddress(trimmed);
    setView('loading');
    let result;
    try {
      result = await fetchBallotFromAddress(trimmed);
    } catch (e) {
      result = { races: [], stateCode: '' };
    }
    if (result.stateCode) setRealStateCode(result.stateCode);
    if (result.races && result.races.length > 0) {
      applyRealRaces(result.races);
      setView(issues.length ? 'workspace' : 'coldopen');
    } else {
      // Fix C: pre-load real state resources before mounting NoContestedView
      // so its links use the real per-state URLs, not vote.gov. Awaited here
      // to guarantee the resources are set before the first render.
      if (result.stateCode) await applyRealStateResources(result.stateCode);
      // Civic couldn't pull the ballot → ask the voter to upload/paste it.
      setView('nocontested');
    }
  }

  function handleLoadingDone() {
    if (issues.length > 0) setView('workspace');
    else setView('coldopen');
  }

  async function handleLockIssues(newIssues) {
    setIssues(newIssues);
    // Single-load (Phase 2): show the loader ONCE while we fetch real
    // race-data for EVERY race, then mount the workspace. Switching races in
    // the workspace afterward is instant (data already loaded) — this is the
    // prototype's load-once model and fixes the drifted per-race loader.
    setView('analyzing');
    if (typeof window !== 'undefined')
      window.scrollTo({ top: 0, behavior: 'auto' });
    try {
      await loadAllRaceData(RACES, newIssues);
    } catch (e) {
      /* leave races on their fallback; never block the workspace */
    }
    setActiveRaceId(RACES[0].id);
    // F-A: kick off candidate web-research but DON'T block the workspace paint
    // on it. preloadAllCandidateResearch's synchronous first pass marks every
    // no-record candidate { status: 'loading' }, so cards mount with skeletons
    // immediately; the throttled second pass drains in the background and
    // resolves each card in place (correct since the blind-mode fix). We used to
    // await this (capped 18s), which could strand the user on 'analyzing'
    // through a slow serverless cold-start. fetchCandidateResearch swallows its
    // own errors (returns null) so this fire-and-forget can never reject.
    void preloadAllCandidateResearch(newIssues);
    setView('workspace');
    // Scroll to top so the user lands at the top of the workspace,
    // not wherever ColdOpenView left them (which on mobile was often
    // the bottom of the issue list).
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'auto' });
      // Mobile: skip the ballot-pane landing page and open the
      // candidate chat overlay for race 1 immediately. The user just
      // told us what they care about — surface the first decision.
      if (window.matchMedia('(max-width: 767px)').matches) {
        window.__autoOpenChat = true;
      }
    }
  }

  function handleDecide(raceId, decision) {
    setDecisions(prev => ({ ...prev, [raceId]: decision }));
  }

  function handleUnpick(raceId, candidateName) {
    setDecisions(prev => {
      const next = { ...prev };
      const d = next[raceId];
      const picks = d?.picks
        ? d.picks
        : (d?.candidateName ? [{ candidateName: d.candidateName, party: d.party || null, why: d.why || '' }] : []);
      // Multi-seat with >1 pick: drop just this candidate, keep the rest.
      if (candidateName && picks.length > 1) {
        const kept = picks.filter(p => p.candidateName !== candidateName);
        next[raceId] = {
          picks: kept,
          pick: kept.map(p => p.candidateName).join(' + '),
          candidateName: kept[0].candidateName,
          party: kept[0].party,
          why: kept[0].why,
        };
      } else {
        delete next[raceId];
      }
      return next;
    });
  }

  function handleSelectRace(raceId) {
    setActiveRaceId(raceId);
  }

  function handlePrint() {
    setView('print');
  }

  function handleBackFromPrint() {
    setView('workspace');
  }

  function handleReset() {
    if (!confirm('Start over? This clears your draft ballot and issues.')) return;
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(LEGACY_KEY);
    } catch (e) {}
    setView('home');
    setAddress('');
    setIssues([]);
    setDecisions({});
    setActiveRaceId(RACES[0].id);
    setRevealedCandidates(new Set());
    setBlindMode(true);
  }

function handleRevealCandidate(candidateId) {
    setRevealedCandidates(prev => new Set([...prev, candidateId]));
  }
  function handleHideCandidate(candidateId) {
    // Inverse of reveal: re-anonymize a single previously-revealed
    // card without flipping global blind mode off and back on.
    setRevealedCandidates(prev => {
      const next = new Set(prev);
      next.delete(candidateId);
      return next;
    });
  }
  function handleToggleBlindMode() {
    setBlindMode(b => {
      const next = !b;
      // [Fix] When the user turns blind mode BACK ON, clear any
      // per-candidate reveals from the previous session. The
      // expectation is that BLIND means BLIND — not "blind except
      // the ones you already peeked at." Per-candidate reveals are
      // a one-off within-session affordance, not a permanent grant.
      if (next) setRevealedCandidates(new Set());
      return next;
    });
  }

  useEffectA(() => {
    window.__voterChoiceReset = handleReset;
  }, []);

  /* ─── Pass-B handlers ─────────────────────── */

  // Amendment editor: open and apply
  function handleApplyAmend(newIssues) {
    setIssues(newIssues);
    setAmendOpen(false);

    // Compute deltas vs previous decisions (mocked — random shift in range)
    const deltas = Object.entries(decisions).map(([raceId, d]) => {
      const race = RACES.find(r => r.id === raceId);
      const oldPct = 50 + Math.floor(Math.random() * 30) - 15;
      const shift = Math.floor(Math.random() * 14) - 7;
      const newPct = Math.max(0, Math.min(100, oldPct + shift));
      return {
        raceId,
        raceLabel: race?.label || raceId,
        pick: d.pick + (d.party ? ' (' + d.party + ')' : ''),
        oldPct,
        newPct,
        significant: Math.abs(shift) > 5,
      };
    });
    setAmendDeltas(deltas);
  }

  function handleClearDelta() { setAmendDeltas(null); }

  // Resume from saved profile (demo: load preset)
  function handleResumeProfile() {
    if (!SAMPLE_RESUME_PROFILE) {
      alert('Sample profile missing — check prototype-screens.jsx');
      return;
    }
    setIssues(SAMPLE_RESUME_PROFILE.issues);
    setDecisions(SAMPLE_RESUME_PROFILE.decisions);
    setAddress('1600 Pennsylvania Ave NW, Washington DC 20500');
    setActiveRaceId('us-senate-tx');
    setResumeOpen(false);
    setView('workspace');
  }

  // Map the prototype's {who,text} chat log → the chat route's {role,content},
  // dropping any empty in-flight AI bubble so it never leaks into history.
  function mapChatHistory(raceId) {
    return (chatMessages[raceId] || [])
      .filter(m => !(m.who === 'ai' && !m.text))
      .map(m => ({ role: m.who === 'user' ? 'user' : 'assistant', content: m.text }));
  }

  // Append a fresh AI bubble and stream a real /api/chat reply into it. The
  // bubble is tracked by a unique `_id` (not "last") so concurrent sends to the
  // same race never cross-contaminate. `apiMessages` ends on the user's turn.
  function runChatStream(raceId, apiMessages) {
    // Clear any prior error banner for this race.
    setChatTimeouts(prev => {
      if (!prev[raceId]) return prev;
      const next = { ...prev };
      delete next[raceId];
      return next;
    });

    const aiId = 'ai-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
    setChatMessages(prev => ({
      ...prev,
      [raceId]: [...(prev[raceId] || []), { who: 'ai', text: '', _id: aiId }],
    }));

    const race = RACES.find(r => r.id === raceId);

    // Blind mode: never send a real candidate name to the model — it could echo
    // it back into the answer. Replace each still-blinded candidate's name with
    // their positional alias ("Candidate A/B") so the chat context literally
    // cannot leak an identity. Revealed candidates keep their real name.
    let racePatterns = getRacePatternsForRace(raceId) || null;
    let blind = false;
    if (racePatterns && Array.isArray(racePatterns.candidates)) {
      racePatterns = {
        ...racePatterns,
        candidates: racePatterns.candidates.map((c, i) => {
          const idn = getCandidateIdentity(c, { blindMode, revealed: revealedCandidates, index: i });
          if (!idn.isBlind) return c;
          blind = true;
          return { ...c, name: idn.aliasLabel };
        }),
      };
    }

    const systemPrompt = buildRaceChatSystemPrompt({
      raceLabel: race?.label || raceId,
      stateCode: getRealStateCode() || '',
      racePatterns,
      alignmentScores: getAlignmentScoresForRace(raceId) || null,
      issues,
      blind,
    });

    streamChatReply(
      {
        messages: apiMessages,
        systemPrompt,
        sessionId: getChatSessionId(),
        messageCount: apiMessages.length,
      },
      {
        onText: (chunk) => setChatMessages(prev => ({
          ...prev,
          [raceId]: (prev[raceId] || []).map(m =>
            m._id === aiId ? { ...m, text: m.text + chunk } : m,
          ),
        })),
        onError: (_reason, meta) => {
          // Drop the (empty/partial) AI bubble first — whichever surface shows.
          setChatMessages(prev => ({
            ...prev,
            [raceId]: (prev[raceId] || []).filter(m => m._id !== aiId),
          }));
          // Route by the server block `code` (surfaced via streamChatReply meta).
          const blk = resolveChatBlock(meta?.code);
          if (blk.budget) {
            // Budget block → the existing handoff modal, not an inline banner.
            setBudgetExhausted(true);
            setBudgetOpen(true);
            return;
          }
          // Else show the inline banner: a block-specific message string, or
          // `true` to fall back to the generic "AI is taking longer" body.
          setChatTimeouts(prev => ({ ...prev, [raceId]: blk.message || true }));
        },
      },
    );
  }

  // Chat input: append the user message, then stream the real reply.
  function handleSendChat(raceId, text) {
    const prior = mapChatHistory(raceId);
    // Drop any dangling trailing user turn(s) — left by a prior FAILED send (no
    // assistant reply) or a still-empty in-flight send. Without this the payload
    // would be [..., user, user], which the chat API rejects.
    while (prior.length && prior[prior.length - 1].role === 'user') prior.pop();
    setChatMessages(prev => ({
      ...prev,
      [raceId]: [...(prev[raceId] || []), { who: 'user', text }],
    }));
    runChatStream(raceId, [...prior, { role: 'user', content: text }]);
  }

  function handleRetryChat(raceId) {
    // The failed turn's empty AI bubble was already removed; the log ends on
    // the user's question. Trim any trailing assistant turns so the payload
    // ends on `user` (the route's contract), then replay.
    const history = mapChatHistory(raceId);
    while (history.length && history[history.length - 1].role === 'assistant') {
      history.pop();
    }
    if (history.length === 0) return;
    runChatStream(raceId, history);
  }

  /* ─── Pass-C navigation ─── */
  function handleNavigate(target) {
    // 'howitworks' folds back to home (where the walkthrough lives).
    if (target === 'howitworks') {
      setView('home');
      setTimeout(() => {
        const el = document.querySelector('.hiw');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
      return;
    }
    if (target === 'home') { setView('home'); return; }
    if (target === 'about' || target === 'methodology' || target === 'privacy' || target === 'tip') {
      setView(target);
      return;
    }
  }
  useEffectA(() => { window.__navigate = handleNavigate; }, [view]);

  /* ─── Pass-C: settings handlers ─── */
  function handleExportProfile() {
    const blob = new Blob([buildPortablePrompt({
      address, issues, decisions,
      racesRemaining: RACES.length - Object.keys(decisions).length,
    })], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'voter-choice-profile.txt';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  // Stable callbacks so context value identity doesn't change every render
  const navValue = React.useMemo(() => ({
    openSettings: () => setSettingsOpen(true),
    navigate: handleNavigate,
    current: view,
  }), [view]);

  return (
    <I18nProvider>
      <NavProvider value={navValue}>
      {view === 'home' && (
        <HomeView
          savedAddress={address}
          savedSession={savedSession}
          onSubmit={handleSubmitAddress}
          onResumeFromProfile={() => setResumeOpen(true)}
          onResumeSession={() => { if (issues.length || Object.keys(decisions).length) setView('workspace'); else setView('coldopen'); }}
          onStartOver={handleReset}
          onNavigate={handleNavigate}
        />
      )}
      {view === 'loading' && (
        // Navigation is driven by handleSubmitAddress after /api/civic resolves
        // (no-op onDone) — the loader just animates while the lookup runs.
        <LoadingView address={address} onDone={() => {}} />
      )}
      {/* Phase 2 single-load: same loader chrome, ANALYZING copy, shown once
          after lock-in while real race-data fetches. onDone is a no-op —
          navigation to the workspace is driven by the fetch completing in
          handleLockIssues. */}
      {view === 'analyzing' && (
        <LoadingView address={address} onDone={() => {}} variant="analyzing" />
      )}
      {view === 'geocodefail' && (
        <>
          <AppNav />
          <main id="main-content">
            <GeocodeFailView
              address={address}
              onEditAddress={() => setView('home')}
              onContinueWithZip={() => setView('loading')}
            />
          </main>
        </>
      )}
      {view === 'nocontested' && (
        <>
          <AppNav />
          <main id="main-content">
            <NoContestedView
              stateData={(() => {
                // Fix C: overlay real state resources onto the fallback shape
                // when available (loaded before this view mounted). vote.gov
                // remains the fallback for any URL not covered by the real data.
                const base = getRealStateCode()
                  ? getFallbackStateData(getRealStateCode())
                  : STATE_ELECTION_DATA;
                const real = getRealStateResources();
                if (!real) return base;
                return {
                  ...base,
                  resources: { ...base.resources, ...real },
                };
              })()}
              county={'your county'}
              onBack={() => setView('home')}
              onBallotConfirmed={() => {
                // Phase 2b: races + state already applied by NoContestedView's
                // extraction (real address kept — no more mock "Harris County,
                // TX"). If the ballot spans BOTH parties (a primary), show the
                // party gate to filter; otherwise straight to cold-open.
                // The gate is rule-driven: getStateRule(state, electionType)
                // returns null for open/top-two states and ALL generals —
                // null means no gate (an open-primary voter may pick either
                // party at the polls; a general ballot is for everyone).
                // Only states with a real participation rule (closed /
                // semi-closed / runoff party-lock) gate, with that rule's copy.
                const et = getRealElectionType();
                const ruleEt =
                  et === 'primary_runoff' ? 'runoff' : et;
                const gateRule =
                  ruleEt === 'primary' || ruleEt === 'runoff'
                    ? getStateRule(getRealStateCode() || '', ruleEt)
                    : null;
                if (gateRule && racesSpanMultipleParties(RACES)) {
                  setPendingRaces(RACES);
                  setView('partygate');
                } else {
                  setView(issues.length ? 'workspace' : 'coldopen');
                }
              }}
            />
          </main>
        </>
      )}
      {view === 'partygate' && (
        <PartyGate
          stateName={
            getRealStateCode()
              ? getFallbackStateData(getRealStateCode()).stateName
              : ''
          }
          rule={(() => {
            const et = getRealElectionType();
            const ruleEt = et === 'primary_runoff' ? 'runoff' : et;
            return ruleEt === 'primary' || ruleEt === 'runoff'
              ? getStateRule(getRealStateCode() || '', ruleEt)
              : null;
          })()}
          electionDate=""
          onPick={(party) => {
            // Filter the ballot to the chosen party's primary (the "2 Senate
            // races" fix — a registered Dem sees only the DEM races).
            applyRealRaces(filterRacesByParty(pendingRaces || RACES, party));
            setView(issues.length ? 'workspace' : 'coldopen');
          }}
          onSkip={() => {
            // "Show me everything" — keep the full (both-party) ballot.
            applyRealRaces(pendingRaces || RACES);
            setView(issues.length ? 'workspace' : 'coldopen');
          }}
        />
      )}
      {view === 'coldopen' && (
        <ColdOpenView address={address} onLock={handleLockIssues} savedIssues={issues} />
      )}
      {view === 'workspace' && (
        <WorkspaceView
          address={address}
          issues={issues}
          decisions={decisions}
          activeRaceId={activeRaceId}
          onDecide={handleDecide}
          onUnpick={handleUnpick}
          onSelectRace={handleSelectRace}
          onPrint={handlePrint}
          onEditIssues={() => setAmendOpen(true)}
          onSaveProfile={handleExportProfile}
          onContinueElsewhere={() => { setBudgetExhausted(true); setBudgetOpen(true); }}
          budgetExhausted={budgetExhausted}
          onOpenByok={() => setSettingsOpen(true)}
          onNavigate={handleNavigate}
          // chat input wiring
          chatMessages={chatMessages}
          onSendChat={handleSendChat}
          // AI timeout
          chatTimeouts={chatTimeouts}
          onRetryChat={handleRetryChat}
          // Compare + See all votes wiring
          onCompare={() => setCompareOpen(true)}
          onSeeAllVotes={(payload) => setAllVotesFor(payload)}
          // Amend delta + rescore offer
          amendDeltas={amendDeltas}
          onClearDelta={handleClearDelta}
          blindMode={blindMode}
          revealedCandidates={revealedCandidates}
          onRevealCandidate={handleRevealCandidate}
          onHideCandidate={handleHideCandidate}
          onToggleBlindMode={handleToggleBlindMode}
        />
      )}
      {view === 'print' && (
        <PrintView
          address={address}
          issues={issues}
          decisions={decisions}
          onBack={handleBackFromPrint}
        />
      )}

      {view === 'about' && (
        <>
          <AppNav />
          <main id="main-content">
            <AboutPage onBack={() => setView('home')} />
          </main>
        </>
      )}
      {view === 'methodology' && (
        <>
          <AppNav />
          <main id="main-content">
            <MethodologyPage onBack={() => setView('home')} />
          </main>
        </>
      )}
      {view === 'privacy' && (
        <>
          <AppNav />
          <main id="main-content">
            <PrivacyPage onBack={() => setView('home')} />
          </main>
        </>
      )}

      {view === 'tip' && (
        <>
          <AppNav />
          <main id="main-content">
            <TipJarPage onBack={() => setView('home')} />
          </main>
        </>
      )}

      {/* Pass-B modals */}
      {amendOpen && (
        <AmendmentEditor
          issues={issues}
          decisionsCount={Object.keys(decisions).length}
          onApply={handleApplyAmend}
          onCancel={() => setAmendOpen(false)}
        />
      )}
      <BudgetExhaustedModal
        open={budgetOpen}
        address={address}
        issues={issues}
        decisions={decisions}
        racesRemaining={RACES.length - Object.keys(decisions).length}
        onClose={() => setBudgetOpen(false)}
        onPrint={handlePrint}
        onSaveProfile={handleExportProfile}
      />
      <ProfileResumeModal
        open={resumeOpen}
        onClose={() => setResumeOpen(false)}
        onResume={handleResumeProfile}
      />
      {compareOpen && (
        <CompareModal
          open={compareOpen}
          race={RACES.find(r => r.id === activeRaceId)}
          issues={issues}
          blindMode={blindMode}
          revealedCandidates={revealedCandidates}
          onRevealCandidate={handleRevealCandidate}
          onClose={() => setCompareOpen(false)}
        />
      )}
      {allVotesFor && (
        <AllVotesPanel
          open={!!allVotesFor}
          candidate={allVotesFor.candidate}
          alignmentEntry={allVotesFor.alignmentEntry}
          blindMode={allVotesFor.blindMode}
          alias={allVotesFor.alias && `Candidate ${allVotesFor.alias}`}
          onClose={() => setAllVotesFor(null)}
        />
      )}

      {/* Post-decision toast — one-time, when every race is decided.
          Persists a localStorage flag so it never nags on return. */}
      {view === 'workspace'
        && Object.keys(decisions).length === RACES.length
        && !toastDismissed
        && !(() => { try { return localStorage.getItem('vc-decided-toast') === '1'; } catch (e) { return false; } })()
        && (
        <div className="pd-toast" role="status">
          <div className="pd-toast-head">
            <div>
              <div className="pd-toast-ttl">You decided all {RACES.length} races.</div>
              <div className="pd-toast-sub">Take your ballot to the booth — many polls don't allow phones.</div>
            </div>
            <button
              className="pd-toast-x"
              aria-label="Dismiss"
              onClick={() => { setToastDismissed(true); try { localStorage.setItem('vc-decided-toast', '1'); } catch (e) {} }}
            >×</button>
          </div>
          <div className="pd-toast-actions">
            <button className="pd-print" onClick={() => { setToastDismissed(true); handlePrint(); }}>Print ↗</button>
            <button className="pd-save" onClick={() => { setToastDismissed(true); handleExportProfile(); }}>Save .txt ↓</button>
            <button className="pd-tip" onClick={() => { setToastDismissed(true); try { localStorage.setItem('vc-decided-toast', '1'); } catch (e) {} handleNavigate('tip'); }}>Tip jar →</button>
          </div>
        </div>
      )}

      <TweaksPanel
        tweaks={tweaks}
        onChange={updateTweaks}
        hidden={!tweaksOpen}
        onClose={closeTweaks}
      />

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onResetAll={handleReset}
        onExportProfile={handleExportProfile}
        onResumeProfile={() => setResumeOpen(true)}
      />
      </NavProvider>
    </I18nProvider>
  );
}

export default App;

/* ─── Shipped-surface exports for the 2026 redesign ──────────────────────────
   Consumed by src/prototype/redesign/ (the congress-assessment experience
   behind NEXT_PUBLIC_BALLOT_ENABLED). These components are the vetted design
   system both experiences share — keep their prop contracts stable. Adding
   exports here is behavior-neutral for the legacy app. */
export {
  formatDollars,
  getCandidateIdentity,
  anonymizeText,
  I18nProvider,
  useI18n,
  NavProvider,
  useNav,
  AppNav,
  AppFooter,
  AppNavWithChrome,
  PollingStatusBar,
  CandidateCardHeader,
  AlignmentScoreBanner,
  FunderBars,
  ErrorBanner,
  HomeView,
  LoadingView,
  ColdOpenView,
  AboutPage,
  MethodologyPage,
  PrivacyPage,
  TipJarPage,
  // Reused by the delegation redesign (seat chat / issue editing / full record).
  AITimeoutBanner,
  IssueRow,
  AllVotesPanel,
};
