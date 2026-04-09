import { AuthForm } from "@/components/auth/auth-form";
import { redirectIfAuthenticated } from "@/lib/server/auth";

export default async function SignupPage() {
  await redirectIfAuthenticated();

  return <AuthForm mode="signup" />;
}
