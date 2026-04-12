"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LayoutDashboard, LogIn, LogOut, Package, Receipt, ShoppingCart, User } from "lucide-react"

import { authClient } from "@/lib/auth-client"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@workspace/ui/components/sidebar"

const navItems = [
  { title: "Dashboard", href: "/account/dashboard", icon: LayoutDashboard },
  { title: "Profile", href: "/account/profile", icon: User },
  { title: "Orders", href: "/account/orders", icon: Receipt },
]

function StoreSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session, isPending } = authClient.useSession()

  const handleSignOut = async () => {
    await authClient.signOut()
    router.push("/")
    router.refresh()
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <ShoppingCart className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">E-Commerce</span>
                  <span className="text-xs text-muted-foreground">My Account</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>My Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))}
                    tooltip={item.title}
                  >
                    <Link href={item.href}>
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>

                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Store</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Cart" isActive={pathname === "/cart" || pathname.startsWith("/checkout")}>
                  <Link href="/cart">
                    <ShoppingCart className="size-4" />
                    <span>Cart</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Browse Products">
                  <Link href="/products">
                    <Package className="size-4" />
                    <span>Browse Products</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            {isPending ? (
              <SidebarMenuButton disabled>
                <span className="text-xs text-muted-foreground">Loading...</span>
              </SidebarMenuButton>
            ) : session?.user ? (
              <>
                <SidebarMenuButton asChild tooltip="Profile">
                  <Link href="/account/profile">
                    <User className="size-4" />
                    <span>Profile</span>
                  </Link>
                </SidebarMenuButton>
                <SidebarMenuButton onClick={() => void handleSignOut()} tooltip="Sign out">
                  <LogOut className="size-4" />
                  <span>Sign out</span>
                </SidebarMenuButton>
              </>
            ) : (
              <>
                <SidebarMenuButton asChild tooltip="Sign in">
                  <Link href="/sign-in">
                    <LogIn className="size-4" />
                    <span>Sign in</span>
                  </Link>
                </SidebarMenuButton>
                <SidebarMenuButton asChild tooltip="Create account">
                  <Link href="/sign-up">
                    <User className="size-4" />
                    <span>Create account</span>
                  </Link>
                </SidebarMenuButton>
              </>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}

export { StoreSidebar }
