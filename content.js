// AutoSelect Pro — Content Script
// Runs on every page to detect text selection and auto-copy

(function () {
  'use strict';

  // ─── State ───────────────────────────────────────────────────────────────
  let settings = {
    enabled: true,
    highlightColor: '#10b981',
    highlightOpacity: 0.35,
    highlightDuration: 1500,
    checkmarkPosition: 'cursor',
    minChars: 1,
    cooldown: 0,
    soundEnabled: false,
    copyOnSelect: true,
    copyOnDoubleClick: true,
    blacklist: []
  };
  let runtimeState = {
    plan: 'free',
    features: { customization: false },
    remainingFreeCopies: 50
  };

  let lastCopiedText = '';
  let lastCopiedTime = 0;
  let checkmarkEl = null;
  let highlightTimeout = null;
  let isInitialized = false;
  let mouseX = 0;
  let mouseY = 0;
  let copyDebounceTimer = null;

  // ─── Init ─────────────────────────────────────────────────────────────────
  async function init() {
    if (isInitialized) return;
    isInitialized = true;

    await loadSettings();
    injectStyles();
    attachListeners();
    listenForSettingsChanges();

    console.log('[AutoSelect Pro] Content script initialized on:', window.location.href);
  }

  // ─── Settings ─────────────────────────────────────────────────────────────
  async function loadSettings() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'GET_RUNTIME_STATE' }, (response) => {
        if (chrome.runtime.lastError) { resolve(); return; }
        if (response?.ok && response.runtime) {
          settings = { ...settings, ...response.runtime.settings };
          runtimeState = {
            plan: response.runtime.billingState?.plan || 'free',
            features: response.runtime.features || runtimeState.features,
            remainingFreeCopies: response.runtime.remainingFreeCopies
          };
          if (!runtimeState.features.customization) {
            settings.highlightColor = '#10b981';
            settings.highlightOpacity = 0.35;
            settings.highlightDuration = 1500;
          }
        }
        resolve();
      });
    });
  }

  function listenForSettingsChanges() {
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'RUNTIME_CHANGED') {
        runtimeState = { ...runtimeState, ...(message.runtimeState || {}) };
      }
    });
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'sync') return;
      Object.entries(changes).forEach(([key, change]) => {
        if (key in settings) settings[key] = change.newValue;
      });
    });
  }

  // ─── Check if current site is blacklisted ────────────────────────────────
  function isSiteBlacklisted() {
    const host = window.location.hostname;
    return settings.blacklist.some(domain =>
      host === domain || host.endsWith('.' + domain)
    );
  }

  // ─── Inject CSS Styles ───────────────────────────────────────────────────
  function injectStyles() {
    const styleId = 'autoselect-pro-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .asp-checkmark {
        position: fixed;
        z-index: 2147483647;
        pointer-events: none;
        display: flex;
        align-items: center;
        gap: 6px;
        background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
        border: 1px solid rgba(16, 185, 129, 0.4);
        border-radius: 10px;
        padding: 6px 12px 6px 8px;
        box-shadow: 0 4px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(16,185,129,0.1);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        font-size: 12px;
        font-weight: 500;
        color: #e2e8f0;
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        animation: asp-fadeIn 0.18s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        transform-origin: bottom left;
      }

      .asp-checkmark.asp-fadeout {
        animation: asp-fadeOut 0.25s ease forwards;
      }

      .asp-checkmark-icon {
        width: 18px;
        height: 18px;
        background: linear-gradient(135deg, #10b981, #059669);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        box-shadow: 0 0 8px rgba(16, 185, 129, 0.5);
      }

      .asp-checkmark-icon svg {
        width: 10px;
        height: 10px;
        stroke: white;
        stroke-width: 2.5;
        fill: none;
        stroke-linecap: round;
        stroke-linejoin: round;
        animation: asp-drawCheck 0.3s ease 0.1s forwards;
        stroke-dasharray: 20;
        stroke-dashoffset: 20;
      }

      .asp-checkmark-corner {
        position: fixed;
        z-index: 2147483647;
        bottom: 24px;
        right: 24px;
        pointer-events: none;
        display: flex;
        align-items: center;
        gap: 8px;
        background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
        border: 1px solid rgba(16, 185, 129, 0.4);
        border-radius: 12px;
        padding: 8px 16px 8px 10px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(16,185,129,0.1);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        font-size: 13px;
        font-weight: 500;
        color: #e2e8f0;
        animation: asp-slideUp 0.22s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
      }

      .asp-checkmark-corner.asp-fadeout {
        animation: asp-slideDown 0.25s ease forwards;
      }

      .asp-highlight-range {
        background-color: var(--asp-highlight-color, rgba(16, 185, 129, 0.35));
        border-radius: 2px;
        transition: background-color 0.1s ease;
      }

      @keyframes asp-fadeIn {
        from { opacity: 0; transform: scale(0.8) translateY(4px); }
        to   { opacity: 1; transform: scale(1) translateY(0); }
      }

      @keyframes asp-fadeOut {
        from { opacity: 1; transform: scale(1) translateY(0); }
        to   { opacity: 0; transform: scale(0.85) translateY(-4px); }
      }

      @keyframes asp-slideUp {
        from { opacity: 0; transform: translateY(12px); }
        to   { opacity: 1; transform: translateY(0); }
      }

      @keyframes asp-slideDown {
        from { opacity: 1; transform: translateY(0); }
        to   { opacity: 0; transform: translateY(12px); }
      }

      @keyframes asp-drawCheck {
        to { stroke-dashoffset: 0; }
      }

      @keyframes asp-pulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
        50%       { box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
      }
    `;
    document.head.appendChild(style);
  }

  // ─── Attach Event Listeners ───────────────────────────────────────────────
  function attachListeners() {
    // Track mouse position
    document.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    }, { passive: true });

    // Main triggers
    document.addEventListener('mouseup', handleMouseEvent, true);
    document.addEventListener('dblclick', handleMouseEvent, true);

    // Keyboard selection support (Shift+arrows, Ctrl+A, etc.)
    document.addEventListener('keyup', (e) => {
      if (!settings.copyOnSelect) return;
      const keysToWatch = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'End', 'Home', 'a', 'A'];
      if ((e.shiftKey || (e.ctrlKey || e.metaKey)) && keysToWatch.includes(e.key)) {
        handleSelectionEvent(e);
      }
    }, true);
  }

  // ─── Main Selection Handler ───────────────────────────────────────────────
  function handleMouseEvent(event) {
    if (!settings.enabled || isSiteBlacklisted()) return;

    const isDoubleClick = (event.type === 'dblclick' || event.detail === 2);
    
    // Check if the trigger is enabled
    if (isDoubleClick && !settings.copyOnDoubleClick) return;
    if (!isDoubleClick && !settings.copyOnSelect) return;

    handleSelectionEvent(event);
  }

  function handleSelectionEvent(event) {
    if (!settings.enabled || isSiteBlacklisted()) return;

    // Debounce to avoid double triggers
    clearTimeout(copyDebounceTimer);
    copyDebounceTimer = setTimeout(() => {
      processSelection(event);
    }, 80);
  }

  function processSelection(event) {
    const selection = window.getSelection();
    if (!selection) return;

    const text = selection.toString();

    // Validate selection
    if (!text || text.trim().length < settings.minChars) return;
    if (text.trim() === lastCopiedText) return; // Avoid re-copying same text
    if (!selection.rangeCount) return;

    // Check cooldown
    if (settings.cooldown > 0 && (Date.now() - lastCopiedTime) < (settings.cooldown * 1000)) {
      return;
    }

    const trimmedText = text.trim();
    lastCopiedText = trimmedText;
    lastCopiedTime = Date.now();

    // Copy to clipboard
    copyToClipboard(trimmedText, selection);
  }

  // ─── Clipboard Copy ───────────────────────────────────────────────────────
  async function copyToClipboard(text, selection) {
    const gate = await requestAutoCopyAllowed();
    if (!gate.allowed) {
      if (gate.reason === 'daily_limit_reached') {
        showLimitReachedToast();
        chrome.runtime.sendMessage({
          type: 'TRACK_EVENT',
          eventType: 'paywall_shown',
          metadata: { context: 'web', reason: 'daily_limit_reached' }
        }).catch(() => {});
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      onCopySuccess(text, selection);
    } catch (err) {
      // Fallback: execCommand (deprecated but works in some contexts)
      try {
        const el = document.createElement('textarea');
        el.value = text;
        el.style.cssText = 'position:fixed;opacity:0;pointer-events:none;';
        document.body.appendChild(el);
        el.focus();
        el.select();
        const success = document.execCommand('copy');
        document.body.removeChild(el);
        if (success) {
          onCopySuccess(text, selection);
        } else {
          console.warn('[AutoSelect Pro] Copy failed:', err);
        }
      } catch (fallbackErr) {
        console.warn('[AutoSelect Pro] Fallback copy failed:', fallbackErr);
      }
    }
  }

  // ─── On Copy Success ──────────────────────────────────────────────────────
  function onCopySuccess(text, selection) {
    // Play sound if enabled
    if (settings.soundEnabled) playCopySound();

    // Show checkmark
    showCheckmark(text);

    // Apply highlight
    if (selection && selection.rangeCount > 0) {
      applyHighlight(selection);
    }
  }

  function requestAutoCopyAllowed() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type: 'REQUEST_AUTO_COPY_ALLOWED', context: 'web' },
        (response) => {
          if (chrome.runtime.lastError || !response?.ok) {
            resolve({ allowed: false, reason: 'quota_unavailable' });
            return;
          }
          resolve({
            allowed: response.result?.ok !== false,
            reason: response.result?.reason || null
          });
        }
      );
    });
  }

  function showLimitReachedToast() {
    removeExistingCheckmark();
    const toast = document.createElement('div');
    toast.className = 'asp-checkmark-corner';
    toast.style.borderColor = 'rgba(245, 158, 11, 0.55)';
    toast.innerHTML = `
      <div class="asp-checkmark-icon" style="background:linear-gradient(135deg,#f59e0b,#d97706)">
        <svg viewBox="0 0 12 12"><path d="M6 1.5v5.5"/><circle cx="6" cy="9.3" r="0.8" fill="white" stroke="none"/></svg>
      </div>
      <span>Límite diario gratis alcanzado (50). Activa Pro para copias ilimitadas.</span>
    `;
    document.body.appendChild(toast);
    checkmarkEl = toast;
    setTimeout(() => {
      toast.classList.add('asp-fadeout');
      setTimeout(() => toast.remove(), 220);
    }, 2400);
  }

  // ─── Show Checkmark ───────────────────────────────────────────────────────
  function showCheckmark(text) {
    removeExistingCheckmark();

    const preview = text.length > 28 ? text.substring(0, 28) + '…' : text;
    const iconSvg = `<svg viewBox="0 0 12 12"><polyline points="1.5,6 4.5,9 10.5,3"/></svg>`;
    const iconHTML = `<div class="asp-checkmark-icon">${iconSvg}</div>`;

    const pos = settings.checkmarkPosition;

    if (pos === 'cursor' || pos === 'both') {
      const el = document.createElement('div');
      el.className = 'asp-checkmark';
      el.id = 'asp-checkmark-cursor';
      el.innerHTML = `${iconHTML}<span>Copiado</span>`;
      el.style.cssText = `left:${mouseX + 12}px; top:${mouseY - 36}px;`;

      // Keep inside viewport
      document.body.appendChild(el);
      const rect = el.getBoundingClientRect();
      if (rect.right > window.innerWidth - 8) {
        el.style.left = (mouseX - rect.width - 12) + 'px';
      }
      if (rect.top < 8) {
        el.style.top = (mouseY + 16) + 'px';
      }
    }

    if (pos === 'corner' || pos === 'both') {
      const el = document.createElement('div');
      el.className = 'asp-checkmark-corner';
      el.id = 'asp-checkmark-corner';
      el.innerHTML = iconHTML;
      const label = document.createElement('span');
      label.textContent = `Copiado - "${preview}"`;
      el.appendChild(label);
      document.body.appendChild(el);
    }

    checkmarkEl = document.getElementById('asp-checkmark-cursor') ||
                  document.getElementById('asp-checkmark-corner');

    // Schedule removal
    const duration = Math.max(settings.highlightDuration, 800);
    clearTimeout(highlightTimeout);
    highlightTimeout = setTimeout(() => {
      fadeOutCheckmark();
    }, duration - 250);
  }

  function fadeOutCheckmark() {
    const cursor = document.getElementById('asp-checkmark-cursor');
    const corner = document.getElementById('asp-checkmark-corner');

    [cursor, corner].forEach(el => {
      if (!el) return;
      el.classList.add('asp-fadeout');
      el.addEventListener('animationend', () => el.remove(), { once: true });
    });
  }

  function removeExistingCheckmark() {
    ['asp-checkmark-cursor', 'asp-checkmark-corner'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.remove();
    });
  }

  // ─── Apply Selection Highlight ────────────────────────────────────────────
  function applyHighlight(selection) {
    if (!CSS.highlights) {
      // Fallback: wrap selected text in span if CSS Highlights API not available
      applyHighlightFallback(selection);
      return;
    }

    try {
      const range = selection.getRangeAt(0).cloneRange();
      const highlight = new Highlight(range);

      // Register the highlight
      CSS.highlights.set('asp-selection', highlight);

      // Inject CSS for ::highlight pseudo-element
      let styleEl = document.getElementById('asp-highlight-css');
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'asp-highlight-css';
        document.head.appendChild(styleEl);
      }

      const r = parseInt(settings.highlightColor.slice(1, 3), 16);
      const g = parseInt(settings.highlightColor.slice(3, 5), 16);
      const b = parseInt(settings.highlightColor.slice(5, 7), 16);

      styleEl.textContent = `
        ::highlight(asp-selection) {
          background-color: rgba(${r}, ${g}, ${b}, ${settings.highlightOpacity});
          color: inherit;
        }
      `;

      // Remove highlight after duration
      setTimeout(() => {
        CSS.highlights.delete('asp-selection');
      }, settings.highlightDuration);
    } catch (e) {
      applyHighlightFallback(selection);
    }
  }

  function applyHighlightFallback(selection) {
    // Only use if safe (single range, no cross-element issues)
    try {
      if (!selection.rangeCount) return;
      const range = selection.getRangeAt(0);

      const r = parseInt(settings.highlightColor.slice(1, 3), 16);
      const g = parseInt(settings.highlightColor.slice(3, 5), 16);
      const b = parseInt(settings.highlightColor.slice(5, 7), 16);
      const color = `rgba(${r}, ${g}, ${b}, ${settings.highlightOpacity})`;

      // Apply via selection style using ::selection pseudo override
      let styleEl = document.getElementById('asp-selection-override');
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'asp-selection-override';
        document.head.appendChild(styleEl);
      }
      styleEl.textContent = `::selection { background: ${color} !important; }`;

      setTimeout(() => {
        if (styleEl) styleEl.textContent = '';
      }, settings.highlightDuration);
    } catch (e) {
      // Silently fail
    }
  }

  // ─── Sound ────────────────────────────────────────────────────────────────
  function playCopySound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.08);

      gainNode.gain.setValueAtTime(0.05, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.15);
    } catch (e) {
      // Audio not available
    }
  }

  // ─── Start ────────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
