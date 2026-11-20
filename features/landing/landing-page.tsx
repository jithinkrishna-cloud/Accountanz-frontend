"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useSession } from "@/features/auth/hooks/use-session";
import { PORTAL_HOME } from "@/lib/constants";
import "./landing.css";
import { LandingFooter, LandingHeader } from "./landing-chrome";
import { usePublicPackages, ROLE_NAME, type PublicPackage } from "./landing-data";
import { LandingExplore } from "./landing-explore";
import { LandingStory } from "./landing-story";

/* ───────────────────────── Hero voucher ───────────────────────── */

type Line = { ledger: string; dr?: number; cr?: number };
type Voucher = { type: string; ref: string; date: string; lines: Line[] };

const VOUCHERS: Voucher[] = [
  {
    type: "Sales",
    ref: "INV-0412",
    date: "18 Nov 2026",
    lines: [
      { ledger: "Kochi Spices Pvt Ltd", dr: 118000 },
      { ledger: "Sales", cr: 100000 },
      { ledger: "Output CGST 9%", cr: 9000 },
      { ledger: "Output SGST 9%", cr: 9000 },
    ],
  },
  {
    type: "Purchase",
    ref: "MP/2211",
    date: "19 Nov 2026",
    lines: [
      { ledger: "Packing materials", dr: 50000 },
      { ledger: "Input IGST 18%", dr: 9000 },
      { ledger: "Malabar Packaging Co", cr: 59000 },
    ],
  },
  {
    type: "Payment",
    ref: "PAY-0087",
    date: "20 Nov 2026",
    lines: [
      { ledger: "Office rent", dr: 35000 },
      { ledger: "HDFC Bank current a/c", cr: 35000 },
    ],
  },
];

const inr = (n: number) => n.toLocaleString("en-IN");
const LINE_GAP = 0.45;
const FIRST_LINE = 0.9;

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return reduced;
}

function useCount(to: number, startAt: number, duration: number, instant: boolean) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (instant) return;
    let raf = 0;
    const t0 = performance.now() + startAt;
    const tick = (now: number) => {
      const p = Math.min(1, Math.max(0, (now - t0) / duration));
      setValue(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, startAt, duration, instant]);
  return instant ? to : value;
}

function VoucherSheet({ v, reduced }: { v: Voucher; reduced: boolean }) {
  const dr = v.lines.reduce((a, l) => a + (l.dr ?? 0), 0);
  const cr = v.lines.reduce((a, l) => a + (l.cr ?? 0), 0);
  const writeDone = (FIRST_LINE + v.lines.length * LINE_GAP) * 1000;
  const shownDr = useCount(dr, FIRST_LINE * 1000, writeDone - FIRST_LINE * 1000 + 300, reduced);
  const shownCr = useCount(cr, FIRST_LINE * 1000 + 150, writeDone - FIRST_LINE * 1000 + 300, reduced);
  const balanced = shownDr === dr && shownCr === cr && dr === cr;

  return (
    <div className="lp-sheet" aria-label={`${v.type} voucher ${v.ref}: debits ${inr(dr)}, credits ${inr(cr)}, balanced`}>
      <div className="lp-vHead">
        <span className="lp-vType lp-display">{v.type} voucher</span>
        <span className="lp-vMeta">
          {v.ref}
          <br />
          {v.date}
        </span>
      </div>
      <div className="lp-grid" aria-hidden>
        <span className="lp-colHead">Ledger</span>
        <span className="lp-colHead lp-num">Debit ₹</span>
        <span className="lp-colHead lp-num">Credit ₹</span>
        {v.lines.map((l, i) => (
          <div key={l.ledger} className="lp-line" style={{ "--d": `${reduced ? 0 : FIRST_LINE + i * LINE_GAP}s` } as CSSProperties}>
            <span className={`lp-ledger ${l.cr ? "lp-credit" : ""}`}>{l.cr ? `To ${l.ledger}` : l.ledger}</span>
            <span className="lp-num">{l.dr ? inr(l.dr) : ""}</span>
            <span className="lp-num">{l.cr ? inr(l.cr) : ""}</span>
          </div>
        ))}
        <div className="lp-line lp-totals" style={{ display: "contents" }}>
          <span>Total</span>
          <span className={balanced ? "lp-match" : undefined}>{inr(shownDr)}</span>
          <span className={balanced ? "lp-match" : undefined}>{inr(shownCr)}</span>
        </div>
      </div>
      <span className={`lp-stamp lp-display ${balanced ? "lp-stampOn" : ""}`} aria-hidden>
        Balanced
      </span>
    </div>
  );
}

function VoucherStage() {
  const reduced = useReducedMotion();
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (reduced || paused) return;
    const t = setTimeout(() => setI((n) => (n + 1) % VOUCHERS.length), 7000);
    return () => clearTimeout(t);
  }, [i, reduced, paused]);

  return (
    <div className="lp-stage" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="lp-sheetBack" aria-hidden />
      <VoucherSheet key={i} v={VOUCHERS[i]} reduced={reduced} />
      <div className="lp-dots">
        {VOUCHERS.map((v, n) => (
          <button key={v.ref} type="button" className="lp-dot" aria-current={n === i} aria-label={`Show the ${v.type.toLowerCase()} voucher`} onClick={() => setI(n)} />
        ))}
      </div>
    </div>
  );
}

/* ───────────────────────── Content ───────────────────────── */

const PROMISES = ["Works in your own Bizpole Books", "GST filed only after you approve", "A team of three on every account"];

const SERVICES = [
  { name: "Monthly bookkeeping", text: "Every sale, purchase, expense, receipt and payment recorded, with bank accounts reconciled and the month closed." },
  { name: "GST filing", text: "GSTR-1 and GSTR-3B prepared from your books, checked against your sales and purchase registers, and filed after your approval." },
  { name: "Payroll processing", text: "Salaries, statutory deductions and payslips, with the payroll entries posted to your books." },
  { name: "Financial reporting", text: "A monthly pack with profit and loss, balance sheet and cash flow, and a note on what changed." },
];

const CHECKLIST = [
  "Bank reconciliations",
  "Sales register posted and tied to GSTR-1",
  "Purchase bills posted with the correct GST",
  "Output tax agreed to the sales register",
  "TDS checked on every eligible payment",
  "Payroll entries and statutory dues booked",
  "Suspense accounts cleared",
  "Trial balance reviewed",
  "Management accounts drafted",
];

const STEPS = [
  { who: "You", what: "Upload bills, invoices and bank statements from your portal." },
  { who: "Your bookkeeper", what: "Posts every entry in your Bizpole Books." },
  { who: "Your finance manager", what: "Reviews the entries and reconciles bank and party balances." },
  { who: "You approve", what: "GST returns are prepared and wait for your approval before filing." },
  { who: "Your CFO", what: "Sends the month's profit and loss, balance sheet and cash position." },
];

const ROLES = [
  {
    name: "Bookkeeper",
    does: "Records sales, purchases, expenses, receipts and payments as your documents arrive.",
    you: "Which documents are still needed, and what's been posted this month.",
  },
  {
    name: "Finance manager",
    does: "Checks the bookkeeper's work, reconciles the bank and prepares your GST returns.",
    you: "Returns waiting for your approval, and anything that needs an answer from you.",
  },
  {
    name: "CFO",
    does: "Reads the month as a whole and tells you what changed and what to watch.",
    you: "Your reports, and a meeting whenever you want to talk them through.",
  },
];

const FAQS = [
  {
    q: "Do I need to change my accounting software?",
    a: "No. Your books stay in your own Bizpole Books account. You link it to Accountanz once with a connection code, and your team works from there.",
  },
  {
    q: "Can Accountanz see my Bizpole Books password?",
    a: "No. You create a connection code inside Bizpole Books and enter it in Accountanz. No password is shared, and you can disconnect any time from your settings.",
  },
  {
    q: "What do I have to do each month?",
    a: "Upload your bills, invoices and bank statements, answer the occasional question in the portal, and approve your GST returns. Your team does the rest.",
  },
  {
    q: "Will anything be filed without my approval?",
    a: "No. Every GST return waits in your portal until you approve it.",
  },
  {
    q: "Who will work on my books?",
    a: "A named bookkeeper and finance manager, and a CFO on the Growth Compliance package. You can see who they are and message them from your portal.",
  },
  {
    q: "How do I get started?",
    a: "Create an account, tell us about your business and choose a package. Then link your Bizpole Books and upload the current month's documents.",
  },
];

/* ───────────────────────── Pieces ───────────────────────── */

function Head({ title, sub, center }: { title: string; sub?: ReactNode; center?: boolean }) {
  return (
    <div className={`lp-head ${center ? "lp-head-center" : ""}`}>
      <h2 className="lp-h2 lp-display">{title}</h2>
      {sub && <p className="lp-sub">{sub}</p>}
    </div>
  );
}

function MonthClose() {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setInView(true), io.disconnect()), { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`lp-track ${inView ? "lp-inView" : ""}`}>
      <span className="lp-rail" aria-hidden>
        <span className="lp-railFill" style={{ display: "block" }} />
      </span>
      <ol className="lp-steps">
        {STEPS.map((st, n) => (
          <li key={st.who} className="lp-step">
            <span className="lp-stepNo" style={{ "--d": `${n * 0.5}s` } as CSSProperties} aria-hidden>
              {n + 1}
            </span>
            <p className="lp-stepWho">{st.who}</p>
            <p className="lp-stepWhat">{st.what}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Tick() {
  return (
    <span className="lp-tick" aria-hidden>
      ✓
    </span>
  );
}

const CYCLE: Record<PublicPackage["billing_cycle"], string> = { monthly: "a month", quarterly: "a month, billed quarterly", yearly: "a month, billed yearly" };
const scopeLines = (notes: string | null) =>
  (notes ?? "")
    .split(/\.\s+|\.$/)
    .map((x) => x.trim())
    .filter(Boolean);
const teamText = (roles: string[]) => {
  const names = roles.map((r) => (ROLE_NAME[r] ?? r).toLowerCase().replace(/^cfo$/, "CFO"));
  if (!names.length) return "";
  const list = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : names[0];
  return list.charAt(0).toUpperCase() + list.slice(1);
};

function Packages({ portal }: { portal: string | null }) {
  const { data, isLoading, error } = usePublicPackages();
  if (error) return <p className="lp-empty">Packages couldn&apos;t be loaded. Refresh the page, or sign in to see them in your portal.</p>;
  if (isLoading || !data)
    return (
      <div className="lp-packages" aria-busy>
        <div className="lp-pkg lp-person-skel" />
        <div className="lp-pkg lp-person-skel" />
      </div>
    );
  if (data.length === 0) return <p className="lp-empty">Packages are being updated. Create an account and we&apos;ll suggest one for you.</p>;
  return (
    <div className="lp-packages">
      {data.map((p, i) => {
        const featured = data.length > 1 && i === data.length - 1;
        return (
          <article key={p.name} className={`lp-pkg ${featured ? "lp-pkg-featured" : ""}`}>
            <h3 className="lp-pkg-name lp-display">{p.name}</h3>
            {p.description && <p className="lp-pkg-for">{p.description}</p>}
            <p className="lp-price">
              <span className="lp-price-n lp-display">₹{p.monthly_fee.toLocaleString("en-IN")}</span> {CYCLE[p.billing_cycle]}
            </p>
            {p.services.length > 0 && (
              <>
                <p className="lp-pkg-label">Included</p>
                <ul className="lp-pkg-list">
                  {p.services.map((x) => (
                    <li key={x}>
                      <Tick />
                      {x}
                    </li>
                  ))}
                </ul>
              </>
            )}
            {scopeLines(p.scope_notes).length > 0 && (
              <>
                <p className="lp-pkg-label">Scope</p>
                <ul className="lp-pkg-scope">
                  {scopeLines(p.scope_notes).map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </>
            )}
            {p.team_roles.length > 0 && <p className="lp-pkg-team">Your team: {teamText(p.team_roles)}</p>}
            <Link href={portal ?? "/register"} className={`lp-btn ${featured ? "lp-btnTeal" : "lp-btnPrimary"} lp-pkg-cta`}>
              {portal ? "Open your portal" : `Start with ${p.name}`}
            </Link>
          </article>
        );
      })}
    </div>
  );
}

/* ───────────────────────── Page ───────────────────────── */

export function LandingPage({ fontClass }: { fontClass: string }) {
  const { data: user } = useSession();
  const portal = user ? PORTAL_HOME[user.portal] : null;

  const ctas = (
    <div className="lp-ctas">
      {portal ? (
        <Link href={portal} className="lp-btn lp-btnPrimary">Open your portal</Link>
      ) : (
        <>
          <Link href="/register" className="lp-btn lp-btnPrimary">Create an account</Link>
          <Link href="/login" className="lp-btn lp-btnGhost">Sign in</Link>
        </>
      )}
    </div>
  );

  return (
    <div className={`lp-page ${fontClass}`}>
      <LandingHeader portal={portal} />

      <main>
        {/* Hero */}
        <section className="lp-band">
          <div className="lp-wrap lp-hero">
            <div>
              <h1 className="lp-headline lp-display">
                <span>Your books,</span>
                <span>closed every month.</span>
              </h1>
              <p className="lp-lede">
                Accountanz gives your business a bookkeeper, a finance manager and a CFO. Link your Bizpole Books so they can see your accounts, and
                send your bills and statements through the portal. They reconcile your bank, prepare your GST for your approval and send you a report
                every month.
              </p>
              {ctas}
              <ul className="lp-promises">
                {PROMISES.map((p) => (
                  <li key={p}>
                    <Tick />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
            <VoucherStage />
          </div>
        </section>

        {/* Story */}
        <LandingStory />

        {/* How a month closes */}
        <section id="how" className="lp-band lp-band-ink">
          <div className="lp-wrap">
            <Head title="How a month closes" sub="The same five steps every month. You can see where each one stands from your portal." />
            <MonthClose />
          </div>
        </section>

        {/* Services */}
        <section id="services" className="lp-band">
          <div className="lp-wrap">
            <Head title="What's done for you every month" sub="Four services, run by one team, in your own books." />
            <div className="lp-services">
              <ul className="lp-service-list">
                {SERVICES.map((sv) => (
                  <li key={sv.name} className="lp-service">
                    <h3 className="lp-h3 lp-display">{sv.name}</h3>
                    <p>{sv.text}</p>
                  </li>
                ))}
              </ul>
              <div className="lp-checklist">
                <p className="lp-checklist-title">Checked before every month is closed</p>
                <ul>
                  {CHECKLIST.map((c) => (
                    <li key={c}>
                      <Tick />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Team */}
        <section className="lp-band lp-band-white">
          <div className="lp-wrap">
            <Head title="Three people on your books" sub="Each one has a clear job, and you can message any of them from your portal." />
            <div className="lp-roles">
              {ROLES.map((r) => (
                <div key={r.name} className="lp-role">
                  <h3 className="lp-roleName lp-display">{r.name}</h3>
                  <p className="lp-roleCol">
                    <strong>What they do</strong>
                    {r.does}
                  </p>
                  <p className="lp-roleCol">
                    <strong>What you see</strong>
                    {r.you}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Explore accountants */}
        <LandingExplore portal={portal} />

        {/* Packages */}
        <section id="packages" className="lp-band lp-band-white">
          <div className="lp-wrap">
            <Head title="Choose how much we handle" sub="Pick a package when you create your account. You can move to another package later from your portal." />
            <Packages portal={portal} />
          </div>
        </section>

        {/* Your books stay yours */}
        <section className="lp-band">
          <div className="lp-wrap lp-yours">
            <Head
              title="Your books stay in your account"
              sub="Create a connection code in Bizpole Books and enter it in Accountanz. Your team reads your books from there. Nothing is copied out, and no password is shared."
            />
            <div className="lp-code">
              <p className="lp-codeLabel">Connection code from Bizpole Books</p>
              <div className="lp-codeValue lp-display">BPC-7KQ2M-4XV9T-…</div>
              <ul className="lp-facts">
                <li><Tick />Read-only access for your Accountanz team</li>
                <li><Tick />You choose which company to share</li>
                <li><Tick />Disconnect any time from your settings</li>
                <li><Tick />Every time your team views your books, it&apos;s recorded</li>
              </ul>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="lp-band lp-band-white">
          <div className="lp-wrap lp-faq-wrap">
            <Head title="Questions owners ask" />
            <div className="lp-faq">
              {FAQS.map((f) => (
                <details key={f.q} className="lp-qa">
                  <summary>
                    {f.q}
                    <span className="lp-plus" aria-hidden />
                  </summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Closing */}
        <section className="lp-band lp-band-ink">
          <div className="lp-wrap lp-closing">
            <Head center title="Start with this month's books" sub="Create an account, choose a package and link your Bizpole Books. Your team takes it from there." />
            {ctas}
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
