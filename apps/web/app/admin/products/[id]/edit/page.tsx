import Link from "next/link"
import { notFound } from "next/navigation"

import { AdminEditProductForm } from "@/components/admin-edit-product-form"
import { adminGetProduct, adminListCategories, type AdminProduct } from "@/lib/orders"
import { Button } from "@workspace/ui/components/button"

type EditProductPageProps = {
  params: Promise<{ id: string }>
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const { id } = await params

  let product: AdminProduct
  try {
    product = await adminGetProduct(id)
  } catch {
    notFound()
  }

  const categories = await adminListCategories()

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/products">← Back to Products</Link>
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Edit Product</h1>
        <p className="text-sm text-muted-foreground">
          Update details for &ldquo;{product.name}&rdquo;
        </p>
      </div>

      <AdminEditProductForm product={product} categories={categories} />
    </div>
  )
}
