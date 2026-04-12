"use client"

import { useEffect, useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts"
import { DollarSign, Package, ShoppingCart, TrendingUp, Users } from "lucide-react"

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegendContent,
} from "@workspace/ui/components/chart"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Skeleton } from "@workspace/ui/components/skeleton"

type OverviewData = {
  totalRevenueInCents: number
  totalOrders: number
  pendingOrders: number
  totalProducts: number
  totalCustomers: number
}

type RevenueByDay = { date: string; revenue: number; orders: number }
type OrdersByStatus = { status: string; count: number }
type TopProduct = { productId: string; name: string; revenueInCents: number; quantitySold: number }
type RevenueByCategory = { name: string; revenueInCents: number }

const revenueChartConfig = {
  revenue: { label: "Revenue", color: "hsl(221, 83%, 53%)" },
} satisfies ChartConfig

const orderStatusConfig = {
  PENDING: { label: "Pending", color: "hsl(38, 92%, 50%)" },
  CONFIRMED: { label: "Confirmed", color: "hsl(221, 83%, 53%)" },
  SHIPPED: { label: "Shipped", color: "hsl(262, 83%, 58%)" },
  DELIVERED: { label: "Delivered", color: "hsl(142, 71%, 45%)" },
  CANCELLED: { label: "Cancelled", color: "hsl(0, 84%, 60%)" },
} satisfies ChartConfig

const categoryColors = [
  "hsl(221, 83%, 53%)",
  "hsl(142, 71%, 45%)",
  "hsl(262, 83%, 58%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 84%, 60%)",
  "hsl(199, 89%, 48%)",
  "hsl(280, 87%, 65%)",
]

function formatPHP(cents: number): string {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(cents / 100)
}

function formatShortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-PH", { month: "short", day: "numeric" })
}

function ChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[250px] w-full" />
      </CardContent>
    </Card>
  )
}

export function AdminCharts() {
  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [revenueByDay, setRevenueByDay] = useState<RevenueByDay[]>([])
  const [ordersByStatus, setOrdersByStatus] = useState<OrdersByStatus[]>([])
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [revenueByCategory, setRevenueByCategory] = useState<RevenueByCategory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const [overviewRes, revenueRes, statusRes, productsRes, categoryRes] =
          await Promise.all([
            fetch("/api/admin/analytics/overview"),
            fetch("/api/admin/analytics/revenue-by-day?days=30"),
            fetch("/api/admin/analytics/orders-by-status"),
            fetch("/api/admin/analytics/top-products?limit=5"),
            fetch("/api/admin/analytics/revenue-by-category"),
          ])

        const [overviewData, revenueData, statusData, productsData, categoryData] =
          await Promise.all([
            overviewRes.json(),
            revenueRes.json(),
            statusRes.json(),
            productsRes.json(),
            categoryRes.json(),
          ])

        setOverview(overviewData)
        setRevenueByDay(revenueData)
        setOrdersByStatus(statusData)
        setTopProducts(productsData)
        setRevenueByCategory(categoryData)
      } catch (err) {
        console.error("Failed to fetch analytics:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {["a", "b", "c", "d"].map((key) => (
            <Card key={key}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="mb-1 h-7 w-28" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatPHP(overview?.totalRevenueInCents ?? 0)}</p>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{(overview?.totalOrders ?? 0).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{overview?.pendingOrders ?? 0} pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{(overview?.totalProducts ?? 0).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">In catalog</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{(overview?.totalCustomers ?? 0).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Registered users</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Revenue (Last 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={revenueChartConfig} className="min-h-[250px] w-full">
              <BarChart data={revenueByDay}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  tickFormatter={(v) => formatShortDate(v)}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `₱${(v / 100).toLocaleString()}`}
                  width={80}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => [formatPHP(Number(value)), "Revenue"]}
                      labelFormatter={(label) => formatShortDate(String(label))}
                    />
                  }
                />
                <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[4, 4, 0, 0]} data-color="revenue" />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Orders by Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={orderStatusConfig} className="min-h-[250px] w-full">
              <PieChart>
                <Pie
                  data={ordersByStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="count"
                  nameKey="status"
                >
                  {ordersByStatus.map((entry) => (
                    <Cell key={entry.status} fill={`var(--color-${entry.status})`} data-color={entry.status} />
                  ))}
                </Pie>
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      nameKey="status"
                      labelFormatter={(label) => {
                        const item = orderStatusConfig[label as keyof typeof orderStatusConfig]
                        return item?.label ?? label
                      }}
                    />
                  }
                />
                <Legend content={<ChartLegendContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Top Products by Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{ revenue: { label: "Revenue", color: "hsl(221, 83%, 53%)" } }}
              className="min-h-[250px] w-full"
            >
              <BarChart data={topProducts} layout="vertical">
                <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={(v) => `₱${(v / 100).toLocaleString()}`} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  width={120}
                  tickFormatter={(v) => (v.length > 15 ? `${v.slice(0, 15)}…` : v)}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, _name, item) => {
                        const quantityCandidate = item.payload?.quantitySold
                        const quantitySold = typeof quantityCandidate === "number" ? quantityCandidate : 0
                        return [`${formatPHP(Number(value))} (${quantitySold} sold)`, "Revenue"]
                      }}
                    />
                  }
                />
                <Bar dataKey="revenueInCents" fill="hsl(221, 83%, 53%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Revenue by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={Object.fromEntries(
                revenueByCategory.map((c, i) => [c.name, { label: c.name, color: categoryColors[i % categoryColors.length] }])
              )}
              className="min-h-[250px] w-full"
            >
              <PieChart>
                <Pie
                  data={revenueByCategory.map((c) => ({ ...c, revenue: c.revenueInCents / 100 }))}
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="revenue"
                  nameKey="name"
                >
                  {revenueByCategory.map((entry, index) => (
                    <Cell key={entry.name} fill={categoryColors[index % categoryColors.length]} />
                  ))}
                </Pie>
                <ChartTooltip
                  content={<ChartTooltipContent formatter={(value) => [formatPHP(Number(value) * 100), "Revenue"]} />}
                />
                <Legend content={<ChartLegendContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
