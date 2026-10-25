# Store API

NestJS, Prisma, Better Auth, and Stripe/mock payments. Production uses PostgreSQL; SQLite is an opt-in local development database only.

From the repository root:

```bash
pnpm install
cp .env.example apps/api/.env
pnpm --dir apps/api run db:sqlite:setup
pnpm --dir apps/api run db:sqlite:seed
pnpm --dir apps/api run dev:sqlite
```

`db:sqlite:setup` derives a SQLite-compatible schema from `prisma/schema.prisma`, generates the SQLite Prisma client, and creates/updates the ignored `apps/api/dev.sqlite` using `prisma db push`. `dev:sqlite` runs setup before starting the API. `db:sqlite:seed` is safe to rerun. No PostgreSQL migrations are applied in SQLite mode.

To return to PostgreSQL, configure `DATABASE_URL`, run `pnpm --dir apps/api run db:generate` to regenerate the PostgreSQL client, then use the normal `db:migrate`/`dev` commands. **Do not use SQLite in production.**

Run `pnpm --dir apps/api test --runInBand` for unit tests and `pnpm --dir apps/api run test:e2e` (or `test:sqlite`) for real HTTP + disposable SQLite integration tests. No PostgreSQL or Docker is needed.
