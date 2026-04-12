import { createAuthClient } from "better-auth/react"

function resolveAuthBaseURL() {
  if (process.env.NEXT_PUBLIC_AUTH_BASE_URL) {
    return process.env.NEXT_PUBLIC_AUTH_BASE_URL
  }

  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:4000`
  }

  return "http://localhost:4000"
}

export const authClient: ReturnType<typeof createAuthClient> = createAuthClient({
  baseURL: resolveAuthBaseURL(),
})
