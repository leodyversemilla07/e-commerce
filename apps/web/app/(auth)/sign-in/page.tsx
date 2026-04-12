import { AuthShell } from "@/components/auth-shell"
import { SignInForm } from "@/components/sign-in-form"

export default function SignInPage() {
  return (
    <AuthShell title="Sign in" subtitle="Access your account securely.">
      <SignInForm />
    </AuthShell>
  )
}
