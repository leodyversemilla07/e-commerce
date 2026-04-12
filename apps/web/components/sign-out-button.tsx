"use client"

import { useRouter } from "next/navigation"

import { authClient } from "@/lib/auth-client"
import { Button } from "@workspace/ui/components/button"

export function SignOutButton() {
  const router = useRouter()

  const handleSignOut = async () => {
    await authClient.signOut()
    router.push("/")
    router.refresh()
  }

  return (
    <Button variant="outline" className="w-full" onClick={handleSignOut}>
      Sign out
    </Button>
  )
}
