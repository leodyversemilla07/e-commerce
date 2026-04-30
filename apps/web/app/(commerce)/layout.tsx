import { PublicHeader } from "@/components/public-header"

export default function CommerceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8 md:px-10">{children}</main>
    </div>
  )
}
