import { Suspense } from "react";
import { ClientProgress } from "@/features/client-portal/components/client-progress";

export default function ClientProgressPage() {
  // Suspense: the page reads ?task= / ?period= (links from document requests open that job).
  return (
    <Suspense>
      <ClientProgress />
    </Suspense>
  );
}
