export type ProductListItem = {
  id: string
  name: string
  slug: string
  description: string
  priceInCents: number
  stock: number
  imageUrl: string | null
  isFeatured: boolean
  category: {
    id: string
    name: string
    slug: string
  }
}

export type ProductDetail = ProductListItem & {
  createdAt: string
  updatedAt: string
  category: ProductListItem["category"] & {
    description?: string | null
  }
}

function resolveApiBaseURL() {
  if (process.env.NEXT_PUBLIC_AUTH_BASE_URL) {
    return process.env.NEXT_PUBLIC_AUTH_BASE_URL
  }

  if (process.env.BETTER_AUTH_URL) {
    return process.env.BETTER_AUTH_URL
  }

  return "http://localhost:4000"
}

export function formatPHP(priceInCents: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(priceInCents / 100)
}

export function getProductImageUrl(product: ProductListItem): string {
  if (product.imageUrl) return product.imageUrl
  return `https://picsum.photos/seed/${product.slug}/400/300`
}

export async function getProducts(): Promise<ProductListItem[]> {
  const response = await fetch(`${resolveApiBaseURL()}/products`, {
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error("Failed to fetch products")
  }

  const payload = (await response.json()) as { items?: ProductListItem[] }
  return payload.items ?? []
}

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  const response = await fetch(`${resolveApiBaseURL()}/products/${slug}`, {
    cache: "no-store",
  })

  if (response.status === 404) return null
  if (!response.ok) {
    throw new Error("Failed to fetch product")
  }

  return (await response.json()) as ProductDetail
}

export async function getFeaturedProducts(): Promise<ProductListItem[]> {
  const products = await getProducts()
  return products.filter((p) => p.isFeatured).slice(0, 6)
}
