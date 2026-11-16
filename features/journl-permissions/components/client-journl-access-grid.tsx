"use client";

import { CircleCheck, Clock, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ErrorState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { applyApiError } from "@/lib/form-errors";
import { cn } from "@/lib/utils";
import { useClientJournlCatalog, useClientJournlTeam, useClientSetTeamModule } from "../hooks/use-journl-permissions";
import type { Catalog, CatalogModule, ClientAssignmentPermission, ClientModulePermission } from "../types/journl-permission.types";

const ROLE_LABEL: Record<string, string> = { cfo: "CFO", finance_manager: "Finance manager", bookkeeper: "Bookkeeper", reviewer: "Reviewer" };

/** Server reasons are written for staff; owners get what it means for them. */
const REASON_COPY: Record<string, string> = {
  "The client has no active engagement": "Your Accountanz service hasn't started yet. Access starts automatically once it does.",
  "JournL access is off for this assignment": "Accountanz hasn't switched on JournL for this person yet.",
  "The assignment isn't active today": "This person isn't assigned to you today.",
  "Not yet verified against JournL's API": "This module is still being verified with JournL.",
};
const NOT_ENABLED_BY_ACCOUNTANZ = "Accountanz hasn't enabled this module for this person yet.";

interface Column {
  module: CatalogModule;
  actionKey: string;
  /** Header text: the module, plus the action when a module has more than one. */
  label: string;
}

/** One column per grantable module action (today every module is view-only, so one column per module). */
function columnsFor(catalog: Catalog): { columns: Column[]; restricted: CatalogModule[] } {
  const usable = (verified: boolean) => catalog.allow_unverified || verified;
  const columns: Column[] = [];
  const restricted: CatalogModule[] = [];
  for (const m of catalog.modules) {
    if (m.default_policy === "restricted") {
      restricted.push(m);
      continue;
    }
    if (!usable(m.verified)) continue;
    const actions = m.actions.filter((a) => usable(a.verified));
    for (const a of actions) columns.push({ module: m, actionKey: a.action_key, label: actions.length > 1 ? `${m.label} · ${a.label}` : m.label });
  }
  return { columns, restricted };
}

/** The JournL features a module opens, by name. Unmapped ids are left out here: owners can't act on a bare number. */
const includes = (m: CatalogModule) =>
  m.features
    .filter((f) => f.known)
    .map((f) => f.name)
    .join(", ");

type CellState = "off" | "on" | "waiting";

function cellOf(person: ClientAssignmentPermission, col: Column): { checked: boolean; state: CellState; why: string | null; access?: ClientModulePermission } {
  const access = person.modules.find((x) => x.module_key === col.module.module_key);
  const checked = !!access?.client_actions.includes(col.actionKey);
  if (!checked) return { checked, state: "off", why: null, access };
  if (access?.effective) return { checked, state: "on", why: null, access };
  return { checked, state: "waiting", why: access?.reason ? (REASON_COPY[access.reason] ?? access.reason) : NOT_ENABLED_BY_ACCOUNTANZ, access };
}

function StateDot({ state, why }: { state: CellState; why: string | null }) {
  if (state === "off") return null;
  return (
    <span
      className={cn("inline-block size-1.5 rounded-full", state === "on" ? "bg-emerald-500" : "bg-amber-500")}
      title={state === "on" ? "In effect" : `Not in effect yet: ${why}`}
      aria-hidden
    />
  );
}

interface GridProps {
  isOwner: boolean;
  /** Person to scroll to and highlight (from "Manage JournL access" on the team page). */
  focus?: { userId: number; teamRole: string } | null;
}

/** Owner: which parts of the company's JournL books each accountant on the team may use, on one screen. */
export function ClientJournlAccessGrid({ isOwner, focus }: GridProps) {
  const catalog = useClientJournlCatalog();
  const team = useClientJournlTeam();
  const set = useClientSetTeamModule();
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [bulk, setBulk] = useState<number | null>(null);
  const [flashDone, setFlashDone] = useState(false);

  const focusAssignmentId = focus ? team.data?.find((p) => p.user_id === focus.userId && p.team_role === focus.teamRole)?.assignment_id : undefined;
  useEffect(() => {
    if (!focusAssignmentId || !team.data) return;
    document.querySelectorAll(`[data-assignment="${focusAssignmentId}"]`).forEach((el) => {
      if ((el as HTMLElement).offsetParent) el.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    const t = setTimeout(() => setFlashDone(true), 2500);
    return () => clearTimeout(t);
  }, [focusAssignmentId, team.data]);
  const highlight = flashDone ? null : (focusAssignmentId ?? null);

  if (catalog.error || team.error) return <ErrorState error={catalog.error ?? team.error} onRetry={() => { void catalog.refetch(); void team.refetch(); }} />;
  if (!catalog.data || !team.data) return <div className="space-y-2 p-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>;

  const { columns, restricted } = columnsFor(catalog.data);
  const people = team.data;
  if (people.length === 0) return <p className="text-muted-foreground p-5 text-sm">No one from Accountanz is assigned to your company yet.</p>;

  const keyOf = (p: ClientAssignmentPermission, c: Column) => `${p.assignment_id}:${c.module.module_key}:${c.actionKey}`;

  async function toggle(person: ClientAssignmentPermission, col: Column, on: boolean) {
    const access = person.modules.find((x) => x.module_key === col.module.module_key);
    const current = access?.client_actions ?? [];
    const next = on ? [...new Set([...current, col.actionKey])] : current.filter((x) => x !== col.actionKey);
    const k = keyOf(person, col);
    setPending((s) => new Set(s).add(k));
    try {
      await set.mutateAsync({ assignmentId: person.assignment_id, moduleKey: col.module.module_key, actions: next });
    } catch (err) {
      applyApiError(err);
    } finally {
      setPending((s) => {
        const n = new Set(s);
        n.delete(k);
        return n;
      });
    }
  }

  /** Allow or remove every column for one person, one module at a time (the API is per module). */
  async function setAll(person: ClientAssignmentPermission, on: boolean) {
    setBulk(person.assignment_id);
    let changed = 0;
    try {
      for (const m of new Set(columns.map((c) => c.module))) {
        const want = on ? columns.filter((c) => c.module === m).map((c) => c.actionKey) : [];
        const have = person.modules.find((x) => x.module_key === m.module_key)?.client_actions ?? [];
        if (want.length === have.length && want.every((a) => have.includes(a))) continue;
        await set.mutateAsync({ assignmentId: person.assignment_id, moduleKey: m.module_key, actions: want });
        changed++;
      }
      toast.success(changed ? `${on ? "Allowed every module" : "Removed all access"} for ${person.full_name}` : "Nothing to change");
    } catch (err) {
      applyApiError(err);
    } finally {
      setBulk(null);
    }
  }

  // One banner instead of a note on every cell: why ticked modules aren't in effect yet.
  const waiting = new Map<string, number>();
  let inEffect = 0;
  for (const p of people) {
    for (const c of columns) {
      const cell = cellOf(p, c);
      if (cell.state === "on") inEffect++;
      if (cell.state === "waiting" && cell.why) waiting.set(cell.why, (waiting.get(cell.why) ?? 0) + 1);
    }
  }

  const countFor = (p: ClientAssignmentPermission) => columns.filter((c) => cellOf(p, c).checked).length;

  const rowActions = (p: ClientAssignmentPermission) =>
    isOwner && (
      <div className="flex shrink-0 gap-1">
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" disabled={bulk !== null || countFor(p) === columns.length} onClick={() => void setAll(p, true)}>
          Allow all
        </Button>
        <Button variant="ghost" size="sm" className="text-muted-foreground h-7 px-2 text-xs" disabled={bulk !== null || countFor(p) === 0} onClick={() => void setAll(p, false)}>
          Remove all
        </Button>
      </div>
    );

  const box = (p: ClientAssignmentPermission, c: Column, idPrefix: string) => {
    const cell = cellOf(p, c);
    const k = keyOf(p, c);
    return (
      <Checkbox
        id={`${idPrefix}-${p.assignment_id}-${c.module.module_key}-${c.actionKey}`}
        aria-label={`${c.label} for ${p.full_name}`}
        checked={cell.checked}
        disabled={!isOwner || pending.has(k) || bulk === p.assignment_id}
        className={cn(pending.has(k) && "animate-pulse")}
        onCheckedChange={(v) => void toggle(p, c, v === true)}
      />
    );
  };

  return (
    <div className="space-y-4 p-5">
      {waiting.size > 0 ? (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
          <Clock className="mt-0.5 size-4 shrink-0" aria-hidden />
          <div>
            <p className="font-medium">Allowed, but not in effect yet</p>
            <ul className="mt-0.5 space-y-0.5 text-xs">
              {[...waiting.keys()].map((why) => <li key={why}>{why}</li>)}
            </ul>
          </div>
        </div>
      ) : inEffect > 0 ? (
        <p className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900">
          <CircleCheck className="size-4 shrink-0" aria-hidden /> Your team can use everything you&apos;ve allowed below.
        </p>
      ) : null}

      {!isOwner && <p className="text-muted-foreground text-xs">Only the company owner can change who can see what.</p>}

      {/* Desktop: one grid, people × modules */}
      <div className="hidden overflow-x-auto rounded-lg border md:block">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th scope="col" className="bg-muted/40 sticky left-0 z-10 min-w-48 px-3 py-2 text-left text-xs font-medium">Accountant</th>
              {columns.map((c) => (
                <th
                  key={`${c.module.module_key}:${c.actionKey}`}
                  scope="col"
                  title={includes(c.module) ? `Includes: ${includes(c.module)}` : undefined}
                  className="text-muted-foreground min-w-20 px-1.5 py-2 text-center text-[11px] leading-tight font-medium"
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {people.map((p) => (
              <tr
                key={p.assignment_id}
                data-assignment={p.assignment_id}
                className={cn("transition-colors", highlight === p.assignment_id && "bg-primary/5")}
              >
                <th scope="row" className={cn("bg-card sticky left-0 z-10 px-3 py-2.5 text-left font-normal transition-colors", highlight === p.assignment_id && "bg-primary/5")}>
                  <p className="font-medium">{p.full_name}</p>
                  <p className="text-muted-foreground text-xs">{ROLE_LABEL[p.team_role] ?? p.team_role} · {countFor(p)} of {columns.length}</p>
                  {isOwner && <div className="mt-1 -ml-2">{rowActions(p)}</div>}
                </th>
                {columns.map((c) => {
                  const cell = cellOf(p, c);
                  return (
                    <td key={`${c.module.module_key}:${c.actionKey}`} className="px-1.5 py-2.5 text-center">
                      <div className="flex flex-col items-center gap-1">
                        {box(p, c, "grid")}
                        <span className="flex h-1.5 items-center"><StateDot state={cell.state} why={cell.why} /></span>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Phones: a card per person */}
      <div className="space-y-3 md:hidden">
        {people.map((p) => (
          <section
            key={p.assignment_id}
            data-assignment={p.assignment_id}
            className={cn("rounded-lg border p-3 transition-colors", highlight === p.assignment_id && "border-primary bg-primary/5")}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium">{p.full_name}</p>
                <p className="text-muted-foreground text-xs">{ROLE_LABEL[p.team_role] ?? p.team_role} · {countFor(p)} of {columns.length} allowed</p>
              </div>
            </div>
            {isOwner && <div className="mt-1 -ml-2">{rowActions(p)}</div>}
            <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2">
              {columns.map((c) => {
                const cell = cellOf(p, c);
                const id = `card-${p.assignment_id}-${c.module.module_key}-${c.actionKey}`;
                return (
                  <li key={`${c.module.module_key}:${c.actionKey}`} className="flex items-start gap-2">
                    <span className="pt-0.5">{box(p, c, "card")}</span>
                    <label htmlFor={id} className="min-w-0 flex-1 text-sm leading-snug">{c.label}</label>
                    <span className="pt-1.5"><StateDot state={cell.state} why={cell.why} /></span>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      <section aria-labelledby="journl-includes" className="rounded-lg border p-4">
        <h3 id="journl-includes" className="text-sm font-medium">What each area includes in JournL</h3>
        <dl className="mt-3 grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {[...new Set(columns.map((c) => c.module)), ...restricted].map((m) => (
            <div key={m.module_key}>
              <dt className="flex items-center gap-1.5 text-sm">
                {m.label}
                {m.default_policy === "restricted" && <Lock className="text-muted-foreground size-3" aria-label="Can't be shared" />}
              </dt>
              <dd className="text-muted-foreground mt-0.5 text-xs leading-relaxed">{includes(m) || "—"}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <span className="inline-flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-emerald-500" aria-hidden /> In effect</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-amber-500" aria-hidden /> Allowed, not in effect yet</span>
        <span>All access is view-only for now.</span>
        {restricted.length > 0 && (
          <span className="inline-flex items-center gap-1"><Lock className="size-3" aria-hidden /> {restricted.map((m) => m.label).join(", ")} can&apos;t be shared.</span>
        )}
      </div>
    </div>
  );
}
