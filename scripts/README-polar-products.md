# Polar product setup

This folder contains the operational script used to create the launch products for AutoSelect Pro in Polar.

## Products

- `AutoSelect Pro - Early Bird (Lifetime)`: one-time, USD 14.99, metadata `launch_limit: 100`.
- `AutoSelect Pro - Licencia de por Vida (Lifetime)`: one-time, USD 19.99.
- `AutoSelect Pro - Suscripción Anual`: yearly subscription, USD 12.00/year.

## Required credentials

Create an Organization Access Token in Polar with `products:read` and `products:write` scopes.

Set it in the shell before running:

```sh
export POLAR_ACCESS_TOKEN="polar_oat_..."
```

Optional variables:

```sh
export POLAR_SERVER="sandbox" # Defaults to production.
export POLAR_PRODUCT_VISIBILITY="public" # public, private, or draft.
export POLAR_ORGANIZATION_ID="..." # Optional when the token is scoped to one organization.
```

## Commands

Validate payloads without creating anything:

```sh
node scripts/create-polar-products.mjs --dry-run
```

Create missing products:

```sh
node scripts/create-polar-products.mjs
```

The script searches by exact product name first, so reruns do not create duplicate products when the original product still exists.
