import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const prismaDir = fileURLToPath(new URL('../prisma/', import.meta.url))
const source = readFileSync(new URL('../prisma/schema.prisma', import.meta.url), 'utf8')
const enumBlock = /enum OrderStatus \{\s*PENDING\s*CONFIRMED\s*SHIPPED\s*DELIVERED\s*CANCELLED\s*\}\s*/
if (!source.includes('provider = "postgresql"') || !source.includes('status               OrderStatus @default(PENDING)') || !enumBlock.test(source)) {
  throw new Error('PostgreSQL Prisma schema changed; review the SQLite conversion before generating')
}
const sqlite = source
  .replace('provider = "postgresql"', 'provider = "sqlite"')
  .replace('status               OrderStatus @default(PENDING)', 'status               String @default("PENDING")')
  .replace(enumBlock, '')

writeFileSync(new URL('../prisma/schema.sqlite.prisma', import.meta.url),
  `// Generated from schema.prisma by scripts/sqlite-schema.mjs. Do not edit.\n${sqlite}`)
console.log(`Generated temporary SQLite schema in ${prismaDir}`)
