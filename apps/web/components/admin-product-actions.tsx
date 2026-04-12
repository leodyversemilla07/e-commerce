"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

import { adminUpdateProduct, adminDeleteProduct } from "@/lib/orders"
import { Button } from "@workspace/ui/components/button"

type AdminProductActionsProps = {
  productId: string
  name: string
  isFeatured: boolean
  isActive: boolean
  stock: number
}

export function AdminProductActions({
  productId,
  name,
  isFeatured,
  isActive,
  stock,
}: AdminProductActionsProps) {
  const router = useRouter()
  const [updating, setUpdating] = useState(false)

  const toggle = async (field: "isFeatured" | "isActive") => {
    setUpdating(true)
    try {
      const current = field === "isFeatured" ? isFeatured : isActive
      await adminUpdateProduct(productId, { [field]: !current })
      toast.success(`${name}: ${field} → ${!current}`)
      router.refresh()
    } catch {
      toast.error("Failed to update product")
    } finally {
      setUpdating(false)
    }
  }

  const adjustStock = async (delta: number) => {
    const newStock = Math.max(0, stock + delta)
    setUpdating(true)
    try {
      await adminUpdateProduct(productId, { stock: newStock })
      toast.success(`${name}: stock → ${newStock}`)
      router.refresh()
    } catch {
      toast.error("Failed to update stock")
    } finally {
      setUpdating(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    setUpdating(true)
    try {
      const result = await adminDeleteProduct(productId)
      if (result.deactivated) {
        toast.success(`${name} deactivated (has order history)`)
      } else {
        toast.success(`${name} deleted`)
      }
      router.refresh()
    } catch {
      toast.error("Failed to delete product")
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button asChild variant="outline" size="sm">
        <Link href={`/admin/products/${productId}/edit`}>Edit</Link>
      </Button>

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={updating}
        onClick={() => void toggle("isFeatured")}
      >
        {isFeatured ? "★ Featured" : "☆ Feature"}
      </Button>

      <Button
        type="button"
        variant={isActive ? "outline" : "destructive"}
        size="sm"
        disabled={updating}
        onClick={() => void toggle("isActive")}
      >
        {isActive ? "Active" : "Inactive"}
      </Button>

      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={updating || stock <= 0}
          onClick={() => void adjustStock(-1)}
        >
          −
        </Button>
        <span className="w-8 text-center text-sm font-medium tabular-nums">{stock}</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={updating}
          onClick={() => void adjustStock(1)}
        >
          +
        </Button>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={updating}
        onClick={() => void handleDelete()}
        className="text-destructive hover:text-destructive"
      >
        Delete
      </Button>
    </div>
  )
}
