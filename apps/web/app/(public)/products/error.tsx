"use client"

export default function ProductsError() {
  return (
    <main className="flex min-h-svh items-center justify-center px-6 py-10">
      <div className="max-w-md rounded-2xl border bg-card p-6 text-center">
        <h1 className="text-xl font-semibold">Could not load products</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Please make sure the API server is running and database is seeded.
        </p>
      </div>
    </main>
  )
}
