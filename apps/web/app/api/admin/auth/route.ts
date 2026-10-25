import { timingSafeEqual } from "node:crypto"

import { parseWebServerEnv } from "@workspace/env/web"
import { type NextRequest, NextResponse } from "next/server"

import { createAdminSession } from '@/lib/admin-session'

const WINDOW_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 10
const attempts = new Map<string, { count: number; resetAt: number }>()

function clientKey(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  return forwarded || request.headers.get("x-real-ip") || "unknown"
}

function isRateLimited(key: string): boolean {
  const now = Date.now()
  for (const [entryKey, entry] of attempts) {
    if (entry.resetAt <= now) attempts.delete(entryKey)
  }
  const entry = attempts.get(key)
  return Boolean(entry && entry.resetAt > now && entry.count >= MAX_ATTEMPTS)
}

function recordFailure(key: string): void {
  const now = Date.now()
  const entry = attempts.get(key)
  if (!entry || entry.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return
  }
  entry.count += 1
}

function passwordsMatch(supplied: string, expected: string): boolean {
  const a = Buffer.from(supplied)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function POST(request: NextRequest) {
  const key = clientKey(request)
  if (isRateLimited(key)) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(WINDOW_MS / 1000)) } },
    )
  }

  const body = await request.json().catch(() => null)
  const password = body?.password

  if (!password || typeof password !== "string") {
    return NextResponse.json({ error: "Password is required" }, { status: 400 })
  }

  const { ADMIN_PASSWORD } = parseWebServerEnv(process.env)

  if (!passwordsMatch(password, ADMIN_PASSWORD)) {
    recordFailure(key)
    return NextResponse.json({ error: "Invalid password" }, { status: 401 })
  }

  attempts.delete(key)
  const token = createAdminSession()

  const response = NextResponse.json({ success: true })
  response.cookies.set("admin_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24, // 24 hours
    path: "/",
  })

  return response
}

export async function DELETE() {
  const response = NextResponse.json({ success: true })
  response.cookies.delete("admin_token")
  return response
}
