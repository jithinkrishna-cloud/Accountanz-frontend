import { Suspense } from "react";
import { ClientMessages } from "@/features/client-portal/components/client-messages";

export default function ClientMessagesPage() {
  // Suspense: the page reads ?to= / ?subject= (from "Message Arun" links).
  return (
    <Suspense>
      <ClientMessages />
    </Suspense>
  );
}
