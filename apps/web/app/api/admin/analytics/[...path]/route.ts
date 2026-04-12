import { type NextRequest, NextResponse } from "next/server"

function resolveApiBaseURL() {
  if (process.env.NEXT_PUBLIC_AUTH_BASE_URL) return process.env.NEXT_PUBLIC_AUTH_BASE_URL
  if (process.env.BETTER_AUTH_URL) return process.env.BETTER_AUTH_URL
  return "http://localhost:4000"
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const apiBase = resolveApiBaseURL()
  const queryString = request.nextUrl.search
  const url = `${apiBase}/admin/analytics/${path.join("/")}${queryString}`

  try {
    const res = await fetch(url, { cache: "no-store" })
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 })
  }
}
