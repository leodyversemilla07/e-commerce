import { AuthShell } from "@/components/auth-shell"
import { SignUpForm } from "@/components/sign-up-form"

export default function SignUpPage() {
  return (
    <AuthShell title="Create account" subtitle="Set up your account to continue.">
      <SignUpForm />
    </AuthShell>
  )
}
