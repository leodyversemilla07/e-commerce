import { Card, CardContent, CardHeader } from "@workspace/ui/components/card"
import { Skeleton } from "@workspace/ui/components/skeleton"

function FormSectionSkeleton({ id }: { id: string }) {
  return (
    <Card key={id}>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-56" />
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-11 w-full rounded-2xl" />
        <Skeleton className="h-11 w-full rounded-2xl" />
        <Skeleton className="h-11 w-full rounded-2xl sm:col-span-2" />
      </CardContent>
    </Card>
  )
}

export default function CheckoutLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-4 w-72" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-4">
          {['contact', 'shipping', 'payment'].map((id) => (
            <FormSectionSkeleton key={id} id={id} />
          ))}
        </div>

        <Card className="h-fit lg:sticky lg:top-20">
          <CardHeader>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {['subtotal', 'shipping', 'tax'].map((id) => (
              <div key={id} className="flex items-center justify-between gap-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between gap-4">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-7 w-28" />
              </div>
            </div>
            <Skeleton className="h-11 w-full rounded-2xl" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
