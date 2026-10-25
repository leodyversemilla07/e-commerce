"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import { DashboardContent } from '@/components/dashboard-content'

export default function DashboardPage() {
  const router = useRouter()
  const { data: session, isPending } = authClient.useSession()

  useEffect(() => {
    if (!isPending && !session?.user) router.replace('/sign-in')
  }, [isPending, session, router])

  if (isPending || !session?.user) return <p className="p-6 text-sm">Loading dashboard...</p>
  return <DashboardContent userName={session.user.name ?? 'there'} />
}
