import { Card, CardContent } from "@workspace/ui/components/card"

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className ?? ""}`} />
}

export default function CartLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-4 w-48" />
      </div>

      <div className="space-y-4">
        {["a", "b"].map((key) => (
          <Card key={key}>
            <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-8 rounded-md" />
                <Skeleton className="h-4 w-6" />
                <Skeleton className="h-8 w-8 rounded-md" />
                <Skeleton className="h-8 w-16 rounded-md" />
              </div>
            </CardContent>
          </Card>
        ))}

        <Card>
          <CardContent className="space-y-3 pt-6">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-6 w-24" />
            </div>
            <Skeleton className="h-10 w-48" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
