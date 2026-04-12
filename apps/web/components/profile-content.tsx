"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowRight, CheckCircle2, Mail, Package, Shield, User } from "lucide-react"

import { getOrders, type OrdersListItem } from "@/lib/orders"
import { formatPHP } from "@/lib/catalog"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Separator } from "@workspace/ui/components/separator"
import { Skeleton } from "@workspace/ui/components/skeleton"

interface ProfileContentProps {
  userName: string
  email: string
  emailVerified: boolean
  memberSince: string
}

export function ProfileContent({ userName, email, emailVerified, memberSince }: ProfileContentProps) {
  const [orders, setOrders] = useState<OrdersListItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getOrders()
        setOrders(data.items)
      } catch {
        setOrders([])
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  const totalOrders = orders.length
  const totalSpent = orders.reduce((sum, o) => sum + o.totalInCents, 0)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your account information and view activity summary.
        </p>
      </div>

      {/* Account Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
              <User className="size-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{userName}</CardTitle>
              <CardDescription>Account details</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Email */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                <Mail className="size-3.5" />
                Email
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">{email}</span>
                {emailVerified ? (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    <CheckCircle2 className="size-3" />
                    Verified
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">Not verified</Badge>
                )}
              </div>
            </div>

            {/* Member Since */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                <Shield className="size-3.5" />
                Member since
              </div>
              <p className="text-sm">{memberSince}</p>
            </div>
          </div>

          <Separator />

          {/* Activity Stats */}
          <div>
            <p className="mb-3 text-sm font-medium text-muted-foreground">Activity Summary</p>
            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {["a", "b"].map((key) => (
                  <div key={key} className="rounded-lg border p-4">
                    <Skeleton className="h-3 w-16 mb-2" />
                    <Skeleton className="h-6 w-10" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border p-4">
                  <p className="text-xs font-medium text-muted-foreground">Total Orders</p>
                  <p className="mt-1 text-2xl font-bold">{totalOrders}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs font-medium text-muted-foreground">Total Spent</p>
                  <p className="mt-1 text-2xl font-bold">{formatPHP(totalSpent)}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/account/dashboard" className="block">
          <Card className="transition-colors hover:bg-accent/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="h-4 w-4" />
                Dashboard
              </CardTitle>
              <CardDescription>View order stats and recent activity</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/account/orders" className="block">
          <Card className="transition-colors hover:bg-accent/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ArrowRight className="h-4 w-4" />
                Order History
              </CardTitle>
              <CardDescription>Browse all your past orders</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  )
}
