"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { Menu, X } from "lucide-react"

import { AuthStatus } from "@/components/auth-status"
import { CartLink } from "@/components/cart-link"
import { Button } from "@workspace/ui/components/button"

type NavLink = {
  label: string
  href: string
}

type MobileNavProps = {
  logo?: { label: string; href: string }
  links?: NavLink[]
  /** Extra content rendered on the right side of the bar (desktop only if links are present). */
  rightSlot?: React.ReactNode
  /** Back-link target (e.g. "/products"). Shows "← Label" on the left. */
  backLink?: { label: string; href: string }
  /** Max width wrapper class. */
  className?: string
}

export function MobileNav({ logo, links = [], rightSlot, backLink, className }: MobileNavProps) {
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  // Close on route change / escape.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  // Close when clicking outside the panel.
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  const hasLinks = links.length > 0

  return (
    <nav className={className ?? ""}>
      {/* Top bar */}
      <div className="flex items-center justify-between gap-2">
        {/* Left section */}
        <div className="flex items-center gap-2">
          {backLink ? (
            <Link href={backLink.href} className="font-semibold tracking-tight">
              ← {backLink.label}
            </Link>
          ) : logo ? (
            <Link href={logo.href} className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-primary" />
              <span className="font-semibold tracking-tight">{logo.label}</span>
            </Link>
          ) : null}
        </div>

        {/* Desktop center links */}
        {hasLinks ? (
          <div className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="transition hover:text-foreground">
                {link.label}
              </Link>
            ))}
          </div>
        ) : null}

        {/* Right section */}
        <div className="flex items-center gap-2">
          {rightSlot}
          {hasLinks ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((prev) => !prev)}
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          ) : null}
        </div>
      </div>

      {/* Mobile dropdown panel */}
      {open && hasLinks ? (
        <div
          ref={panelRef}
          className="mt-2 space-y-1 rounded-xl border bg-card/80 p-3 backdrop-blur md:hidden"
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted/60 hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </div>
      ) : null}
    </nav>
  )
}
