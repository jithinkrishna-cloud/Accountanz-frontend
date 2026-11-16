"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { NotificationSettings } from "@/features/notifications/components/notification-settings";
import { cn } from "@/lib/utils";
import { SettingsForm } from "./settings-form";

const TABS = [
  { key: "general", label: "General", description: "Accountanz's own billing identity and the GST rate used on service invoices." },
  { key: "notifications", label: "Notifications", description: "Email reminders sent automatically by the platform." },
] as const;
type TabKey = (typeof TABS)[number]["key"];

/** Admin → Settings: General (company and billing) and Notifications (email reminders). ?tab= picks the tab. */
export function AdminSettings() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const requested = params.get("tab");
  const tab: TabKey = TABS.some((t) => t.key === requested) ? (requested as TabKey) : "general";
  const current = TABS.find((t) => t.key === tab)!;
  // The tab lives in the URL, so a link (or the old /admin/notifications address) can open it directly.
  const select = (key: TabKey) => router.replace(key === "general" ? pathname : `${pathname}?tab=${key}`, { scroll: false });

  return (
    <>
      <PageHeader title="Settings" description={current.description} />
      <div role="tablist" aria-label="Settings" className="mb-6 flex gap-2 border-b">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={t.key === tab}
            onClick={() => select(t.key)}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              t.key === tab ? "border-primary text-primary" : "text-muted-foreground hover:text-foreground border-transparent",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" aria-label={current.label}>
        {tab === "general" ? <SettingsForm embedded /> : <NotificationSettings embedded />}
      </div>
    </>
  );
}
