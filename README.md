# E-Commerce

![E-Commerce App Screenshot](./docs/app-screenshot.png)

A full-stack e-commerce application built as a monorepo — product catalog, shopping cart, checkout, order management, and admin dashboard.

## Tech Stack

### Frontend (`apps/web`)
| Technology | Version |
|---|---|
| Next.js | 16.4.3 |
| React | 19.2.4 |
| TypeScript | 5.9.3 |
| Tailwind CSS | 4.1.18 |
| shadcn/ui | 4.2.0 |
| TanStack Query | 5.97.0 |
| Zustand | 5.0.12 |
| Recharts | 3.8.1 |
| BetterAuth | 1.7.12 |
| Sonner | 2.0.7 |

### Backend (`apps/api`)
| Technology | Version |
|---|---|
| NestJS | 11.2.8 |
| Prisma | 7.8.0 |
| PostgreSQL | — |
| Express | 5.3.0 |
| Stripe | 22.0.1 |
| BetterAuth | 1.7.12 |

### Tooling
| Tool | Version |
|---|---|
| pnpm | 12.15.0 |
| Turborepo | 2.11.10 |
| Biome | 1.9.4 |

## Features

**Storefront**
- Product catalog with search and category filtering
- Product detail pages with stock info and images
- Shopping cart with quantity management
- Checkout with shipping options and payment method selection (COD / mock card)
- Order history with status timeline

**Admin Dashboard**
- Revenue and order analytics with charts
- Order management with status updates
- Product CRUD (create, edit, feature, deactivate, delete)
- Stock management (inventory is reserved at checkout and restored on eligible cancellations; paid orders cannot be cancelled until a refund workflow exists)
- Unconfirmed cash-on-delivery orders expire after 48 hours and their stock is restored automatically

**Auth**
- Email/password authentication via BetterAuth
- Session-based auth with middleware protection
- Auth endpoint rate limiting and an admin password gate with login throttling

**UX**
- Responsive design (mobile + desktop)
- Loading skeletons, error boundaries, empty states
- Toast notifications on all user actions

## Project Structure

```
e-commerce/
├── apps/
│   ├── web/          # Next.js 16 frontend
│   └── api/          # NestJS 11 backend
├── packages/
│   ├── env/          # Shared, validated environment schemas
│   ├── pricing/      # Shared tax and shipping calculations
│   └── ui/           # Shared shadcn/ui components
├── turbo.json        # Turborepo config
└── package.json      # Root workspace
```

## Environment Variables

Copy the template and fill in real values before running locally:

```bash
cp .env.example .env
```

Required keys:
- NEXT_PUBLIC_AUTH_BASE_URL (usually http://localhost:4000 in local dev)
- BETTER_AUTH_URL (API base URL for Better Auth)
- BETTER_AUTH_SECRET (long random secret)
- BETTER_AUTH_TRUSTED_ORIGINS (comma-separated allowed origins, e.g. http://localhost:3000)
- DATABASE_URL (PostgreSQL connection string in normal mode; set automatically in temporary SQLite mode)
- ADMIN_PASSWORD (32+ character admin panel password, web only)
- ADMIN_API_SECRET (separate 32+ character secret shared by API and web servers)
- PORT (API port; default 4000)

Email (order confirmations and password reset):
- RESEND_API_KEY — get a free key at https://resend.com. Omit only in local dev; production requires it.
- RESEND_FROM_EMAIL — must be a verified sender in your Resend account (e.g. no-reply@yourdomain.com). Required in production.

Payments:
- PAYMENT_PROVIDER=mock for local/demo only. Production configuration rejects mock payments.
- PAYMENT_PROVIDER=stripe requires STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET. **Do not enable for live sales yet:** both the storefront and payment-intent API disable card checkout in Stripe mode until a Stripe Elements flow and payment/order reconciliation are implemented.

Production configuration:
- Set `NODE_ENV=production` before validating or starting the apps.
- Production rejects placeholder secrets (`change-me`, `admin123`, etc.) and requires `RESEND_API_KEY` and `RESEND_FROM_EMAIL`.
- Run `pnpm run validate:env` to validate the API and web environment together. The repository CI uses mock payments without `NODE_ENV=production`, so it does not require live email credentials.

## Quick Start

```bash
# Install dependencies
pnpm install

# Set up environment
cp .env.example apps/api/.env
cp .env.example apps/web/.env.local

# Validate configuration
pnpm run validate:env

# Set up database
pnpm --dir apps/api run db:migrate
pnpm --dir apps/api run db:generate
pnpm --dir apps/api run db:seed

# Run both apps
pnpm run dev:all
```

- Frontend: http://localhost:3000
- API: http://localhost:4000

### Temporary local SQLite (no PostgreSQL/Docker needed)

The schema and migrations are **PostgreSQL-only**. SQLite uses a derived local-only schema and `db push`; do not apply PostgreSQL migrations to it. SQLite tests do not replace PostgreSQL-specific concurrency/migration tests.

```bash
pnpm install
cp .env.example apps/api/.env
cp .env.example apps/web/.env.local
pnpm --dir apps/api run db:sqlite:setup
pnpm --dir apps/api run db:sqlite:seed
pnpm run dev:sqlite
```

The ignored database is `apps/api/dev.sqlite`. Run `pnpm --dir apps/api run test:e2e` for a disposable HTTP integration test (no PostgreSQL needed). SQLite setup regenerates the Prisma client, so stop the API before switching providers. To switch back to PostgreSQL, run `pnpm --dir apps/api run db:generate` (with a PostgreSQL `DATABASE_URL`), then `pnpm run dev:all`. The seed command is safe to repeat and does not overwrite existing products or orders.

## Key Routes

| Route | Description |
|---|---|
| `/products` | Product catalog |
| `/products/:slug` | Product detail |
| `/cart` | Shopping cart |
| `/checkout` | Checkout flow |
| `/orders` | Order history |
| `/orders/:id` | Order detail |
| `/account` | User account |
| `/admin` | Admin dashboard |
| `/admin/orders` | Order management |
| `/admin/products` | Product management |

## License

This project is licensed under the [MIT License](./LICENSE).
