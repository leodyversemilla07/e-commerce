import Link from "next/link"
import { ArrowRight, ShieldCheck, Truck, RotateCcw } from "lucide-react"

import { formatPHP, getFeaturedProducts, getProductImageUrl, getProducts } from "@/lib/catalog"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"

export default async function Page() {
  const [featured, products] = await Promise.all([
    getFeaturedProducts(),
    getProducts(),
  ])

  const categories = [...new Set(products.map((p) => p.category.name))]

  return (
    <main className="min-h-svh bg-background text-foreground">
      {/* Hero */}
      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
        <div className="relative mx-auto max-w-7xl px-6 py-20 md:px-10 md:py-28 lg:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-6 rounded-full">
              New arrivals every week
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
              Curated products for{" "}
              <span className="text-primary">modern living</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
              Premium gear, fast checkout, and reliable delivery — everything you
              need in one streamlined marketplace.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href="/products">
                  Browse Products
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
                <Link href="/products">View All</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-7xl px-6 py-16 md:px-10 md:py-20">
          <div className="mb-10 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
                Featured
              </h2>
              <p className="mt-1 text-muted-foreground">
                Hand-picked items from our catalog
              </p>
            </div>
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link href="/products">
                View all
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featured.slice(0, 4).map((product) => (
              <Link key={product.id} href={`/products/${product.slug}`}>
                <Card className="group overflow-hidden transition-all hover:shadow-lg">
                  <div className="aspect-square overflow-hidden bg-muted">
                    <img
                      src={getProductImageUrl(product)}
                      alt={product.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                  <CardContent className="space-y-1 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-medium">{product.name}</p>
                      <Badge variant="secondary" className="shrink-0 text-xs">
                        {product.category.name}
                      </Badge>
                    </div>
                    <p className="font-semibold">{formatPHP(product.priceInCents)}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Categories */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto max-w-7xl px-6 py-16 md:px-10 md:py-20">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Shop by category
            </h2>
            <p className="mt-1 text-muted-foreground">
              Find exactly what you&apos;re looking for
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {categories.map((cat) => (
              <Button key={cat} asChild variant="outline" size="lg" className="rounded-full">
                <Link href="/products">{cat}</Link>
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="mx-auto max-w-7xl px-6 py-16 md:px-10 md:py-20">
        <div className="grid gap-8 md:grid-cols-3">
          {[
            {
              icon: Truck,
              title: "Free shipping",
              desc: "On orders over ₱2,000",
            },
            {
              icon: ShieldCheck,
              title: "Secure checkout",
              desc: "Fast and protected payments",
            },
            {
              icon: RotateCcw,
              title: "Easy returns",
              desc: "7-day hassle-free returns",
            },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <item.icon className="size-5" />
              </div>
              <div>
                <p className="font-medium">{item.title}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-7xl px-6 py-16 text-center md:px-10 md:py-20">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Ready to get started?
          </h2>
          <p className="mx-auto mt-2 max-w-md text-muted-foreground">
            Browse our catalog and find your next favorite product.
          </p>
          <Button asChild size="lg" className="mt-8">
            <Link href="/products">
              Start Shopping
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </main>
  )
}
