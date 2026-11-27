"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatPeriod } from "@/lib/format";

/** Picks the month that "approved", "returned" and "hours" are counted for. */
export function PeriodSelect({ value, periods, onChange }: { value: string; periods: string[]; onChange: (p: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-40" aria-label="Month">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {periods.map((p) => (
          <SelectItem key={p} value={p}>{formatPeriod(p)}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
