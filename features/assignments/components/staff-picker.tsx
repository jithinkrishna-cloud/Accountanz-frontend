"use client";

import { Check, Search } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { ROLE_LABELS } from "@/lib/constants";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PortalRole } from "@/types/auth";
import type { AssignmentOptions } from "../types/assignment.types";

type Staff = AssignmentOptions["staff"][number];

/**
 * Search-as-you-type accountant picker: matches name, email, role or expertise, and shows each person's role,
 * skills and how many clients they're on today, so the right person is quick to find and spot.
 */
export function StaffPicker({ staff, value, onChange, invalid, id }: { staff: Staff[]; value: string; onChange: (v: string) => void; invalid?: boolean; id?: string }) {
  const [q, setQ] = useState("");
  const term = q.trim().toLowerCase();
  const role = (s: Staff) => ROLE_LABELS[s.portal_role as PortalRole] ?? s.portal_role;
  const shown = staff.filter(
    (s) => !term || [s.full_name, s.email, role(s), ...s.expertise].some((x) => x.toLowerCase().includes(term)),
  );
  const selected = staff.find((s) => String(s.user_id) === value);

  return (
    <div className={cn("rounded-lg border", invalid && "border-destructive")}>
      <div className="relative border-b">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" aria-hidden />
        <Input
          id={id}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={selected ? `Selected: ${selected.full_name}. Type to search…` : "Search by name, role or skill"}
          className="rounded-b-none border-0 pl-9 shadow-none focus-visible:ring-0"
          aria-label="Search accountants"
          aria-controls={`${id ?? "staff"}-list`}
        />
      </div>
      <ul id={`${id ?? "staff"}-list`} role="listbox" aria-label="Accountants" className="max-h-56 overflow-y-auto p-1">
        {shown.length === 0 && <li className="text-muted-foreground px-3 py-4 text-center text-sm">No one matches &ldquo;{q}&rdquo;.</li>}
        {shown.map((s) => {
          const verified = s.verification_status === "verified";
          const active = String(s.user_id) === value;
          return (
            <li key={s.user_id}>
              <button
                type="button"
                role="option"
                aria-selected={active}
                disabled={!verified}
                onClick={() => onChange(String(s.user_id))}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                  active ? "bg-primary/10" : "hover:bg-muted",
                )}
              >
                <span className={cn("grid size-8 shrink-0 place-content-center rounded-full text-xs font-semibold", active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                  {initials(s.full_name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{s.full_name}</span>
                  <span className="text-muted-foreground block truncate text-xs">
                    {role(s)}
                    {s.expertise.length > 0 && ` · ${s.expertise.slice(0, 3).join(", ")}`}
                  </span>
                </span>
                <span className="text-muted-foreground shrink-0 text-right text-[11px]">
                  {verified ? `${s.active_clients} client${s.active_clients === 1 ? "" : "s"}` : "Not verified"}
                </span>
                {active && <Check className="text-primary size-4 shrink-0" aria-hidden />}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
