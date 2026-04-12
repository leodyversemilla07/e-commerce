import { ProductFilters } from "@/components/product-filters"
import { getProducts } from "@/lib/catalog"

export default async function ProductsPage() {
  const products = await getProducts()

  return (
    <main className="min-h-svh bg-background text-foreground">
      <section className="border-b">
        <div className="mx-auto max-w-7xl px-6 py-10 md:px-10 md:py-14">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Products</h1>
          <p className="mt-2 text-muted-foreground">
            Browse our catalog of {products.length} products
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-8 md:px-10">
        <ProductFilters products={products} />
      </section>
    </main>
  )
}
