import Link from "next/link"

import { formatPHP } from "@/lib/catalog"
import { AdminSearch } from "@/components/admin-search"
import { AdminProductActions } from "@/components/admin-product-actions"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"

function resolveApiBaseURL() {
  if (process.env.NEXT_PUBLIC_AUTH_BASE_URL) return process.env.NEXT_PUBLIC_AUTH_BASE_URL
  if (process.env.BETTER_AUTH_URL) return process.env.BETTER_AUTH_URL
  return "http://localhost:4000"
}

type ProductItem = {
  id: string
  name: string
  slug: string
  priceInCents: number
  stock: number
  isFeatured: boolean
  isActive: boolean
  category: { name: string; slug: string }
  createdAt: string
}

async function getProducts(): Promise<ProductItem[]> {
  try {
    const res = await fetch(`${resolveApiBaseURL()}/admin/products`, { cache: "no-store" })
    if (!res.ok) return []
    const data = (await res.json()) as { items: ProductItem[] }
    return data.items
  } catch {
    return []
  }
}

type AdminProductsPageProps = {
  searchParams: Promise<{ q?: string; filter?: string }>
}

export default async function AdminProductsPage({ searchParams }: AdminProductsPageProps) {
  const params = await searchParams
  const query = params.q?.toLowerCase() ?? ""
  const filter = params.filter ?? ""

  const allProducts = await getProducts()

  const products = allProducts.filter((p) => {
    const matchesQuery =
      !query ||
      p.name.toLowerCase().includes(query) ||
      p.slug.toLowerCase().includes(query) ||
      p.category.name.toLowerCase().includes(query)

    let matchesFilter = true
    if (filter === "featured") matchesFilter = p.isFeatured
    else if (filter === "inactive") matchesFilter = !p.isActive
    else if (filter === "low-stock") matchesFilter = p.stock <= 5

    return matchesQuery && matchesFilter
  })

  const categories = [...new Set(allProducts.map((p) => p.category.name))].sort()

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Products</h1>
          <p className="text-sm text-muted-foreground">
            Manage product visibility, featured status, and stock. ({allProducts.length} total)
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/products/new">+ Create Product</Link>
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <AdminSearch placeholder="Search by name, slug, or category..." basePath="/admin/products" />
        <div className="flex flex-wrap gap-2">
          {[
            { key: "", label: "All" },
            { key: "featured", label: "Featured" },
            { key: "inactive", label: "Inactive" },
            { key: "low-stock", label: "Low Stock" },
          ].map((f) => (
            <Link
              key={f.key}
              href={f.key ? `/admin/products?filter=${f.key}` : "/admin/products"}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                filter === f.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>
      </div>

      {products.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              {query || filter ? "No products match your search." : "No products found."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {products.map((product) => (
            <Card key={product.id}>
              <CardContent className="flex flex-col gap-4 pt-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/products/${product.id}/edit`}
                      className="font-medium hover:underline"
                    >
                      {product.name}
                    </Link>
                    {product.isFeatured ? <Badge>Featured</Badge> : null}
                    {!product.isActive ? (
                      <Badge variant="destructive">Inactive</Badge>
                    ) : null}
                    {product.stock <= 5 ? (
                      <Badge variant="outline" className="text-orange-600">
                        Low stock
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {product.category.name} · {formatPHP(product.priceInCents)} · Stock: {product.stock}
                  </p>
                  <p className="font-mono text-xs text-muted-foreground">{product.slug}</p>
                </div>

                <AdminProductActions
                  productId={product.id}
                  name={product.name}
                  isFeatured={product.isFeatured}
                  isActive={product.isActive}
                  stock={product.stock}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
