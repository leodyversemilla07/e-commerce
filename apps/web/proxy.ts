import { type NextRequest, NextResponse } from "next/server"

import { verifyAdminSession } from './lib/admin-session'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow the login page and API routes
  if (pathname === "/admin/login" || pathname.startsWith("/api/")) {
    return NextResponse.next()
  }

  // Protect all /admin/* routes
  if (pathname.startsWith("/admin")) {
    const token = request.cookies.get("admin_token")?.value

    if (!verifyAdminSession(token)) {
      const loginUrl = new URL("/admin/login", request.url)
      loginUrl.searchParams.set("redirect", pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*"],
}
