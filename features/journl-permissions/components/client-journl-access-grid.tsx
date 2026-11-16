"use client";

import { Lock, Minus, Plus } from "lucide-react";
import { Fragment, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ErrorState } from "@/components/shared/states";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { applyApiError } from "@/lib/form-errors";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useClientAccessActivity, useClientJournlCatalog, useClientJournlTeam, useClientSetTeamModule } from "../hooks/use-journl-permissions";
import type { Catalog, CatalogModule, ClientAccessActivity, ClientAssignmentPermission, ClientModulePermission } from "../types/journl-permission.types";

const ROLE_LABEL: Record<string, string> = { cfo: "CFO", finance_manager: "Finance manager", bookkeeper: "Bookkeeper", reviewer: "Reviewer" };

/** Why a feature both sides allow still isn't readable, in the owner's words. */
const WAITING: Record<string, string> = {
  "The client has no active engagement": "Starts with your service",
  "JournL access is off for this assignment": "JournL is off for this person",
  "The assignment isn't active today": "Not assigned to you today",
  "Not yet verified against JournL's API": "Being verified with JournL",
};

interface Feature {
  module: CatalogModule;
  /** Usable action keys (today just "view"). */
  actions: string[];
}
interface Area {
  key: string;
  label: string;
  features: Feature[];
}

/** Features grouped by area, and the action columns (one per distinct action, e.g. View; Edit appears once JournL allows writing). */
function shapeOf(catalog: Catalog) {
  const usable = (verified: boolean) => catalog.allow_unverified || verified;
  const areas = new Map<string, Area>();
  const columns = new Map<string, string>();
  const restricted: CatalogModule[] = [];
  for (const m of catalog.modules) {
    if (m.default_policy === "restricted") {
      restricted.push(m);
      continue;
    }
    const actions = usable(m.verified) ? m.actions.filter((a) => usable(a.verified)) : [];
    if (!actions.length) continue;
    for (const a of actions) if (!columns.has(a.action_key)) columns.set(a.action_key, a.action_key === "view" ? "View" : a.label);
    if (!areas.has(m.group_key)) areas.set(m.group_key, { key: m.group_key, label: m.group_label, features: [] });
    areas.get(m.group_key)!.features.push({ module: m, actions: actions.map((a) => a.action_key) });
  }
  return { areas: [...areas.values()], columns: [...columns.entries()].map(([key, label]) => ({ key, label })), restricted };
}

/** cellKey = "<feature>:<action>"; a draft maps changed cells to their new value. */
type Draft = Record<string, boolean>;
const cellKey = (feature: string, action: string) => `${feature}:${action}`;

const timeAgo = (at: number) => {
  const s = Math.round((at - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat("en-IN", { numeric: "auto" });
  for (const [unit, secs] of [["day", 86400], ["hour", 3600], ["minute", 60]] as const) if (Math.abs(s) >= secs) return rtf.format(Math.round(s / secs), unit);
  return "just now";
};

/** The two keys a feature needs: Accountanz's and yours. Filled = that side allows it. */
function Keys({ accountanz, yours, pending }: { accountanz: boolean; yours: boolean; pending: boolean }) {
  const key = (on: boolean, label: string, tone: string) => (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-full border px-2 text-[11px] leading-none",
        on ? tone : "text-muted-foreground border-dashed bg-transparent",
      )}
    >
      <span className="sr-only">{on ? "Allowed by " : "Not allowed by "}</span>
      {label}
    </span>
  );
  return (
    <span className="inline-flex gap-1">
      {key(accountanz, "Accountanz", "border-slate-300 bg-slate-100 text-slate-700")}
      {key(yours, "You", cn("border-primary/40 bg-primary/10 text-primary", pending && "ring-primary/40 ring-2"))}
    </span>
  );
}

function statusOf(access: ClientModulePermission | undefined, accountanz: boolean, yours: boolean, pending: boolean): { text: string; tone: string } {
  if (pending) return { text: yours ? "Allowed once applied" : "Removed once applied", tone: "text-primary" };
  if (!yours && !accountanz) return { text: "No access", tone: "text-muted-foreground" };
  if (!yours) return { text: "Allow it to give access", tone: "text-muted-foreground" };
  if (!accountanz) return { text: "Waiting for Accountanz", tone: "text-amber-700" };
  if (access?.effective) return { text: "In effect", tone: "text-emerald-700" };
  return { text: (access?.reason && WAITING[access.reason]) ?? "Not in effect yet", tone: "text-amber-700" };
}

function Activity({ assignmentId }: { assignmentId: number }) {
  const q = useClientAccessActivity(assignmentId);
  return (
    <section aria-labelledby="access-activity" className="bg-card rounded-xl border">
      <h3 id="access-activity" className="border-b px-4 py-3 text-sm font-medium">Recent changes</h3>
      {q.isLoading ? (
        <div className="space-y-2 p-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
      ) : !q.data?.length ? (
        <p className="text-muted-foreground px-4 py-3 text-sm">No changes yet.</p>
      ) : (
        <ol className="max-h-80 divide-y overflow-y-auto">
          {q.data.map((e: ClientAccessActivity) => (
            <li key={e.id} className="flex items-start gap-2.5 px-4 py-2.5 text-sm">
              {e.change === "allowed" ? <Plus className="mt-0.5 size-3.5 shrink-0 text-emerald-600" aria-hidden /> : <Minus className="text-muted-foreground mt-0.5 size-3.5 shrink-0" aria-hidden />}
              <div className="min-w-0 flex-1">
                <p>
                  <span className="font-medium">{e.actor}</span> {e.change} {e.feature}
                  {e.side === "accountanz" && <span className="text-muted-foreground"> for Accountanz&apos;s side</span>}
                </p>
                <p className="text-muted-foreground text-xs">
                  <time dateTime={new Date(e.at).toISOString()} title={new Date(e.at).toLocaleString("en-IN")}>{timeAgo(e.at)}</time>
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

interface GridProps {
  isOwner: boolean;
  /** Person to open first (from "Manage JournL access" on the team page). */
  focus?: { userId: number; teamRole: string } | null;
}

/**
 * Owner: what one accountant may read in the company's JournL, feature by feature. Edits collect into a change
 * preview and are applied together. Each row shows both keys access needs (Accountanz's and yours) and the result.
 */
export function ClientJournlAccessGrid({ isOwner, focus }: GridProps) {
  const catalog = useClientJournlCatalog();
  const team = useClientJournlTeam();
  const set = useClientSetTeamModule();
  const [picked, setPicked] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<Record<number, Draft>>({});
  const [applying, setApplying] = useState(false);

  const focusId = focus ? team.data?.find((p) => p.user_id === focus.userId && p.team_role === focus.teamRole)?.assignment_id : undefined;
  const selectedId = picked ?? focusId ?? team.data?.[0]?.assignment_id ?? null;
  const shape = useMemo(() => (catalog.data ? shapeOf(catalog.data) : null), [catalog.data]);

  const anyDraft = Object.values(drafts).some((d) => Object.keys(d).length > 0);
  useEffect(() => {
    if (!anyDraft) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [anyDraft]);

  if (catalog.error || team.error) return <ErrorState error={catalog.error ?? team.error} onRetry={() => { void catalog.refetch(); void team.refetch(); }} />;
  if (!shape || !team.data) return <div className="space-y-2 p-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>;
  const people = team.data;
  if (people.length === 0) return <p className="text-muted-foreground p-5 text-sm">No one from Accountanz is assigned to your company yet.</p>;

  const person = people.find((p) => p.assignment_id === selectedId) ?? people[0]!;
  const draft = drafts[person.assignment_id] ?? {};
  const { areas, columns, restricted } = shape;
  const allFeatures = areas.flatMap((a) => a.features);

  const accessOf = (p: ClientAssignmentPermission, f: Feature) => p.modules.find((x) => x.module_key === f.module.module_key);
  const savedOn = (p: ClientAssignmentPermission, f: Feature, action: string) => !!accessOf(p, f)?.client_actions.includes(action);
  const valueOf = (f: Feature, action: string) => draft[cellKey(f.module.module_key, action)] ?? savedOn(person, f, action);
  const countAllowed = (p: ClientAssignmentPermission) => allFeatures.filter((f) => f.actions.every((a) => (drafts[p.assignment_id]?.[cellKey(f.module.module_key, a)]) ?? savedOn(p, f, a))).length;

  /** Sets cells in the current person's draft; a cell set back to its saved value drops out of the draft. */
  function change(cells: { f: Feature; action: string }[], on: boolean) {
    setDrafts((all) => {
      const next = { ...(all[person.assignment_id] ?? {}) };
      for (const { f, action } of cells) {
        if (!f.actions.includes(action)) continue;
        const k = cellKey(f.module.module_key, action);
        if (savedOn(person, f, action) === on) delete next[k];
        else next[k] = on;
      }
      return { ...all, [person.assignment_id]: next };
    });
  }
  const triState = (cells: { f: Feature; action: string }[]): boolean | "indeterminate" => {
    const usable = cells.filter(({ f, action }) => f.actions.includes(action));
    const on = usable.filter(({ f, action }) => valueOf(f, action)).length;
    return on === 0 ? false : on === usable.length ? true : "indeterminate";
  };

  const changes = Object.entries(draft).map(([k, on]) => {
    const [featureKey, action] = k.split(":") as [string, string];
    const f = allFeatures.find((x) => x.module.module_key === featureKey)!;
    return { f, action, on };
  });

  async function apply() {
    setApplying(true);
    let done = 0;
    try {
      // The API takes a feature's full action list, so send one request per changed feature.
      for (const featureKey of new Set(changes.map((c) => c.f.module.module_key))) {
        const f = allFeatures.find((x) => x.module.module_key === featureKey)!;
        const actions = f.actions.filter((a) => valueOf(f, a));
        await set.mutateAsync({ assignmentId: person.assignment_id, moduleKey: featureKey, actions });
        done++;
      }
      setDrafts((all) => ({ ...all, [person.assignment_id]: {} }));
      toast.success(`${changes.length} ${changes.length === 1 ? "change" : "changes"} applied for ${person.full_name}`);
    } catch (err) {
      applyApiError(err);
      if (done) toast.message(`${done} of ${changes.length} changes were applied before the error.`);
    } finally {
      setApplying(false);
    }
  }

  const discard = () => setDrafts((all) => ({ ...all, [person.assignment_id]: {} }));
  const actionCells = (features: Feature[], action: string) => features.map((f) => ({ f, action }));

  const preview = isOwner && (
    <section aria-labelledby="access-preview" className="bg-card rounded-xl border">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <h3 id="access-preview" className="text-sm font-medium">Change preview</h3>
        {changes.length > 0 && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] text-amber-800 ring-1 ring-amber-200">Not applied</span>}
      </div>
      {changes.length === 0 ? (
        <p className="text-muted-foreground px-4 py-3 text-sm">Tick or untick features. Your changes collect here until you apply them.</p>
      ) : (
        <div className="space-y-3 px-4 py-3">
          <ul className="max-h-60 space-y-1.5 overflow-y-auto text-sm">
            {[...changes].sort((a, b) => Number(b.on) - Number(a.on)).map(({ f, action, on }) => (
              <li key={cellKey(f.module.module_key, action)} className="flex items-center gap-2">
                {on ? <Plus className="size-3.5 shrink-0 text-emerald-600" aria-label="Allow" /> : <Minus className="text-muted-foreground size-3.5 shrink-0" aria-label="Remove" />}
                <span className={cn(!on && "text-muted-foreground")}>
                  {f.module.label}
                  {columns.length > 1 && ` · ${columns.find((c) => c.key === action)?.label}`}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-muted-foreground text-xs">Applies to {person.full_name} only. Everything else stays as it is.</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" disabled={applying} onClick={discard}>Discard</Button>
            <SubmitButton size="sm" className="flex-1" pending={applying} onClick={() => void apply()}>
              Apply {changes.length} {changes.length === 1 ? "change" : "changes"}
            </SubmitButton>
          </div>
        </div>
      )}
    </section>
  );

  return (
    <div className="space-y-4 p-5">
      {/* Whose access is being edited */}
      <div role="tablist" aria-label="Accountant" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {people.map((p) => {
          const active = p.assignment_id === person.assignment_id;
          const pendingCount = Object.keys(drafts[p.assignment_id] ?? {}).length;
          return (
            <button
              key={p.assignment_id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setPicked(p.assignment_id)}
              className={cn(
                "focus-visible:ring-ring/50 flex shrink-0 items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors outline-none focus-visible:ring-[3px]",
                active ? "border-primary bg-primary/5" : "hover:bg-muted/50",
              )}
            >
              <span className={cn("grid size-8 place-content-center rounded-full text-xs font-semibold", active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                {initials(p.full_name)}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium">{p.full_name}</span>
                <span className="text-muted-foreground block text-xs">
                  {ROLE_LABEL[p.team_role] ?? p.team_role} · {countAllowed(p)} of {allFeatures.length}
                </span>
              </span>
              {pendingCount > 0 && (
                <span className="rounded-full bg-amber-100 px-1.5 text-[11px] font-medium text-amber-900" title={`${pendingCount} changes not applied`}>
                  {pendingCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {!isOwner && <p className="text-muted-foreground text-xs">Only the company owner can change who can see what.</p>}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0 space-y-2">
          <div className="max-h-[70vh] overflow-auto rounded-xl border" role="tabpanel" aria-label={`JournL access for ${person.full_name}`}>
            <table className="w-full border-separate border-spacing-0 text-sm">
              <thead className="bg-muted sticky top-0 z-10">
                <tr>
                  <th scope="col" className="border-b px-4 py-2.5 text-left text-xs font-medium">JournL feature</th>
                  {columns.map((c) => (
                    <th key={c.key} scope="col" className="w-20 border-b px-2 py-2.5 text-xs font-medium">
                      <span className="flex items-center justify-center gap-2">
                        <Checkbox
                          aria-label={`${c.label}: every feature`}
                          checked={triState(actionCells(allFeatures, c.key))}
                          disabled={!isOwner || applying}
                          onCheckedChange={(v) => change(actionCells(allFeatures, c.key), v === true)}
                        />
                        {c.label}
                      </span>
                    </th>
                  ))}
                  <th scope="col" className="hidden border-b px-4 py-2.5 text-left text-xs font-medium sm:table-cell">Access</th>
                </tr>
              </thead>
              <tbody>
                {areas.map((area) => (
                  <Fragment key={area.key}>
                    <tr className="bg-muted/40">
                      <th scope="rowgroup" className="border-b px-4 py-2 text-left text-xs font-semibold">
                        {area.label}
                        <span className="text-muted-foreground ml-2 font-normal tabular-nums">
                          {area.features.filter((f) => f.actions.every((a) => valueOf(f, a))).length}/{area.features.length}
                        </span>
                      </th>
                      {columns.map((c) => (
                        <td key={c.key} className="border-b px-2 py-2 text-center">
                          <Checkbox
                            aria-label={`${c.label}: all of ${area.label}`}
                            checked={triState(actionCells(area.features, c.key))}
                            disabled={!isOwner || applying}
                            onCheckedChange={(v) => change(actionCells(area.features, c.key), v === true)}
                          />
                        </td>
                      ))}
                      <td className="hidden border-b sm:table-cell" />
                    </tr>
                    {area.features.map((f) => {
                      const access = accessOf(person, f);
                      const yours = f.actions.every((a) => valueOf(f, a));
                      const accountanz = f.actions.every((a) => access?.accountanz_actions.includes(a));
                      const pending = f.actions.some((a) => cellKey(f.module.module_key, a) in draft);
                      const status = statusOf(access, accountanz, yours, pending);
                      return (
                        <tr key={f.module.module_key} className={cn(pending && "bg-primary/5")}>
                          <th scope="row" className="border-b py-2 pr-3 pl-6 text-left font-normal">
                            <span className="block">{f.module.label}</span>
                            {/* Phones: the access column is hidden, so show the result under the name */}
                            <span className={cn("block text-xs sm:hidden", status.tone)}>{status.text}</span>
                          </th>
                          {columns.map((c) => (
                            <td key={c.key} className="border-b px-2 py-2 text-center">
                              {f.actions.includes(c.key) && (
                                <Checkbox
                                  aria-label={`${c.label} ${f.module.label}`}
                                  checked={valueOf(f, c.key)}
                                  disabled={!isOwner || applying}
                                  onCheckedChange={(v) => change([{ f, action: c.key }], v === true)}
                                />
                              )}
                            </td>
                          ))}
                          <td className="hidden border-b px-4 py-2 sm:table-cell">
                            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                              <Keys accountanz={accountanz} yours={yours} pending={pending} />
                              <span className={cn("text-xs", status.tone)}>{status.text}</span>
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <span>A feature works when both Accountanz and you allow it. All access is view-only for now.</span>
            {restricted.length > 0 && (
              <span className="inline-flex items-center gap-1">
                <Lock className="size-3" aria-hidden /> {restricted.map((m) => m.label).join(", ")} can&apos;t be shared.
              </span>
            )}
          </p>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          {preview}
          <Activity assignmentId={person.assignment_id} />
        </aside>
      </div>

      {/* Phones: keep Apply in reach while scrolling the list */}
      {isOwner && changes.length > 0 && (
        <div className="bg-card fixed inset-x-0 bottom-0 z-30 flex items-center gap-2 border-t px-4 py-3 shadow-lg lg:hidden">
          <span className="min-w-0 flex-1 text-sm">
            {changes.length} {changes.length === 1 ? "change" : "changes"} for {person.full_name.split(" ")[0]}
          </span>
          <Button variant="outline" size="sm" disabled={applying} onClick={discard}>Discard</Button>
          <SubmitButton size="sm" pending={applying} onClick={() => void apply()}>Apply</SubmitButton>
        </div>
      )}
    </div>
  );
}
