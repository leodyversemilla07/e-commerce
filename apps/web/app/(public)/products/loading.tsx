import { Card, CardContent, CardHeader } from "@workspace/ui/components/card"
import { Skeleton } from "@workspace/ui/components/skeleton"

function ProductCardSkeleton({ id }: { id: string }) {
  return (
    <Card key={id}>
      <Skeleton className="aspect-[4/3] w-full rounded-b-none rounded-t-4xl" />
      <CardHeader>
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-4">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-9 w-24 rounded-2xl" />
      </CardContent>
    </Card>
  )
}

export default function ProductsLoading() {
  return (
    <main className="min-h-svh bg-background px-6 py-8 text-foreground md:px-10">
      <section className="mx-auto flex max-w-7xl flex-col gap-8">
        <Skeleton className="h-12 w-full rounded-2xl" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-5 w-full max-w-96" />
        </div>
        <Skeleton className="h-11 w-full rounded-2xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {['product-1', 'product-2', 'product-3', 'product-4', 'product-5', 'product-6'].map(
            (id) => (
              <ProductCardSkeleton key={id} id={id} />
            )
          )}
        </div>
      </section>
    </main>
  )
}
