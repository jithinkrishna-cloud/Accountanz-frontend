"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { StaffPortal } from "@/types/auth";
import { useStaffClientOptions } from "../hooks/use-workspace";

/** Client select limited to the clients this user can act on (all for admins, assigned ones for accountants). */
export function ClientPicker({ portal, id, value, onChange, invalid }: { portal: StaffPortal; id: string; value: string; onChange: (v: string) => void; invalid?: boolean }) {
  const options = useStaffClientOptions(portal);
  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger id={id} className="w-full" aria-invalid={invalid}>
        <SelectValue placeholder={options.isLoading ? "Loading clients…" : "Choose a client"} />
      </SelectTrigger>
      <SelectContent>
        {(options.data ?? []).map((o) => (
          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
