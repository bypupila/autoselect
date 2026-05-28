// AutoSelect Pro — Options Page Script

const DEFAULT_SETTINGS = {
  enabled: true,
  highlightColor: '#10b981',
  highlightOpacity: 0.35,
  highlightDuration: 1500,
  checkmarkPosition: 'cursor',
  minChars: 1,
  cooldown: 0,
  soundEnabled: false,
  desktopNotificationsEnabled: true,
  uiLanguage: 'en',
  languageChoiceRequired: false,
  pdfMode: true,
  pdfLineGapSplitEnabled: true,
  pdfLineGapThreshold: 56,
  blacklist: [],
  copyCount: 0
};

let settings = { ...DEFAULT_SETTINGS };
let saveTimeout = null;
let runtime = null;
let earlyBirdTimer = null;
let locale = 'en';
document.documentElement.style.visibility = 'hidden';

const I18N = {
  en: {
    htmlLang: 'en',
    pageTitle: 'AutoSelect Pro — Options',
    saved: 'Saved',
    navGeneral: 'General',
    navVisual: 'Visual',
    navSites: 'Blocked sites',
    navStats: 'Stats',
    navLicense: 'License',
    extension: 'Extension',
    behavior: 'Behavior',
    minCharsLabel: 'Minimum characters to copy',
    minCharsDesc: 'Selections shorter than this will not be copied',
    cooldownLabel: 'Cooldown',
    cooldownDesc: 'Seconds to wait before allowing another copy',
    copyOnSelectLabel: 'Copy on drag selection',
    copyOnSelectDesc: 'Copies text when you select by dragging the mouse',
    copyOnDoubleClickLabel: 'Copy on double click',
    copyOnDoubleClickDesc: 'Copies immediately when you double-click a word',
    pdfModeLabel: 'PDF support',
    pdfModeDesc: 'Enable auto-copy in PDFs opened in Chrome',
    pdfSplitLabel: 'Split lines by columns',
    pdfSplitDesc: 'In Line mode, split text when there is a large whitespace gap',
    soundLabel: 'Copy sound',
    soundDesc: 'Subtle confirmation tone',
    desktopNotifLabel: 'System notification',
    desktopNotifDesc: 'Show a system notification every time text is copied',
    languageLabel: 'Language',
    languageDesc: 'English is default. Switch to Spanish anytime.',
    visualTitle: 'Selection highlight',
    colorLabel: 'Highlight color',
    colorDesc: 'Color shown over copied text',
    opacityLabel: 'Highlight opacity',
    opacityDesc: 'Background color transparency',
    durationLabel: 'Highlight duration',
    durationDesc: 'How long the color remains visible',
    indicatorTitle: 'Copy indicator (✓)',
    indicatorLabel: 'Indicator position',
    posCursor: 'Cursor',
    posCorner: 'Corner',
    posBoth: 'Both',
    posNone: 'None',
    previewTitle: 'Live preview',
    previewLead: 'Select this text to preview the highlight effect.',
    previewSpan: 'This text will show the selected color.',
    previewTail: 'The extension will copy automatically what you select.',
    copiedWord: 'Copied',
    blockedSitesTitle: 'Blocked sites',
    blockedSitesDesc: 'The extension will not run on these domains',
    blockedSitesPlaceholder: 'e.g. google.com, notion.so',
    add: 'Add',
    noBlockedSites: 'No blocked sites',
    totalCopied: 'Total copied texts',
    thisSession: 'This session',
    actions: 'Actions',
    resetStats: 'Reset stats',
    accountEyebrow: 'Your account',
    startTrial: 'Start trial',
    trialStrong: '3-day Pro',
    sync: 'Sync',
    revalidate: 'Revalidate access',
    buyProTitle: 'Buy Pro',
    buyProCopy: 'Checkout opens in Polar through explicit user action. After purchase, come back here and activate with your license key.',
    earlyBirdStrong: '$14.99 lifetime',
    lifetimeStrong: '$19.99 one-time',
    annualLabel: 'Annual',
    annualStrong: '$12.00/year',
    activateProTitle: 'Activate Pro',
    activateProCopy: 'Use your purchase email and license key. If you have a promo code, apply it from this same form.',
    purchaseEmail: 'Purchase email',
    purchaseEmailPlaceholder: 'you@email.com',
    licenseKey: 'License key',
    licenseKeyPlaceholder: 'Polar license key',
    promoCode: 'Promo code',
    optional: 'Optional',
    marketingConsent: 'I agree to receive updates, improvements, and offers from AutoSelect Pro via email.',
    activateLicenseBtn: 'Activate with license key',
    applyCodeBtn: 'Apply code',
    advancedConfigTitle: 'Advanced configuration',
    advancedConfigCopy: 'Only edit this if you need to change backend, legal URLs, or analytics before release.',
    apiBaseUrl: 'API Base URL',
    apiBasePlaceholder: 'https://api.yourdomain.com',
    ga4SecretPlaceholder: 'Measurement Protocol API secret',
    checkoutAnnual: 'Checkout Annual',
    privacyPolicy: 'Privacy Policy',
    terms: 'Terms',
    saveConfig: 'Save configuration',
    remove: 'Remove',
    resetStatsConfirm: 'Reset all statistics?',
    trialUnavailable: 'Could not start trial. It may already be used in this installation.',
    trialStarted: 'Trial activated. You can now use all Pro features.',
    synced: 'Access synced with server.',
    configSaved: 'Configuration saved. Invalid URLs were left empty.',
    setupCheckoutFirst: 'Configure the HTTPS Polar checkout URL for this plan first.',
    activationNeedsFields: 'Enter purchase email and license key to activate Pro.',
    activationFailed: 'Activation failed. Check purchase email and license key.',
    activationSuccess: 'Pro activated successfully.',
    couponNeedsFields: 'Enter purchase email and promo code.',
    couponFailed: 'Could not apply promo code: {{error}}',
    couponSuccess: 'Code applied. Pro is now active.',
    graceStatus: 'Your Pro access needs to reconnect to the server for revalidation.',
    trialUsed: 'Trial used',
    trialAvailable: '3-day Pro',
    planPro: 'AutoSelect Pro',
    planAnnualActive: 'Annual subscription active.',
    planLifetimeActive: 'Lifetime license active.',
    planTrial: 'Pro Trial',
    planTrialStatus: 'Pro feature trial active until {{date}} (FREE basic usage remains available).',
    planFree: 'Current plan: FREE',
    planFreeStatus: 'FREE works right after install. Upgrade to Pro or start a 3-day trial to unlock Pro features.',
    meterUnlimited: 'unlimited copies',
    meterTrial: 'copies during trial',
    meterRemaining: 'copies left today',
    checkoutConfigureTitle: 'Configure this Polar checkout URL in Advanced configuration.',
    checkoutOpenTitle: 'Open secure Polar checkout',
    offerEnded: 'Offer ended',
    offerEndsIn: 'Ends in {{days}}d {{time}}',
    sectionSites: 'Blocked sites',
    sectionStats: 'Stats',
    sectionLicense: 'License'
  },
  es: {
    htmlLang: 'es',
    pageTitle: 'AutoSelect Pro — Opciones',
    saved: 'Guardado',
    navGeneral: 'General',
    navVisual: 'Visual',
    navSites: 'Sitios excluidos',
    navStats: 'Estadísticas',
    navLicense: 'Licencia',
    extension: 'Extensión',
    behavior: 'Comportamiento',
    minCharsLabel: 'Mínimo de caracteres para copiar',
    minCharsDesc: 'No copiará selecciones más cortas que esto',
    cooldownLabel: 'Tiempo de espera (Cooldown)',
    cooldownDesc: 'Segundos a esperar antes de permitir copiar de nuevo',
    copyOnSelectLabel: 'Copiar al arrastrar',
    copyOnSelectDesc: 'Copia el texto cuando lo seleccionas arrastrando el mouse',
    copyOnDoubleClickLabel: 'Copiar al hacer doble clic',
    copyOnDoubleClickDesc: 'Copia el texto inmediatamente al hacer doble clic en una palabra',
    pdfModeLabel: 'Soporte de PDFs',
    pdfModeDesc: 'Activar auto-copy en PDFs abiertos en Chrome',
    pdfSplitLabel: 'Cortar líneas por columnas',
    pdfSplitDesc: 'En modo Línea, separa textos cuando hay una brecha grande en blanco',
    soundLabel: 'Sonido al copiar',
    soundDesc: 'Tono sutil de confirmación',
    desktopNotifLabel: 'Notificación del sistema',
    desktopNotifDesc: 'Muestra una notificación del SO cada vez que copia',
    languageLabel: 'Idioma',
    languageDesc: 'Inglés por defecto. Cambia a español cuando quieras.',
    visualTitle: 'Highlight de selección',
    colorLabel: 'Color del highlight',
    colorDesc: 'Color que aparece sobre el texto copiado',
    opacityLabel: 'Opacidad del highlight',
    opacityDesc: 'Transparencia del color de fondo',
    durationLabel: 'Duración del highlight',
    durationDesc: 'Tiempo que permanece visible el color',
    indicatorTitle: 'Indicador de copia (✓)',
    indicatorLabel: 'Posición del indicador',
    posCursor: 'Cursor',
    posCorner: 'Esquina',
    posBoth: 'Ambos',
    posNone: 'Ninguno',
    previewTitle: 'Vista previa',
    previewLead: 'Selecciona este texto para ver el efecto del highlight en acción.',
    previewSpan: 'Este texto mostrará el color elegido.',
    previewTail: 'La extensión copiará automáticamente lo que selecciones.',
    copiedWord: 'Copiado',
    blockedSitesTitle: 'Sitios excluidos',
    blockedSitesDesc: 'La extensión no funcionará en estos dominios',
    blockedSitesPlaceholder: 'ej: google.com, notion.so',
    add: 'Agregar',
    noBlockedSites: 'No hay sitios excluidos',
    totalCopied: 'Total de textos copiados',
    thisSession: 'Esta sesión',
    actions: 'Acciones',
    resetStats: 'Resetear estadísticas',
    accountEyebrow: 'Tu cuenta',
    startTrial: 'Iniciar trial',
    trialStrong: '3 días Pro',
    sync: 'Sincronizar',
    revalidate: 'Revalidar acceso',
    buyProTitle: 'Comprar Pro',
    buyProCopy: 'El checkout se abre en Polar mediante una acción explícita del usuario. Después de comprar, vuelve aquí para activar con tu license key.',
    earlyBirdStrong: '$14.99 lifetime',
    lifetimeStrong: '$19.99 único',
    annualLabel: 'Anual',
    annualStrong: '$12.00/año',
    activateProTitle: 'Activar Pro',
    activateProCopy: 'Usa el email de compra y tu license key. Si tienes un código promocional, puedes aplicarlo desde el mismo formulario.',
    purchaseEmail: 'Email de compra',
    purchaseEmailPlaceholder: 'tu@email.com',
    licenseKey: 'License key',
    licenseKeyPlaceholder: 'Polar license key',
    promoCode: 'Código promocional',
    optional: 'Opcional',
    marketingConsent: 'Acepto recibir novedades, mejoras y ofertas de AutoSelect Pro por email.',
    activateLicenseBtn: 'Activar con license key',
    applyCodeBtn: 'Aplicar código',
    advancedConfigTitle: 'Configuración avanzada',
    advancedConfigCopy: 'Solo necesitas tocar esto si cambias el backend, URLs legales o analytics antes de publicar.',
    apiBaseUrl: 'API Base URL',
    apiBasePlaceholder: 'https://api.tudominio.com',
    ga4SecretPlaceholder: 'Measurement Protocol API secret',
    checkoutAnnual: 'Checkout Anual',
    privacyPolicy: 'Política de Privacidad',
    terms: 'Términos',
    saveConfig: 'Guardar configuración',
    remove: 'Eliminar',
    resetStatsConfirm: '¿Resetear todas las estadísticas?',
    trialUnavailable: 'No fue posible iniciar el trial. Puede que ya se haya usado en esta instalación.',
    trialStarted: 'Trial activado. Ya puedes usar todas las funciones Pro.',
    synced: 'Acceso sincronizado con el servidor.',
    configSaved: 'Configuración guardada. Las URLs inválidas se dejaron vacías.',
    setupCheckoutFirst: 'Configura primero el checkout HTTPS de Polar para este plan.',
    activationNeedsFields: 'Completa email y license key para activar Pro.',
    activationFailed: 'No se pudo activar. Verifica el email y la license key.',
    activationSuccess: 'Pro activado correctamente.',
    couponNeedsFields: 'Completa email y código promocional.',
    couponFailed: 'No se pudo aplicar el código: {{error}}',
    couponSuccess: 'Código aplicado. Pro quedó activo.',
    graceStatus: 'Tu acceso Pro necesita reconectar con el servidor para revalidarse.',
    trialUsed: 'Trial usado',
    trialAvailable: '3 días Pro',
    planPro: 'AutoSelect Pro',
    planAnnualActive: 'Suscripción anual activa.',
    planLifetimeActive: 'Licencia de por vida activa.',
    planTrial: 'Trial Pro',
    planTrialStatus: 'Trial de funciones Pro activo hasta {{date}} (el uso básico FREE siempre sigue funcionando).',
    planFree: 'Plan actual: FREE',
    planFreeStatus: 'El plan FREE funciona al instalar. Activa Pro o prueba 3 días solo para desbloquear funciones Pro.',
    meterUnlimited: 'copias ilimitadas',
    meterTrial: 'copias durante el trial',
    meterRemaining: 'copias restantes hoy',
    checkoutConfigureTitle: 'Configura este checkout de Polar en Configuración avanzada.',
    checkoutOpenTitle: 'Abrir checkout seguro de Polar',
    offerEnded: 'Oferta finalizada',
    offerEndsIn: 'Termina en {{days}}d {{time}}',
    sectionSites: 'Sitios excluidos',
    sectionStats: 'Estadísticas',
    sectionLicense: 'Licencia'
  }
};

function tr(key, vars = {}) {
  const lang = I18N[locale] ? locale : 'en';
  const raw = I18N[lang][key] ?? I18N.en[key] ?? key;
  return Object.entries(vars).reduce(
    (acc, [name, value]) => acc.replaceAll(`{{${name}}}`, String(value)),
    raw
  );
}

function setText(el, value) {
  if (!el) return;
  el.textContent = value;
}

function setTrailingText(el, value) {
  if (!el) return;
  const textNode = [...el.childNodes].find(
    (node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim().length
  );
  if (textNode) {
    textNode.textContent = ` ${value}`;
    return;
  }
  el.appendChild(document.createTextNode(` ${value}`));
}

function setGroupLabelAndDesc(control, labelKey, descKey) {
  const group = control?.closest('.form-group');
  if (!group) return;
  setText(group.querySelector('.form-label'), tr(labelKey));
  setText(group.querySelector('.form-desc'), tr(descKey));
}

// ─── DOM ─────────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

const els = {
  sidebarToggle:     $('sidebarToggle'),
  minChars:          $('minChars'),
  minCharsValue:     $('minCharsValue'),
  cooldown:          $('cooldown'),
  cooldownValue:     $('cooldownValue'),
  copyOnSelect:      $('copyOnSelect'),
  copyOnDoubleClick: $('copyOnDoubleClick'),
  pdfMode:           $('pdfMode'),
  pdfLineGapSplitEnabled: $('pdfLineGapSplitEnabled'),
  pdfLineGapThreshold: $('pdfLineGapThreshold'),
  pdfLineGapThresholdValue: $('pdfLineGapThresholdValue'),
  soundEnabled:      $('soundEnabled'),
  desktopNotificationsEnabled: $('desktopNotificationsEnabled'),
  uiLanguage:        $('uiLanguage'),
  highlightColor:    $('highlightColor'),
  highlightOpacity:  $('highlightOpacity'),
  opacityValue:      $('opacityValue'),
  highlightDuration: $('highlightDuration'),
  durationValue:     $('durationValue'),
  positionGrid:      $('positionGrid'),
  previewHighlight:  $('previewHighlight'),
  previewCheckmark:  $('previewCheckmark'),
  blacklistInput:    $('blacklistInput'),
  btnAddSite:        $('btnAddSite'),
  blacklistList:     $('blacklistList'),
  blacklistEmpty:    $('blacklistEmpty'),
  statTotal:         $('statTotal'),
  statSession:       $('statSession'),
  btnResetStats:     $('btnResetStats'),
  saveIndicator:     $('saveIndicator'),
  pageTitle:         $('pageTitle'),
  licensePlanText:   $('licensePlanText'),
  licenseBadge:      $('licenseBadge'),
  licenseStatusText: $('licenseStatusText'),
  licenseMeter:      $('licenseMeter'),
  licenseMeterValue: $('licenseMeterValue'),
  licenseMeterLabel: $('licenseMeterLabel'),
  licenseMessage:    $('licenseMessage'),
  licenseEmailText:  $('licenseEmailText'),
  licenseExpiryText: $('licenseExpiryText'),
  licenseKeyInput:   $('licenseKeyInput'),
  licenseEmailInput: $('licenseEmailInput'),
  couponCodeInput:   $('couponCodeInput'),
  marketingConsent:  $('marketingConsent'),
  btnBuyEarlyBird:   $('btnBuyEarlyBird'),
  btnBuyLifetime:    $('btnBuyLifetime'),
  btnBuyAnnual:      $('btnBuyAnnual'),
  earlyBirdCountdown:$('earlyBirdCountdown'),
  btnActivateLicense:$('btnActivateLicense'),
  btnActivateCoupon: $('btnActivateCoupon'),
  btnStartTrial:     $('btnStartTrial'),
  btnRevalidateLicense:$('btnRevalidateLicense'),
  apiBaseUrl:        $('apiBaseUrl'),
  ga4MeasurementId:  $('ga4MeasurementId'),
  ga4ApiSecret:      $('ga4ApiSecret'),
  checkoutEarlyBirdUrl:$('checkoutEarlyBirdUrl'),
  checkoutLifetimeUrl:$('checkoutLifetimeUrl'),
  checkoutAnnualUrl: $('checkoutAnnualUrl'),
  privacyUrl:        $('privacyUrl'),
  termsUrl:          $('termsUrl'),
  btnSaveBackend:    $('btnSaveBackend')
};

function applyStaticLocalization() {
  document.documentElement.lang = tr('htmlLang');
  document.title = tr('pageTitle');

  setTrailingText(document.querySelector('.nav-item[data-section="general"]'), tr('navGeneral'));
  setTrailingText(document.querySelector('.nav-item[data-section="visual"]'), tr('navVisual'));
  setTrailingText(document.querySelector('.nav-item[data-section="sites"]'), tr('navSites'));
  setTrailingText(document.querySelector('.nav-item[data-section="stats"]'), tr('navStats'));
  setTrailingText(document.querySelector('.nav-item[data-section="license"]'), tr('navLicense'));
  setText(document.querySelector('.quick-toggle-row span'), tr('extension'));
  setTrailingText(els.saveIndicator, tr('saved'));

  setText(document.querySelector('#section-general .card .card-title'), tr('behavior'));
  setGroupLabelAndDesc(els.minChars, 'minCharsLabel', 'minCharsDesc');
  setGroupLabelAndDesc(els.cooldown, 'cooldownLabel', 'cooldownDesc');
  setGroupLabelAndDesc(els.copyOnSelect, 'copyOnSelectLabel', 'copyOnSelectDesc');
  setGroupLabelAndDesc(els.copyOnDoubleClick, 'copyOnDoubleClickLabel', 'copyOnDoubleClickDesc');
  setGroupLabelAndDesc(els.pdfMode, 'pdfModeLabel', 'pdfModeDesc');
  setGroupLabelAndDesc(els.pdfLineGapSplitEnabled, 'pdfSplitLabel', 'pdfSplitDesc');
  setGroupLabelAndDesc(els.soundEnabled, 'soundLabel', 'soundDesc');
  setGroupLabelAndDesc(els.desktopNotificationsEnabled, 'desktopNotifLabel', 'desktopNotifDesc');
  setGroupLabelAndDesc(els.uiLanguage, 'languageLabel', 'languageDesc');

  const visualCard = document.querySelector('#section-visual .card');
  setText(visualCard?.querySelector('.card-title'), tr('visualTitle'));
  setGroupLabelAndDesc(els.highlightColor, 'colorLabel', 'colorDesc');
  setGroupLabelAndDesc(els.highlightOpacity, 'opacityLabel', 'opacityDesc');
  setGroupLabelAndDesc(els.highlightDuration, 'durationLabel', 'durationDesc');

  const indicatorCard = document.querySelector('#section-visual .card:nth-of-type(2)');
  setText(indicatorCard?.querySelector('.card-title'), tr('indicatorTitle'));
  setText(indicatorCard?.querySelector('.form-label'), tr('indicatorLabel'));
  document.querySelectorAll('.position-btn').forEach((btn) => {
    const value = btn.dataset.value;
    if (value === 'cursor') setTrailingText(btn, tr('posCursor'));
    if (value === 'corner') setTrailingText(btn, tr('posCorner'));
    if (value === 'both') setTrailingText(btn, tr('posBoth'));
    if (value === 'none') setTrailingText(btn, tr('posNone'));
  });

  const previewCard = document.querySelector('#section-visual .preview-card');
  setText(previewCard?.querySelector('.card-title'), tr('previewTitle'));
  setText(document.getElementById('previewLeadText'), tr('previewLead'));
  setText(document.getElementById('previewHighlight'), tr('previewSpan'));
  setText(document.getElementById('previewTailText'), tr('previewTail'));
  setTrailingText(els.previewCheckmark, tr('copiedWord'));

  const sitesCard = document.querySelector('#section-sites .card');
  setText(sitesCard?.querySelector('.card-title'), tr('blockedSitesTitle'));
  setText(sitesCard?.querySelector('.form-desc'), tr('blockedSitesDesc'));
  els.blacklistInput.placeholder = tr('blockedSitesPlaceholder');
  setText(els.btnAddSite, tr('add'));
  setText(els.blacklistEmpty?.querySelector('span'), tr('noBlockedSites'));

  const statsCards = document.querySelectorAll('#section-stats .card');
  setText(document.querySelector('#section-stats .stat-big-card:nth-of-type(1) .stat-big-label'), tr('totalCopied'));
  setText(document.querySelector('#section-stats .stat-big-card:nth-of-type(2) .stat-big-label'), tr('thisSession'));
  setText(statsCards?.[0]?.querySelector('.card-title'), tr('actions'));
  setTrailingText(els.btnResetStats, tr('resetStats'));

  setText(document.querySelector('.license-eyebrow'), tr('accountEyebrow'));
  setText(document.querySelector('#btnStartTrial span'), tr('startTrial'));
  setText(document.querySelector('#btnStartTrial strong'), tr('trialStrong'));
  setText(document.querySelector('#btnRevalidateLicense span'), tr('sync'));
  setText(document.querySelector('#btnRevalidateLicense strong'), tr('revalidate'));

  const licenseCards = document.querySelectorAll('#section-license .license-card');
  setText(licenseCards?.[0]?.querySelector('.card-title'), tr('buyProTitle'));
  setText(licenseCards?.[0]?.querySelector('.license-copy'), tr('buyProCopy'));
  setText(document.querySelector('#btnBuyAnnual span'), tr('annualLabel'));
  setText(document.querySelector('#btnBuyEarlyBird strong'), tr('earlyBirdStrong'));
  setText(document.querySelector('#btnBuyLifetime strong'), tr('lifetimeStrong'));
  setText(document.querySelector('#btnBuyAnnual strong'), tr('annualStrong'));

  setText(licenseCards?.[1]?.querySelector('.card-title'), tr('activateProTitle'));
  setText(licenseCards?.[1]?.querySelector('.license-copy'), tr('activateProCopy'));
  setText(document.querySelector('label[for="marketingConsent"] span'), tr('marketingConsent'));
  setText(els.btnActivateLicense, tr('activateLicenseBtn'));
  setText(els.btnActivateCoupon, tr('applyCodeBtn'));
  els.licenseEmailInput.placeholder = tr('purchaseEmailPlaceholder');
  els.licenseKeyInput.placeholder = tr('licenseKeyPlaceholder');

  setText(document.getElementById('licenseEmailLabel'), tr('purchaseEmail'));
  setText(document.getElementById('licenseKeyLabel'), tr('licenseKey'));
  setText(document.getElementById('couponCodeLabel'), tr('promoCode'));
  setText(document.getElementById('apiBaseUrlLabel'), tr('apiBaseUrl'));
  setText(document.getElementById('checkoutAnnualLabel'), tr('checkoutAnnual'));
  setText(document.getElementById('privacyUrlLabel'), tr('privacyPolicy'));
  setText(document.getElementById('termsUrlLabel'), tr('terms'));

  setText(licenseCards?.[2]?.querySelector('.card-title'), tr('advancedConfigTitle'));
  setText(licenseCards?.[2]?.querySelector('.license-copy'), tr('advancedConfigCopy'));
  setText(els.btnSaveBackend, tr('saveConfig'));

  els.couponCodeInput.placeholder = tr('optional');
  els.apiBaseUrl.placeholder = tr('apiBasePlaceholder');
  els.ga4ApiSecret.placeholder = tr('ga4SecretPlaceholder');
}

// ─── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_RUNTIME_STATE' }).catch(() => null);
    runtime = response?.runtime || null;
    const stored = runtime?.settings || await chrome.storage.sync.get(null);
    settings = { ...DEFAULT_SETTINGS, ...stored };
    locale = settings.uiLanguage === 'es' ? 'es' : 'en';
    applyStaticLocalization();
    applyToUI();
    attachListeners();
    renderBlacklist();
    updateStats();
    updateLicenseUI();
    const initialSection = window.location.hash.replace('#', '');
    if (initialSection) switchSection(initialSection);
    trackPageView();
  } finally {
    document.documentElement.style.visibility = '';
  }
}

// ─── Apply to UI ──────────────────────────────────────────────────────────────
function applyToUI() {
  els.sidebarToggle.checked   = settings.enabled;
  els.minChars.value           = settings.minChars;
  els.minCharsValue.textContent = settings.minChars;
  els.cooldown.value           = settings.cooldown;
  els.cooldownValue.textContent = settings.cooldown + 's';
  els.copyOnSelect.checked     = settings.copyOnSelect;
  els.copyOnDoubleClick.checked= settings.copyOnDoubleClick;
  els.pdfMode.checked          = settings.pdfMode;
  els.pdfLineGapSplitEnabled.checked = settings.pdfLineGapSplitEnabled;
  els.pdfLineGapThreshold.value = settings.pdfLineGapThreshold;
  els.pdfLineGapThresholdValue.textContent = settings.pdfLineGapThreshold + 'px';
  els.soundEnabled.checked     = settings.soundEnabled;
  els.desktopNotificationsEnabled.checked = settings.desktopNotificationsEnabled !== false;
  els.uiLanguage.value = settings.uiLanguage || 'en';
  if (els.uiLanguage?.options?.length >= 2) {
    els.uiLanguage.options[0].textContent = 'English';
    els.uiLanguage.options[1].textContent = 'Español';
  }
  els.highlightColor.value     = settings.highlightColor;
  els.highlightOpacity.value   = settings.highlightOpacity;
  els.opacityValue.textContent = Math.round(settings.highlightOpacity * 100) + '%';
  els.highlightDuration.value  = settings.highlightDuration;
  els.durationValue.textContent = (settings.highlightDuration / 1000).toFixed(1) + 's';

  // Position buttons
  document.querySelectorAll('.position-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.value === settings.checkmarkPosition);
  });

  // Update preview
  updatePreview();

  if (runtime?.appConfig) {
    els.apiBaseUrl.value = runtime.appConfig.apiBaseUrl || '';
    els.ga4MeasurementId.value = runtime.appConfig.analytics?.ga4MeasurementId || '';
    els.ga4ApiSecret.value = runtime.appConfig.analytics?.ga4ApiSecret || '';
    els.checkoutEarlyBirdUrl.value = runtime.appConfig.checkoutLinks?.earlyBird || '';
    els.checkoutLifetimeUrl.value = runtime.appConfig.checkoutLinks?.lifetime || '';
    els.checkoutAnnualUrl.value = runtime.appConfig.checkoutLinks?.annual || '';
    els.privacyUrl.value = runtime.appConfig.privacyUrl || '';
    els.termsUrl.value = runtime.appConfig.termsUrl || '';
  }
}

function updateLicenseUI() {
  const plan = runtime?.billingState?.plan || 'free';
  const status = runtime?.billingState?.proStatus || 'inactive';
  const exp = runtime?.billingState?.expiresAt || runtime?.billingState?.trialEndsAt || '-';
  const email = runtime?.billingState?.email || '';
  const remaining = runtime?.remainingFreeCopies ?? 50;
  const isPro = plan === 'lifetime_pro' || plan === 'annual_pro';
  const isTrial = plan === 'trial';

  els.licenseBadge.className = 'license-badge';
  if (isPro) {
    els.licensePlanText.textContent = tr('planPro');
    els.licenseBadge.textContent = plan === 'annual_pro' ? (locale === 'es' ? 'ANUAL' : 'ANNUAL') : 'PRO';
    els.licenseStatusText.textContent = plan === 'annual_pro' ? tr('planAnnualActive') : tr('planLifetimeActive');
    els.licenseMeterValue.textContent = '∞';
    els.licenseMeterLabel.textContent = tr('meterUnlimited');
  } else if (isTrial) {
    els.licensePlanText.textContent = tr('planTrial');
    els.licenseBadge.textContent = 'TRIAL';
    els.licenseBadge.classList.add('trial');
    els.licenseStatusText.textContent = tr('planTrialStatus', { date: formatDate(exp) });
    els.licenseMeterValue.textContent = '∞';
    els.licenseMeterLabel.textContent = tr('meterTrial');
  } else {
    els.licensePlanText.textContent = tr('planFree');
    els.licenseBadge.textContent = 'FREE';
    els.licenseBadge.classList.add('free');
    els.licenseStatusText.textContent = tr('planFreeStatus');
    els.licenseMeterValue.textContent = remaining;
    els.licenseMeterLabel.textContent = tr('meterRemaining');
  }

  if (status === 'grace') {
    showLicenseMessage(tr('graceStatus'), 'error');
  }

  els.licenseEmailInput.value = email || els.licenseEmailInput.value;
  els.marketingConsent.checked = !!runtime?.billingState?.marketing?.consent;
  els.btnStartTrial.disabled = isPro || isTrial || !!runtime?.billingState?.trialStartedAt;
  els.btnStartTrial.querySelector('strong').textContent = runtime?.billingState?.trialStartedAt ? tr('trialUsed') : tr('trialAvailable');
  els.btnRevalidateLicense.disabled = !(isPro || isTrial || runtime?.billingState?.licenseKey);
  updatePurchaseButtons();

  const canCustomize = runtime?.features?.customization;
  [
    els.cooldown,
    els.highlightColor,
    els.highlightOpacity,
    els.highlightDuration,
    els.blacklistInput,
    els.btnAddSite,
    els.soundEnabled,
    els.copyOnDoubleClick
  ].forEach((node) => {
    if (!node) return;
    node.disabled = !canCustomize;
  });
  if (!canCustomize) {
    settings.highlightColor = '#10b981';
    settings.highlightOpacity = 0.35;
    settings.highlightDuration = 1500;
    settings.cooldown = 0;
    updatePreview();
  }
}

function updatePurchaseButtons() {
  const links = runtime?.appConfig?.checkoutLinks || {};
  const earlyBirdEndsAt = runtime?.appConfig?.earlyBirdEndsAt || null;
  const earlyBirdExpired = isEarlyBirdExpired(earlyBirdEndsAt);

  if (earlyBirdExpired) {
    if (els.btnBuyEarlyBird) els.btnBuyEarlyBird.style.display = 'none';
    if (els.btnBuyAnnual) els.btnBuyAnnual.style.display = 'none';
    if (els.btnBuyLifetime) els.btnBuyLifetime.style.display = '';
    document.querySelector('.purchase-grid')?.classList.add('only-lifetime');
  } else {
    if (els.btnBuyEarlyBird) els.btnBuyEarlyBird.style.display = '';
    if (els.btnBuyAnnual) els.btnBuyAnnual.style.display = '';
    document.querySelector('.purchase-grid')?.classList.remove('only-lifetime');
  }

  [
    [els.btnBuyEarlyBird, links.earlyBird, earlyBirdExpired],
    [els.btnBuyLifetime, links.lifetime],
    [els.btnBuyAnnual, links.annual]
  ].forEach(([btn, url, forceDisabled]) => {
    if (!btn) return;
    btn.disabled = !!forceDisabled || !isHttpsUrl(url);
    btn.title = btn.disabled ? tr('checkoutConfigureTitle') : tr('checkoutOpenTitle');
  });

  updateEarlyBirdCountdown(earlyBirdEndsAt);
}

function isEarlyBirdExpired(endsAtIso) {
  if (!endsAtIso) return false;
  const endsAt = new Date(endsAtIso);
  if (Number.isNaN(endsAt.getTime())) return false;
  return endsAt.getTime() <= Date.now();
}

function updateEarlyBirdCountdown(endsAtIso) {
  clearInterval(earlyBirdTimer);
  if (!els.earlyBirdCountdown) return;
  if (!endsAtIso || isEarlyBirdExpired(endsAtIso)) {
    els.earlyBirdCountdown.textContent = tr('offerEnded');
    return;
  }
  const tick = () => {
    const endsAt = new Date(endsAtIso).getTime();
    const remaining = endsAt - Date.now();
    if (remaining <= 0) {
      els.earlyBirdCountdown.textContent = tr('offerEnded');
      clearInterval(earlyBirdTimer);
      updatePurchaseButtons();
      return;
    }
    const totalSeconds = Math.floor(remaining / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const time = `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;
    els.earlyBirdCountdown.textContent = tr('offerEndsIn', { days, time });
  };
  tick();
  earlyBirdTimer = setInterval(tick, 1000);
}

function isHttpsUrl(value) {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

function formatDate(value) {
  if (!value || value === '-') return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString(locale === 'es' ? 'es' : 'en', { day: '2-digit', month: 'short', year: 'numeric' });
}

function showLicenseMessage(message, type = 'success') {
  els.licenseMessage.textContent = message;
  els.licenseMessage.className = `license-message show ${type}`;
}

function clearLicenseMessage() {
  els.licenseMessage.textContent = '';
  els.licenseMessage.className = 'license-message';
}

function setLicenseBusy(isBusy) {
  [els.btnActivateLicense, els.btnActivateCoupon, els.btnStartTrial, els.btnRevalidateLicense].forEach(btn => {
    if (btn) btn.disabled = isBusy;
  });
}

function trackPageView() {
  chrome.runtime.sendMessage({
    type: 'TRACK_EVENT',
    eventType: 'page_view',
    metadata: {
      context: 'options',
      pageTitle: document.title,
      pageLocation: location.href,
      pagePath: location.pathname + location.hash
    }
  }).catch(() => {});
}

function updatePreview() {
  const r = parseInt(settings.highlightColor.slice(1,3), 16);
  const g = parseInt(settings.highlightColor.slice(3,5), 16);
  const b = parseInt(settings.highlightColor.slice(5,7), 16);
  els.previewHighlight.style.background = `rgba(${r},${g},${b},${settings.highlightOpacity})`;

  const checkIcon = els.previewCheckmark.querySelector('.preview-check-icon');
  if (checkIcon) {
    checkIcon.style.background = `linear-gradient(135deg, ${settings.highlightColor}, ${settings.highlightColor}dd)`;
    checkIcon.style.boxShadow = `0 0 8px ${settings.highlightColor}60`;
  }

  els.previewCheckmark.style.borderColor = settings.highlightColor + '66';
  els.previewCheckmark.style.display =
    settings.checkmarkPosition === 'none' ? 'none' : 'flex';
}

// ─── Listeners ────────────────────────────────────────────────────────────────
function attachListeners() {
  // Sidebar toggle
  els.sidebarToggle.addEventListener('change', () => {
    settings.enabled = els.sidebarToggle.checked;
    save();
  });

  // Min chars
  els.minChars.addEventListener('input', () => {
    settings.minChars = parseInt(els.minChars.value);
    els.minCharsValue.textContent = settings.minChars;
    save();
  });

  // Cooldown
  els.cooldown.addEventListener('input', () => {
    settings.cooldown = parseFloat(els.cooldown.value);
    els.cooldownValue.textContent = settings.cooldown + 's';
    save();
  });

  // Toggles
  els.copyOnSelect.addEventListener('change', () => {
    settings.copyOnSelect = els.copyOnSelect.checked;
    save();
  });

  els.copyOnDoubleClick.addEventListener('change', () => {
    settings.copyOnDoubleClick = els.copyOnDoubleClick.checked;
    save();
  });

  els.pdfMode.addEventListener('change', () => {
    settings.pdfMode = els.pdfMode.checked;
    save();
  });

  els.pdfLineGapSplitEnabled.addEventListener('change', () => {
    settings.pdfLineGapSplitEnabled = els.pdfLineGapSplitEnabled.checked;
    save();
  });

  els.pdfLineGapThreshold.addEventListener('input', () => {
    settings.pdfLineGapThreshold = parseInt(els.pdfLineGapThreshold.value, 10);
    els.pdfLineGapThresholdValue.textContent = settings.pdfLineGapThreshold + 'px';
    save();
  });

  // Sound
  els.soundEnabled.addEventListener('change', () => {
    settings.soundEnabled = els.soundEnabled.checked;
    save();
  });

  els.desktopNotificationsEnabled.addEventListener('change', async () => {
    if (els.desktopNotificationsEnabled.checked) {
      const granted = await chrome.permissions.request({ permissions: ['notifications'] }).catch(() => false);
      if (!granted) {
        els.desktopNotificationsEnabled.checked = false;
      }
    }
    settings.desktopNotificationsEnabled = els.desktopNotificationsEnabled.checked;
    save();
  });

  els.uiLanguage.addEventListener('change', () => {
    settings.uiLanguage = els.uiLanguage.value;
    settings.languageChoiceRequired = false;
    locale = settings.uiLanguage === 'es' ? 'es' : 'en';
    applyStaticLocalization();
    const activeSection = document.querySelector('.nav-item.active')?.dataset.section || 'general';
    switchSection(activeSection);
    updateLicenseUI();
    renderBlacklist();
    save();
  });

  // Highlight color
  els.highlightColor.addEventListener('input', () => {
    settings.highlightColor = els.highlightColor.value;
    updatePreview();
    save();
  });

  // Opacity
  els.highlightOpacity.addEventListener('input', () => {
    settings.highlightOpacity = parseFloat(els.highlightOpacity.value);
    els.opacityValue.textContent = Math.round(settings.highlightOpacity * 100) + '%';
    updatePreview();
    save();
  });

  // Duration
  els.highlightDuration.addEventListener('input', () => {
    settings.highlightDuration = parseInt(els.highlightDuration.value);
    els.durationValue.textContent = (settings.highlightDuration / 1000).toFixed(1) + 's';
    save();
  });

  // Color presets
  document.querySelectorAll('.preset-color').forEach(btn => {
    btn.addEventListener('click', () => {
      const color = btn.dataset.color;
      settings.highlightColor = color;
      els.highlightColor.value = color;
      document.querySelectorAll('.preset-color').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      updatePreview();
      save();
    });
  });

  // Position buttons
  document.querySelectorAll('.position-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      settings.checkmarkPosition = btn.dataset.value;
      document.querySelectorAll('.position-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      updatePreview();
      save();
    });
  });

  // Blacklist
  els.btnAddSite.addEventListener('click', addBlacklistSite);
  els.blacklistInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') addBlacklistSite();
  });

  // Reset stats
  els.btnResetStats.addEventListener('click', () => {
    if (confirm(tr('resetStatsConfirm'))) {
      settings.copyCount = 0;
      save();
      updateStats();
    }
  });

  // Nav
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const section = item.dataset.section;
      switchSection(section);
    });
  });

  els.btnActivateLicense.addEventListener('click', activateLicenseFromOptions);
  els.btnActivateCoupon.addEventListener('click', activateCouponFromOptions);
  els.btnBuyEarlyBird.addEventListener('click', () => openCheckout('earlyBird'));
  els.btnBuyLifetime.addEventListener('click', () => openCheckout('lifetime'));
  els.btnBuyAnnual.addEventListener('click', () => openCheckout('annual'));
  els.btnStartTrial.addEventListener('click', async () => {
    clearLicenseMessage();
    setLicenseBusy(true);
    const res = await chrome.runtime.sendMessage({ type: 'START_TRIAL' }).catch(() => null);
    setLicenseBusy(false);
    if (!res?.ok) {
      showLicenseMessage(tr('trialUnavailable'), 'error');
      return;
    }
    await refreshRuntime();
    showLicenseMessage(tr('trialStarted'), 'success');
  });
  els.btnRevalidateLicense.addEventListener('click', async () => {
    clearLicenseMessage();
    setLicenseBusy(true);
    await chrome.runtime.sendMessage({ type: 'FORCE_REVALIDATE_LICENSE' }).catch(() => null);
    setLicenseBusy(false);
    await refreshRuntime();
    showLicenseMessage(tr('synced'), 'success');
  });
  els.btnSaveBackend.addEventListener('click', async () => {
    await chrome.runtime.sendMessage({
      type: 'SAVE_APP_CONFIG',
      appConfig: {
        apiBaseUrl: els.apiBaseUrl.value.trim(),
        analytics: {
          ga4MeasurementId: els.ga4MeasurementId.value.trim(),
          ga4ApiSecret: els.ga4ApiSecret.value.trim()
        },
        checkoutLinks: {
          earlyBird: els.checkoutEarlyBirdUrl.value.trim(),
          lifetime: els.checkoutLifetimeUrl.value.trim(),
          annual: els.checkoutAnnualUrl.value.trim()
        },
        privacyUrl: els.privacyUrl.value.trim(),
        termsUrl: els.termsUrl.value.trim()
      }
    }).catch(() => null);
    await refreshRuntime();
    showLicenseMessage(tr('configSaved'), 'success');
  });
}

function openCheckout(plan) {
  const links = runtime?.appConfig?.checkoutLinks || {};
  const url = links[plan];
  if (!isHttpsUrl(url)) {
    showLicenseMessage(tr('setupCheckoutFirst'), 'error');
    return;
  }
  chrome.tabs.create({ url });
}

// ─── Section Navigation ───────────────────────────────────────────────────────
function switchSection(section) {
  if (!document.getElementById('section-' + section)) return;
  document.querySelectorAll('.nav-item').forEach(i =>
    i.classList.toggle('active', i.dataset.section === section));
  document.querySelectorAll('.options-section').forEach(s =>
    s.classList.toggle('active', s.id === 'section-' + section));

  const titles = {
    general: tr('navGeneral'),
    visual: tr('navVisual'),
    sites: tr('sectionSites'),
    stats: tr('sectionStats'),
    license: tr('sectionLicense')
  };
  els.pageTitle.textContent = titles[section] || section;
}

// ─── Blacklist ────────────────────────────────────────────────────────────────
function addBlacklistSite() {
  const val = els.blacklistInput.value.trim().toLowerCase()
    .replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  if (!val) return;
  if (settings.blacklist.includes(val)) {
    els.blacklistInput.style.borderColor = '#f87171';
    setTimeout(() => els.blacklistInput.style.borderColor = '', 1000);
    return;
  }
  settings.blacklist.push(val);
  els.blacklistInput.value = '';
  renderBlacklist();
  save();
}

function renderBlacklist() {
  els.blacklistList.innerHTML = '';
  els.blacklistEmpty.style.display = settings.blacklist.length ? 'none' : 'flex';

  settings.blacklist.forEach((domain, idx) => {
    const item = document.createElement('div');
    item.className = 'blacklist-item';
    item.innerHTML = `
      <span></span>
      <button class="blacklist-remove" title="${tr('remove')}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    `;
    item.querySelector('span').textContent = domain;
    item.querySelector('.blacklist-remove').addEventListener('click', () => {
      settings.blacklist.splice(idx, 1);
      renderBlacklist();
      save();
    });
    els.blacklistList.appendChild(item);
  });
}

// ─── Stats ────────────────────────────────────────────────────────────────────
function updateStats() {
  els.statTotal.textContent = settings.copyCount || 0;
  els.statSession.textContent = parseInt(sessionStorage.getItem('asp_session_count') || '0');
}

// ─── Save ─────────────────────────────────────────────────────────────────────
async function save() {
  if (!(runtime?.features?.customization)) {
    settings.highlightColor = '#10b981';
    settings.highlightOpacity = 0.35;
    settings.highlightDuration = 1500;
    settings.cooldown = 0;
  }
  await chrome.storage.sync.set(settings);

  // Notify all tabs
  chrome.runtime.sendMessage({
    type: 'SETTINGS_UPDATED',
    settings: settings
  }).catch(() => {});

  // Show save indicator
  clearTimeout(saveTimeout);
  els.saveIndicator.classList.add('show');
  saveTimeout = setTimeout(() => els.saveIndicator.classList.remove('show'), 2000);
}

async function activateLicenseFromOptions() {
  clearLicenseMessage();
  const licenseKey = els.licenseKeyInput.value.trim();
  const email = els.licenseEmailInput.value.trim();
  if (!licenseKey || !email) {
    showLicenseMessage(tr('activationNeedsFields'), 'error');
    return;
  }
  setLicenseBusy(true);
  const res = await chrome.runtime.sendMessage({
    type: 'ACTIVATE_LICENSE',
    payload: {
      licenseKey,
      email,
      consentMarketing: !!els.marketingConsent.checked,
      source: 'options'
    }
  }).catch(() => null);
  setLicenseBusy(false);
  if (!res?.ok) {
    showLicenseMessage(tr('activationFailed'), 'error');
    return;
  }
  await refreshRuntime();
  showLicenseMessage(tr('activationSuccess'), 'success');
}

async function activateCouponFromOptions() {
  clearLicenseMessage();
  const couponCode = els.couponCodeInput.value.trim();
  const email = els.licenseEmailInput.value.trim();
  if (!couponCode || !email) {
    showLicenseMessage(tr('couponNeedsFields'), 'error');
    return;
  }
  setLicenseBusy(true);
  const res = await chrome.runtime.sendMessage({
    type: 'ACTIVATE_COUPON',
    payload: {
      couponCode,
      email,
      consentMarketing: !!els.marketingConsent.checked,
      source: 'options_promo'
    }
  }).catch(() => null);
  setLicenseBusy(false);
  if (!res?.ok) {
    showLicenseMessage(tr('couponFailed', { error: res?.error || 'error' }), 'error');
    return;
  }
  await refreshRuntime();
  showLicenseMessage(tr('couponSuccess'), 'success');
}

async function refreshRuntime() {
  const response = await chrome.runtime.sendMessage({ type: 'GET_RUNTIME_STATE' }).catch(() => null);
  runtime = response?.runtime || runtime;
  settings = { ...settings, ...(runtime?.settings || {}) };
  locale = settings.uiLanguage === 'es' ? 'es' : 'en';
  applyStaticLocalization();
  applyToUI();
  updateLicenseUI();
}

// ─── Run ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
