"use client"

import Link from "next/link"

import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"

export default function AccountError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Something went wrong</h1>
        <p className="text-sm text-muted-foreground">We could not load your account.</p>
      </div>
      <Card>
        <CardContent className="space-y-4 pt-6">
          <p className="font-mono text-xs text-destructive">{error.message}</p>
          <div className="flex gap-3">
            <Button onClick={reset}>Try Again</Button>
            <Button asChild variant="outline">
              <Link href="/">Go Home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
