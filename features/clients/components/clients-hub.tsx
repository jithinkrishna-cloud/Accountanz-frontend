"use client";

import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { EngagementList } from "@/features/engagements/components/engagement-list";
import { cn } from "@/lib/utils";
import { ClientList } from "./client-list";

export const CLIENT_TABS = [
  { id: "clients", label: "Clients", description: "Every business Accountanz manages, from first lead to exit." },
  { id: "engagements", label: "Engagements", description: "Service agreements from draft to active, with the signed agreement on file." },
] as const;
export type ClientTab = (typeof CLIENT_TABS)[number]["id"];

/** Admin → Clients: one place for clients and engagements (packages and services). */
export function ClientsHub({ tab, openEngagementId }: { tab: ClientTab; openEngagementId?: number }) {
  const current = CLIENT_TABS.find((t) => t.id === tab) ?? CLIENT_TABS[0];
  return (
    <>
      <PageHeader title="Clients" description={current.description} />
      <nav className="-mt-2 mb-5 flex gap-1 border-b" aria-label="Client views">
        {CLIENT_TABS.map((t) => (
          <Link
            key={t.id}
            href={t.id === "clients" ? "/admin/clients" : `/admin/clients?tab=${t.id}`}
            aria-current={t.id === current.id ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm whitespace-nowrap transition-colors",
              t.id === current.id ? "border-primary text-primary font-medium" : "text-muted-foreground hover:text-foreground border-transparent",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {current.id === "clients" && <ClientList embedded />}
      {current.id === "engagements" && <EngagementList embedded initialOpenId={openEngagementId} />}
    </>
  );
}
