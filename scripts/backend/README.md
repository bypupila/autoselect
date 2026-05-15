# AutoSelect Pro backend (Neon + Polar + Brevo)

## 1) Install

```bash
cd scripts/backend
npm install
```

## 2) Environment

Copy `.env.example` to `.env` in `scripts/backend` and fill the values:

```bash
PORT=8787
DATABASE_URL=postgres://...
POLAR_ACCESS_TOKEN=polar_oat_...
POLAR_SERVER=production
POLAR_ORGANIZATION_ID=
POLAR_EARLY_BIRD_BENEFIT_ID=
POLAR_LIFETIME_BENEFIT_ID=
POLAR_ANNUAL_BENEFIT_ID=
ALLOWED_EXTENSION_ORIGINS=
CHECKOUT_EARLY_BIRD_URL=
CHECKOUT_LIFETIME_URL=
CHECKOUT_ANNUAL_URL=
EARLY_BIRD_ENDS_AT=2026-06-15T03:00:00.000Z
BREVO_API_KEY=
BREVO_LIST_ID=0
PROMO_COUPON_ENABLED=false
PROMO_COUPON_CODE=
PROMO_COUPON_PLAN=lifetime
```

`PROMO_COUPON_ENABLED` should stay `false` in production unless you are running a short, controlled test. `EARLY_BIRD_ENDS_AT` is a global UTC deadline for the launch offer. Polar license validation requires a License Keys benefit on each paid product and the matching benefit IDs above.

## 3) Database schema

Run [schema.sql](/Users/bypupila/.gemini/antigravity/scratch/autoselect-pro/scripts/backend/schema.sql) on Neon.

## 4) Run

```bash
npm start
```

Healthcheck:

```bash
curl http://localhost:8787/health
```

## Endpoints

- `POST /api/license/validate`
- `GET /api/checkout-links`
- `POST /api/lead-upsert`
- `POST /api/event`

The extension does not ship with a localhost backend URL for Chrome Web Store builds. Configure the production HTTPS API URL and Polar checkout links in Options > Licencia > Configuración avanzada before packaging.
