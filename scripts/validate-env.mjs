import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

const args = new Map()
for (const arg of process.argv.slice(2)) {
  const [key, value = "true"] = arg.replace(/^--/, "").split("=")
  args.set(key, value)
}

const service = args.get("service") ?? "all"
const mode = args.get("mode") ?? process.env.NODE_ENV ?? "development"
const isProduction = mode === "production"

function loadEnvFile(path) {
  const file = resolve(path)
  if (!existsSync(file)) return

  for (const rawLine of readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith("#")) continue

    const separatorIndex = line.indexOf("=")
    if (separatorIndex === -1) continue

    const key = line.slice(0, separatorIndex).trim()
    let value = line.slice(separatorIndex + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    if (process.env[key] === undefined) {
      process.env[key] = value
    }
  }
}

function loadServiceEnv(targetService) {
  loadEnvFile(".env")
  if (targetService === "api") loadEnvFile("apps/api/.env")
  if (targetService === "web") loadEnvFile("apps/web/.env.local")
}

function validateRequired(keys, errors) {
  for (const key of keys) {
    if (!process.env[key]?.trim()) {
      errors.push(`${key} is required`)
    }
  }
}

function validateSecret(name, errors) {
  const value = process.env[name]?.trim()
  if (!value) return
  if (value.length < 32) {
    errors.push(`${name} must be at least 32 characters`)
  }
  if (isProduction && /change-me|admin123|secret/i.test(value)) {
    errors.push(`${name} must be replaced with a secure production value`)
  }
}

function validateUrl(name, errors) {
  const value = process.env[name]?.trim()
  if (!value) return
  try {
    new URL(value)
  } catch {
    errors.push(`${name} must be a valid URL`)
  }
}

function validateApi() {
  loadServiceEnv("api")
  const errors = []
  const warnings = []

  validateRequired(
    ["DATABASE_URL", "BETTER_AUTH_URL", "BETTER_AUTH_SECRET", "BETTER_AUTH_TRUSTED_ORIGINS"],
    errors
  )
  validateSecret("BETTER_AUTH_SECRET", errors)
  validateUrl("BETTER_AUTH_URL", errors)

  const paymentProvider = process.env.PAYMENT_PROVIDER?.trim() || "mock"
  if (!["mock", "stripe"].includes(paymentProvider)) {
    errors.push("PAYMENT_PROVIDER must be either mock or stripe")
  }

  if (paymentProvider === "stripe") {
    validateRequired(["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"], errors)
  }

  if (isProduction && paymentProvider === "mock") {
    warnings.push("PAYMENT_PROVIDER is mock in production")
  }

  const requireEmail = process.env.REQUIRE_EMAIL?.trim() === "true"
  if (requireEmail) {
    validateRequired(["RESEND_API_KEY", "RESEND_FROM_EMAIL"], errors)
  } else if (isProduction && (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL)) {
    warnings.push("RESEND_API_KEY/RESEND_FROM_EMAIL are missing; email will fall back to logs")
  }

  return { service: "api", errors, warnings }
}

function validateWeb() {
  loadServiceEnv("web")
  const errors = []

  validateRequired(
    ["NEXT_PUBLIC_AUTH_BASE_URL", "BETTER_AUTH_URL", "BETTER_AUTH_SECRET", "ADMIN_PASSWORD"],
    errors
  )
  validateSecret("BETTER_AUTH_SECRET", errors)
  validateSecret("ADMIN_PASSWORD", errors)
  validateUrl("NEXT_PUBLIC_AUTH_BASE_URL", errors)
  validateUrl("BETTER_AUTH_URL", errors)

  return { service: "web", errors, warnings: [] }
}

const targets = service === "all" ? ["api", "web"] : [service]
if (!targets.every((target) => ["api", "web"].includes(target))) {
  console.error("Usage: node scripts/validate-env.mjs --service=api|web|all [--mode=production]")
  process.exit(1)
}

let hasErrors = false
for (const target of targets) {
  const result = target === "api" ? validateApi() : validateWeb()

  for (const warning of result.warnings) {
    console.warn(`[env:${result.service}] warning: ${warning}`)
  }

  if (result.errors.length) {
    hasErrors = true
    for (const error of result.errors) {
      console.error(`[env:${result.service}] error: ${error}`)
    }
  } else {
    console.log(`[env:${result.service}] ok`)
  }
}

if (hasErrors) process.exit(1)
