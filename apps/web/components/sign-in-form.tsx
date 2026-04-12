"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { type FormEvent, useState } from "react"
import { toast } from "sonner"

import { authClient } from "@/lib/auth-client"
import { PasswordField } from "@/components/password-field"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"

function getErrorMessage(error: unknown): string {
  if (!error || typeof error !== "object") return "Unable to sign in"
  if ("message" in error && typeof error.message === "string") return error.message
  return "Unable to sign in"
}

export function SignInForm() {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPending(true)
    setError(null)

    const formData = new FormData(event.currentTarget)
    const email = String(formData.get("email") ?? "").trim()
    const password = String(formData.get("password") ?? "")

    const result = await authClient.signIn.email({
      email,
      password,
    })

    setPending(false)

    if (result.error) {
      const message = getErrorMessage(result.error)
      setError(message)
      toast.error(message)
      return
    }

    toast.success("Signed in successfully")
    router.push("/account")
    router.refresh()
  }

  return (
    <Card className="w-full max-w-md">
      <CardContent className="pt-6">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">Email</label>
            <Input id="email" name="email" type="email" placeholder="you@example.com" required />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-medium">Password</label>
              <Link href="/forgot-password" className="text-xs text-muted-foreground underline underline-offset-4">
                Forgot password?
              </Link>
            </div>
            <PasswordField id="password" name="password" autoComplete="current-password" />
          </div>

          {error ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        <p className="mt-4 text-sm text-muted-foreground">
          New here?{" "}
          <Link href="/sign-up" className="font-medium text-foreground underline underline-offset-4">
            Create an account
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
