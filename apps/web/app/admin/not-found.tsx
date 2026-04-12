import Link from "next/link"

import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"

export default function AdminNotFound() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Not Found</h1>
        <p className="text-sm text-muted-foreground">
          The admin page you're looking for doesn't exist.
        </p>
      </div>
      <Card>
        <CardContent className="flex items-center gap-4 pt-6">
          <Button asChild>
            <Link href="/admin">Go to Dashboard</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/orders">View Orders</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
