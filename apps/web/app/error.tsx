"use client"

import Link from "next/link"

import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-6 py-10 text-foreground">
      <Card className="max-w-md">
        <CardContent className="space-y-4 pt-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
          <p className="text-sm text-muted-foreground">
            An unexpected error occurred. Please try again.
          </p>
          <p className="font-mono text-xs text-destructive">{error.message}</p>
          <div className="flex justify-center gap-3">
            <Button onClick={reset}>Try Again</Button>
            <Button asChild variant="outline">
              <Link href="/">Go Home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
