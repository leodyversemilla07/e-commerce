import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { DashboardContent } from "@/components/dashboard-content"

type SessionPayload = {
  user?: {
    name?: string | null
    email?: string | null
  } | null
}

function resolveApiBaseURL(requestHeaders: Headers) {
  if (process.env.BETTER_AUTH_URL) return process.env.BETTER_AUTH_URL

  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000"
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http"
  const hostname = host.replace(/:\d+$/, "")

  return `${protocol}://${hostname}:4000`
}

export default async function DashboardPage() {
  const requestHeaders = await headers()
  const apiBaseURL = resolveApiBaseURL(requestHeaders)
  const cookie = requestHeaders.get("cookie") ?? ""

  const response = await fetch(`${apiBaseURL}/api/auth/get-session`, {
    headers: { cookie },
    cache: "no-store",
  })

  const session = (await response.json().catch(() => null)) as SessionPayload | null

  if (!response.ok || !session?.user) {
    redirect("/sign-in")
  }

  return <DashboardContent userName={session.user.name ?? "there"} />
}
