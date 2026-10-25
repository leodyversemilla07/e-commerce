import { type NextRequest, NextResponse } from 'next/server'
import { adminApiBase, adminApiHeaders } from '@/lib/admin-api'
import { verifyAdminSession } from '@/lib/admin-session'

type Context = { params: Promise<{ path: string[] }> }

async function forward(request: NextRequest, { params }: Context) {
  if (!verifyAdminSession(request.cookies.get('admin_token')?.value)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // Do not allow this route to proxy arbitrary upstream paths.
  const { path } = await params
  if (!path.length || !['products', 'orders', 'analytics'].includes(path[0] ?? '') ||
      path.some((segment) => !/^[a-zA-Z0-9_-]+$/.test(segment))) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
  }
  if (!['GET', 'HEAD'].includes(request.method)) {
    const origin = request.headers.get('origin')
    if (origin !== request.nextUrl.origin) {
      return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
    }
  }
  try {
    const response = await fetch(`${adminApiBase()}/admin/${path.join('/')}${request.nextUrl.search}`, {
      method: request.method,
      headers: { ...adminApiHeaders(), 'content-type': 'application/json' },
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : await request.text(),
      cache: 'no-store',
    })
    return new NextResponse(await response.text(), {
      status: response.status,
      headers: { 'content-type': response.headers.get('content-type') ?? 'application/json' },
    })
  } catch {
    return NextResponse.json({ error: 'Admin API unavailable' }, { status: 502 })
  }
}

export const GET = forward
export const POST = forward
export const PATCH = forward
export const DELETE = forward
