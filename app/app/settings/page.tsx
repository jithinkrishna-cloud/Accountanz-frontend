import { Suspense } from "react";
import { ClientSettings } from "@/features/client-portal/components/client-account";

export default function ClientSettingsPage() {
  // Suspense: the page reads ?tab= / ?user= / ?role= (from "Manage JournL access" on the team page).
  return (
    <Suspense>
      <ClientSettings />
    </Suspense>
  );
}
