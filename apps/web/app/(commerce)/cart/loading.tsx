import { Card, CardContent, CardHeader } from "@workspace/ui/components/card"
import { Skeleton } from "@workspace/ui/components/skeleton"

function CartItemSkeleton({ id }: { id: string }) {
  return (
    <Card key={id}>
      <CardContent className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="size-16 rounded-2xl" />
          <div className="flex min-w-0 flex-col gap-2">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-36" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="size-9 rounded-2xl" />
          <Skeleton className="h-5 w-8" />
          <Skeleton className="size-9 rounded-2xl" />
          <Skeleton className="h-9 w-20 rounded-2xl" />
        </div>
      </CardContent>
    </Card>
  )
}

export default function CartLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-10 w-36" />
        <Skeleton className="h-4 w-64" />
      </div>

      <div className="flex flex-col gap-4">
        {['cart-item-1', 'cart-item-2', 'cart-item-3'].map((id) => (
          <CartItemSkeleton key={id} id={id} />
        ))}

        <Card>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-6 w-24" />
            </div>
            <Skeleton className="h-11 w-full rounded-2xl" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
