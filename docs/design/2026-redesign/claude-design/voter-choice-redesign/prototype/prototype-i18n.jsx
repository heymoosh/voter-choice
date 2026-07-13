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
        "We pull who your representatives are based on address. The address never leaves your device — we look up your representatives and discard it.",
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
      cardSource: 'Source · Harris County Elections',
    },
  },
  es: {
    nav: {
      howItWorks: 'Cómo funciona',
      theRecord: 'El registro',
      about: 'Acerca de',
      methodology: 'Metodología',
      privacy: 'Privacidad',
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
        'Buscamos quiénes son tus representantes según tu dirección. Tu dirección no sale de tu dispositivo — consultamos tus representantes y la descartamos.',
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
      cardSource: 'Fuente · Elecciones del Condado de Harris',
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
