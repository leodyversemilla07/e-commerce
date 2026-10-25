"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import { ProfileContent } from '@/components/profile-content'

export default function ProfilePage() {
  const router = useRouter()
  const { data: session, isPending } = authClient.useSession()

  useEffect(() => {
    if (!isPending && !session?.user) router.replace('/sign-in')
  }, [isPending, session, router])

  if (isPending || !session?.user) return <p className="p-6 text-sm">Loading profile...</p>
  const user = session.user
  return <ProfileContent
    userName={user.name ?? 'User'}
    email={user.email ?? ''}
    emailVerified={user.emailVerified ?? false}
    memberSince={user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    }) : 'N/A'}
  />
}
