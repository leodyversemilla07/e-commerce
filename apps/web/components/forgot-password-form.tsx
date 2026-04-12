"use client"

import Link from "next/link"
import { type FormEvent, useState } from "react"
import { toast } from "sonner"

import { authClient } from "@/lib/auth-client"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"

function getErrorMessage(error: unknown): string {
  if (!error || typeof error !== "object") return "Unable to send reset email"
  if ("message" in error && typeof error.message === "string") return error.message
  return "Unable to send reset email"
}

export function ForgotPasswordForm() {
  const [pending, setPending] = useState(false)

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPending(true)

    const formData = new FormData(event.currentTarget)
    const email = String(formData.get("email") ?? "").trim()

    const result = await authClient.requestPasswordReset({
      email,
      redirectTo: `${window.location.origin}/reset-password`,
    })

    setPending(false)

    if (result.error) {
      toast.error(getErrorMessage(result.error))
      return
    }

    toast.success("If the email exists, a reset link has been sent.")
    event.currentTarget.reset()
  }

  return (
    <Card className="w-full max-w-md">
      <CardContent className="pt-6">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">Email</label>
            <Input id="email" name="email" type="email" placeholder="you@example.com" required />
          </div>

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Sending..." : "Send reset link"}
          </Button>
        </form>

        <p className="mt-4 text-sm text-muted-foreground">
          Remembered your password?{" "}
          <Link href="/sign-in" className="font-medium text-foreground underline underline-offset-4">
            Back to sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
