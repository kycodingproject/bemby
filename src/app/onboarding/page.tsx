import { redirect } from "next/navigation";
import { authEnabled, currentUser } from "@/lib/auth";
import { serviceRoleClient } from "@/lib/repo/supabase";
import { Onboarding } from "@/components/Onboarding";

export const dynamic = "force-dynamic";
export const metadata = { title: "Set up Bemby" };

export default async function OnboardingPage() {
  if (!authEnabled()) redirect("/");
  const user = await currentUser();
  if (!user) redirect("/login");
  const { data } = await serviceRoleClient().from("businesses").select("id").eq("owner_id", user.id).maybeSingle();
  if (data) redirect("/");
  return <Onboarding />;
}
