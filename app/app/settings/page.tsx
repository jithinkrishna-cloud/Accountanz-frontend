import { Suspense } from "react";
import { ClientSettings } from "@/features/client-portal/components/client-account";

export default function ClientSettingsPage() {
  // Suspense: the page reads ?tab= (e.g. ?tab=integrations).
  return (
    <Suspense>
      <ClientSettings />
    </Suspense>
  );
}
