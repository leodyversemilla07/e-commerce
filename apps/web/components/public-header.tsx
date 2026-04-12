"use client"

import Link from "next/link"
import { ShoppingCart } from "lucide-react"

import { AuthStatus } from "@/components/auth-status"
import { CartLink } from "@/components/cart-link"
import { Button } from "@workspace/ui/components/button"

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6 md:px-10">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <div className="flex aspect-square size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ShoppingCart className="size-3.5" />
            </div>
            <span>E-Commerce</span>
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            <Button asChild variant="ghost" size="sm">
              <Link href="/products">Products</Link>
            </Button>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <CartLink />
          <AuthStatus />
        </div>
      </div>
    </header>
  )
}
