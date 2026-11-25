"use client";

import { ChevronRight, ChevronsLeft, ChevronsRight, Menu } from "lucide-react";
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

function SidebarNav({ portal, collapsed = false, onNavigate }: { portal: Portal; collapsed?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <div className="bg-sidebar text-sidebar-foreground border-sidebar-border flex h-full flex-col border-r">
      <div className={cn("px-5 py-5", collapsed && "px-3 py-3")}>
        <Logo collapsed={collapsed} />
      </div>
      <nav className="no-scrollbar flex-1 space-y-6 overflow-y-auto px-3 pb-4" aria-label="Main">
        {NAV[portal].map((group) => (
          <div key={group.label}>
            <p className={cn("text-sidebar-muted px-3 pb-2 text-[11px] font-semibold tracking-[0.14em] uppercase", collapsed && "hidden")}>{group.label}</p>
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
                        active
                          ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium shadow-sm"
                          : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      )}
                    >
                      <item.icon className="size-4 shrink-0" aria-hidden />
                      <span className={cn("truncate", collapsed && "hidden")}>{item.label}</span>
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
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const current = NAV[portal].flatMap((g) => g.items).find((i) => isActive(pathname, i.href));

  return (
    <div className={cn("min-h-screen lg:pl-64", collapsed && "lg:pl-16")}>
      <aside className={cn("fixed inset-y-0 left-0 hidden w-64 lg:block", collapsed && "w-16")}>
        <SidebarNav portal={portal} collapsed={collapsed} />
      </aside>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 border-none p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarNav portal={portal} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <header className="bg-background/90 sticky top-0 z-30 flex h-14 items-center gap-3 border-b px-4 backdrop-blur sm:px-6">
        <Button variant="ghost" size="icon" className="hidden lg:inline-flex" onClick={() => setCollapsed((c) => !c)} aria-label={collapsed ? "Open sidebar" : "Close sidebar"}>
          {collapsed ? <ChevronsRight className="size-5" aria-hidden /> : <ChevronsLeft className="size-5" aria-hidden />}
        </Button>
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
