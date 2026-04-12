"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"

import { useCartQuery } from "@/hooks/use-cart"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

type CartLinkProps = {
  asButton?: boolean
  className?: string
}

export function CartLink({ asButton = false, className }: CartLinkProps) {
  const { data: cart, isLoading } = useCartQuery()
  const itemCount = cart?.itemCount ?? 0
  const countLabel = isLoading ? "…" : String(itemCount)
  const [isBouncing, setIsBouncing] = useState(false)
  const previousCountRef = useRef(itemCount)

  useEffect(() => {
    if (isLoading) return

    if (previousCountRef.current !== itemCount) {
      setIsBouncing(true)
      const timeout = window.setTimeout(() => setIsBouncing(false), 220)
      previousCountRef.current = itemCount

      return () => window.clearTimeout(timeout)
    }

    previousCountRef.current = itemCount
  }, [itemCount, isLoading])

  const shouldShowCount = isLoading || itemCount > 0

  const countPill = shouldShowCount ? (
    <span
      className={cn(
        "inline-flex min-w-5 items-center justify-center rounded-full border px-1.5 text-[11px] font-semibold leading-4 transition-transform duration-200",
        isBouncing && "scale-110",
        asButton ? "border-current/20" : "border-border bg-muted/60",
      )}
      aria-label={`${itemCount} item${itemCount === 1 ? "" : "s"} in cart`}
    >
      {countLabel}
    </span>
  ) : null

  if (asButton) {
    return (
      <Button asChild variant="outline" size="sm" className={className}>
        <Link href="/cart" className="inline-flex items-center gap-1.5">
          <span>Cart</span>
          {countPill}
        </Link>
      </Button>
    )
  }

  return (
    <Link
      href="/cart"
      className={cn(
        "inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground",
        className,
      )}
    >
      <span>Cart</span>
      {countPill}
    </Link>
  )
}
