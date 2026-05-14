# Chrome Web Store release checklist

## Must be configured before packaging

- `scripts/backend/.env` must never be included in the extension ZIP.
- Deploy `scripts/backend` behind an HTTPS URL.
- In Options > Licencia > Configuración avanzada, set:
  - API Base URL
  - Checkout Early Bird URL
  - Checkout Lifetime URL
  - Checkout Anual URL
  - Privacy Policy URL
  - Terms URL
- Create a Polar License Keys benefit for each paid product and set the matching backend env vars:
  - `POLAR_ORGANIZATION_ID`
  - `POLAR_EARLY_BIRD_BENEFIT_ID`
  - `POLAR_LIFETIME_BENEFIT_ID`
  - `POLAR_ANNUAL_BENEFIT_ID`

## Package only these extension files

- `manifest.json`
- `background.js`
- `content.js`
- `popup.html`
- `popup.css`
- `popup.js`
- `options.html`
- `options.css`
- `options.js`
- `pdf-viewer.html`
- `pdf-viewer.css`
- `pdf-viewer.js`
- `pdf.min.js`
- `pdf.worker.min.js`
- `icons/`

Do not package `scripts/`, `.env`, `node_modules/`, internal READMEs, or build artifacts.

## Chrome policy notes

- The extension does not load Google Fonts or other remote code/resources in extension pages.
- Purchase buttons open Polar checkout only after a user click.
- Email marketing collection is opt-in through the checkbox in the license screen.
- The privacy policy must disclose email, license validation, install ID, local PDF recents, clipboard behavior, and optional marketing sync.
