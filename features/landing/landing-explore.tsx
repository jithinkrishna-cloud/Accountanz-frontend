"use client";

import Link from "next/link";
import { useState, type CSSProperties } from "react";
import { ROLE_NAME, usePublicAccountants } from "./landing-data";

const FILTERS = [
  { key: "all", label: "Everyone" },
  { key: "bookkeeper", label: "Bookkeepers" },
  { key: "finance_manager", label: "Finance managers" },
  { key: "cfo", label: "CFOs" },
] as const;

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");

const since = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { month: "short", year: "numeric", timeZone: "UTC" });

/** Public showcase of Accountanz's verified accountants (name, role, expertise, start date only). */
export function LandingExplore({ portal }: { portal: string | null }) {
  const { data, isLoading, error } = usePublicAccountants();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");
  const shown = (data ?? []).filter((a) => filter === "all" || a.role === filter || (filter === "finance_manager" && a.role === "reviewer"));
  const count = (key: string) => (data ?? []).filter((a) => key === "all" || a.role === key || (key === "finance_manager" && a.role === "reviewer")).length;

  return (
    <section id="accountants" className="lp-band">
      <div className="lp-wrap">
        <div className="lp-explore-head">
          <div className="lp-head">
            <h2 className="lp-h2 lp-display">Meet the accountants</h2>
            <p className="lp-sub">
              Every accountant is verified by Accountanz before they join a client. Once you&apos;re a client, you can ask for a specific person from
              your portal.
            </p>
          </div>
          <div className="lp-filters" role="group" aria-label="Show accountants by role">
            {FILTERS.map((f) => (
              <button key={f.key} type="button" className="lp-filter" aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>
                {f.label}
                {data && <span className="lp-filter-n">{count(f.key)}</span>}
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <p className="lp-empty">The accountant list couldn&apos;t be loaded. Refresh the page to try again.</p>
        ) : isLoading ? (
          <div className="lp-people" aria-busy>
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="lp-person lp-person-skel" />
            ))}
          </div>
        ) : shown.length === 0 ? (
          <p className="lp-empty">No accountants in this role yet.</p>
        ) : (
          <ul key={filter} className="lp-people">
            {shown.map((a, i) => (
              <li key={`${a.full_name}-${a.role}`} className={`lp-person lp-role-${a.role}`} style={{ "--i": i } as CSSProperties}>
                <span className="lp-avatar lp-display" aria-hidden>
                  {initials(a.full_name)}
                </span>
                <h3 className="lp-person-name">{a.full_name}</h3>
                <p className="lp-person-role">{ROLE_NAME[a.role] ?? a.role}</p>
                {a.expertise.length > 0 && (
                  <ul className="lp-chips" aria-label="Expertise">
                    {a.expertise.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                )}
                <p className="lp-person-since">With Accountanz since {since(a.member_since)}</p>
              </li>
            ))}
          </ul>
        )}

        <div className="lp-explore-cta">
          {portal?.startsWith("/app") ? (
            <Link href="/app/explore" className="lp-btn lp-btnPrimary">Explore accountants in your portal</Link>
          ) : portal ? (
            <Link href={portal} className="lp-btn lp-btnPrimary">Open your portal</Link>
          ) : (
            <Link href="/register" className="lp-btn lp-btnPrimary">Create an account to choose your team</Link>
          )}
        </div>
      </div>
    </section>
  );
}
