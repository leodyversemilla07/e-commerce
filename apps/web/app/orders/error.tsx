"use client"

import Link from "next/link"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"

export default function LegacyOrdersError() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Orders moved</h1>
        <p className="text-sm text-muted-foreground">Please use the new account orders page.</p>
      </div>
      <Card>
        <CardContent className="space-y-4 pt-6">
          <Button asChild>
            <Link href="/account/orders">Go to Orders</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
