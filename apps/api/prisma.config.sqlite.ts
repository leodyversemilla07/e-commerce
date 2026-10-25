import { defineConfig, env } from 'prisma/config';

// Local-only SQLite database. PostgreSQL migrations remain the production source of truth.
export default defineConfig({
  schema: 'prisma/schema.sqlite.prisma',
  datasource: { url: env('DATABASE_URL') },
});
