"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

import { adminUpdateProduct, type AdminProduct, type AdminCategory } from "@/lib/orders"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"

type AdminEditProductFormProps = {
  product: AdminProduct
  categories: AdminCategory[]
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

export function AdminEditProductForm({ product, categories }: AdminEditProductFormProps) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [name, setName] = useState(product.name)
  const [slug, setSlug] = useState(product.slug)
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(true)
  const [description, setDescription] = useState(product.description)
  const [price, setPrice] = useState((product.priceInCents / 100).toString())
  const [stock, setStock] = useState(product.stock.toString())
  const [imageUrl, setImageUrl] = useState(product.imageUrl ?? "")
  const [categoryId, setCategoryId] = useState(product.categoryId)
  const [isFeatured, setIsFeatured] = useState(product.isFeatured)
  const [isActive, setIsActive] = useState(product.isActive)

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
      await adminUpdateProduct(product.id, {
        name,
        slug,
        description,
        priceInCents,
        stock: Number.parseInt(stock) || 0,
        imageUrl: imageUrl || null,
        categoryId,
        isFeatured,
        isActive,
      })
      toast.success(`Updated "${name}"`)
      router.push("/admin/products")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update product")
    } finally {
      setSubmitting(false)
    }
  }

  const hasChanges =
    name !== product.name ||
    slug !== product.slug ||
    description !== product.description ||
    priceInCents() !== product.priceInCents ||
    (Number.parseInt(stock) || 0) !== product.stock ||
    (imageUrl || null) !== product.imageUrl ||
    categoryId !== product.categoryId ||
    isFeatured !== product.isFeatured ||
    isActive !== product.isActive

  function priceInCents() {
    return Math.round(Number.parseFloat(price || "0") * 100)
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Product Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Name *
              </label>
              <Input
                id="name"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
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
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">
              Description *
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
              placeholder="https://example.com/image.jpg"
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
          {submitting ? "Saving..." : "Save Changes"}
        </Button>
        <Button asChild type="button" variant="outline">
          <a href="/admin/products">Cancel</a>
        </Button>
      </div>
    </form>
  )
}
