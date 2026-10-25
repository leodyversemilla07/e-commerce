import { type NextRequest, NextResponse } from 'next/server'
import { adminServerFetch } from '@/lib/admin-api'
import { verifyAdminSession } from '@/lib/admin-session'

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  if (!verifyAdminSession(request.cookies.get('admin_token')?.value)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { path } = await params
  if (path.some((part) => !/^[a-zA-Z0-9_-]+$/.test(part))) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
  }
  try {
    const res = await adminServerFetch(`analytics/${path.join('/')}${request.nextUrl.search}`)
    return new NextResponse(await res.text(), { status: res.status, headers: { 'content-type': 'application/json' } })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 502 })
  }
}
