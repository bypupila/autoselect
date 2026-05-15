// AutoSelect Pro — Background Service Worker (MV3 module)

const DEFAULT_SETTINGS = {
  enabled: true,
  highlightColor: "#10b981",
  highlightOpacity: 0.35,
  highlightDuration: 1500,
  checkmarkPosition: "cursor",
  minChars: 1,
  cooldown: 0,
  soundEnabled: false,
  pdfMode: true,
  pdfLineGapSplitEnabled: true,
  pdfLineGapThreshold: 56,
  copyOnSelect: true,
  copyOnDoubleClick: true,
  blacklist: [],
  copyCount: 0,
};

const DEFAULT_BILLING = {
  plan: "free", // free | trial | lifetime_pro | annual_pro
  proStatus: "inactive", // inactive | active | grace | expired
  productId: null,
  customerId: null,
  licenseKey: null,
  email: null,
  activatedAt: null,
  expiresAt: null,
  trialStartedAt: null,
  trialEndsAt: null,
  graceEndsAt: null,
  lastValidatedAt: null,
  nextRevalidateAt: null,
  installId: null,
  dailyQuota: { dayKey: null, count: 0, limit: 50 },
  marketing: {
    consent: false,
    consentAt: null,
    source: null,
  },
};

const DEFAULT_APP_CONFIG = {
  apiBaseUrl: "https://autoselect.bypupila.com",
  privacyUrl: "https://autoselect.bypupila.com/privacy",
  termsUrl: "https://autoselect.bypupila.com/terms",
  earlyBirdEndsAt: "2026-06-15T03:00:00.000Z",
  checkoutLinks: {
    earlyBird: "",
    lifetime: "",
    annual: "",
  },
};

const PRO_PRODUCT_IDS = new Set([
  "9eb268f3-6eee-4db5-b18b-7f5e0117390a",
  "7c1c1a25-d33c-4cb7-9d59-50fe052edcd2",
  "91dfd8e7-f159-48f0-a85f-16270cff047a",
]);

const PRO_PRICE_IDS = new Set([
  "fbabdd44-6923-48c9-ae35-b665cc97cca0",
  "d0a9dbb9-a230-430a-9bce-4c71d63bb988",
  "7aca868a-107f-4411-b41d-4372ebc83547",
]);

function getDayKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function generateInstallId() {
  return `asp_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

async function getSyncSettings() {
  const stored = await chrome.storage.sync.get(null);
  return { ...DEFAULT_SETTINGS, ...stored };
}

async function setSyncSettings(settings) {
  await chrome.storage.sync.set(settings);
}

async function getLocalState() {
  const { billingState, appConfig } = await chrome.storage.local.get([
    "billingState",
    "appConfig",
  ]);
  const merged = {
    ...DEFAULT_BILLING,
    ...billingState,
    dailyQuota: {
      ...DEFAULT_BILLING.dailyQuota,
      ...(billingState?.dailyQuota || {}),
    },
    marketing: {
      ...DEFAULT_BILLING.marketing,
      ...(billingState?.marketing || {}),
    },
  };
  if (!merged.installId) merged.installId = generateInstallId();
  return {
    billingState: merged,
    appConfig: {
      ...DEFAULT_APP_CONFIG,
      ...(appConfig || {}),
      checkoutLinks: {
        ...DEFAULT_APP_CONFIG.checkoutLinks,
        ...(appConfig?.checkoutLinks || {}),
      },
    },
  };
}

async function saveBillingState(billingState) {
  await chrome.storage.local.set({ billingState });
}

async function saveAppConfig(appConfig) {
  await chrome.storage.local.set({ appConfig });
}

function isProPlan(plan) {
  return ["lifetime_pro", "annual_pro", "trial"].includes(plan);
}

function getFeatureAccess(plan) {
  const isPro = isProPlan(plan);
  return {
    isPro,
    webAutoCopyLimit: isPro ? null : 50,
    pdfModes: isPro ? ["free", "block", "paragraph", "line", "word"] : ["free"],
    pdfFilters: isPro,
    pdfMultiSelect: isPro,
    pdfEraser: isPro,
    customization: isPro,
    recentsMax: isPro ? 10 : 0,
  };
}

async function ensureDailyQuotaFresh(billingState) {
  const dayKey = getDayKey();
  if (billingState.dailyQuota.dayKey !== dayKey) {
    billingState.dailyQuota.dayKey = dayKey;
    billingState.dailyQuota.count = 0;
    await saveBillingState(billingState);
  }
}

function nowIso() {
  return new Date().toISOString();
}

function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function sanitizeExternalUrl(value, { allowLocalhost = false } = {}) {
  if (!value) return "";
  try {
    const url = new URL(String(value).trim());
    const isLocal =
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname === "::1";
    if (url.protocol === "https:" || (allowLocalhost && isLocal && url.protocol === "http:")) {
      return url.toString().replace(/\/$/, "");
    }
  } catch {
    // Fall through to blank invalid URLs.
  }
  return "";
}

async function postEvent(eventType, metadata = {}) {
  const { billingState, appConfig } = await getLocalState();
  if (!appConfig.apiBaseUrl) return;
  try {
    await fetch(`${appConfig.apiBaseUrl}/api/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        install_id: billingState.installId,
        event_type: eventType,
        plan_type: billingState.plan,
        metadata,
      }),
    });
  } catch {
    // Non-blocking telemetry.
  }
}

async function revalidateLicenseIfNeeded(force = false) {
  const { billingState, appConfig } = await getLocalState();
  if (!isProPlan(billingState.plan) || billingState.plan === "trial") return billingState;

  const now = new Date();
  const nextRevalidateAt = parseDate(billingState.nextRevalidateAt);
  if (!force && nextRevalidateAt && nextRevalidateAt > now) {
    return billingState;
  }

  if (!billingState.licenseKey || !billingState.email) return billingState;
  if (billingState.licenseKey.startsWith("coupon:")) return billingState;
  if (!appConfig.apiBaseUrl) return billingState;

  try {
    const res = await fetch(`${appConfig.apiBaseUrl}/api/license/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        license_key: billingState.licenseKey,
        email: billingState.email,
        install_id: billingState.installId,
      }),
    });
    if (!res.ok) throw new Error("validation_failed");
    const data = await res.json();
    if (!data.ok || !data.active) {
      billingState.plan = "free";
      billingState.proStatus = "expired";
      billingState.graceEndsAt = null;
      billingState.nextRevalidateAt = null;
      await saveBillingState(billingState);
      await postEvent("downgraded_to_free", { reason: "remote_inactive" });
      return billingState;
    }
    billingState.proStatus = "active";
    billingState.lastValidatedAt = nowIso();
    billingState.nextRevalidateAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    billingState.expiresAt = data.expires_at || billingState.expiresAt;
    billingState.productId = data.product_id || billingState.productId;
    billingState.customerId = data.customer_id || billingState.customerId;
    billingState.graceEndsAt = null;
    await saveBillingState(billingState);
    return billingState;
  } catch {
    const grace = parseDate(billingState.graceEndsAt);
    if (!grace) {
      billingState.graceEndsAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
      billingState.proStatus = "grace";
      await saveBillingState(billingState);
      return billingState;
    }
    if (grace < new Date()) {
      billingState.plan = "free";
      billingState.proStatus = "expired";
      billingState.nextRevalidateAt = null;
      await saveBillingState(billingState);
      await postEvent("downgraded_to_free", { reason: "grace_expired" });
    }
    return billingState;
  }
}

async function getRuntimeState() {
  const settings = await getSyncSettings();
  let { billingState, appConfig } = await getLocalState();
  appConfig = await hydrateCheckoutLinks(appConfig);
  billingState = await revalidateLicenseIfNeeded(false);

  if (billingState.plan === "trial") {
    const trialEndsAt = parseDate(billingState.trialEndsAt);
    if (trialEndsAt && trialEndsAt < new Date()) {
      billingState.plan = "free";
      billingState.proStatus = "expired";
      await saveBillingState(billingState);
      await postEvent("trial_expired", {});
    }
  }

  await ensureDailyQuotaFresh(billingState);
  const features = getFeatureAccess(billingState.plan);
  return {
    settings,
    billingState,
    appConfig,
    features,
    remainingFreeCopies:
      features.webAutoCopyLimit == null
        ? null
        : Math.max(0, features.webAutoCopyLimit - billingState.dailyQuota.count),
  };
}

async function hydrateCheckoutLinks(appConfig) {
  const hasAllLinks =
    appConfig.checkoutLinks?.earlyBird &&
    appConfig.checkoutLinks?.lifetime &&
    appConfig.checkoutLinks?.annual;
  if (hasAllLinks || !appConfig.apiBaseUrl) return appConfig;

  try {
    const res = await fetch(`${appConfig.apiBaseUrl}/api/checkout-links`);
    if (!res.ok) return appConfig;
    const data = await res.json();
    if (!data?.ok || !data?.links) return appConfig;
    const merged = {
      ...appConfig,
      earlyBirdEndsAt: data.early_bird_ends_at || appConfig.earlyBirdEndsAt,
      privacyUrl: data.privacy_url || appConfig.privacyUrl,
      termsUrl: data.terms_url || appConfig.termsUrl,
      checkoutLinks: {
        earlyBird: data.links.earlyBird || appConfig.checkoutLinks?.earlyBird || "",
        lifetime: data.links.lifetime || appConfig.checkoutLinks?.lifetime || "",
        annual: data.links.annual || appConfig.checkoutLinks?.annual || "",
      },
    };
    await saveAppConfig(merged);
    return merged;
  } catch {
    return appConfig;
  }
}

async function consumeAutoCopyQuota(context = "web") {
  const runtime = await getRuntimeState();
  const { billingState, features } = runtime;
  if (features.webAutoCopyLimit == null) {
    return { ok: true, reason: null, remaining: null, runtime };
  }
  if (billingState.dailyQuota.count >= features.webAutoCopyLimit) {
    await postEvent("quota_limit_reached", { context });
    return { ok: false, reason: "daily_limit_reached", remaining: 0, runtime };
  }
  billingState.dailyQuota.count += 1;
  await saveBillingState(billingState);
  const syncSettings = await getSyncSettings();
  syncSettings.copyCount = (syncSettings.copyCount || 0) + 1;
  await setSyncSettings(syncSettings);
  runtime.billingState = billingState;
  runtime.remainingFreeCopies = features.webAutoCopyLimit - billingState.dailyQuota.count;
  return { ok: true, reason: null, remaining: runtime.remainingFreeCopies, runtime };
}

async function activateTrial() {
  const { billingState } = await getLocalState();
  if (billingState.trialStartedAt) {
    return { ok: false, error: "trial_already_used" };
  }
  const start = new Date();
  const end = new Date(start.getTime() + 3 * 24 * 60 * 60 * 1000);
  billingState.plan = "trial";
  billingState.proStatus = "active";
  billingState.trialStartedAt = start.toISOString();
  billingState.trialEndsAt = end.toISOString();
  billingState.activatedAt = start.toISOString();
  await saveBillingState(billingState);
  await postEvent("trial_started", {});
  return { ok: true, billingState };
}

async function activateLicense({ licenseKey, email, consentMarketing, source }) {
  const { billingState, appConfig } = await getLocalState();
  if (!appConfig.apiBaseUrl) return { ok: false, error: "api_not_configured" };
  const payload = {
    license_key: licenseKey,
    email,
    install_id: billingState.installId,
    consent_marketing: !!consentMarketing,
    consent_source: source || "popup",
  };

  await postEvent("activation_attempted", { source: payload.consent_source });
  const res = await fetch(`${appConfig.apiBaseUrl}/api/license/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    await postEvent("activation_failed", { status: res.status });
    return { ok: false, error: "validation_request_failed" };
  }
  const data = await res.json();
  if (!data.ok || !data.active) {
    await postEvent("activation_failed", { reason: data.reason || "inactive" });
    return { ok: false, error: data.reason || "inactive_license" };
  }

  const isLifetime = ["early_bird_lifetime", "lifetime"].includes(data.plan_code);
  const isAnnual = data.plan_code === "annual_subscription";
  const plan = isLifetime ? "lifetime_pro" : isAnnual ? "annual_pro" : null;
  if (!plan) return { ok: false, error: "unknown_plan" };

  if (
    (data.product_id && !PRO_PRODUCT_IDS.has(data.product_id)) ||
    (data.price_id && !PRO_PRICE_IDS.has(data.price_id))
  ) {
    return { ok: false, error: "product_not_allowed" };
  }

  billingState.plan = plan;
  billingState.proStatus = "active";
  billingState.productId = data.product_id || null;
  billingState.customerId = data.customer_id || null;
  billingState.licenseKey = licenseKey;
  billingState.email = email;
  billingState.activatedAt = nowIso();
  billingState.expiresAt = data.expires_at || null;
  billingState.lastValidatedAt = nowIso();
  billingState.nextRevalidateAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  billingState.graceEndsAt = null;
  billingState.marketing = {
    consent: !!consentMarketing,
    consentAt: consentMarketing ? nowIso() : null,
    source: source || "popup",
  };

  await saveBillingState(billingState);
  await postEvent("activation_succeeded", { plan });
  return { ok: true, billingState };
}

async function activateCoupon({ couponCode, email, consentMarketing, source }) {
  const { billingState, appConfig } = await getLocalState();
  if (!appConfig.apiBaseUrl) return { ok: false, error: "api_not_configured" };
  const payload = {
    coupon_code: couponCode,
    email,
    install_id: billingState.installId,
    consent_marketing: !!consentMarketing,
    consent_source: source || "options",
  };

  await postEvent("coupon_activation_attempted", { source: payload.consent_source });
  const res = await fetch(`${appConfig.apiBaseUrl}/api/coupon/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    await postEvent("coupon_activation_failed", { status: res.status });
    return { ok: false, error: "coupon_request_failed" };
  }
  const data = await res.json();
  if (!data.ok || !data.active) {
    await postEvent("coupon_activation_failed", { reason: data.reason || "inactive" });
    return { ok: false, error: data.reason || "invalid_coupon" };
  }

  const isLifetime = ["early_bird_lifetime", "lifetime"].includes(data.plan_code);
  const isAnnual = data.plan_code === "annual_subscription";
  const plan = isLifetime ? "lifetime_pro" : isAnnual ? "annual_pro" : null;
  if (!plan) return { ok: false, error: "unknown_plan" };

  billingState.plan = plan;
  billingState.proStatus = "active";
  billingState.productId = data.product_id || null;
  billingState.customerId = data.customer_id || null;
  billingState.licenseKey = `coupon:${couponCode}`;
  billingState.email = email;
  billingState.activatedAt = nowIso();
  billingState.expiresAt = data.expires_at || null;
  billingState.lastValidatedAt = nowIso();
  billingState.nextRevalidateAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  billingState.graceEndsAt = null;
  billingState.marketing = {
    consent: !!consentMarketing,
    consentAt: consentMarketing ? nowIso() : null,
    source: source || "options",
  };

  await saveBillingState(billingState);
  await postEvent("coupon_activation_succeeded", { plan });
  return { ok: true, billingState };
}

chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.sync.get(null);
  const settings = { ...DEFAULT_SETTINGS, ...existing };
  await setSyncSettings(settings);
  const { billingState, appConfig } = await getLocalState();
  await saveBillingState(billingState);
  await saveAppConfig(appConfig);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    switch (message.type) {
      case "GET_SETTINGS": {
        const settings = await getSyncSettings();
        sendResponse({ settings });
        break;
      }
      case "SETTINGS_UPDATED": {
        sendResponse({ success: true });
        break;
      }
      case "GET_RUNTIME_STATE": {
        const runtime = await getRuntimeState();
        sendResponse({ ok: true, runtime });
        break;
      }
      case "REQUEST_AUTO_COPY_ALLOWED": {
        const result = await consumeAutoCopyQuota(message.context || "web");
        sendResponse({ ok: true, result });
        break;
      }
      case "START_TRIAL": {
        const result = await activateTrial();
        sendResponse(result);
        break;
      }
      case "ACTIVATE_LICENSE": {
        const result = await activateLicense(message.payload || {});
        sendResponse(result);
        break;
      }
      case "ACTIVATE_COUPON": {
        const result = await activateCoupon(message.payload || {});
        sendResponse(result);
        break;
      }
      case "FORCE_REVALIDATE_LICENSE": {
        const billingState = await revalidateLicenseIfNeeded(true);
        sendResponse({ ok: true, billingState });
        break;
      }
      case "SAVE_APP_CONFIG": {
        const { appConfig } = await getLocalState();
        const incoming = message.appConfig || {};
        const next = {
          ...appConfig,
          ...incoming,
          checkoutLinks: {
            ...(appConfig.checkoutLinks || {}),
            ...(incoming.checkoutLinks || {}),
          },
        };
        next.apiBaseUrl = sanitizeExternalUrl(next.apiBaseUrl, { allowLocalhost: true });
        next.privacyUrl = sanitizeExternalUrl(next.privacyUrl);
        next.termsUrl = sanitizeExternalUrl(next.termsUrl);
        next.checkoutLinks = {
          earlyBird: sanitizeExternalUrl(next.checkoutLinks.earlyBird),
          lifetime: sanitizeExternalUrl(next.checkoutLinks.lifetime),
          annual: sanitizeExternalUrl(next.checkoutLinks.annual),
        };
        await saveAppConfig(next);
        sendResponse({ ok: true, appConfig: next });
        break;
      }
      case "TRACK_EVENT": {
        await postEvent(message.eventType, message.metadata || {});
        sendResponse({ ok: true });
        break;
      }
      default:
        sendResponse({ ok: false, error: "unknown_message_type" });
    }
  })().catch((error) => {
    sendResponse({ ok: false, error: error?.message || "background_error" });
  });
  return true;
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.enabled) {
    if (changes.enabled.newValue) {
      chrome.action.setBadgeText({ text: "" });
    } else {
      chrome.action.setBadgeText({ text: "OFF" });
      chrome.action.setBadgeBackgroundColor({ color: "#6b7280" });
    }
  }
});
