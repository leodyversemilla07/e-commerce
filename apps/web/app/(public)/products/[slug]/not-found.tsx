import Link from "next/link"

import { Button } from "@workspace/ui/components/button"

export default function ProductNotFoundPage() {
  return (
    <main className="flex min-h-svh items-center justify-center px-6 py-10">
      <div className="max-w-md rounded-2xl border bg-card p-6 text-center">
        <h1 className="text-xl font-semibold">Product not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The product you are looking for does not exist or is no longer active.
        </p>
        <Button asChild className="mt-4">
          <Link href="/products">Back to products</Link>
        </Button>
      </div>
    </main>
  )
}
