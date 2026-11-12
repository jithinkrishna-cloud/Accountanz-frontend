"use client";

import { ChevronRight, LogOut, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useLogout } from "@/features/auth/hooks/use-session";
import { ROLE_LABELS } from "@/lib/constants";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Portal, SessionUser } from "@/types/auth";
import { Logo } from "./logo";
import { NAV, PORTAL_LABEL, type NavItem } from "./nav-config";

const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

function SidebarNav({ portal, user, onNavigate }: { portal: Portal; user: SessionUser; onNavigate?: () => void }) {
  const pathname = usePathname();
  const logout = useLogout();
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
      <div className="border-sidebar-accent flex items-center gap-3 border-t px-4 py-4">
        <Avatar className="size-9">
          <AvatarFallback className="bg-sidebar-accent text-xs text-white">{initials(user.fullName)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">{user.fullName}</p>
          <p className="text-sidebar-muted truncate text-xs">{ROLE_LABELS[user.role]}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-white"
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
          aria-label="Sign out"
        >
          <LogOut className="size-4" />
        </Button>
      </div>
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
        <SidebarNav portal={portal} user={user} />
      </aside>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 border-none p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarNav portal={portal} user={user} onNavigate={() => setMobileOpen(false)} />
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
        <div className="ml-auto flex items-center gap-3">
          <span className="bg-secondary hidden rounded-full px-3 py-1 text-xs font-medium sm:inline">{ROLE_LABELS[user.role]}</span>
          <Avatar className="size-8">
            <AvatarFallback className="bg-sidebar text-xs text-white">{initials(user.fullName)}</AvatarFallback>
          </Avatar>
        </div>
      </header>

      <main className="w-full px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</main>
    </div>
  );
}
