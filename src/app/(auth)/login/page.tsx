import { AuthForm } from "@/components/AuthForm";
import { signIn } from "../actions";

export const metadata = { title: "Sign in · Bemby" };

export default function LoginPage() {
  return <AuthForm mode="login" action={signIn} />;
}
