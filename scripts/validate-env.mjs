import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import apiConfig from '@workspace/env/api'
import webConfig from '@workspace/env/web'

const { parseApiEnv, apiEnvWarnings } = apiConfig
const { parseWebServerEnv } = webConfig
const args = new Map(process.argv.slice(2).map((arg) => arg.replace(/^--/, '').split('=')))
const service = args.get('service') ?? 'all'
const mode = args.get('mode') ?? process.env.NODE_ENV ?? 'development'

function loadEnvFile(path) {
  const file = resolve(path)
  if (!existsSync(file)) return
  for (const rawLine of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const separator = line.indexOf('=')
    if (separator === -1) continue
    const key = line.slice(0, separator).trim()
    let value = line.slice(separator + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1)
    if (process.env[key] === undefined) process.env[key] = value
  }
}

function loadServiceEnv(target) {
  loadEnvFile('.env')
  loadEnvFile(target === 'api' ? 'apps/api/.env' : 'apps/web/.env.local')
}

const targets = service === 'all' ? ['api', 'web'] : [service]
if (!targets.every((target) => target === 'api' || target === 'web')) {
  console.error('Usage: node scripts/validate-env.mjs --service=api|web|all [--mode=production]')
  process.exit(1)
}

let failed = false
for (const target of targets) {
  loadServiceEnv(target)
  try {
    const parsed = target === 'api'
      ? parseApiEnv(process.env, mode)
      : parseWebServerEnv(process.env, mode)
    if (target === 'api') {
      for (const warning of apiEnvWarnings(parsed, mode)) {
        console.warn(`[env:${target}] warning: ${warning}`)
      }
    }
    console.log(`[env:${target}] ok`)
  } catch (error) {
    failed = true
    const issues = error && typeof error === 'object' && 'issues' in error ? error.issues : null
    if (Array.isArray(issues)) {
      for (const issue of issues) {
        console.error(`[env:${target}] error: ${issue.path.join('.')}: ${issue.message}`)
      }
    } else {
      console.error(`[env:${target}] error: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}
if (failed) process.exit(1)
