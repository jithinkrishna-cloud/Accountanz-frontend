"use client";

import { ArrowLeft, ChevronsLeft, ChevronsRight, LayoutGrid, Menu, Plus, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Logo } from "@/components/layouts/logo";
import { ProfileMenu } from "@/components/layouts/profile-menu";
import { ErrorState, FullPageLoader } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useSession } from "@/features/auth/hooks/use-session";
import { PORTAL_HOME } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/types/auth";
import { useSpaces } from "../hooks/use-projects";

function SpaceNav({ user, collapsed = false, onNavigate }: { user: SessionUser; collapsed?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const { data: spaces } = useSpaces({});
  const link = (href: string, active: boolean) =>
    cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors", active ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium shadow-sm" : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground");

  return (
    <div className="bg-sidebar text-sidebar-foreground border-sidebar-border flex h-full flex-col border-r">
      <div className={cn("px-5 py-5", collapsed && "px-3 py-3")}>
        <Logo collapsed={collapsed} />
        <p className={cn("text-sidebar-muted mt-2 text-[11px] font-semibold tracking-[0.14em] uppercase", collapsed && "hidden")}>Workspace</p>
      </div>
      <nav className="no-scrollbar flex-1 space-y-6 overflow-y-auto px-3 pb-4" aria-label="Workspace">
        <ul className="space-y-0.5">
          <li>
            <Link href={PORTAL_HOME[user.portal]} onClick={onNavigate} className={link("", false)}>
              <ArrowLeft className="size-4" aria-hidden />
              <span className={cn("truncate", collapsed && "hidden")}>Back to Accountanz</span>
            </Link>
          </li>
          <li>
            <Link href="/projects" onClick={onNavigate} aria-current={pathname === "/projects" ? "page" : undefined} className={link("/projects", pathname === "/projects")}>
              <LayoutGrid className="size-4" aria-hidden />
              <span className={cn("truncate", collapsed && "hidden")}>All spaces</span>
            </Link>
          </li>
        </ul>
        <div>
          <div className="flex items-center justify-between px-3 pb-2">
            <p className={cn("text-sidebar-muted text-[11px] font-semibold tracking-[0.14em] uppercase", collapsed && "hidden")}>Spaces</p>
            <Link href="/projects/new" onClick={onNavigate} className="text-sidebar-muted hover:text-sidebar-foreground" aria-label="Create space" title="Create space">
              <Plus className="size-4" />
            </Link>
          </div>
          <ul className="space-y-0.5">
            {spaces?.map((s) => {
              const href = `/projects/${s.space_key}`;
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <li key={s.id}>
                  <Link href={`${href}/board`} onClick={onNavigate} aria-current={active ? "page" : undefined} className={link(href, active)}>
                    <span className="bg-sidebar-accent text-sidebar-accent-foreground flex size-6 shrink-0 items-center justify-center rounded text-[10px] font-bold">{s.space_key.slice(0, 2)}</span>
                    <span className={cn("truncate", collapsed && "hidden")}>{s.name}</span>
                  </Link>
                </li>
              );
            })}
            {spaces?.length === 0 && <li className="text-sidebar-muted px-3 py-1 text-xs">No spaces yet</li>}
          </ul>
        </div>
      </nav>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const { data: user, isPending, error, refetch } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!isPending && user === null) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [isPending, user, router, pathname]);

  if (error) return <ErrorState error={error} onRetry={() => void refetch()} className="min-h-screen" />;
  if (isPending || !user) return <FullPageLoader />;
  if (user.portal === "app") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
        <ShieldAlert className="text-warning size-10" aria-hidden />
        <h1 className="text-xl font-semibold">The Workspace is for the Accountanz team</h1>
        <Button asChild className="mt-2">
          <Link href={PORTAL_HOME[user.portal]}>Go to my portal</Link>
        </Button>
      </main>
    );
  }

  return (
    <div className={cn("min-h-screen lg:pl-64", collapsed && "lg:pl-16")}>
      <aside className={cn("fixed inset-y-0 left-0 hidden w-64 lg:block", collapsed && "w-16")}>
        <SpaceNav user={user} collapsed={collapsed} />
      </aside>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 border-none p-0">
          <SheetTitle className="sr-only">Workspace navigation</SheetTitle>
          <SpaceNav user={user} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
      <header className="bg-background/90 sticky top-0 z-30 flex h-14 items-center gap-3 border-b px-4 backdrop-blur sm:px-6">
        <Button variant="ghost" size="icon" className="hidden lg:inline-flex" onClick={() => setCollapsed((c) => !c)} aria-label={collapsed ? "Open sidebar" : "Close sidebar"}>
          {collapsed ? <ChevronsRight className="size-5" aria-hidden /> : <ChevronsLeft className="size-5" aria-hidden />}
        </Button>
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
          <Menu className="size-5" />
        </Button>
        <span className="text-muted-foreground text-sm">Workspace</span>
        <div className="ml-auto">
          <ProfileMenu portal={user.portal} user={user} />
        </div>
      </header>
      <main className="w-full min-w-0 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}

/** Workspace layout: staff only (the API enforces it too), with its own space sidebar. */
export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<FullPageLoader />}>
      <Shell>{children}</Shell>
    </Suspense>
  );
}
