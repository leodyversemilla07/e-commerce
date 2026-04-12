import { Check, Clock, Package, Truck, XCircle } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"

type OrderStatus = "PENDING" | "CONFIRMED" | "SHIPPED" | "DELIVERED" | "CANCELLED"

type OrderStatusTimelineProps = {
  status: string
}

const STEPS: { key: OrderStatus; label: string; icon: typeof Clock }[] = [
  { key: "PENDING", label: "Pending", icon: Clock },
  { key: "CONFIRMED", label: "Confirmed", icon: Check },
  { key: "SHIPPED", label: "Shipped", icon: Truck },
  { key: "DELIVERED", label: "Delivered", icon: Package },
]

export function OrderStatusTimeline({ status }: OrderStatusTimelineProps) {
  const currentStatus = status.toUpperCase() as OrderStatus

  if (currentStatus === "CANCELLED") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3">
        <XCircle className="h-5 w-5 text-destructive" />
        <div>
          <p className="text-sm font-medium text-destructive">Order cancelled</p>
          <p className="text-xs text-muted-foreground">This order has been cancelled.</p>
        </div>
      </div>
    )
  }

  const currentIndex = STEPS.findIndex((s) => s.key === currentStatus)

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Order status</p>
      <div className="flex items-start justify-between">
        {STEPS.map((step, index) => {
          const Icon = step.icon
          const isCompleted = index <= currentIndex
          const isCurrent = index === currentIndex

          return (
            <div key={step.key} className="flex flex-1 flex-col items-center">
              <div className="flex w-full items-center">
                {/* Connector line (left) */}
                {index > 0 ? (
                  <div
                    className={cn(
                      "h-0.5 flex-1 transition-colors",
                      index <= currentIndex ? "bg-primary" : "bg-border",
                    )}
                  />
                ) : null}

                {/* Step circle */}
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                    isCompleted
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground",
                    isCurrent && "ring-2 ring-primary/30",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>

                {/* Connector line (right) */}
                {index < STEPS.length - 1 ? (
                  <div
                    className={cn(
                      "h-0.5 flex-1 transition-colors",
                      index < currentIndex ? "bg-primary" : "bg-border",
                    )}
                  />
                ) : null}
              </div>

              {/* Label */}
              <p
                className={cn(
                  "mt-1.5 text-center text-xs",
                  isCompleted ? "font-medium text-foreground" : "text-muted-foreground",
                )}
              >
                {step.label}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
