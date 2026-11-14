"use client";

import { ChevronRight, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { Portal, SessionUser } from "@/types/auth";
import { Logo } from "./logo";
import { NAV, PORTAL_LABEL, type NavItem } from "./nav-config";
import { ProfileMenu } from "./profile-menu";

const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

function SidebarNav({ portal, onNavigate }: { portal: Portal; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <div className="bg-sidebar text-sidebar-foreground flex h-full flex-col">
      <div className="px-5 py-5">
        <Logo inverted />
      </div>
      <nav className="no-scrollbar flex-1 space-y-6 overflow-y-auto px-3 pb-4" aria-label="Main">
        {NAV[portal].map((group) => (
          <div key={group.label}>
            <p className="text-sidebar-muted px-3 pb-2 text-[11px] font-semibold tracking-[0.14em] uppercase">{group.label}</p>
            <ul className="space-y-0.5">
              {group.items.map((item: NavItem) => {
                const active = isActive(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                        active ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "hover:bg-sidebar-accent/60 hover:text-white",
                      )}
                    >
                      <item.icon className={cn("size-4 shrink-0", active && "text-sidebar-primary")} aria-hidden />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  );
}

export function PortalShell({ portal, user, children }: { portal: Portal; user: SessionUser; children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const current = NAV[portal].flatMap((g) => g.items).find((i) => isActive(pathname, i.href));

  return (
    <div className="min-h-screen lg:pl-64">
      <aside className="fixed inset-y-0 left-0 hidden w-64 lg:block">
        <SidebarNav portal={portal} />
      </aside>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 border-none p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarNav portal={portal} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <header className="bg-background/90 sticky top-0 z-30 flex h-14 items-center gap-3 border-b px-4 backdrop-blur sm:px-6">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
          <Menu className="size-5" />
        </Button>
        <nav aria-label="Breadcrumb" className="text-muted-foreground flex min-w-0 items-center gap-1.5 text-sm">
          <span className="hidden sm:inline">{PORTAL_LABEL[portal]}</span>
          {current && (
            <>
              <ChevronRight className="hidden size-4 sm:inline" aria-hidden />
              <span className="text-foreground truncate font-medium">{current.label}</span>
            </>
          )}
        </nav>
        <div className="ml-auto">
          <ProfileMenu portal={portal} user={user} />
        </div>
      </header>

      <main className="w-full min-w-0 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</main>
    </div>
  );
}
