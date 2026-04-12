import { Suspense } from "react"

import { AuthShell } from "@/components/auth-shell"
import { ResetPasswordForm } from "@/components/reset-password-form"

export default function ResetPasswordPage() {
  return (
    <AuthShell title="Reset password" subtitle="Choose a new secure password.">
      <Suspense
        fallback={<p className="text-sm text-muted-foreground">Loading reset form...</p>}
      >
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  )
}
