"use client";

import {
  BookOpen,
  Boxes,
  ChartColumn,
  Landmark,
  Percent,
  Receipt,
  ShoppingCart,
  Truck,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useJournlWorkspace } from "../hooks/use-journl-workspace";
import { JOURNL_MODULE_META } from "../types/journl-workspace.types";

const ICONS: Record<string, LucideIcon> = {
  sales: Receipt,
  purchases: ShoppingCart,
  expenses: Wallet,
  accounting: BookOpen,
  customers: Users,
  vendors: Truck,
  banking: Landmark,
  inventory: Boxes,
  gst: Percent,
  financial_reports: ChartColumn,
};

/** Modules the signed-in accountant may read on at least one client (from their admin-granted JournL modules). */
export function useGrantedModules() {
  const ws = useJournlWorkspace();
  const granted = new Set(ws.data?.clients.flatMap((c) => c.modules) ?? []);
  return {
    ...ws,
    modules: Object.keys(JOURNL_MODULE_META).filter((k) => granted.has(k)),
  };
}

/** The JournL area's own navigation: only the modules an admin has granted. A column on desktop, a scrolling row on mobile. */
export function JournlSubnav() {
  const pathname = usePathname();
  const { modules, isLoading } = useGrantedModules();
  return (
    <nav
      aria-label="JournL modules"
      className="lg:bg-card lg:sticky lg:top-20 lg:rounded-xl lg:border lg:p-2 lg:shadow-xs"
    >
      <p className="text-muted-foreground hidden px-3 pt-1 pb-2 text-[11px] font-semibold tracking-[0.14em] uppercase lg:block">
        JournL modules
      </p>
      {isLoading ? (
        <div className="grid gap-1.5 p-1">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      ) : modules.length === 0 ? (
        <p className="text-muted-foreground px-3 py-2 text-xs">
          No JournL modules granted yet. An admin grants them under Assignments
          → JournL modules.
        </p>
      ) : (
        <ul className="no-scrollbar flex gap-1 overflow-x-auto lg:flex-col lg:gap-0.5">
          {modules.map((key) => {
            const meta = JOURNL_MODULE_META[key]!;
            const href = `/team/journl/${key}`;
            const active = pathname === href;
            const Icon = ICONS[key] ?? BookOpen;
            return (
              <li key={key} className="shrink-0">
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm whitespace-nowrap transition-colors",
                    active
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  <Icon className="size-4 shrink-0" aria-hidden />
                  {meta.label}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </nav>
  );
}
