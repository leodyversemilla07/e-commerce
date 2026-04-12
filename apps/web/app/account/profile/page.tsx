import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { ProfileContent } from "@/components/profile-content"

type SessionPayload = {
  user?: {
    id?: string
    name?: string | null
    email?: string | null
    emailVerified?: boolean
    image?: string | null
    createdAt?: string | Date
  } | null
}

function resolveApiBaseURL(requestHeaders: Headers) {
  if (process.env.BETTER_AUTH_URL) return process.env.BETTER_AUTH_URL

  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000"
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http"
  const hostname = host.replace(/:\d+$/, "")

  return `${protocol}://${hostname}:4000`
}

export default async function ProfilePage() {
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

  const user = session.user
  return (
    <ProfileContent
      userName={user.name ?? "User"}
      email={user.email ?? ""}
      emailVerified={user.emailVerified ?? false}
      memberSince={
        user.createdAt
          ? new Date(user.createdAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })
          : "N/A"
      }
    />
  )
}
