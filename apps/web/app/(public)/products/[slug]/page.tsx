import { notFound } from "next/navigation"

import { AddToCartButton } from "@/components/add-to-cart-button"
import { formatPHP, getProductBySlug, getProductImageUrl } from "@/lib/catalog"
import { Badge } from "@workspace/ui/components/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"

type ProductDetailPageProps = {
  params: Promise<{ slug: string }>
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { slug } = await params
  const product = await getProductBySlug(slug)

  if (!product) {
    notFound()
  }

  return (
    <main className="min-h-svh bg-background px-6 py-8 text-foreground md:px-10">
      <section className="mx-auto max-w-4xl space-y-8">
        <Card className="overflow-hidden">
          <div className="aspect-[16/9] w-full overflow-hidden bg-muted sm:aspect-[2/1]">
            <img
              src={getProductImageUrl(product)}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          </div>
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{product.category.name}</Badge>
              {product.isFeatured ? <Badge>Featured</Badge> : null}
            </div>
            <CardTitle className="text-3xl">{product.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-muted-foreground">{product.description}</p>
            <div className="space-y-1">
              <p className="text-2xl font-semibold">{formatPHP(product.priceInCents)}</p>
              <p className="text-sm text-muted-foreground">Stock available: {product.stock}</p>
            </div>
            <AddToCartButton productId={product.id} showBuyNow />
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
