"use client";

import Link from "next/link";
import { useSession } from "@/features/auth/hooks/use-session";
import { ApiError } from "@/lib/api-client";
import { PORTAL_HOME } from "@/lib/constants";
import "./landing.css";
import { LandingFooter, LandingHeader } from "./landing-chrome";
import { ROLE_NAME, usePublicAccountant, usePublicAccountants, usePublicPackages } from "./landing-data";
import { AccountantCard, initials, since } from "./landing-explore";

type RoleInfo = { summary: string; does: string[]; you: string[]; plural: string };

const FINANCE: RoleInfo = {
  summary: "Checks the work and gets your returns ready.",
  does: [
    "Reviews every entry your bookkeeper records",
    "Reconciles your bank, customer and supplier balances",
    "Prepares your GST returns and sends them to you for approval",
  ],
  you: ["Returns waiting for your approval", "Questions that need an answer from you"],
  plural: "finance managers",
};

const ROLE_INFO: Record<string, RoleInfo> = {
  bookkeeper: {
    summary: "Keeps your day-to-day records complete and correct.",
    does: [
      "Records sales, purchases, expenses, receipts and payments as your documents arrive",
      "Matches entries to your bank statements",
      "Asks you in the portal when a document is missing",
    ],
    you: ["Which documents are still needed", "What's been recorded this month"],
    plural: "bookkeepers",
  },
  finance_manager: FINANCE,
  reviewer: FINANCE,
  cfo: {
    summary: "Reads the month as a whole and tells you what it means.",
    does: ["Reviews your monthly profit and loss, balance sheet and cash flow", "Explains what changed and what to watch", "Meets with you to plan ahead"],
    you: ["Your monthly reports", "Meetings whenever you want to talk them through"],
    plural: "CFOs",
  },
};

/** The team role a package needs for this person (reviewers cover the finance manager seat). */
const seat = (role: string) => (role === "reviewer" ? "finance_manager" : role);

function Tick() {
  return (
    <span className="lp-tick" aria-hidden>
      ✓
    </span>
  );
}

/** Public profile of one verified accountant: /accountants/[slug]. */
export function AccountantProfile({ slug, fontClass }: { slug: string; fontClass: string }) {
  const { data: user } = useSession();
  const portal = user ? PORTAL_HOME[user.portal] : null;
  const { data: a, isLoading, error } = usePublicAccountant(slug);
  const everyone = usePublicAccountants();
  const packages = usePublicPackages();

  const notFound = error instanceof ApiError && error.status === 404;

  return (
    <div className={`lp-page ${fontClass}`}>
      <LandingHeader portal={portal} />
      <main>
        {isLoading ? (
          <section className="lp-band">
            <div className="lp-wrap">
              <div className="lp-person-skel lp-profile-skel" />
            </div>
          </section>
        ) : !a ? (
          <section className="lp-band">
            <div className="lp-wrap lp-profile-missing">
              <h1 className="lp-h2 lp-display">{notFound ? "This profile isn't available" : "This profile couldn't be loaded"}</h1>
              <p className="lp-sub">
                {notFound
                  ? "The accountant may have changed their name or no longer works with clients. See everyone who does on the home page."
                  : "Check your connection and refresh the page."}
              </p>
              <div className="lp-ctas">
                <Link href="/#accountants" className="lp-btn lp-btnPrimary">See all accountants</Link>
              </div>
            </div>
          </section>
        ) : (
          (() => {
            const info = ROLE_INFO[a.role] ?? ROLE_INFO.bookkeeper;
            const roleName = ROLE_NAME[a.role] ?? a.role;
            const first = a.full_name.split(/\s+/)[0];
            const others = (everyone.data ?? []).filter((o) => o.slug !== a.slug && seat(o.role) === seat(a.role)).slice(0, 3);
            const fits = (packages.data ?? []).filter((p) => p.team_roles.includes(seat(a.role)));
            const request = portal?.startsWith("/app") ? (
              <Link href="/app/explore" className="lp-btn lp-btnTeal">Request {first} in your portal</Link>
            ) : portal ? (
              <Link href={portal} className="lp-btn lp-btnTeal">Open your portal</Link>
            ) : (
              <Link href="/register" className="lp-btn lp-btnTeal">Create an account to request {first}</Link>
            );

            return (
              <>
                {/* Profile hero */}
                <section className={`lp-profile-hero lp-role-${a.role}`}>
                  <div className="lp-profile-band" aria-hidden />
                  <div className="lp-wrap lp-profile-top">
                    <nav className="lp-crumbs" aria-label="Breadcrumb">
                      <Link href="/#accountants">Accountants</Link>
                      <span aria-hidden>/</span>
                      <span aria-current="page">{a.full_name}</span>
                    </nav>
                    <div className="lp-profile-card">
                      <span className="lp-avatar lp-avatar-lg lp-display" aria-hidden>
                        {initials(a.full_name)}
                      </span>
                      <div className="lp-profile-id">
                        <h1 className="lp-profile-name lp-display">{a.full_name}</h1>
                        <div className="lp-profile-tags">
                          <span className="lp-person-role">{roleName}</span>
                          <span className="lp-verified lp-verified-inline">✓ Verified by Accountanz</span>
                        </div>
                        <p className="lp-profile-summary">{info.summary}</p>
                      </div>
                      <div className="lp-profile-actions">
                        {request}
                        <p className="lp-profile-since">With Accountanz since {since(a.member_since)}</p>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Details */}
                <section className="lp-band">
                  <div className="lp-wrap lp-profile-grid">
                    <div className="lp-profile-main">
                      {a.expertise.length > 0 && (
                        <div className="lp-profile-block">
                          <h2 className="lp-h3 lp-display">Expertise</h2>
                          <ul className="lp-chips lp-chips-lg">
                            {a.expertise.map((x) => (
                              <li key={x}>{x}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="lp-profile-block">
                        <h2 className="lp-h3 lp-display">What {first} does as your {roleName.toLowerCase().replace("cfo", "CFO")}</h2>
                        <ul className="lp-profile-list">
                          {info.does.map((d) => (
                            <li key={d}>
                              <Tick />
                              {d}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="lp-profile-block">
                        <h2 className="lp-h3 lp-display">What you see in your portal</h2>
                        <ul className="lp-profile-list">
                          {info.you.map((d) => (
                            <li key={d}>
                              <Tick />
                              {d}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="lp-profile-block">
                        <h2 className="lp-h3 lp-display">How to work with {first}</h2>
                        <ol className="lp-howto">
                          <li>
                            <span className="lp-howto-n">1</span>
                            <div>
                              <strong>Create an account and choose a package</strong>
                              <p>Tell us about your business and pick the package that fits.</p>
                            </div>
                          </li>
                          <li>
                            <span className="lp-howto-n">2</span>
                            <div>
                              <strong>Open Explore accountants in your portal</strong>
                              <p>Find {first} and choose what you need: to join your accounting team, a one-off piece of work, or to replace someone on your team.</p>
                            </div>
                          </li>
                          <li>
                            <span className="lp-howto-n">3</span>
                            <div>
                              <strong>Accountanz confirms</strong>
                              <p>We check availability and let you know. Once approved, {first} appears on your team page.</p>
                            </div>
                          </li>
                        </ol>
                      </div>
                    </div>

                    <aside className="lp-profile-side">
                      <div className="lp-side-card">
                        <h2 className="lp-side-title">Packages with a {roleName.toLowerCase().replace("cfo", "CFO")}</h2>
                        {packages.isLoading ? (
                          <div className="lp-person-skel" style={{ minHeight: 120 }} />
                        ) : fits.length === 0 ? (
                          <p className="lp-muted">No package includes this role yet.</p>
                        ) : (
                          <ul className="lp-side-pkgs">
                            {fits.map((p) => (
                              <li key={p.name}>
                                <span className="lp-side-pkg-name">{p.name}</span>
                                <span className="lp-side-pkg-price">₹{p.monthly_fee.toLocaleString("en-IN")} a month</span>
                                <span className="lp-muted lp-small">{p.services.join(", ")}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        <Link href="/#packages" className="lp-side-link">Compare packages</Link>
                      </div>
                      <div className="lp-side-card lp-side-note">
                        <p>
                          Every accountant on Accountanz is verified before they work with clients. Their rates and contact details aren&apos;t public; your
                          team is arranged through your portal.
                        </p>
                      </div>
                    </aside>
                  </div>
                </section>

                {/* Others */}
                {others.length > 0 && (
                  <section className="lp-band lp-band-white">
                    <div className="lp-wrap">
                      <div className="lp-head">
                        <h2 className="lp-h2 lp-display">Other {info.plural}</h2>
                      </div>
                      <ul className="lp-people">
                        {others.map((o, i) => (
                          <AccountantCard key={o.slug} a={o} i={i} />
                        ))}
                      </ul>
                    </div>
                  </section>
                )}
              </>
            );
          })()
        )}
      </main>
      <LandingFooter />
    </div>
  );
}
