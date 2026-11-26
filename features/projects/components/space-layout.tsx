"use client";

import { Archive, Settings, Users } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { createContext, Suspense, useCallback, useContext } from "react";
import { ErrorState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api-client";
import { applyApiError } from "@/lib/form-errors";
import { cn } from "@/lib/utils";
import { useMembers, useSpace, useSpaceLookup, useUnarchiveSpace } from "../hooks/use-projects";
import type { Member, SpaceDetail } from "../types/project.types";
import { ItemSheet } from "./item-sheet";

interface SpaceCtx {
  space: SpaceDetail;
  members: Member[];
  isAdmin: boolean;
  /** Opens an item in the side sheet (`?item=KEY-12`), keeping the current page. */
  openItem: (number: number) => void;
}

const Ctx = createContext<SpaceCtx | null>(null);
export const useSpaceCtx = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSpaceCtx must be used inside SpaceLayout");
  return v;
};

function Tabs({ space, isAdmin }: { space: SpaceDetail; isAdmin: boolean }) {
  const pathname = usePathname();
  const base = `/projects/${space.space_key}`;
  const tabs = [
    { href: `${base}/summary`, label: "Summary" },
    { href: `${base}/board`, label: "Board" },
    ...(space.template === "scrum" ? [{ href: `${base}/backlog`, label: "Backlog" }] : []),
    { href: `${base}/list`, label: "List" },
    ...(isAdmin ? [{ href: `${base}/settings`, label: "Settings", icon: true }] : []),
  ];
  return (
    <nav className="-mb-px flex gap-1 overflow-x-auto border-b" aria-label="Space views">
      {tabs.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={cn("flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm whitespace-nowrap transition-colors", active ? "border-primary text-primary font-medium" : "text-muted-foreground hover:text-foreground border-transparent")}
          >
            {"icon" in t && <Settings className="size-3.5" aria-hidden />}
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

const NO_ACCESS_COPY = "You don't have access to this client workspace. Contact an Ops Admin to request access.";

/** Shown when the space fails to load. A 404 may mean it exists but the viewer isn't in it: then show the name only. */
function SpaceError({ spaceKey, error, onRetry }: { spaceKey: string; error: unknown; onRetry: () => void }) {
  const notFound = error instanceof ApiError && error.status === 404;
  const lookup = useSpaceLookup(spaceKey, notFound);
  if (notFound && lookup.data && !lookup.data.accessible) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h1 className="text-xl font-semibold">{lookup.data.name}</h1>
        <p className="text-muted-foreground mt-2 text-sm">{NO_ACCESS_COPY}</p>
        <Button variant="outline" size="sm" className="mt-4" asChild>
          <Link href="/projects">Back to spaces</Link>
        </Button>
      </div>
    );
  }
  if (notFound && lookup.isLoading) return <Skeleton className="h-40 w-full" />;
  return <ErrorState error={error} onRetry={onRetry} />;
}

function ArchivedBanner({ spaceKey, canUnarchive }: { spaceKey: string; canUnarchive: boolean }) {
  const unarchive = useUnarchiveSpace(spaceKey);
  return (
    <div role="status" className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
      <Archive className="size-4 shrink-0" aria-hidden />
      <span>This space is archived. Unarchive it to make changes.</span>
      {canUnarchive && (
        <Button
          size="sm"
          variant="outline"
          className="ml-auto"
          disabled={unarchive.isPending}
          onClick={() => void unarchive.mutateAsync().then(() => toast.success("Space unarchived")).catch((e) => applyApiError(e))}
        >
          Unarchive
        </Button>
      )}
    </div>
  );
}

function Inner({ spaceKey, children }: { spaceKey: string; children: React.ReactNode }) {
  const space = useSpace(spaceKey);
  const members = useMembers(spaceKey);
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const itemParam = params.get("item");
  const itemNumber = itemParam ? Number(itemParam.split("-").pop()) || null : null;

  const setItem = useCallback(
    (n: number | null) => {
      const next = new URLSearchParams(params.toString());
      if (n == null) next.delete("item");
      else next.set("item", `${spaceKey}-${n}`);
      const qs = next.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [params, pathname, router, spaceKey],
  );

  if (space.error) return <SpaceError spaceKey={spaceKey} error={space.error} onRetry={() => void space.refetch()} />;
  if (!space.data) return <Skeleton className="h-40 w-full" />;

  const s = space.data;
  const value: SpaceCtx = { space: s, members: members.data ?? [], isAdmin: s.my_role === "admin", openItem: setItem };
  const base = `/projects/${s.space_key}`;

  return (
    <Ctx.Provider value={value}>
      <div className="mb-5">
        <nav aria-label="Breadcrumb" className="text-muted-foreground text-sm">
          <Link href="/projects" className="hover:underline">Spaces</Link> / <span className="font-mono">{s.space_key}</span>
        </nav>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{s.name}</h1>
          {s.client_name && <span className="bg-muted rounded px-2 py-0.5 text-xs font-medium">{s.client_name}</span>}
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`${base}/settings/access`}><Users className="size-4" /> People</Link>
            </Button>
          </div>
        </div>
        <div className="mt-3">
          <Tabs space={s} isAdmin={value.isAdmin} />
        </div>
      </div>
      {s.archived_at && <ArchivedBanner spaceKey={s.space_key} canUnarchive={value.isAdmin && s.kind !== "client_primary"} />}
      {children}
      <ItemSheet number={itemNumber} onClose={() => setItem(null)} />
    </Ctx.Provider>
  );
}

/** Loads the space once for every view under /projects/[key] and hosts the item side sheet. */
export function SpaceLayout({ spaceKey, children }: { spaceKey: string; children: React.ReactNode }) {
  return (
    <Suspense fallback={<Skeleton className="h-40 w-full" />}>
      <Inner spaceKey={spaceKey.toUpperCase()}>{children}</Inner>
    </Suspense>
  );
}
