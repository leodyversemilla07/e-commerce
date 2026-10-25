"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

import { adminUpdateOrderStatus, formatOrderStatus } from "@/lib/orders"
import { Badge } from "@workspace/ui/components/badge"

const NEXT_STATUSES: Record<string, string[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
}

type AdminStatusUpdaterProps = {
  orderId: string
  currentStatus: string
  hasCardPayment?: boolean
}

export function AdminStatusUpdater({ orderId, currentStatus, hasCardPayment = false }: AdminStatusUpdaterProps) {
  const router = useRouter()
  const [updating, setUpdating] = useState(false)
  const availableStatuses = (NEXT_STATUSES[currentStatus] ?? []).filter(
    (status) => status !== 'CANCELLED' || !hasCardPayment,
  )

  const updateStatus = async (newStatus: string) => {
    setUpdating(true)
    try {
      await adminUpdateOrderStatus(orderId, newStatus)
      toast.success(`Status updated to ${formatOrderStatus(newStatus)}`)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update status')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={currentStatus}
        onChange={(e) => void updateStatus(e.target.value)}
        disabled={updating || availableStatuses.length === 0}
        className="h-8 rounded-md border bg-background px-2 text-xs"
      >
        {[currentStatus, ...availableStatuses].map((s) => (
          <option key={s} value={s}>
            {formatOrderStatus(s)}
          </option>
        ))}
      </select>
    </div>
  )
}
