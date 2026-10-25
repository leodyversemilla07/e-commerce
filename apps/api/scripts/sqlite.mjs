import { spawn, spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const apiDir = fileURLToPath(new URL('../', import.meta.url))
const cli = (name) => resolve(apiDir, name)
const env = {
  ...process.env,
  DB_PROVIDER: 'sqlite',
  DATABASE_URL: process.env.SQLITE_DATABASE_URL ?? 'file:./dev.sqlite',
}
if (!env.DATABASE_URL.startsWith('file:')) throw new Error('SQLITE_DATABASE_URL must start with file:')
const mode = process.argv[2]

function run(file, args) {
  const result = spawnSync(process.execPath, [cli(file), ...args], { cwd: apiDir, env, stdio: 'inherit' })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}

if (!['setup', 'seed', 'dev'].includes(mode)) {
  console.error('Usage: node scripts/sqlite.mjs setup|seed|dev')
  process.exit(1)
}

if (mode === 'setup' || mode === 'dev' || mode === 'seed') {
  run('scripts/sqlite-schema.mjs', [])
  run('node_modules/prisma/build/index.js', ['generate', '--config', 'prisma.config.sqlite.ts'])
  run('node_modules/prisma/build/index.js', ['db', 'push', '--config', 'prisma.config.sqlite.ts'])
}

if (mode === 'seed') {
  run('node_modules/tsx/dist/cli.mjs', ['prisma/seed.ts'])
}

if (mode === 'dev') {
  const child = spawn(process.execPath, [cli('node_modules/@nestjs/cli/bin/nest.js'), 'start', '--watch'], {
    cwd: apiDir, env, stdio: 'inherit',
  })
  child.on('error', (error) => { console.error(error); process.exitCode = 1 })
  child.on('exit', (code) => { process.exitCode = code ?? 1 })
}
