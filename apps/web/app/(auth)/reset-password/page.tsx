import { Suspense } from "react"

import { AuthShell } from "@/components/auth-shell"
import { ResetPasswordForm } from "@/components/reset-password-form"
import { Skeleton } from "@workspace/ui/components/skeleton"

export default function ResetPasswordPage() {
  return (
    <AuthShell title="Reset password" subtitle="Choose a new secure password.">
      <Suspense fallback={<Skeleton className="h-52 w-full rounded-3xl" />}>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  )
}
