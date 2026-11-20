"use client";

import { useEffect, useRef, useState } from "react";

type Chapter = { when: string; title: string; body: string; why: string };

const CHAPTERS: Chapter[] = [
  {
    when: "28 October",
    title: "The bills are in a drawer, and GST is due soon.",
    body: "Anitha runs Kochi Spices, a small export business. Sales invoices sit in WhatsApp chats, purchase bills in a drawer, and last month's bank statement is still unopened. Her GST returns are due on the 11th and the 20th.",
    why: "Most small businesses don't need a full-time accountant. They need the books done properly, every month, without chasing anyone.",
  },
  {
    when: "1 November",
    title: "She sends the paperwork, not the books.",
    body: "Anitha photographs the bills and uploads the bank statement from her Accountanz portal. Her books stay in her own JournL account. She linked it once with a connection code, and no password was shared.",
    why: "You keep ownership of your books. Your accountants work in them; nothing is copied out.",
  },
  {
    when: "2 to 5 November",
    title: "Three people pick it up.",
    body: "Her bookkeeper posts every sale, purchase and expense. Her finance manager checks the entries, reconciles the bank, and asks Anitha two questions in the portal instead of over the phone.",
    why: "Every entry is reviewed by a second person before it reaches a return or a report.",
  },
  {
    when: "9 November",
    title: "She approves, and the return is filed.",
    body: "Her GSTR-3B arrives in the portal with the tax payable worked out. Anitha reads it, taps Approve, and it's filed before the due date. Nothing is filed without her approval.",
    why: "You stay in control of anything that goes to the government, without doing the work yourself.",
  },
  {
    when: "12 November",
    title: "She knows where the business stands.",
    body: "Her CFO sends October's profit and loss, balance sheet and cash position, with a short note on what changed. Anitha books a call to talk about a new export order.",
    why: "Closed books every month mean decisions made on real numbers, not on the bank balance.",
  },
];

function Visual({ n }: { n: number }) {
  if (n === 0)
    return (
      <div className="lp-vis lp-vis-pile" aria-hidden>
        <div className="lp-paper" style={{ transform: "rotate(-8deg) translate(-120px, -50px)" }}>Purchase bill<br /><b>Malabar Packaging</b><span>₹59,000</span></div>
        <div className="lp-paper" style={{ transform: "rotate(6deg) translate(115px, -75px)" }}>Sales invoice<br /><b>INV-0409</b><span>₹84,200</span></div>
        <div className="lp-paper" style={{ transform: "rotate(-2deg) translate(-10px, 70px)" }}>Bank statement<br /><b>HDFC, October</b><span>unopened</span></div>
        <div className="lp-due">GSTR-3B due in 23 days</div>
      </div>
    );
  if (n === 1)
    return (
      <div className="lp-vis lp-vis-card" aria-hidden>
        <p className="lp-vis-title">Uploaded this month</p>
        {["Sales invoices, October (14)", "Purchase bills, October (9)", "HDFC statement, October", "Rent receipt, October"].map((d, i) => (
          <div key={d} className="lp-row" style={{ animationDelay: `${0.15 + i * 0.25}s` }}>
            <span className="lp-tick">✓</span>
            {d}
          </div>
        ))}
        <div className="lp-link">Kochi Spices linked from JournL</div>
      </div>
    );
  if (n === 2)
    return (
      <div className="lp-vis lp-vis-card" aria-hidden>
        <p className="lp-vis-title">October close</p>
        {[
          { t: "Entries posted", by: "Bookkeeper", p: 100, v: "64 of 64" },
          { t: "Entries reviewed", by: "Finance manager", p: 100, v: "64 of 64" },
          { t: "Bank reconciled", by: "Finance manager", p: 82, v: "2 questions for you" },
        ].map((r, i) => (
          <div key={r.t} className="lp-prog" style={{ animationDelay: `${0.15 + i * 0.25}s` }}>
            <div className="lp-prog-top">
              <span>{r.t}</span>
              <span className="lp-muted">{r.v}</span>
            </div>
            <div className="lp-progbar"><span style={{ width: `${r.p}%`, animationDelay: `${0.4 + i * 0.25}s` }} /></div>
            <span className="lp-muted lp-small">{r.by}</span>
          </div>
        ))}
      </div>
    );
  if (n === 3)
    return (
      <div className="lp-vis lp-vis-card" aria-hidden>
        <p className="lp-vis-title">Waiting for your approval</p>
        <div className="lp-approval">
          <b>GSTR-3B, October 2026</b>
          <div className="lp-kv"><span>Output tax</span><span>₹31,860</span></div>
          <div className="lp-kv"><span>Input tax credit</span><span>₹18,420</span></div>
          <div className="lp-kv lp-kv-total"><span>Tax payable</span><span>₹13,440</span></div>
          <div className="lp-approve">Approve</div>
        </div>
        <p className="lp-filed">Filed 9 Nov, 11 days before the due date</p>
      </div>
    );
  return (
    <div className="lp-vis lp-vis-card" aria-hidden>
      <p className="lp-vis-title">October report</p>
      <div className="lp-bars">
        {[
          { m: "Jul", v: 52 },
          { m: "Aug", v: 61 },
          { m: "Sep", v: 58 },
          { m: "Oct", v: 74 },
        ].map((b, i) => (
          <div key={b.m} className="lp-col">
            <span className="lp-colbar" style={{ height: `${b.v}%`, animationDelay: `${0.15 + i * 0.15}s` }} />
            <span className="lp-muted lp-small">{b.m}</span>
          </div>
        ))}
      </div>
      <div className="lp-kv"><span>Net profit, October</span><span>₹2,18,400</span></div>
      <p className="lp-note">“Margins improved as packaging costs fell. Worth fixing the new order&apos;s price before peak season.” <span className="lp-muted">Your CFO</span></p>
    </div>
  );
}

export function LandingStory() {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.i));
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  // Desktop: when scrolling stops near a chapter, glide it to the middle of the screen, level with the visual.
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 961px)");
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timer = 0;
    let settling = false;
    const settle = () => {
      if (!desktop.matches || still.matches) return;
      const mid = window.innerHeight / 2;
      let best: { off: number } | null = null;
      for (const el of refs.current) {
        if (!el) continue;
        const r = el.getBoundingClientRect();
        const off = r.top + r.height / 2 - mid;
        if (!best || Math.abs(off) < Math.abs(best.off)) best = { off };
      }
      // Only nearby chapters (within a third of the screen), and not when already centred.
      if (!best || Math.abs(best.off) < 4 || Math.abs(best.off) > window.innerHeight / 3) return;
      settling = true;
      window.scrollBy({ top: best.off, behavior: "smooth" });
      window.setTimeout(() => (settling = false), 700);
    };
    const onScroll = () => {
      if (settling) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(settle, 160);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <section className="lp-band lp-band-white lp-story" aria-labelledby="lp-story-title">
      <div className="lp-wrap lp-story-intro">
        <div className="lp-head">
          <h2 id="lp-story-title" className="lp-h2 lp-display">One month with Accountanz</h2>
          <p className="lp-sub">What Accountanz does, told through one business owner&apos;s October.</p>
        </div>
      </div>
      <div className="lp-story-body">
        <div className="lp-story-stage">
          <div className="lp-story-sticky">
            <Visual key={active} n={active} />
            <div className="lp-story-progress" aria-hidden>
              {CHAPTERS.map((c, i) => (
                <span key={c.when} className={i <= active ? "lp-on" : undefined} />
              ))}
            </div>
          </div>
        </div>
        <ol className="lp-chapters">
          {CHAPTERS.map((c, i) => (
            <li
              key={c.when}
              ref={(el) => {
                refs.current[i] = el;
              }}
              data-i={i}
              className={`lp-chapter ${i === active ? "lp-chapter-on" : ""}`}
            >
              <p className="lp-when">{c.when}</p>
              <h3 className="lp-chapter-title lp-display">{c.title}</h3>
              <p className="lp-chapter-body">{c.body}</p>
              <p className="lp-why">{c.why}</p>
              <div className="lp-inline-vis">
                <Visual n={i} />
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
