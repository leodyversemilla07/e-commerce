import Link from "next/link"

import { AdminCreateProductForm } from "@/components/admin-create-product-form"
import { adminListCategories } from "@/lib/orders"
import { Button } from "@workspace/ui/components/button"

export default async function NewProductPage() {
  const categories = await adminListCategories()

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/products">← Back to Products</Link>
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Create Product</h1>
        <p className="text-sm text-muted-foreground">Add a new product to your catalog.</p>
      </div>

      <AdminCreateProductForm categories={categories} />
    </div>
  )
}
