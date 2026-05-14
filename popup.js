// AutoSelect Pro — Popup Script

const DEFAULT_SETTINGS = {
  enabled: true,
  highlightColor: '#10b981',
  highlightOpacity: 0.35,
  highlightDuration: 1500,
  checkmarkPosition: 'cursor',
  minChars: 1,
  soundEnabled: false,
  pdfMode: true,
  copyOnSelect: true,
  copyOnDoubleClick: true,
  blacklist: [],
  copyCount: 0,
  sessionCount: 0
};

// ─── DOM References ─────────────────────────────────────────────────────────
const mainToggle    = document.getElementById('mainToggle');
const toggleLabel   = document.getElementById('toggleLabel');
const toggleWrapper = document.getElementById('toggleWrapper');
const statusBanner  = document.getElementById('statusBanner');
const statusDot     = document.getElementById('statusDot');
const statusText    = document.getElementById('statusText');
const copyCountEl   = document.getElementById('copyCount');
const sessionCountEl= document.getElementById('sessionCount');
const colorIndicator= document.getElementById('colorIndicator');
const colorPreview  = document.getElementById('colorPreview');
const quickColor    = document.getElementById('quickColor');
const quickPosition = document.getElementById('quickPosition');
const soundToggle   = document.getElementById('soundToggle');
const lastCopied    = document.getElementById('lastCopied');
const lastCopiedText= document.getElementById('lastCopiedText');
const btnOptions    = document.getElementById('btnOptions');
const btnPdfViewer  = document.getElementById('btnPdfViewer');
const planName      = document.getElementById('planName');
const planMeta      = document.getElementById('planMeta');
const planBadge     = document.getElementById('planBadge');
const btnStartTrial = document.getElementById('btnStartTrial');
const btnActivatePro= document.getElementById('btnActivatePro');
const btnManageLicense= document.getElementById('btnManageLicense');

let runtime = null;

let settings = { ...DEFAULT_SETTINGS };
let sessionCount = 0;

// ─── Init ────────────────────────────────────────────────────────────────────
async function init() {
  const response = await chrome.runtime.sendMessage({ type: 'GET_RUNTIME_STATE' }).catch(() => null);
  runtime = response?.runtime || null;
  const stored = runtime?.settings || await chrome.storage.sync.get(null);
  settings = { ...DEFAULT_SETTINGS, ...stored };

  // Session count from session storage
  const session = parseInt(sessionStorage.getItem('asp_session_count') || '0');
  sessionCount = session;

  applySettingsToUI();
  attachListeners();
  updateStatus();
  applyPlanToUI();
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

  if (plan === 'trial') {
    planName.textContent = 'Trial Pro';
    planMeta.textContent = 'Funciones Pro habilitadas por 3 días';
    planBadge.textContent = 'TRIAL';
    btnStartTrial.style.display = 'none';
    btnManageLicense.style.display = '';
    btnActivatePro.textContent = 'Comprar Pro';
    btnStartTrial.disabled = true;
  } else if (plan === 'lifetime_pro' || plan === 'annual_pro') {
    planName.textContent = 'AutoSelect Pro';
    planMeta.textContent = plan === 'annual_pro' ? 'Suscripción anual activa' : 'Licencia de por vida activa';
    planBadge.textContent = 'PRO';
    btnStartTrial.style.display = 'none';
    btnActivatePro.style.display = 'none';
    btnManageLicense.style.display = '';
    btnStartTrial.disabled = true;
  } else {
    planName.textContent = 'Free';
    planMeta.textContent = `Quedan ${runtime?.remainingFreeCopies ?? 50} copias automáticas hoy`;
    planBadge.textContent = 'FREE';
    btnActivatePro.textContent = 'Activar Pro';
    btnStartTrial.disabled = false;
  }
}

function updateStatus() {
  if (settings.enabled) {
    statusBanner.classList.remove('inactive');
    statusDot.classList.remove('inactive');
    statusText.textContent = 'Activo — selecciona texto para copiar automáticamente';
  } else {
    statusBanner.classList.add('inactive');
    statusDot.classList.add('inactive');
    statusText.textContent = 'Inactivo — activa el toggle para empezar';
  }
}

// ─── Attach Listeners ────────────────────────────────────────────────────────
function attachListeners() {
  // Main toggle
  mainToggle.addEventListener('change', async () => {
    settings.enabled = mainToggle.checked;
    toggleLabel.textContent = settings.enabled ? 'ON' : 'OFF';
    toggleLabel.classList.toggle('off', !settings.enabled);
    await saveSettings();
    updateStatus();
  });

  // Color picker — click preview opens picker
  colorPreview.addEventListener('click', () => quickColor.click());
  quickColor.addEventListener('input', async () => {
    const color = quickColor.value;
    settings.highlightColor = color;
    colorPreview.style.background = color;
    colorPreview.style.boxShadow = `0 0 10px ${color}60`;
    colorIndicator.style.background = color;
    colorIndicator.style.boxShadow = `0 0 12px ${color}80`;
    await saveSettings();
  });

  // Position
  quickPosition.addEventListener('change', async () => {
    settings.checkmarkPosition = quickPosition.value;
    await saveSettings();
  });

  // Sound
  soundToggle.addEventListener('change', async () => {
    settings.soundEnabled = soundToggle.checked;
    await saveSettings();
  });

  // Options page
  btnOptions.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
    window.close();
  });

  // PDF Viewer
  btnPdfViewer.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('pdf-viewer.html') });
    window.close();
  });

  btnStartTrial.addEventListener('click', async () => {
    btnStartTrial.disabled = true;
    const res = await chrome.runtime.sendMessage({ type: 'START_TRIAL' }).catch(() => null);
    if (!res?.ok) {
      statusText.textContent = 'Trial no disponible en esta instalación';
      statusBanner.classList.add('inactive');
      btnStartTrial.disabled = false;
      return;
    }
    const state = await chrome.runtime.sendMessage({ type: 'GET_RUNTIME_STATE' }).catch(() => null);
    runtime = state?.runtime || runtime;
    applySettingsToUI();
    applyPlanToUI();
    statusText.textContent = 'Trial Pro activo';
  });

  btnActivatePro.addEventListener('click', async () => {
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
  // Notify all tabs
  chrome.runtime.sendMessage({
    type: 'SETTINGS_UPDATED',
    settings: settings
  }).catch(() => {});
}

// ─── Listen for copy events from content script ──────────────────────────────
chrome.storage.onChanged.addListener((changes) => {
  if (changes.copyCount) {
    const newCount = changes.copyCount.newValue || 0;
    copyCountEl.textContent = newCount;

    // Animate counter
    copyCountEl.style.transform = 'scale(1.3)';
    copyCountEl.style.color = '#10b981';
    setTimeout(() => {
      copyCountEl.style.transform = 'scale(1)';
      copyCountEl.style.color = '';
    }, 200);
  }
});

// ─── Run ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
