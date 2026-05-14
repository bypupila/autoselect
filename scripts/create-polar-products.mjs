#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";

const PRODUCT_DEFINITIONS = [
  {
    key: "early_bird_lifetime",
    name: "AutoSelect Pro - Early Bird (Lifetime)",
    description:
      "Acceso de por vida a todas las funciones premium de AutoSelect Pro. Pago único, actualizaciones gratuitas para siempre. (Solo para los primeros 100 usuarios).",
    recurringInterval: null,
    amountCents: 1499,
    metadata: {
      app: "autoselect_pro",
      plan: "early_bird_lifetime",
      launch_limit: 100,
      billing_model: "one_time",
    },
  },
  {
    key: "lifetime",
    name: "AutoSelect Pro - Licencia de por Vida (Lifetime)",
    description:
      "Desbloquea la extracción avanzada de PDFs, selección múltiple, modo borrador y filtros personalizados. Olvídate de las suscripciones.",
    recurringInterval: null,
    amountCents: 1999,
    metadata: {
      app: "autoselect_pro",
      plan: "lifetime",
      billing_model: "one_time",
    },
  },
  {
    key: "annual_subscription",
    name: "AutoSelect Pro - Suscripción Anual",
    description:
      "Acceso completo a todas las funciones de la extensión con soporte prioritario. Ideal para empresas.",
    recurringInterval: "year",
    amountCents: 1200,
    metadata: {
      app: "autoselect_pro",
      plan: "annual_subscription",
      billing_model: "subscription",
    },
  },
];

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");

loadDotenv(".env");
loadDotenv(".env.local");

const accessToken = process.env.POLAR_ACCESS_TOKEN || process.env.POLAR_OAT;
const server = process.env.POLAR_SERVER || "production";
const visibility = process.env.POLAR_PRODUCT_VISIBILITY || "public";
const organizationId = process.env.POLAR_ORGANIZATION_ID || null;

if (!accessToken && !dryRun) {
  console.error(
    "Missing Polar token. Set POLAR_ACCESS_TOKEN or POLAR_OAT before running this script.",
  );
  process.exit(1);
}

if (!["production", "sandbox"].includes(server)) {
  console.error("POLAR_SERVER must be either 'production' or 'sandbox'.");
  process.exit(1);
}

const apiBase =
  server === "sandbox"
    ? "https://sandbox-api.polar.sh/v1"
    : "https://api.polar.sh/v1";

const createdOrExisting = [];

for (const definition of PRODUCT_DEFINITIONS) {
  const payload = buildProductPayload(definition);

  if (dryRun) {
    createdOrExisting.push({
      action: "dry-run",
      key: definition.key,
      payload,
    });
    continue;
  }

  const existing = await findExistingProduct(definition.name);
  if (existing) {
    createdOrExisting.push(formatProduct("existing", existing));
    continue;
  }

  const created = await fetchPolar("/products/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  createdOrExisting.push(formatProduct("created", created));
}

console.log(JSON.stringify(createdOrExisting, null, 2));

function buildProductPayload(definition) {
  const payload = {
    name: definition.name,
    description: definition.description,
    visibility,
    metadata: definition.metadata,
    prices: [
      {
        amount_type: "fixed",
        price_currency: "usd",
        price_amount: definition.amountCents,
      },
    ],
  };

  if (definition.recurringInterval) {
    payload.recurring_interval = definition.recurringInterval;
    payload.recurring_interval_count = 1;
  }

  if (organizationId) {
    payload.organization_id = organizationId;
  }

  return payload;
}

async function findExistingProduct(name) {
  const products = await fetchPolar(
    `/products/?${new URLSearchParams({
      query: name,
      limit: "100",
    })}`,
  );

  return products.items?.find((product) => product.name === name) || null;
}

async function fetchPolar(path, init = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const detail = data?.detail || data?.message || text || response.statusText;
    throw new Error(`Polar API ${response.status}: ${JSON.stringify(detail)}`);
  }

  return data;
}

function formatProduct(action, product) {
  return {
    action,
    id: product.id,
    name: product.name,
    visibility: product.visibility,
    recurring_interval: product.recurring_interval,
    prices: product.prices?.map((price) => ({
      id: price.id,
      amount_type: price.amount_type,
      price_currency: price.price_currency,
      price_amount: price.price_amount,
    })),
  };
}

function loadDotenv(path) {
  if (!existsSync(path)) {
    return;
  }

  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/);
    if (!match || process.env[match[1]]) {
      continue;
    }

    const value = match[2].trim().replace(/^['"]|['"]$/g, "");
    process.env[match[1]] = value;
  }
}
