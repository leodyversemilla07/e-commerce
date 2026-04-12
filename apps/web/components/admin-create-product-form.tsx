"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

import { adminCreateProduct, type AdminCategory } from "@/lib/orders"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"

type AdminCreateProductFormProps = {
  categories: AdminCategory[]
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

export function AdminCreateProductForm({ categories }: AdminCreateProductFormProps) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const [description, setDescription] = useState("")
  const [price, setPrice] = useState("")
  const [stock, setStock] = useState("0")
  const [imageUrl, setImageUrl] = useState("")
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "")
  const [isFeatured, setIsFeatured] = useState(false)
  const [isActive, setIsActive] = useState(true)

  const handleNameChange = (value: string) => {
    setName(value)
    if (!slugManuallyEdited) {
      setSlug(slugify(value))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name || !slug || !description || !price || !categoryId) {
      toast.error("Please fill in all required fields")
      return
    }

    const priceInCents = Math.round(Number.parseFloat(price) * 100)
    if (Number.isNaN(priceInCents) || priceInCents <= 0) {
      toast.error("Price must be a positive number")
      return
    }

    setSubmitting(true)
    try {
      const product = await adminCreateProduct({
        name,
        slug,
        description,
        priceInCents,
        stock: Number.parseInt(stock) || 0,
        imageUrl: imageUrl || undefined,
        isFeatured,
        isActive,
        categoryId,
      })
      toast.success(`Created "${product.name}"`)
      router.push("/admin/products")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create product")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Product Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Name *
            </label>
            <Input
              id="name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Wireless Headphones"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="slug" className="text-sm font-medium">
              Slug *
            </label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value)
                setSlugManuallyEdited(true)
              }}
              placeholder="wireless-headphones"
              required
            />
            <p className="text-xs text-muted-foreground">
              URL-friendly identifier. Auto-generated from name.
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">
              Description *
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Premium wireless headphones with active noise cancellation..."
              required
              className="flex min-h-[100px] w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <label htmlFor="price" className="text-sm font-medium">
                Price (₱) *
              </label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="3990"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="stock" className="text-sm font-medium">
                Stock
              </label>
              <Input
                id="stock"
                type="number"
                min="0"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="category" className="text-sm font-medium">
                Category *
              </label>
              <select
                id="category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
                className="flex h-9 w-full rounded-md border bg-background px-3 py-1 text-sm"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="imageUrl" className="text-sm font-medium">
              Image URL
            </label>
            <Input
              id="imageUrl"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/image.jpg (optional)"
            />
            <p className="text-xs text-muted-foreground">
              Leave empty for auto-generated placeholder image.
            </p>
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                className="h-4 w-4 rounded"
              />
              Featured product
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded"
              />
              Active (visible in catalog)
            </label>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Creating..." : "Create Product"}
        </Button>
        <Button asChild type="button" variant="outline">
          <a href="/admin/products">Cancel</a>
        </Button>
      </div>
    </form>
  )
}
