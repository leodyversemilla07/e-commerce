import { ProductFilters } from "@/components/product-filters"
import { getProducts } from "@/lib/catalog"

export default async function ProductsLoading() {
  return (
    <main className="min-h-svh bg-background px-6 py-8 text-foreground md:px-10">
      <section className="mx-auto max-w-7xl space-y-8">
        <div className="h-12 w-full animate-pulse rounded-2xl bg-muted" />
        <div className="space-y-2">
          <div className="h-9 w-36 animate-pulse rounded-md bg-muted" />
          <div className="h-5 w-80 animate-pulse rounded-md bg-muted" />
        </div>
        <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {["a", "b", "c", "d", "e", "f"].map((key) => (
            <div key={key} className="animate-pulse rounded-2xl border bg-card">
              <div className="aspect-[4/3] rounded-b-none bg-muted" />
              <div className="space-y-2 p-4">
                <div className="h-5 w-3/4 rounded bg-muted" />
                <div className="h-4 w-1/2 rounded bg-muted" />
                <div className="h-4 w-1/3 rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
