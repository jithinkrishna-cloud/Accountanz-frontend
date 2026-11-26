import { ClientsHub, type ClientTab } from "@/features/clients/components/clients-hub";

// Kept here, not imported from the client component: values exported from a "use client" module are
// only references on the server, so they can't be read in a server component.
const TABS: readonly ClientTab[] = ["clients", "engagements"];
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ tab?: string | string[]; open?: string | string[] }> }) {
  const sp = await searchParams;
  const requested = first(sp.tab) as ClientTab | undefined;
  const tab: ClientTab = requested && TABS.includes(requested) ? requested : "clients";
  const open = Number(first(sp.open));
  return <ClientsHub tab={tab} openEngagementId={Number.isInteger(open) && open > 0 ? open : undefined} />;
}
