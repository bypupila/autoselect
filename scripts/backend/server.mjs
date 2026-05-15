import express from "express";
import pg from "pg";
import { readFileSync } from "node:fs";

const { Pool } = pg;

loadLocalEnv();

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
const EARLY_BIRD_ENDS_AT =
  process.env.EARLY_BIRD_ENDS_AT || "2026-06-15T03:00:00.000Z";
const PUBLIC_BASE_URL =
  safeHttpsUrlFromEnv(process.env.PUBLIC_BASE_URL) || "https://autoselect.bypupila.com";
const PRIVACY_URL =
  safeHttpsUrlFromEnv(process.env.PRIVACY_URL) || `${PUBLIC_BASE_URL}/privacy`;
const TERMS_URL =
  safeHttpsUrlFromEnv(process.env.TERMS_URL) || `${PUBLIC_BASE_URL}/terms`;

if (!DATABASE_URL) throw new Error("Missing DATABASE_URL");
if (!POLAR_ACCESS_TOKEN) throw new Error("Missing POLAR_ACCESS_TOKEN");

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use((req, res, next) => {
  const origin = req.get("origin");
  if (origin && ALLOWED_EXTENSION_ORIGINS.length > 0 && !isAllowedOrigin(origin)) {
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

const pool = new Pool({ connectionString: normalizeDatabaseUrl(DATABASE_URL) });

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

function loadLocalEnv() {
  try {
    const env = readFileSync(new URL(".env", import.meta.url), "utf8");
    for (const line of env.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)?\s*$/);
      if (!match) continue;
      const [, key, rawValue = ""] = match;
      if (Object.prototype.hasOwnProperty.call(process.env, key)) continue;
      process.env[key] = rawValue.replace(/^(['"])(.*)\1$/, "$2");
    }
  } catch {
    // Production hosts provide real environment variables; local .env is optional.
  }
}

function isAllowedOrigin(origin) {
  if (ALLOWED_EXTENSION_ORIGINS.includes(origin)) return true;
  if (!ALLOWED_EXTENSION_ORIGINS.includes("chrome-extension://*")) return false;
  try {
    return new URL(origin).protocol === "chrome-extension:";
  } catch {
    return false;
  }
}

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

function safeHttpsUrlFromEnv(value) {
  if (!value) return "";
  try {
    const url = new URL(String(value).trim());
    return url.protocol === "https:" ? url.toString().replace(/\/$/, "") : "";
  } catch {
    return "";
  }
}

function normalizeDatabaseUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol === "postgres:" || url.protocol === "postgresql:") {
      url.searchParams.set("sslmode", "verify-full");
      return url.toString();
    }
  } catch {
    // Let pg surface the original connection error.
  }
  return value;
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

function legalPage({ title, summary, sections }) {
  const sectionHtml = sections
    .map(
      (section) => `
        <section>
          <h2>${section.title}</h2>
          ${section.body
            .map((paragraph) => `<p>${paragraph}</p>`)
            .join("")}
        </section>
      `,
    )
    .join("");

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} | AutoSelect Pro</title>
  <meta name="description" content="${summary}">
  <style>
    :root {
      color-scheme: dark;
      --bg: #07111f;
      --panel: #0f1b2e;
      --text: #edf5ff;
      --muted: #9fb0c7;
      --line: #22314a;
      --accent: #10b981;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.65;
    }
    main {
      width: min(920px, calc(100% - 32px));
      margin: 0 auto;
      padding: 48px 0 64px;
    }
    header {
      border-bottom: 1px solid var(--line);
      margin-bottom: 28px;
      padding-bottom: 24px;
    }
    .brand {
      color: var(--accent);
      font-size: 13px;
      font-weight: 800;
      letter-spacing: .08em;
      text-transform: uppercase;
    }
    h1 {
      font-size: clamp(32px, 6vw, 54px);
      line-height: 1.05;
      margin: 12px 0 16px;
      letter-spacing: 0;
    }
    h2 {
      font-size: 20px;
      margin: 30px 0 8px;
      letter-spacing: 0;
    }
    p, li { color: var(--muted); font-size: 16px; }
    a { color: var(--accent); }
    .updated {
      display: inline-flex;
      margin-top: 10px;
      padding: 6px 10px;
      border: 1px solid var(--line);
      border-radius: 8px;
      color: var(--muted);
      font-size: 14px;
    }
    footer {
      margin-top: 40px;
      padding-top: 22px;
      border-top: 1px solid var(--line);
      color: var(--muted);
      font-size: 14px;
    }
  </style>
</head>
<body>
  <main>
    <header>
      <div class="brand">AutoSelect Pro</div>
      <h1>${title}</h1>
      <p>${summary}</p>
      <div class="updated">Ultima actualizacion: 15 de mayo de 2026</div>
    </header>
    ${sectionHtml}
    <footer>
      Contacto: <a href="mailto:hello@bypupila.com">hello@bypupila.com</a>
    </footer>
  </main>
</body>
</html>`;
}

app.get("/health", asyncHandler(async (_req, res) => {
  await pool.query("select 1");
  res.json({ ok: true });
}));

app.get("/privacy", (_req, res) => {
  res
    .type("html")
    .set("Cache-Control", "public, max-age=3600")
    .send(
      legalPage({
        title: "Politica de privacidad",
        summary:
          "Esta politica explica que datos usa AutoSelect Pro para operar licencias, pruebas, marketing opcional y funciones locales de la extension.",
        sections: [
          {
            title: "Responsable y alcance",
            body: [
              "AutoSelect Pro / BY PUPILA opera la extension AutoSelect Pro para Chrome y el backend asociado publicado en este dominio. Esta politica aplica a la extension, al sistema de licencias y a las paginas publicas de soporte del producto.",
            ],
          },
          {
            title: "Datos que procesamos",
            body: [
              "Para activar una licencia podemos procesar email, license key, identificador de instalacion, plan activo, estado de validacion, fechas de activacion y eventos tecnicos como intento de activacion, inicio de trial o limite de cuota alcanzado.",
              "Si aceptas marketing, guardamos tu consentimiento y podemos sincronizar tu email con un proveedor de email marketing. El consentimiento es opcional y no es necesario para usar una licencia comprada.",
            ],
          },
          {
            title: "Datos locales de la extension",
            body: [
              "El contenido copiado, los textos de PDFs, los archivos PDF locales, preferencias de highlight, blacklist y documentos recientes se procesan en tu navegador. AutoSelect Pro no sube tus PDFs ni el contenido del portapapeles al servidor para ejecutar las funciones principales.",
              "La version gratuita registra localmente el conteo diario de copias automaticas para aplicar el limite del plan. La version Pro elimina ese limite.",
            ],
          },
          {
            title: "Proveedores",
            body: [
              "Usamos Polar para checkout y licencias, Neon Postgres para guardar datos operativos, Railway para hospedar el backend y, solo con consentimiento, Brevo u otro proveedor equivalente para email marketing.",
            ],
          },
          {
            title: "Seguridad y conservacion",
            body: [
              "Las comunicaciones con el backend usan HTTPS. Las claves de licencia se validan contra Polar y se almacenan en el navegador para permitir revalidaciones. Conservamos datos operativos mientras sean necesarios para soporte, seguridad, analitica basica del producto y cumplimiento de obligaciones comerciales.",
            ],
          },
          {
            title: "Tus derechos",
            body: [
              "Puedes solicitar acceso, correccion o eliminacion de tus datos escribiendo a hello@bypupila.com. Tambien puedes retirar el consentimiento de marketing desde los emails recibidos o solicitandolo por contacto.",
            ],
          },
        ],
      }),
    );
});

app.get("/terms", (_req, res) => {
  res
    .type("html")
    .set("Cache-Control", "public, max-age=3600")
    .send(
      legalPage({
        title: "Terminos de uso",
        summary:
          "Estos terminos regulan el uso de AutoSelect Pro, sus funciones gratuitas, planes Pro, trials, compras y licencias.",
        sections: [
          {
            title: "Uso del producto",
            body: [
              "AutoSelect Pro es una herramienta de productividad para copiar texto seleccionado en paginas web y trabajar con PDFs locales desde el navegador. Debes usarla de forma legal y respetando los derechos sobre el contenido que procesas.",
            ],
          },
          {
            title: "Plan gratuito y plan Pro",
            body: [
              "La version gratuita puede incluir limites funcionales, como cuota diaria de copias automaticas y acceso reducido a modos avanzados de PDF. AutoSelect Pro desbloquea funciones premium, incluyendo modos inteligentes de extraccion, filtros, seleccion multiple, modo borrador, personalizacion e historial ampliado.",
            ],
          },
          {
            title: "Compras, trial y licencias",
            body: [
              "Las compras se procesan mediante Polar. Despues de comprar, debes usar la license key emitida para activar Pro en la extension. El trial gratuito, cuando este disponible, dura 3 dias y puede usarse una sola vez por instalacion.",
              "La oferta Early Bird finaliza el 15 de junio de 2026 a las 03:00 UTC. Despues de esa fecha puede dejar de mostrarse y quedar disponible solo la licencia Lifetime regular u otros planes vigentes.",
            ],
          },
          {
            title: "Reembolsos y soporte",
            body: [
              "Los pagos, facturas y reembolsos se gestionan con Polar conforme a sus procesos y politicas aplicables. Para soporte de activacion o problemas tecnicos puedes escribir a hello@bypupila.com.",
            ],
          },
          {
            title: "Disponibilidad y cambios",
            body: [
              "AutoSelect Pro se ofrece tal como esta disponible. Podemos corregir errores, cambiar funciones, ajustar precios futuros o retirar promociones sin afectar derechos ya adquiridos por compras completadas.",
            ],
          },
        ],
      }),
    );
});

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
    early_bird_ends_at: EARLY_BIRD_ENDS_AT,
    privacy_url: PRIVACY_URL,
    terms_url: TERMS_URL,
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
