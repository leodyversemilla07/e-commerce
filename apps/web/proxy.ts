import { type NextRequest, NextResponse } from "next/server"

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123"

function verifyAdminToken(token: string | undefined): boolean {
  if (!token) return false
  // Simple: token is the password itself (base64 encoded for basic obfuscation)
  try {
    return Buffer.from(token, "base64").toString() === ADMIN_PASSWORD
  } catch {
    return false
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow the login page and API routes
  if (pathname === "/admin/login" || pathname.startsWith("/api/")) {
    return NextResponse.next()
  }

  // Protect all /admin/* routes
  if (pathname.startsWith("/admin")) {
    const token = request.cookies.get("admin_token")?.value

    if (!verifyAdminToken(token)) {
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
