"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { Search, SlidersHorizontal, X } from "lucide-react"

import type { ProductListItem } from "@/lib/catalog"
import { formatPHP, getProductImageUrl } from "@/lib/catalog"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"

type ProductFiltersProps = {
  products: ProductListItem[]
}

export function ProductFilters({ products }: ProductFiltersProps) {
  const [query, setQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const categories = useMemo(() => {
    const set = new Map<string, string>()
    for (const p of products) {
      if (!set.has(p.category.slug)) {
        set.set(p.category.slug, p.category.name)
      }
    }
    return Array.from(set.entries()).map(([slug, name]) => ({ slug, name }))
  }, [products])

  const filtered = useMemo(() => {
    let result = products

    if (selectedCategory) {
      result = result.filter((p) => p.category.slug === selectedCategory)
    }

    if (query.trim()) {
      const q = query.trim().toLowerCase()
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.category.name.toLowerCase().includes(q),
      )
    }

    return result
  }, [products, query, selectedCategory])

  const hasActiveFilter = query.trim().length > 0 || selectedCategory !== null

  const clearAll = () => {
    setQuery("")
    setSelectedCategory(null)
  }

  return (
    <div className="space-y-6">
      {/* Search + filter bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search products..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-10 w-full rounded-lg border bg-background pl-10 pr-10 text-sm outline-none transition focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="hidden h-4 w-4 text-muted-foreground sm:block" />
          <p className="text-sm text-muted-foreground">
            {filtered.length === products.length
              ? `${products.length} products`
              : `${filtered.length} of ${products.length}`}
          </p>
        </div>
      </div>

      {/* Category pills */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSelectedCategory(null)}
          className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
            selectedCategory === null
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground"
          }`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat.slug}
            type="button"
            onClick={() =>
              setSelectedCategory((prev) => (prev === cat.slug ? null : cat.slug))
            }
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
              selectedCategory === cat.slug
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground"
            }`}
          >
            {cat.name}
          </button>
        ))}
        {hasActiveFilter ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="text-muted-foreground"
          >
            Clear
          </Button>
        ) : null}
      </div>

      {/* Product grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <Search className="size-5 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">No products found</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Try a different search term or category.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={clearAll}>
            Reset filters
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((product) => (
            <Link key={product.id} href={`/products/${product.slug}`}>
              <Card className="group overflow-hidden transition-all hover:shadow-md">
                <div className="relative aspect-square overflow-hidden bg-muted">
                  <img
                    src={getProductImageUrl(product)}
                    alt={product.name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                  {product.isFeatured ? (
                    <Badge className="absolute left-3 top-3">Featured</Badge>
                  ) : null}
                  {product.stock <= 5 && product.stock > 0 ? (
                    <Badge variant="secondary" className="absolute right-3 top-3">
                      Only {product.stock} left
                    </Badge>
                  ) : null}
                  {product.stock === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                      <Badge variant="destructive">Out of stock</Badge>
                    </div>
                  ) : null}
                </div>
                <CardContent className="space-y-2 p-4">
                  <div>
                    <Badge variant="outline" className="text-xs">
                      {product.category.name}
                    </Badge>
                  </div>
                  <p className="truncate font-medium">{product.name}</p>
                  <p className="line-clamp-1 text-sm text-muted-foreground">
                    {product.description}
                  </p>
                  <p className="pt-1 text-lg font-semibold">
                    {formatPHP(product.priceInCents)}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
