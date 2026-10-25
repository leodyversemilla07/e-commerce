import { createHmac, timingSafeEqual } from 'node:crypto'
import { parseWebServerEnv } from '@workspace/env/web'

const MAX_AGE_SECONDS = 60 * 60 * 24

function secret(): string {
  return parseWebServerEnv(process.env).ADMIN_PASSWORD
}

function signature(expires: string): string {
  return createHmac('sha256', secret()).update(expires).digest('hex')
}

export function createAdminSession(): string {
  const expires = String(Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS)
  return `${expires}.${signature(expires)}`
}

export function verifyAdminSession(token: string | undefined): boolean {
  if (!token) return false
  const [expires, mac, extra] = token.split('.')
  if (extra || !expires || !mac || !/^\d+$/.test(expires)) return false
  const time = Number(expires)
  if (!Number.isSafeInteger(time) || time <= Date.now() / 1000 || time > Date.now() / 1000 + MAX_AGE_SECONDS) return false
  try {
    const a = Buffer.from(mac, 'hex')
    const b = Buffer.from(signature(expires), 'hex')
    return a.length === b.length && timingSafeEqual(a, b)
  } catch {
    return false
  }
}
