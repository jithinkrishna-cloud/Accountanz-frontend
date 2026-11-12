"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const ALL = "__all__";

interface FilterSelectProps {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  options: { value: string; label: string }[];
  allLabel: string;
  className?: string;
}

/** A list filter whose first option clears it ("All clients", "All statuses"…). */
export function FilterSelect({ value, onChange, options, allLabel, className }: FilterSelectProps) {
  return (
    <Select value={value ?? ALL} onValueChange={(v) => onChange(v === ALL ? undefined : v)}>
      <SelectTrigger className={cn("w-full sm:w-44", className)} aria-label={allLabel}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
