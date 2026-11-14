"use client";

import { ArrowLeft, LayoutGrid, Menu, Plus, ShieldAlert } from "lucide-react";
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

function SpaceNav({ user, onNavigate }: { user: SessionUser; onNavigate?: () => void }) {
  const pathname = usePathname();
  const { data: spaces } = useSpaces({});
  const link = (href: string, active: boolean) =>
    cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors", active ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "hover:bg-sidebar-accent/60 hover:text-white");

  return (
    <div className="bg-sidebar text-sidebar-foreground flex h-full flex-col">
      <div className="px-5 py-5">
        <Logo inverted />
        <p className="text-sidebar-muted mt-2 text-[11px] font-semibold tracking-[0.14em] uppercase">Workspace</p>
      </div>
      <nav className="no-scrollbar flex-1 space-y-6 overflow-y-auto px-3 pb-4" aria-label="Workspace">
        <ul className="space-y-0.5">
          <li>
            <Link href={PORTAL_HOME[user.portal]} onClick={onNavigate} className={link("", false)}>
              <ArrowLeft className="size-4" aria-hidden /> Back to Accountanz
            </Link>
          </li>
          <li>
            <Link href="/projects" onClick={onNavigate} aria-current={pathname === "/projects" ? "page" : undefined} className={link("/projects", pathname === "/projects")}>
              <LayoutGrid className="size-4" aria-hidden /> All spaces
            </Link>
          </li>
        </ul>
        <div>
          <div className="flex items-center justify-between px-3 pb-2">
            <p className="text-sidebar-muted text-[11px] font-semibold tracking-[0.14em] uppercase">Spaces</p>
            <Link href="/projects/new" onClick={onNavigate} className="text-sidebar-muted hover:text-white" aria-label="Create space" title="Create space">
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
                    <span className="bg-sidebar-primary/20 text-sidebar-primary flex size-6 shrink-0 items-center justify-center rounded text-[10px] font-bold">{s.space_key.slice(0, 2)}</span>
                    <span className="truncate">{s.name}</span>
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
    <div className="min-h-screen lg:pl-64">
      <aside className="fixed inset-y-0 left-0 hidden w-64 lg:block">
        <SpaceNav user={user} />
      </aside>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 border-none p-0">
          <SheetTitle className="sr-only">Workspace navigation</SheetTitle>
          <SpaceNav user={user} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
      <header className="bg-background/90 sticky top-0 z-30 flex h-14 items-center gap-3 border-b px-4 backdrop-blur sm:px-6">
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
