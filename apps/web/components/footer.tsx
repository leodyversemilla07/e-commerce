import Link from "next/link"
import { ShoppingCart } from "lucide-react"

const footerLinks = [
  {
    title: "Shop",
    links: [
      { label: "Products", href: "/products" },
      { label: "Cart", href: "/cart" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Sign in", href: "/sign-in" },
      { label: "Create account", href: "/sign-up" },
      { label: "Orders", href: "/account/orders" },
    ],
  },
]

export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="mx-auto max-w-7xl px-6 py-12 md:px-10">
        <div className="grid gap-8 sm:grid-cols-3">
          {/* Brand */}
          <div className="space-y-3">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <div className="flex aspect-square size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <ShoppingCart className="size-3.5" />
              </div>
              E-Commerce
            </Link>
            <p className="max-w-xs text-sm text-muted-foreground">
              Premium gear, fast checkout, and reliable delivery.
            </p>
          </div>

          {/* Links */}
          {footerLinks.map((group) => (
            <div key={group.title} className="space-y-3">
              <p className="text-sm font-medium">{group.title}</p>
              <ul className="space-y-2">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 border-t pt-6">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} E-Commerce. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
