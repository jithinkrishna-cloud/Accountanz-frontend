import { redirect } from "next/navigation";

/** Leads now live under Clients. Kept so old links keep working. */
export default function OnboardingPage() {
  redirect("/admin/clients?tab=leads");
}
