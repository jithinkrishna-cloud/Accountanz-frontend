"use client";

import Link from "next/link";

const SECTIONS = [
  { href: "/#how", label: "How it works" },
  { href: "/#services", label: "Services" },
  { href: "/#accountants", label: "Accountants" },
  { href: "/#packages", label: "Packages" },
  { href: "/#faq", label: "Questions" },
];

function Brand() {
  return (
    <Link href="/" className="lp-brand">
      <span className="lp-mark" aria-hidden>
        A
      </span>
      Accountanz
    </Link>
  );
}

/** Sticky top bar shared by the public pages. */
export function LandingHeader({ portal }: { portal: string | null }) {
  return (
    <header className="lp-header">
      <div className="lp-bar">
        <Brand />
        <nav className="lp-nav" aria-label="Sections">
          {SECTIONS.map((s) => (
            <Link key={s.href} href={s.href}>
              {s.label}
            </Link>
          ))}
        </nav>
        <div className="lp-barLinks">
          {portal ? (
            <Link href={portal} className="lp-btn lp-btnPrimary lp-btnSmall">Open your portal</Link>
          ) : (
            <>
              <Link href="/login" className="lp-btn lp-btnGhost lp-btnSmall lp-hide-sm">Sign in</Link>
              <Link href="/register" className="lp-btn lp-btnPrimary lp-btnSmall">Create an account</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export function LandingFooter() {
  return (
    <footer className="lp-footer">
      <div className="lp-wrap lp-foot">
        <div>
          <Brand />
          <p className="lp-foot-note">Managed accounting for growing businesses in India.</p>
        </div>
        <nav className="lp-foot-links" aria-label="Footer">
          {SECTIONS.map((s) => (
            <Link key={s.href} href={s.href}>
              {s.label}
            </Link>
          ))}
          <Link href="/login">Sign in</Link>
        </nav>
        <p className="lp-foot-copy">© 2026 Accountanz</p>
      </div>
    </footer>
  );
}
