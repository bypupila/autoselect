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
  pdfMode: true,
  blacklist: [],
  copyCount: 0
};

let settings = { ...DEFAULT_SETTINGS };
let saveTimeout = null;
let runtime = null;
let earlyBirdTimer = null;

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
  soundEnabled:      $('soundEnabled'),
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
  checkoutEarlyBirdUrl:$('checkoutEarlyBirdUrl'),
  checkoutLifetimeUrl:$('checkoutLifetimeUrl'),
  checkoutAnnualUrl: $('checkoutAnnualUrl'),
  privacyUrl:        $('privacyUrl'),
  termsUrl:          $('termsUrl'),
  btnSaveBackend:    $('btnSaveBackend')
};

// ─── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  const response = await chrome.runtime.sendMessage({ type: 'GET_RUNTIME_STATE' }).catch(() => null);
  runtime = response?.runtime || null;
  const stored = runtime?.settings || await chrome.storage.sync.get(null);
  settings = { ...DEFAULT_SETTINGS, ...stored };
  applyToUI();
  attachListeners();
  renderBlacklist();
  updateStats();
  updateLicenseUI();
  const initialSection = window.location.hash.replace('#', '');
  if (initialSection) switchSection(initialSection);
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
  els.soundEnabled.checked     = settings.soundEnabled;
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
    els.licensePlanText.textContent = 'AutoSelect Pro';
    els.licenseBadge.textContent = plan === 'annual_pro' ? 'ANUAL' : 'PRO';
    els.licenseStatusText.textContent = plan === 'annual_pro' ? 'Suscripción anual activa.' : 'Licencia de por vida activa.';
    els.licenseMeterValue.textContent = '∞';
    els.licenseMeterLabel.textContent = 'copias ilimitadas';
  } else if (isTrial) {
    els.licensePlanText.textContent = 'Trial Pro';
    els.licenseBadge.textContent = 'TRIAL';
    els.licenseBadge.classList.add('trial');
    els.licenseStatusText.textContent = `Funciones Pro activas hasta ${formatDate(exp)}.`;
    els.licenseMeterValue.textContent = '∞';
    els.licenseMeterLabel.textContent = 'copias durante el trial';
  } else {
    els.licensePlanText.textContent = 'AutoSelect Free';
    els.licenseBadge.textContent = 'FREE';
    els.licenseBadge.classList.add('free');
    els.licenseStatusText.textContent = 'Activa Pro o prueba 3 días para desbloquear PDF inteligente, filtros y copias ilimitadas.';
    els.licenseMeterValue.textContent = remaining;
    els.licenseMeterLabel.textContent = 'copias restantes hoy';
  }

  if (status === 'grace') {
    showLicenseMessage('Tu acceso Pro necesita reconectar con el servidor para revalidarse.', 'error');
  }

  els.licenseEmailInput.value = email || els.licenseEmailInput.value;
  els.marketingConsent.checked = !!runtime?.billingState?.marketing?.consent;
  els.btnStartTrial.disabled = isPro || isTrial || !!runtime?.billingState?.trialStartedAt;
  els.btnStartTrial.querySelector('strong').textContent = runtime?.billingState?.trialStartedAt ? 'Trial usado' : '3 días Pro';
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
    btn.title = btn.disabled ? 'Configura este checkout de Polar en Configuración avanzada.' : 'Abrir checkout seguro de Polar';
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
    els.earlyBirdCountdown.textContent = 'Oferta finalizada';
    return;
  }
  const tick = () => {
    const endsAt = new Date(endsAtIso).getTime();
    const remaining = endsAt - Date.now();
    if (remaining <= 0) {
      els.earlyBirdCountdown.textContent = 'Oferta finalizada';
      clearInterval(earlyBirdTimer);
      updatePurchaseButtons();
      return;
    }
    const totalSeconds = Math.floor(remaining / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    els.earlyBirdCountdown.textContent =
      `Termina en ${days}d ${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;
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
  return date.toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
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

  // Sound
  els.soundEnabled.addEventListener('change', () => {
    settings.soundEnabled = els.soundEnabled.checked;
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
    if (confirm('¿Resetear todas las estadísticas?')) {
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
      showLicenseMessage('No fue posible iniciar el trial. Puede que ya se haya usado en esta instalación.', 'error');
      return;
    }
    await refreshRuntime();
    showLicenseMessage('Trial activado. Ya puedes usar todas las funciones Pro.', 'success');
  });
  els.btnRevalidateLicense.addEventListener('click', async () => {
    clearLicenseMessage();
    setLicenseBusy(true);
    await chrome.runtime.sendMessage({ type: 'FORCE_REVALIDATE_LICENSE' }).catch(() => null);
    setLicenseBusy(false);
    await refreshRuntime();
    showLicenseMessage('Acceso sincronizado con el servidor.', 'success');
  });
  els.btnSaveBackend.addEventListener('click', async () => {
    await chrome.runtime.sendMessage({
      type: 'SAVE_APP_CONFIG',
      appConfig: {
        apiBaseUrl: els.apiBaseUrl.value.trim(),
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
    showLicenseMessage('Configuración guardada. Las URLs inválidas se dejaron vacías.', 'success');
  });
}

function openCheckout(plan) {
  const links = runtime?.appConfig?.checkoutLinks || {};
  const url = links[plan];
  if (!isHttpsUrl(url)) {
    showLicenseMessage('Configura primero el checkout HTTPS de Polar para este plan.', 'error');
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

  const titles = { general: 'General', visual: 'Visual', sites: 'Sitios excluidos', stats: 'Estadísticas', license: 'Licencia' };
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
      <button class="blacklist-remove" title="Eliminar">
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
    showLicenseMessage('Completa email y license key para activar Pro.', 'error');
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
    showLicenseMessage('No se pudo activar. Verifica el email y la license key.', 'error');
    return;
  }
  await refreshRuntime();
  showLicenseMessage('Pro activado correctamente.', 'success');
}

async function activateCouponFromOptions() {
  clearLicenseMessage();
  const couponCode = els.couponCodeInput.value.trim();
  const email = els.licenseEmailInput.value.trim();
  if (!couponCode || !email) {
    showLicenseMessage('Completa email y código promocional.', 'error');
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
    showLicenseMessage(`No se pudo aplicar el código: ${res?.error || 'error'}`, 'error');
    return;
  }
  await refreshRuntime();
  showLicenseMessage('Código aplicado. Pro quedó activo.', 'success');
}

async function refreshRuntime() {
  const response = await chrome.runtime.sendMessage({ type: 'GET_RUNTIME_STATE' }).catch(() => null);
  runtime = response?.runtime || runtime;
  applyToUI();
  updateLicenseUI();
}

// ─── Run ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
