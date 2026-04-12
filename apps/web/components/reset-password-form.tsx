"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { type FormEvent, useMemo, useState } from "react"
import { toast } from "sonner"

import { PasswordField } from "@/components/password-field"
import { authClient } from "@/lib/auth-client"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"

function getErrorMessage(error: unknown): string {
  if (!error || typeof error !== "object") return "Unable to reset password"
  if ("message" in error && typeof error.message === "string") return error.message
  return "Unable to reset password"
}

export function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const token = useMemo(() => searchParams.get("token"), [searchParams])

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!token) {
      setError("Invalid or expired reset link")
      toast.error("Invalid or expired reset link")
      return
    }

    setPending(true)
    setError(null)

    const formData = new FormData(event.currentTarget)
    const newPassword = String(formData.get("newPassword") ?? "")
    const confirmPassword = String(formData.get("confirmPassword") ?? "")

    if (newPassword !== confirmPassword) {
      setPending(false)
      setError("Passwords do not match")
      toast.error("Passwords do not match")
      return
    }

    const result = await authClient.resetPassword({
      token,
      newPassword,
    })

    setPending(false)

    if (result.error) {
      const message = getErrorMessage(result.error)
      setError(message)
      toast.error(message)
      return
    }

    toast.success("Password reset successful. Please sign in.")
    router.push("/sign-in")
    router.refresh()
  }

  return (
    <Card className="w-full max-w-md">
      <CardContent className="pt-6">
        {!token ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              Invalid or expired reset link.
            </div>
            <Link href="/forgot-password" className="text-sm text-foreground underline underline-offset-4">
              Request a new reset link
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="newPassword" className="text-sm font-medium">New password</label>
              <PasswordField id="newPassword" name="newPassword" autoComplete="new-password" />
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium">Confirm password</label>
              <PasswordField id="confirmPassword" name="confirmPassword" autoComplete="new-password" />
            </div>

            {error ? (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            ) : null}

            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Resetting..." : "Reset password"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
