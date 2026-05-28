// AutoSelect Pro — Popup Script

const DEFAULT_SETTINGS = {
  enabled: true,
  highlightColor: '#10b981',
  highlightOpacity: 0.35,
  highlightDuration: 1500,
  checkmarkPosition: 'cursor',
  minChars: 1,
  soundEnabled: false,
  desktopNotificationsEnabled: true,
  uiLanguage: 'en',
  languageChoiceRequired: false,
  pdfMode: true,
  copyOnSelect: true,
  copyOnDoubleClick: true,
  blacklist: [],
  copyCount: 0,
  sessionCount: 0
};

const I18N = {
  en: {
    planSectionTitle: 'Plan',
    quickSectionTitle: 'Quick settings',
    copiedTodayLabel: 'Copied today',
    sessionLabel: 'This session',
    activeColorLabel: 'Active color',
    selectionColorName: 'Selection color',
    selectionColorDesc: 'Highlight on copy',
    indicatorName: 'Indicator ✓',
    indicatorDesc: 'Where it appears',
    soundName: 'Sound',
    soundDesc: 'Tone on copy',
    notificationName: 'Notification',
    notificationDesc: 'System alert on copy',
    lastCopiedLabel: 'Last copied',
    optionsBtn: 'Advanced options',
    pdfViewerLabel: 'Open PDF Viewer',
    pdfNewBadge: 'NEW',
    btnStartTrial: 'Try 3 days',
    btnActivatePro: 'Upgrade to Pro',
    btnManageLicense: 'Manage license',
    statusActive: 'Active — select text to copy automatically',
    statusInactive: 'Inactive — turn ON to start',
    planTrialName: 'TRIAL PRO',
    planTrialMeta: '3-day PRO feature trial (basic usage is not a trial)',
    planProAnnualMeta: 'Annual subscription active',
    planProLifetimeMeta: 'Lifetime license active',
    planFreeMeta: 'Current plan FREE · {{remaining}} automatic copies left today',
    trialUnavailable: 'Trial is not available on this installation',
    trialActive: 'PRO trial activated',
    noTabInfo: 'Could not read the current tab. Try refreshing the page.',
    blockedInternal: 'This page blocks extensions (chrome://, edge:// or about:). Try a regular website.',
    blockedExtensionPage: 'This is an extension page. Open any website and select text there.',
    blockedWebStore: 'Chrome Web Store blocks content scripts. Try another tab.',
    unsupportedUrl: 'This URL does not support auto-copy. Try an http/https page.',
    tabValidationFail: 'Could not validate the active tab. Close and reopen the popup.',
    noContentConnection: 'Could not connect to the page. Refresh the tab and verify site access for this extension.',
    noSiteAccess: 'Site access is disabled. In extension settings: "Can read and change site data" -> "On all sites".',
    notifMissingPermission: 'Notifications permission is missing. Toggle "Notification" OFF and ON to grant it.',
    notifDenied: 'System notifications are blocked by Chrome/OS. Enable them to see copy alerts.',
    soundDisabled: 'Sound is OFF. Enable "Sound" to hear copy confirmation.',
    soundProOnly: 'Sound and customization are available in PRO/Trial.',
    langTitle: 'Choose your language',
    langBody: 'AutoSelect works in FREE right after install. Trial only unlocks PRO features.',
    langEnglish: 'English (Default)',
    langSpanish: 'Spanish',
    langSaving: 'Saving language...',
    langDone: 'Language saved. Loading extension...',
    langError: 'Could not save language. Try again.'
  },
  es: {
    planSectionTitle: 'Plan',
    quickSectionTitle: 'Configuración rápida',
    copiedTodayLabel: 'Copiados hoy',
    sessionLabel: 'Esta sesión',
    activeColorLabel: 'Color activo',
    selectionColorName: 'Color de selección',
    selectionColorDesc: 'Highlight al copiar',
    indicatorName: 'Indicador ✓',
    indicatorDesc: 'Dónde aparece',
    soundName: 'Sonido',
    soundDesc: 'Tono al copiar',
    notificationName: 'Notificación',
    notificationDesc: 'Aviso del sistema al copiar',
    lastCopiedLabel: 'Último copiado',
    optionsBtn: 'Opciones avanzadas',
    pdfViewerLabel: 'Abrir PDF Viewer',
    pdfNewBadge: 'NUEVO',
    btnStartTrial: 'Probar 3 días',
    btnActivatePro: 'Activar Pro',
    btnManageLicense: 'Gestionar licencia',
    statusActive: 'Activo — selecciona texto para copiar automáticamente',
    statusInactive: 'Inactivo — activa el toggle para empezar',
    planTrialName: 'TRIAL PRO',
    planTrialMeta: 'Trial de funciones PRO por 3 días (el uso básico no es trial)',
    planProAnnualMeta: 'Suscripción anual activa',
    planProLifetimeMeta: 'Licencia de por vida activa',
    planFreeMeta: 'Plan actual FREE · {{remaining}} copias automáticas disponibles hoy',
    trialUnavailable: 'Trial no disponible en esta instalación',
    trialActive: 'Trial Pro activo',
    noTabInfo: 'No pude leer la pestaña actual. Probá recargando la página.',
    blockedInternal: 'Esta página no permite extensiones (chrome://, edge:// o about:). Probá en un sitio web normal.',
    blockedExtensionPage: 'Esta es una página interna de la extensión. Abrí cualquier sitio web y probá seleccionar texto.',
    blockedWebStore: 'Chrome Web Store bloquea los content scripts. Probá la extensión en otra pestaña.',
    unsupportedUrl: 'Esta URL no soporta auto-copy. Probá en páginas http/https.',
    tabValidationFail: 'No pude validar la pestaña activa. Probá cerrando y abriendo el popup.',
    noContentConnection: 'No pude conectar con la página. Recargá la pestaña y verificá acceso del sitio para esta extensión.',
    noSiteAccess: 'Esta página no tiene acceso habilitado. En el ícono de la extensión: "Puede leer y cambiar datos del sitio" -> "En todos los sitios".',
    notifMissingPermission: 'Falta permiso de notificaciones. Apagá y volvé a encender el switch "Notificación" para concederlo.',
    notifDenied: 'Notificaciones del sistema bloqueadas por Chrome/SO. Habilitalas para ver avisos de copiado.',
    soundDisabled: 'El sonido está desactivado. Activá el switch "Sonido" para escuchar confirmación.',
    soundProOnly: 'El sonido y personalización están en modo Pro/Trial.',
    langTitle: 'Elige tu idioma',
    langBody: 'AutoSelect funciona en FREE al instalar. El trial solo desbloquea funciones PRO.',
    langEnglish: 'English (Predeterminado)',
    langSpanish: 'Español',
    langSaving: 'Guardando idioma...',
    langDone: 'Idioma guardado. Cargando extensión...',
    langError: 'No se pudo guardar el idioma. Intentá de nuevo.'
  }
};

function getLocale() {
  return I18N[uiLanguage] ? uiLanguage : 'en';
}

function t(key, vars = {}) {
  const locale = getLocale();
  const source = I18N[locale][key] || I18N.en[key] || key;
  return Object.entries(vars).reduce(
    (acc, [name, value]) => acc.replaceAll(`{{${name}}}`, String(value)),
    source
  );
}

// ─── DOM References ─────────────────────────────────────────────────────────
const popupContainer = document.querySelector('.popup-container');
const mainToggle = document.getElementById('mainToggle');
const toggleLabel = document.getElementById('toggleLabel');
const statusBanner = document.getElementById('statusBanner');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const healthNotice = document.getElementById('healthNotice');
const copyCountEl = document.getElementById('copyCount');
const sessionCountEl = document.getElementById('sessionCount');
const colorIndicator = document.getElementById('colorIndicator');
const colorPreview = document.getElementById('colorPreview');
const quickColor = document.getElementById('quickColor');
const quickPosition = document.getElementById('quickPosition');
const soundToggle = document.getElementById('soundToggle');
const desktopNotificationToggle = document.getElementById('desktopNotificationToggle');
const btnOptions = document.getElementById('btnOptions');
const btnPdfViewer = document.getElementById('btnPdfViewer');
const planName = document.getElementById('planName');
const planMeta = document.getElementById('planMeta');
const planBadge = document.getElementById('planBadge');
const btnStartTrial = document.getElementById('btnStartTrial');
const btnActivatePro = document.getElementById('btnActivatePro');
const btnManageLicense = document.getElementById('btnManageLicense');

let runtime = null;
let settings = { ...DEFAULT_SETTINGS };
let sessionCount = 0;
let uiLanguage = 'en';

const STATIC_LABELS = [
  ['planSectionTitle', 'planSectionTitle'],
  ['quickSectionTitle', 'quickSectionTitle'],
  ['copiedTodayLabel', 'copiedTodayLabel'],
  ['sessionLabel', 'sessionLabel'],
  ['activeColorLabel', 'activeColorLabel'],
  ['selectionColorName', 'selectionColorName'],
  ['selectionColorDesc', 'selectionColorDesc'],
  ['indicatorName', 'indicatorName'],
  ['indicatorDesc', 'indicatorDesc'],
  ['soundName', 'soundName'],
  ['soundDesc', 'soundDesc'],
  ['notificationName', 'notificationName'],
  ['notificationDesc', 'notificationDesc'],
  ['lastCopiedLabel', 'lastCopiedLabel'],
  ['pdfViewerLabel', 'pdfViewerLabel'],
  ['pdfNewBadge', 'pdfNewBadge'],
  ['optionsBtnLabel', 'optionsBtn']
];

function setText(id, key, vars = {}) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = t(key, vars);
}

function applyStaticLabels() {
  document.documentElement.lang = getLocale();
  STATIC_LABELS.forEach(([id, key]) => setText(id, key));
  if (quickPosition?.options?.length >= 4) {
    quickPosition.options[0].textContent = getLocale() === 'es' ? 'Cursor' : 'Cursor';
    quickPosition.options[1].textContent = getLocale() === 'es' ? 'Esquina' : 'Corner';
    quickPosition.options[2].textContent = getLocale() === 'es' ? 'Ambos' : 'Both';
    quickPosition.options[3].textContent = getLocale() === 'es' ? 'Ninguno' : 'None';
  }
}

function renderLanguageChooser() {
  popupContainer.innerHTML = `
    <section style="display:flex;flex-direction:column;gap:10px;border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:14px;background:rgba(17,24,39,.9)">
      <div style="font-size:12px;color:#6ee7b7">AutoSelect Pro</div>
      <h2 style="margin:0;font-size:20px">${t('langTitle')}</h2>
      <p style="margin:0;font-size:12px;line-height:1.5;color:#94a3b8">${t('langBody')}</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px">
        <button id="langEnBtn" style="border:none;border-radius:10px;padding:10px;font-weight:700;cursor:pointer;background:#10b981;color:#06281f">${t('langEnglish')}</button>
        <button id="langEsBtn" style="border:1px solid rgba(255,255,255,.18);border-radius:10px;padding:10px;font-weight:700;cursor:pointer;background:#182235;color:#e2e8f0">${t('langSpanish')}</button>
      </div>
      <p id="langStatus" style="margin:0;color:#94a3b8;font-size:12px"></p>
    </section>
  `;

  const langEnBtn = document.getElementById('langEnBtn');
  const langEsBtn = document.getElementById('langEsBtn');
  const langStatus = document.getElementById('langStatus');

  const chooseLanguage = async (lang) => {
    langStatus.textContent = t('langSaving');
    langEnBtn.disabled = true;
    langEsBtn.disabled = true;
    try {
      settings.uiLanguage = lang;
      settings.languageChoiceRequired = false;
      await saveSettings();
      langStatus.textContent = t('langDone');
      window.location.reload();
    } catch {
      langStatus.textContent = t('langError');
      langEnBtn.disabled = false;
      langEsBtn.disabled = false;
    }
  };

  langEnBtn.addEventListener('click', () => chooseLanguage('en'));
  langEsBtn.addEventListener('click', () => chooseLanguage('es'));
}

// ─── Init ────────────────────────────────────────────────────────────────────
async function init() {
  const response = await chrome.runtime.sendMessage({ type: 'GET_RUNTIME_STATE' }).catch(() => null);
  runtime = response?.runtime || null;
  const stored = runtime?.settings || await chrome.storage.sync.get(null);
  settings = { ...DEFAULT_SETTINGS, ...stored };
  uiLanguage = settings.uiLanguage || 'en';

  if (settings.languageChoiceRequired) {
    renderLanguageChooser();
    return;
  }

  const session = parseInt(sessionStorage.getItem('asp_session_count') || '0', 10);
  sessionCount = Number.isNaN(session) ? 0 : session;

  applyStaticLabels();
  applySettingsToUI();
  attachListeners();
  updateStatus();
  applyPlanToUI();
  await runHealthChecks();
  trackPageView();
}

function trackPageView() {
  chrome.runtime.sendMessage({
    type: 'TRACK_EVENT',
    eventType: 'page_view',
    metadata: {
      context: 'popup',
      pageTitle: document.title,
      pageLocation: location.href,
      pagePath: location.pathname
    }
  }).catch(() => {});
}

// ─── Apply Settings to UI ────────────────────────────────────────────────────
function applySettingsToUI() {
  mainToggle.checked = settings.enabled;
  toggleLabel.textContent = settings.enabled ? 'ON' : 'OFF';
  toggleLabel.classList.toggle('off', !settings.enabled);

  const canCustomize = runtime?.features?.customization;
  if (!canCustomize) {
    settings.highlightColor = '#10b981';
    settings.checkmarkPosition = 'cursor';
    settings.soundEnabled = false;
  }

  quickColor.value = settings.highlightColor;
  colorPreview.style.background = settings.highlightColor;
  colorPreview.style.boxShadow = `0 0 10px ${settings.highlightColor}60`;
  colorIndicator.style.background = settings.highlightColor;
  colorIndicator.style.boxShadow = `0 0 12px ${settings.highlightColor}80`;

  quickPosition.value = settings.checkmarkPosition;
  soundToggle.checked = settings.soundEnabled;
  desktopNotificationToggle.checked = settings.desktopNotificationsEnabled !== false;
  quickColor.disabled = !canCustomize;
  quickPosition.disabled = !canCustomize;
  soundToggle.disabled = !canCustomize;

  copyCountEl.textContent = settings.copyCount || 0;
  sessionCountEl.textContent = sessionCount;
}

function applyPlanToUI() {
  const plan = runtime?.billingState?.plan || 'free';
  btnStartTrial.style.display = '';
  btnActivatePro.style.display = '';
  btnManageLicense.style.display = 'none';
  btnStartTrial.disabled = false;
  btnActivatePro.disabled = false;
  btnStartTrial.textContent = t('btnStartTrial');
  btnActivatePro.textContent = t('btnActivatePro');
  btnManageLicense.textContent = t('btnManageLicense');

  if (plan === 'trial') {
    planName.textContent = t('planTrialName');
    planMeta.textContent = t('planTrialMeta');
    planBadge.textContent = 'TRIAL';
    btnStartTrial.style.display = 'none';
    btnManageLicense.style.display = '';
    btnActivatePro.textContent = getLocale() === 'es' ? 'Comprar Pro' : 'Buy Pro';
    btnStartTrial.disabled = true;
  } else if (plan === 'lifetime_pro' || plan === 'annual_pro') {
    planName.textContent = 'AutoSelect Pro';
    planMeta.textContent = plan === 'annual_pro' ? t('planProAnnualMeta') : t('planProLifetimeMeta');
    planBadge.textContent = 'PRO';
    btnStartTrial.style.display = 'none';
    btnActivatePro.style.display = 'none';
    btnManageLicense.style.display = '';
    btnStartTrial.disabled = true;
  } else {
    planName.textContent = 'FREE';
    planMeta.textContent = t('planFreeMeta', { remaining: runtime?.remainingFreeCopies ?? 50 });
    planBadge.textContent = 'FREE';
    btnActivatePro.textContent = t('btnActivatePro');
    btnStartTrial.textContent = t('btnStartTrial');
    btnManageLicense.textContent = t('btnManageLicense');
    btnStartTrial.disabled = false;
  }
}

function updateStatus() {
  if (settings.enabled) {
    statusBanner.classList.remove('inactive');
    statusDot.classList.remove('inactive');
    statusText.textContent = t('statusActive');
  } else {
    statusBanner.classList.add('inactive');
    statusDot.classList.add('inactive');
    statusText.textContent = t('statusInactive');
  }
}

function renderHealthNotice(lines) {
  if (!lines.length) {
    healthNotice.style.display = 'none';
    healthNotice.textContent = '';
    return;
  }
  healthNotice.style.display = 'block';
  healthNotice.textContent = lines.join('\n');
}

function getTabIssueFromUrl(url) {
  if (!url) return t('noTabInfo');
  const lower = url.toLowerCase();
  if (lower.startsWith('chrome://') || lower.startsWith('edge://') || lower.startsWith('about:')) {
    return t('blockedInternal');
  }
  if (lower.startsWith('chrome-extension://')) {
    return t('blockedExtensionPage');
  }
  if (lower.includes('chrome.google.com/webstore') || lower.includes('chromewebstore.google.com')) {
    return t('blockedWebStore');
  }
  if (!lower.startsWith('http://') && !lower.startsWith('https://') && !lower.startsWith('file://')) {
    return t('unsupportedUrl');
  }
  return null;
}

async function runHealthChecks() {
  const lines = [];

  if (!settings.enabled) {
    renderHealthNotice(lines);
    return;
  }

  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs?.[0];
    const issue = getTabIssueFromUrl(tab?.url || '');
    if (issue) {
      lines.push(`- ${issue}`);
    } else if (tab?.id != null) {
      try {
        const ping = await chrome.tabs.sendMessage(tab.id, { type: 'PING_CONTENT_SCRIPT' });
        if (!ping?.ok) lines.push(`- ${t('noContentConnection')}`);
      } catch {
        lines.push(`- ${t('noSiteAccess')}`);
      }
    }
  } catch {
    lines.push(`- ${t('tabValidationFail')}`);
  }

  if (settings.desktopNotificationsEnabled) {
    const res = await chrome.runtime.sendMessage({ type: 'GET_NOTIFICATIONS_PERMISSION_LEVEL' }).catch(() => null);
    if (res?.ok && res.level === 'missing_permission') {
      lines.push(`- ${t('notifMissingPermission')}`);
    } else if (res?.ok && res.level === 'denied') {
      lines.push(`- ${t('notifDenied')}`);
    }
  }

  if (!settings.soundEnabled && runtime?.features?.customization) {
    lines.push(`- ${t('soundDisabled')}`);
  } else if (!runtime?.features?.customization) {
    lines.push(`- ${t('soundProOnly')}`);
  }

  renderHealthNotice(lines);
}

// ─── Attach Listeners ────────────────────────────────────────────────────────
function attachListeners() {
  mainToggle.addEventListener('change', async () => {
    settings.enabled = mainToggle.checked;
    toggleLabel.textContent = settings.enabled ? 'ON' : 'OFF';
    toggleLabel.classList.toggle('off', !settings.enabled);
    await saveSettings();
    updateStatus();
    await runHealthChecks();
  });

  colorPreview.addEventListener('click', () => quickColor.click());
  quickColor.addEventListener('input', async () => {
    const color = quickColor.value;
    settings.highlightColor = color;
    colorPreview.style.background = color;
    colorPreview.style.boxShadow = `0 0 10px ${color}60`;
    colorIndicator.style.background = color;
    colorIndicator.style.boxShadow = `0 0 12px ${color}80`;
    await saveSettings();
    await runHealthChecks();
  });

  quickPosition.addEventListener('change', async () => {
    settings.checkmarkPosition = quickPosition.value;
    await saveSettings();
    await runHealthChecks();
  });

  soundToggle.addEventListener('change', async () => {
    settings.soundEnabled = soundToggle.checked;
    await saveSettings();
    await runHealthChecks();
  });

  desktopNotificationToggle.addEventListener('change', async () => {
    if (desktopNotificationToggle.checked) {
      const granted = await chrome.permissions.request({ permissions: ['notifications'] }).catch(() => false);
      if (!granted) {
        desktopNotificationToggle.checked = false;
        settings.desktopNotificationsEnabled = false;
        await saveSettings();
        await runHealthChecks();
        return;
      }
    }
    settings.desktopNotificationsEnabled = desktopNotificationToggle.checked;
    await saveSettings();
    await runHealthChecks();
  });

  btnOptions.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
    window.close();
  });

  btnPdfViewer.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('pdf-viewer.html') });
    window.close();
  });

  btnStartTrial.addEventListener('click', async () => {
    btnStartTrial.disabled = true;
    const res = await chrome.runtime.sendMessage({ type: 'START_TRIAL' }).catch(() => null);
    if (!res?.ok) {
      statusText.textContent = t('trialUnavailable');
      statusBanner.classList.add('inactive');
      btnStartTrial.disabled = false;
      return;
    }
    const state = await chrome.runtime.sendMessage({ type: 'GET_RUNTIME_STATE' }).catch(() => null);
    runtime = state?.runtime || runtime;
    applySettingsToUI();
    applyPlanToUI();
    statusText.textContent = t('trialActive');
    await runHealthChecks();
  });

  btnActivatePro.addEventListener('click', () => {
    openLicenseOptions();
  });

  btnManageLicense.addEventListener('click', openLicenseOptions);
}

function openLicenseOptions() {
  chrome.tabs.create({ url: chrome.runtime.getURL('options.html#license') });
  window.close();
}

// ─── Save Settings ────────────────────────────────────────────────────────────
async function saveSettings() {
  await chrome.storage.sync.set(settings);
  chrome.runtime.sendMessage({
    type: 'SETTINGS_UPDATED',
    settings
  }).catch(() => {});
}

// ─── Listen for changes ───────────────────────────────────────────────────────
chrome.storage.onChanged.addListener((changes) => {
  if (changes.copyCount) {
    const newCount = changes.copyCount.newValue || 0;
    copyCountEl.textContent = newCount;

    copyCountEl.style.transform = 'scale(1.3)';
    copyCountEl.style.color = '#10b981';
    setTimeout(() => {
      copyCountEl.style.transform = 'scale(1)';
      copyCountEl.style.color = '';
    }, 200);
  }
  if (changes.desktopNotificationsEnabled) {
    settings.desktopNotificationsEnabled = changes.desktopNotificationsEnabled.newValue;
    desktopNotificationToggle.checked = settings.desktopNotificationsEnabled !== false;
  }
});

// ─── Run ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
