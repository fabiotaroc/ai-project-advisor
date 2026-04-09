import { AuthForm } from "@/components/auth/auth-form";
import { redirectIfAuthenticated } from "@/lib/server/auth";

export default async function LoginPage() {
  await redirectIfAuthenticated();

  return <AuthForm mode="login" />;
}
