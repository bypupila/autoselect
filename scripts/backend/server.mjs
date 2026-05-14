import express from "express";
import pg from "pg";

const { Pool } = pg;

const PORT = Number(process.env.PORT || 8787);
const DATABASE_URL = process.env.DATABASE_URL;
const POLAR_ACCESS_TOKEN = process.env.POLAR_ACCESS_TOKEN;
const POLAR_SERVER = process.env.POLAR_SERVER || "production";
const POLAR_ORGANIZATION_ID = process.env.POLAR_ORGANIZATION_ID || "";
const BREVO_API_KEY = process.env.BREVO_API_KEY || "";
const BREVO_LIST_ID = Number(process.env.BREVO_LIST_ID || 0);
const ALLOWED_EXTENSION_ORIGINS = (process.env.ALLOWED_EXTENSION_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const PROMO_COUPON_ENABLED = process.env.PROMO_COUPON_ENABLED === "true";
const PROMO_COUPON_CODE = process.env.PROMO_COUPON_CODE || "";
const PROMO_COUPON_PLAN = process.env.PROMO_COUPON_PLAN || "lifetime";
const POLAR_EARLY_BIRD_BENEFIT_ID = process.env.POLAR_EARLY_BIRD_BENEFIT_ID || "";
const POLAR_LIFETIME_BENEFIT_ID = process.env.POLAR_LIFETIME_BENEFIT_ID || "";
const POLAR_ANNUAL_BENEFIT_ID = process.env.POLAR_ANNUAL_BENEFIT_ID || "";
const CHECKOUT_EARLY_BIRD_URL = process.env.CHECKOUT_EARLY_BIRD_URL || "";
const CHECKOUT_LIFETIME_URL = process.env.CHECKOUT_LIFETIME_URL || "";
const CHECKOUT_ANNUAL_URL = process.env.CHECKOUT_ANNUAL_URL || "";
const CHECKOUT_EARLY_BIRD_PRICE_ID =
  process.env.CHECKOUT_EARLY_BIRD_PRICE_ID || "fbabdd44-6923-48c9-ae35-b665cc97cca0";
const CHECKOUT_LIFETIME_PRICE_ID =
  process.env.CHECKOUT_LIFETIME_PRICE_ID || "d0a9dbb9-a230-430a-9bce-4c71d63bb988";
const CHECKOUT_ANNUAL_PRICE_ID =
  process.env.CHECKOUT_ANNUAL_PRICE_ID || "7aca868a-107f-4411-b41d-4372ebc83547";

if (!DATABASE_URL) throw new Error("Missing DATABASE_URL");
if (!POLAR_ACCESS_TOKEN) throw new Error("Missing POLAR_ACCESS_TOKEN");

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use((req, res, next) => {
  const origin = req.get("origin");
  if (origin && ALLOWED_EXTENSION_ORIGINS.length > 0 && !ALLOWED_EXTENSION_ORIGINS.includes(origin)) {
    return res.status(403).json({ ok: false, reason: "origin_not_allowed" });
  }
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  if (req.method === "OPTIONS") return res.status(204).end();
  next();
});

const pool = new Pool({ connectionString: DATABASE_URL });

const POLAR_API_BASE =
  POLAR_SERVER === "sandbox"
    ? "https://sandbox-api.polar.sh/v1"
    : "https://api.polar.sh/v1";

const PLAN_CODE_BY_PRODUCT = {
  "9eb268f3-6eee-4db5-b18b-7f5e0117390a": "early_bird_lifetime",
  "7c1c1a25-d33c-4cb7-9d59-50fe052edcd2": "lifetime",
  "91dfd8e7-f159-48f0-a85f-16270cff047a": "annual_subscription",
};

const PLAN_CODE_BY_BENEFIT = Object.fromEntries(
  [
    [POLAR_EARLY_BIRD_BENEFIT_ID, "early_bird_lifetime"],
    [POLAR_LIFETIME_BENEFIT_ID, "lifetime"],
    [POLAR_ANNUAL_BENEFIT_ID, "annual_subscription"],
  ].filter(([benefitId]) => Boolean(benefitId)),
);

const RATE_LIMITS = new Map();

function rateLimit(name, limit, windowMs) {
  return (req, res, next) => {
    const forwardedFor = String(req.get("x-forwarded-for") || "").split(",")[0].trim();
    const key = `${name}:${forwardedFor || req.ip || "unknown"}`;
    const now = Date.now();
    const bucket = RATE_LIMITS.get(key);
    if (!bucket || bucket.resetAt <= now) {
      RATE_LIMITS.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    bucket.count += 1;
    if (bucket.count > limit) {
      return res.status(429).json({ ok: false, reason: "rate_limited" });
    }
    return next();
  };
}

function isValidEmail(value) {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function safeString(value, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function isSafeHttpsUrl(value) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

app.get("/health", asyncHandler(async (_req, res) => {
  await pool.query("select 1");
  res.json({ ok: true });
}));

app.get("/api/checkout-links", rateLimit("checkout-links", 60, 60 * 1000), asyncHandler(async (_req, res) => {
  const configured = {
    earlyBird: isSafeHttpsUrl(CHECKOUT_EARLY_BIRD_URL) ? CHECKOUT_EARLY_BIRD_URL : "",
    lifetime: isSafeHttpsUrl(CHECKOUT_LIFETIME_URL) ? CHECKOUT_LIFETIME_URL : "",
    annual: isSafeHttpsUrl(CHECKOUT_ANNUAL_URL) ? CHECKOUT_ANNUAL_URL : "",
  };

  const links = {
    earlyBird:
      configured.earlyBird ||
      (await createCheckoutUrlForPrice(CHECKOUT_EARLY_BIRD_PRICE_ID)),
    lifetime:
      configured.lifetime ||
      (await createCheckoutUrlForPrice(CHECKOUT_LIFETIME_PRICE_ID)),
    annual:
      configured.annual ||
      (await createCheckoutUrlForPrice(CHECKOUT_ANNUAL_PRICE_ID)),
  };

  res.json({
    ok: true,
    links,
  });
}));

app.post("/api/event", rateLimit("event", 120, 60 * 1000), asyncHandler(async (req, res) => {
  const { install_id, event_type, plan_type, metadata } = req.body || {};
  const installId = safeString(install_id, 120);
  const eventType = safeString(event_type, 80);
  if (!installId || !eventType) {
    return res.status(400).json({ ok: false, reason: "missing_fields" });
  }
  await pool.query(
    `
      insert into license_events (install_id, event_type, plan_type, metadata)
      values ($1, $2, $3, $4::jsonb)
    `,
    [installId, eventType, safeString(plan_type, 80) || null, JSON.stringify(metadata || {})],
  );
  res.json({ ok: true });
}));

app.post("/api/lead-upsert", rateLimit("lead", 20, 60 * 1000), asyncHandler(async (req, res) => {
  const {
    install_id,
    email,
    plan_type = "free",
    consent_marketing = false,
    source = "extension",
  } = req.body || {};
  const installId = safeString(install_id, 120);
  const normalizedEmail = safeString(email, 254).toLowerCase();
  if (!installId) return res.status(400).json({ ok: false, reason: "missing_install_id" });
  if (normalizedEmail && !isValidEmail(normalizedEmail)) {
    return res.status(400).json({ ok: false, reason: "invalid_email" });
  }

  const consentAt = consent_marketing ? new Date().toISOString() : null;
  await pool.query(
    `
      insert into leads (install_id, email, plan_type, consent_marketing, consent_at, source)
      values ($1, $2, $3, $4, $5, $6)
      on conflict (install_id) do update
      set email = excluded.email,
          plan_type = excluded.plan_type,
          consent_marketing = excluded.consent_marketing,
          consent_at = coalesce(excluded.consent_at, leads.consent_at),
          source = excluded.source,
          updated_at = now()
    `,
    [installId, normalizedEmail || null, safeString(plan_type, 80), !!consent_marketing, consentAt, safeString(source, 80)],
  );

  if (normalizedEmail && consent_marketing && BREVO_API_KEY && BREVO_LIST_ID > 0) {
    await upsertBrevoContact(normalizedEmail, safeString(plan_type, 80));
  }

  res.json({ ok: true });
}));

app.post("/api/license/validate", rateLimit("license", 12, 60 * 1000), asyncHandler(async (req, res) => {
  const {
    license_key,
    email,
    install_id,
    consent_marketing = false,
    consent_source = "extension",
  } = req.body || {};

  const licenseKey = safeString(license_key, 240);
  const normalizedEmail = safeString(email, 254).toLowerCase();
  const installId = safeString(install_id, 120);
  if (!licenseKey || !normalizedEmail || !installId) {
    return res.status(400).json({ ok: false, reason: "missing_fields" });
  }
  if (!isValidEmail(normalizedEmail)) {
    return res.status(400).json({ ok: false, reason: "invalid_email" });
  }

  const result = await validateLicenseWithPolar(licenseKey, normalizedEmail);
  if (!result.ok) {
    await insertEvent(installId, "activation_failed", "free", { reason: result.reason });
    return res.status(200).json(result);
  }

  await pool.query(
    `
      insert into leads (install_id, email, plan_type, consent_marketing, consent_at, source)
      values ($1, $2, $3, $4, $5, $6)
      on conflict (install_id) do update
      set email = excluded.email,
          plan_type = excluded.plan_type,
          consent_marketing = excluded.consent_marketing,
          consent_at = coalesce(excluded.consent_at, leads.consent_at),
          source = excluded.source,
          updated_at = now()
    `,
    [
      installId,
      normalizedEmail,
      result.plan_code,
      !!consent_marketing,
      consent_marketing ? new Date().toISOString() : null,
      safeString(consent_source, 80),
    ],
  );

  await insertEvent(installId, "activation_succeeded", result.plan_code, {
    product_id: result.product_id,
    customer_id: result.customer_id,
  });

  if (consent_marketing && BREVO_API_KEY && BREVO_LIST_ID > 0) {
    await upsertBrevoContact(normalizedEmail, result.plan_code);
  }

  return res.json(result);
}));

app.post("/api/coupon/validate", rateLimit("coupon", 8, 60 * 1000), asyncHandler(async (req, res) => {
  const {
    coupon_code,
    email,
    install_id,
    consent_marketing = false,
    consent_source = "extension",
  } = req.body || {};

  const couponCode = safeString(coupon_code, 120);
  const normalizedEmail = safeString(email, 254).toLowerCase();
  const installId = safeString(install_id, 120);
  if (!couponCode || !normalizedEmail || !installId) {
    return res.status(400).json({ ok: false, reason: "missing_fields" });
  }
  if (!isValidEmail(normalizedEmail)) {
    return res.status(400).json({ ok: false, reason: "invalid_email" });
  }
  if (!PROMO_COUPON_ENABLED || !PROMO_COUPON_CODE) {
    return res.status(400).json({ ok: false, reason: "promo_coupon_not_configured" });
  }
  if (couponCode !== PROMO_COUPON_CODE.trim()) {
    await insertEvent(installId, "coupon_activation_failed", "free", { reason: "invalid_coupon" });
    return res.status(200).json({ ok: false, active: false, reason: "invalid_coupon" });
  }

  const planCode = PROMO_COUPON_PLAN === "annual" ? "annual_subscription" : "lifetime";
  const productId =
    planCode === "annual_subscription"
      ? "91dfd8e7-f159-48f0-a85f-16270cff047a"
      : "7c1c1a25-d33c-4cb7-9d59-50fe052edcd2";

  await pool.query(
    `
      insert into leads (install_id, email, plan_type, consent_marketing, consent_at, source)
      values ($1, $2, $3, $4, $5, $6)
      on conflict (install_id) do update
      set email = excluded.email,
          plan_type = excluded.plan_type,
          consent_marketing = excluded.consent_marketing,
          consent_at = coalesce(excluded.consent_at, leads.consent_at),
          source = excluded.source,
          updated_at = now()
    `,
    [
      installId,
      normalizedEmail,
      planCode,
      !!consent_marketing,
      consent_marketing ? new Date().toISOString() : null,
      safeString(consent_source, 80),
    ],
  );

  await insertEvent(installId, "coupon_activation_succeeded", planCode, {
    product_id: productId,
    coupon_code: "redacted",
  });

  if (consent_marketing && BREVO_API_KEY && BREVO_LIST_ID > 0) {
    await upsertBrevoContact(normalizedEmail, planCode);
  }

  res.json({
    ok: true,
    active: true,
    reason: null,
    plan_code: planCode,
    product_id: productId,
    customer_id: `coupon_${installId}`,
    expires_at:
      planCode === "annual_subscription"
        ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        : null,
    price_id:
      planCode === "annual_subscription"
        ? "7aca868a-107f-4411-b41d-4372ebc83547"
        : "d0a9dbb9-a230-430a-9bce-4c71d63bb988",
  });
}));

async function insertEvent(installId, eventType, planType, metadata) {
  await pool.query(
    `
      insert into license_events (install_id, event_type, plan_type, metadata)
      values ($1, $2, $3, $4::jsonb)
    `,
    [installId, eventType, planType, JSON.stringify(metadata || {})],
  );
}

async function validateLicenseWithPolar(licenseKey, email) {
  try {
    if (!POLAR_ORGANIZATION_ID) {
      return { ok: false, active: false, reason: "polar_organization_not_configured" };
    }
    if (Object.keys(PLAN_CODE_BY_BENEFIT).length === 0) {
      return { ok: false, active: false, reason: "polar_benefit_mapping_required" };
    }
    const licenseResponse = await fetch(`${POLAR_API_BASE}/license-keys/validate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${POLAR_ACCESS_TOKEN}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        key: licenseKey,
        organization_id: POLAR_ORGANIZATION_ID,
      }),
    });
    if (licenseResponse.status === 404) {
      return { ok: false, active: false, reason: "not_found" };
    }
    if (!licenseResponse.ok) {
      return { ok: false, active: false, reason: "polar_license_unavailable" };
    }
    const license = await licenseResponse.json();
    const customerEmail = String(license?.customer?.email || "").trim().toLowerCase();
    if (customerEmail && customerEmail !== email) {
      return { ok: false, active: false, reason: "email_mismatch" };
    }
    const planCode = PLAN_CODE_BY_BENEFIT[license?.benefit_id];
    if (!planCode) return { ok: false, active: false, reason: "benefit_not_allowed" };
    const expiresAt = license?.expires_at || null;
    const active =
      license?.status === "granted" &&
      (!expiresAt || new Date(expiresAt).getTime() > Date.now());

    return {
      ok: true,
      active,
      reason: active ? null : "license_inactive",
      plan_code: planCode,
      product_id: null,
      customer_id: license?.customer_id || license?.customer?.id || null,
      expires_at: expiresAt,
      price_id: null,
    };
  } catch {
    return { ok: false, active: false, reason: "polar_network_error" };
  }
}

async function upsertBrevoContact(email, planType) {
  try {
    await fetch("https://api.brevo.com/v3/contacts", {
      method: "POST",
      headers: {
        "api-key": BREVO_API_KEY,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        email,
        listIds: [BREVO_LIST_ID],
        updateEnabled: true,
        attributes: { PLAN_TYPE: planType },
      }),
    });
  } catch {
    // Marketing sync must never block license activation.
  }
}

async function createCheckoutUrlForPrice(productPriceId) {
  if (!productPriceId) return "";
  try {
    const response = await fetch(`${POLAR_API_BASE}/checkouts/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${POLAR_ACCESS_TOKEN}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        product_price_id: productPriceId,
      }),
    });
    if (!response.ok) return "";
    const checkout = await response.json();
    const url = String(checkout?.url || "");
    return isSafeHttpsUrl(url) ? url : "";
  } catch {
    return "";
  }
}

app.listen(PORT, () => {
  console.log(`AutoSelect backend listening on :${PORT}`);
});

app.use((err, _req, res, _next) => {
  console.error("Unhandled API error:", err?.message || err);
  res.status(500).json({ ok: false, reason: "internal_error" });
});
