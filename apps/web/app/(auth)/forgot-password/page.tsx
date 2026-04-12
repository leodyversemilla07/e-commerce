import { AuthShell } from "@/components/auth-shell"
import { ForgotPasswordForm } from "@/components/forgot-password-form"

export default function ForgotPasswordPage() {
  return (
    <AuthShell title="Forgot password" subtitle="We’ll send a reset link to your email.">
      <ForgotPasswordForm />
    </AuthShell>
  )
}
