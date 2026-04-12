import { OrderDetailView } from "@/components/order-detail-view"

type OrderDetailPageProps = {
  params: Promise<{ id: string }>
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { id } = await params

  return (
    <div className="space-y-6">
      <OrderDetailView orderId={id} />
    </div>
  )
}
