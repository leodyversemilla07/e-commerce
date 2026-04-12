"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

import { adminUpdateOrderStatus, formatOrderStatus } from "@/lib/orders"
import { Badge } from "@workspace/ui/components/badge"

const STATUSES = ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"]

type AdminStatusUpdaterProps = {
  orderId: string
  currentStatus: string
}

export function AdminStatusUpdater({ orderId, currentStatus }: AdminStatusUpdaterProps) {
  const router = useRouter()
  const [updating, setUpdating] = useState(false)

  const updateStatus = async (newStatus: string) => {
    setUpdating(true)
    try {
      await adminUpdateOrderStatus(orderId, newStatus)
      toast.success(`Status updated to ${formatOrderStatus(newStatus)}`)
      router.refresh()
    } catch {
      toast.error("Failed to update status")
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={currentStatus}
        onChange={(e) => void updateStatus(e.target.value)}
        disabled={updating}
        className="h-8 rounded-md border bg-background px-2 text-xs"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {formatOrderStatus(s)}
          </option>
        ))}
      </select>
    </div>
  )
}
