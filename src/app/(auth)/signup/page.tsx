import { AuthForm } from "@/components/AuthForm";
import { signUp } from "../actions";

export const metadata = { title: "Create your account · Bemby" };

export default function SignupPage() {
  return <AuthForm mode="signup" action={signUp} />;
}
