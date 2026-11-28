import { Suspense } from "react";
import { ClientTeam } from "@/features/client-portal/components/client-company";

export default function ClientTeamPage() {
  // Suspense: the page reads ?member=.
  return (
    <Suspense>
      <ClientTeam />
    </Suspense>
  );
}
