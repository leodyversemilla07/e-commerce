import { Card, CardContent } from "@workspace/ui/components/card"
import { Skeleton } from "@workspace/ui/components/skeleton"

function OrderRowSkeleton({ id }: { id: string }) {
  return (
    <Card key={id}>
      <CardContent className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-5 w-56" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-7 w-28" />
        </div>
      </CardContent>
    </Card>
  )
}

export default function OrdersLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-10 w-44" />
        <Skeleton className="h-4 w-72" />
      </div>

      <div className="flex flex-col gap-3">
        {['order-1', 'order-2', 'order-3'].map((id) => (
          <OrderRowSkeleton key={id} id={id} />
        ))}
      </div>
    </div>
  )
}
