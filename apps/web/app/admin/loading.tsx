import { Card, CardContent, CardHeader } from "@workspace/ui/components/card"
import { Skeleton } from "@workspace/ui/components/skeleton"

export default function AdminLoading() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-10 w-52" />
        <Skeleton className="h-4 w-72" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {['revenue', 'orders', 'stock'].map((id) => (
          <Card key={id}>
            <CardHeader>
              <Skeleton className="h-4 w-28" />
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {['chart-1', 'chart-2'].map((id) => (
          <Card key={id}>
            <CardHeader>
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-72 w-full rounded-3xl" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {['row-1', 'row-2', 'row-3'].map((id) => (
            <Skeleton key={id} className="h-16 w-full rounded-2xl" />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
