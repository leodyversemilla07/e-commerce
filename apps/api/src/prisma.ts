import 'dotenv/config';

import { resolve } from 'node:path';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaPg } from '@prisma/adapter-pg';
import { parseApiEnv } from '@workspace/env/api';
import { PrismaClient } from './generated/prisma/client';

export const apiEnv = parseApiEnv(process.env);
const sqlite = apiEnv.DB_PROVIDER === 'sqlite';

// Both the SQLite CLI config and runtime adapter resolve file: URLs from apps/api.
const adapter = sqlite
  ? new PrismaBetterSqlite3({ url: resolve(process.cwd(), apiEnv.DATABASE_URL.slice(5)) })
  : new PrismaPg({ connectionString: apiEnv.DATABASE_URL });

export const prisma = new PrismaClient({ adapter });
