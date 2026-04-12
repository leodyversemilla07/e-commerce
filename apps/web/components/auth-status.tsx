"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

import { authClient } from "@/lib/auth-client"
import { Button } from "@workspace/ui/components/button"

function getErrorMessage(error: unknown): string {
  if (!error || typeof error !== "object") return "Something went wrong"
  if ("message" in error && typeof error.message === "string") return error.message
  return "Something went wrong"
}

export function AuthStatus() {
  const { data, isPending } = authClient.useSession()
  const [showPending, setShowPending] = useState(false)

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | null = null

    if (isPending) {
      timeout = setTimeout(() => setShowPending(true), 180)
    } else {
      setShowPending(false)
    }

    return () => {
      if (timeout) clearTimeout(timeout)
    }
  }, [isPending])

  const handleSignOut = async () => {
    const result = await authClient.signOut()
    if (result?.error) {
      console.error(getErrorMessage(result.error))
    }
  }

  if (isPending && showPending) {
    return (
      <div className="flex items-center gap-2" aria-live="polite" aria-busy="true">
        <span className="inline-flex items-center gap-1.5 rounded-md border bg-muted/50 px-2.5 py-1 text-xs font-medium text-muted-foreground sm:text-sm">
          <Loader2 className="size-3.5 animate-spin" />
          Checking session
        </span>
      </div>
    )
  }

  if (data?.user) {
    return (
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button asChild size="sm">
          <Link href="/account/dashboard">Dashboard</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button asChild size="sm" variant="outline">
        <Link href="/sign-in">Sign in</Link>
      </Button>
      <Button asChild size="sm">
        <Link href="/sign-up">
          <span className="hidden sm:inline">Create account</span>
          <span className="sm:hidden">Sign up</span>
        </Link>
      </Button>
    </div>
  )
}
