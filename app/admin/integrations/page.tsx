import { notFound } from "next/navigation";
import { JOURNL_INTEGRATION } from "@/lib/features";
import { IntegrationList } from "@/features/integrations/components/integration-list";

export default function IntegrationsPage() {
  if (!JOURNL_INTEGRATION) notFound();
  return <IntegrationList />;
}
