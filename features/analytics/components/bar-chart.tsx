"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export interface Bar {
  key: string;
  label: string;
  value: number;
}

interface BarChartProps {
  bars: Bar[];
  format: (n: number) => string;
  /** Accessible name for the chart. */
  title: string;
  orientation?: "vertical" | "horizontal";
}

/**
 * Single-series bar chart: one hue (the brand primary), thin bars with a 4px rounded data end,
 * recessive baseline, value on hover/focus, and an accessible table fallback for screen readers.
 */
export function BarChart({ bars, format, title, orientation = "vertical" }: BarChartProps) {
  const [active, setActive] = useState<string | null>(null);
  const max = Math.max(...bars.map((b) => b.value), 0);
  const pct = (v: number) => (max === 0 ? 0 : (v / max) * 100);

  const table = (
    <table className="sr-only">
      <caption>{title}</caption>
      <tbody>
        {bars.map((b) => (
          <tr key={b.key}>
            <th scope="row">{b.label}</th>
            <td>{format(b.value)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  if (orientation === "horizontal") {
    return (
      <div>
        {table}
        <ul className="space-y-3" aria-hidden>
          {bars.map((b) => (
            <li key={b.key} className="grid grid-cols-[7rem_1fr_auto] items-center gap-3 text-sm">
              <span className="text-muted-foreground truncate">{b.label}</span>
              <div className="bg-muted h-2.5 rounded-full">
                <div className="bg-primary h-full rounded-full" style={{ width: `${Math.max(pct(b.value), b.value > 0 ? 2 : 0)}%` }} />
              </div>
              <span className="font-medium tabular-nums">{format(b.value)}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div>
      {table}
      <div className="flex h-48 items-end gap-3 border-b px-2" aria-hidden>
        {bars.map((b) => {
          const isActive = active === b.key;
          return (
            <div
              key={b.key}
              className="relative flex h-full flex-1 flex-col items-center justify-end"
              onMouseEnter={() => setActive(b.key)}
              onMouseLeave={() => setActive(null)}
            >
              {isActive && (
                <div className="bg-foreground text-background absolute -top-1 z-10 -translate-y-full rounded-md px-2 py-1 text-xs whitespace-nowrap shadow">
                  <span className="opacity-70">{b.label}</span> · <span className="font-medium tabular-nums">{format(b.value)}</span>
                </div>
              )}
              <div
                className={cn("bg-primary w-full max-w-10 rounded-t-[4px] transition-opacity", active && !isActive && "opacity-50")}
                style={{ height: `${Math.max(pct(b.value), b.value > 0 ? 1.5 : 0)}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-3 px-2 pt-2" aria-hidden>
        {bars.map((b) => (
          <span key={b.key} className="text-muted-foreground flex-1 text-center text-xs">{b.label}</span>
        ))}
      </div>
    </div>
  );
}
