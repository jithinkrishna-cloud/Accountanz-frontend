import { CLIENT_TABS, ClientsHub, type ClientTab } from "@/features/clients/components/clients-hub";

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ tab?: string | string[]; open?: string | string[] }> }) {
  const sp = await searchParams;
  const tab = (CLIENT_TABS.some((t) => t.id === first(sp.tab)) ? first(sp.tab) : "clients") as ClientTab;
  const open = Number(first(sp.open));
  return <ClientsHub tab={tab} openEngagementId={Number.isInteger(open) && open > 0 ? open : undefined} />;
}
