import { type NextRequest, NextResponse } from "next/server"

function resolveApiBaseURL() {
  if (process.env.NEXT_PUBLIC_AUTH_BASE_URL) return process.env.NEXT_PUBLIC_AUTH_BASE_URL
  if (process.env.BETTER_AUTH_URL) return process.env.BETTER_AUTH_URL
  return "http://localhost:4000"
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const cookie = request.headers.get("cookie") ?? ""

  try {
    const res = await fetch(`${resolveApiBaseURL()}/orders/${id}`, {
      headers: { cookie },
      cache: "no-store",
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: "Order not found" }, { status: 404 })
  }
}
