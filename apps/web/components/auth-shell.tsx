import type { ReactNode } from "react"

import { Badge } from "@workspace/ui/components/badge"

type AuthShellProps = {
  title: string
  subtitle: string
  children: ReactNode
}

export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <main className="min-h-svh bg-background">
      <section className="mx-auto grid min-h-svh max-w-7xl grid-cols-1 px-6 py-10 md:px-10 lg:grid-cols-2 lg:gap-8 lg:py-14">
        <aside className="hidden rounded-4xl border bg-card/30 p-10 lg:flex lg:flex-col lg:justify-between">
          <div className="space-y-6">
            <Badge variant="secondary" className="w-fit rounded-full px-4 py-1 text-xs">
              Secure Auth Experience
            </Badge>
            <div className="space-y-3">
              <h1 className="text-4xl font-semibold tracking-tight">E-Commerce Portal</h1>
              <p className="max-w-md text-sm text-muted-foreground">
                Sign in, reset passwords, and manage sessions with Better Auth, Prisma, and
                PostgreSQL in a clean shadcn-powered interface.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl border bg-background/70 p-4">
              <p className="text-xs uppercase text-muted-foreground">Security</p>
              <p className="text-sm font-medium">Session cookies + server-side route protection</p>
            </div>
            <div className="rounded-3xl border bg-background/70 p-4">
              <p className="text-xs uppercase text-muted-foreground">UX</p>
              <p className="text-sm font-medium">Toasts, password toggles, and clear error states</p>
            </div>
          </div>
        </aside>

        <div className="flex items-center justify-center lg:justify-end">
          <div className="w-full max-w-md space-y-2">
            <div className="px-1">
              <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            </div>
            {children}
          </div>
        </div>
      </section>
    </main>
  )
}
