'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import Nav from './Nav';
import Footer from './Footer';
import { TORONTO_ORG_ID } from '@/lib/api';
import styles from './About.module.css';

const TORONTO_HREF = `/org/${TORONTO_ORG_ID}`;

function FadeUp({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.visible);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`${styles.fadeUp} ${className}`}>
      {children}
    </div>
  );
}

export default function AboutPage() {
  const flowRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (flowRef.current) {
      flowRef.current.querySelectorAll('path').forEach((p) => {
        const len = p.getTotalLength();
        p.style.strokeDasharray = `${len}`;
        p.style.strokeDashoffset = `${len}`;
      });
    }
    const t = setTimeout(() => {
      if (flowRef.current) {
        flowRef.current.querySelectorAll('path').forEach((p) => {
          p.style.transition = 'stroke-dashoffset 1.8s cubic-bezier(.16,1,.3,1)';
          p.style.strokeDashoffset = '0';
        });
      }
    }, 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className={styles.page}>
      <Nav />

      {/* ── HERO ── */}
      <div className={styles.pageHero}>
        <svg ref={flowRef} className={styles.flowBg} viewBox="0 0 1100 480" preserveAspectRatio="none" aria-hidden="true">
          <path d="M -50,90 C 250,90 300,200 600,200 C 850,200 900,60 1150,60" stroke="var(--amber)" opacity="0.09" />
          <path d="M -50,180 C 200,180 320,330 600,330 C 880,330 920,420 1150,420" stroke="var(--teal)" opacity="0.08" />
          <path d="M -50,300 C 280,300 260,140 560,140 C 820,140 950,260 1150,260" stroke="var(--tm)" opacity="0.055" />
          <path d="M -50,420 C 220,420 300,440 500,440 C 760,440 880,300 1150,300" stroke="var(--amber)" opacity="0.05" />
        </svg>
        <div className={styles.container}>
          <div className={styles.heroEyebrow}>About Democracy Distributed</div>
          <h1>
            An open record of
            <br />
            <em>how government spends and decides</em>
            <br />
            — and a public that can use it.
          </h1>
          <p className={styles.heroSub}>
            The accountability data is public, but scattered — and understanding it alone changes nothing. We&apos;re connecting it,
            and building the public that can act on it. Built in the open, in Toronto, and looking for people to build it.
          </p>
        </div>
      </div>

      {/* ── §0 ORIENTATION ── */}
      <section className={styles.section} id="what">
        <div className={styles.container}>
          <div className={styles.orientationInner}>
            <FadeUp>
              <div className={styles.eyebrow}>What This Is</div>
              <h2>
                More than a database. <em>A way to understand power — together.</em>
              </h2>
              <p>
                Democracy Distributed is an open, crowdsourced record of how a government spends money and makes decisions —
                structured so anyone can follow a budget line to the vote behind it, the contract it funded, and the outcome it
                produced.
              </p>
              <p>
                But the record is the means, not the point. The point is to help people understand how the system around them
                actually works — how money moves, who decides, and when — and to find others who see the same things. Toronto is
                where we started.
              </p>
            </FadeUp>

            <FadeUp className={styles.chainMotif}>
              <div className={styles.chainNode}>
                <div className={`${styles.chainNodeIcon} ${styles.chainNodeIconAmber}`}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#e8a020" strokeWidth="1.8">
                    <rect x="2" y="5" width="20" height="14" rx="2" />
                    <path d="M16 10a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" />
                    <path d="M2 10h2M20 10h2" />
                  </svg>
                </div>
                <div className={styles.chainNodeLabel}>Allocation</div>
                <div className={styles.chainNodeValue}>Money</div>
              </div>

              <div className={styles.chainArrow}>
                <div className={styles.chainArrowLine} />
              </div>

              <div className={styles.chainNode}>
                <div className={`${styles.chainNodeIcon} ${styles.chainNodeIconTeal}`}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#2dd4bf" strokeWidth="1.8">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                </div>
                <div className={styles.chainNodeLabel}>Vote / Policy</div>
                <div className={styles.chainNodeValue}>Decision</div>
              </div>

              <div className={styles.chainArrow}>
                <div className={styles.chainArrowLine} />
              </div>

              <div className={styles.chainNode}>
                <div className={`${styles.chainNodeIcon} ${styles.chainNodeIconAmber}`}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#e8a020" strokeWidth="1.8">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                </div>
                <div className={styles.chainNodeLabel}>Impact / Contract</div>
                <div className={styles.chainNodeValue}>Outcome</div>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ── §1 THE PROBLEM ── */}
      <section className={`${styles.section} ${styles.sectionAlt}`} id="problem">
        <div className={styles.container}>
          <div className={styles.problemInner}>
            <FadeUp>
              <div className={styles.eyebrow}>The Problem</div>
              <h2>
                The problem isn&apos;t the data. <em>It&apos;s that no one can keep up.</em>
              </h2>
              <p>
                Democracy was built for a smaller world. The systems we still use to decide things together — to pool money for the
                common good and hold the deciders accountable — were designed for communities a fraction of today&apos;s size. Now
                most people have no idea who their councillor is, what they decide, or where the money goes.
              </p>
              <p>
                It isn&apos;t that the information is hidden. Every budget is published, every vote is on record, every large contract
                is disclosed. But it&apos;s scattered, in different formats, and never linked to what came before or after it — far
                too much for any one person to follow. So spending goes unwatched, not because the public doesn&apos;t care, but
                because keeping up is a full-time job no one is paid to do.
              </p>
              <p>
                And the connections that would make it legible — the ones that turn a number into a story — don&apos;t exist
                anywhere. A budget line doesn&apos;t tell you what project it funded. A contract doesn&apos;t show the vote that
                authorized it. None of it connects, unless someone builds the connections by hand.
              </p>

              <ul className={styles.gapList}>
                <li>Budget documents reference line items with no project behind them</li>
                <li>Committee minutes link to votes but not to what was spent</li>
                <li>Contracts name vendors but not the program they served</li>
                <li>None of it connects — unless someone builds the connections by hand</li>
              </ul>

              <p style={{ marginTop: 28 }}>
                <Link href={TORONTO_HREF} className={styles.inlineLink}>
                  See it on Toronto&apos;s 2024 budget →
                </Link>
              </p>
            </FadeUp>

            <FadeUp>
              <div className={styles.problemCallout}>
                <div className={styles.calloutLabel}>Toronto 2024 — Example</div>
                <div className={styles.calloutLine}>
                  <strong>Program:</strong> Paramedic Services
                </div>
                <div className={styles.calloutLine}>
                  <strong>Budget line:</strong> $3.2M — &quot;Technology Modernization&quot;
                </div>
                <div className={styles.calloutLine}>
                  <strong>Linked vote:</strong> —
                </div>
                <div className={styles.calloutLine}>
                  <strong>Contract awarded:</strong> —
                </div>
                <div className={styles.calloutLine}>
                  <strong>Outcome reported:</strong> —
                </div>
                <div className={styles.calloutStatus}>No traceable chain</div>
              </div>
              <p className={styles.problemSidebarNote}>
                This isn&apos;t unusual. It&apos;s the norm. A budget line with a plausible name and a real dollar figure — and
                nothing else connecting it to a decision or a result.
              </p>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ── §2 WHAT WE BUILT ── */}
      <section className={styles.section} id="what-we-built">
        <div className={styles.container}>
          <FadeUp className={styles.builtHeader}>
            <div className={styles.eyebrow}>What We Built</div>
            <h2>
              <em>WikiGov</em> — a structured public
              <br />
              page for every government.
            </h2>
            <p>
              WikiGov gives any government organization a page where its finances render as an interactive Sankey diagram. Click a
              flow and you follow the money: from the budget allocation, to the decision that authorized it, to the contract or
              project it funded. Every link in that chain is visible, and every link can be contributed or corrected by anyone.
            </p>
            <p style={{ marginTop: 16 }}>
              That&apos;s the differentiator. Most civic tools show you finance, or decisions, or projects. WikiGov connects them —
              and the connections are crowdsourced, which is why they don&apos;t exist anywhere else. The data is open, contributable,
              and free.
            </p>
          </FadeUp>

          <div className={styles.featuresGrid}>
            <FadeUp className={styles.featureCard}>
              <div className={`${styles.featureIcon} ${styles.featureIconAmber}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#e8a020" strokeWidth="1.8">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                </svg>
              </div>
              <h3>Structured org pages</h3>
              <p>
                Every government organization gets a consistent, structured page — budget, decisions, contracts, outcomes —
                formatted the same way every time.
              </p>
            </FadeUp>

            <FadeUp className={styles.featureCard}>
              <div className={`${styles.featureIcon} ${styles.featureIconTeal}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#2dd4bf" strokeWidth="1.8">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              </div>
              <h3>Interactive Sankey</h3>
              <p>
                Finances render as a live flow diagram. Hover or click any stream to see what&apos;s inside — the numbers, the vote,
                the outcome on the other end.
              </p>
            </FadeUp>

            <FadeUp className={styles.featureCard}>
              <div className={`${styles.featureIcon} ${styles.featureIconAmber}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#e8a020" strokeWidth="1.8">
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
              </div>
              <h3>Crowdsourced connections</h3>
              <p>
                The links between money, decisions, and outcomes are contributed by the public and verified openly — the work
                governments don&apos;t do, done together.
              </p>
            </FadeUp>
          </div>

          <FadeUp className={styles.podNote}>
            <span className={styles.podBadge}>POD — Coming</span>
            <p>
              The public layer is WikiGov. POD is the coordination tool sitting beside it: a way for community groups to run
              themselves on the same data model governments use — structured decisions, transparent finances, clear outcomes.
              Defined in vision, not yet launched.
            </p>
          </FadeUp>

          <FadeUp className={styles.builtCtas}>
            <Link href={TORONTO_HREF} className={`${styles.btn} ${styles.btnPrimary}`}>
              Explore Toronto&apos;s data →
            </Link>
            <Link href="/contribute" className={`${styles.btn} ${styles.btnSecondary}`}>
              Contribute →
            </Link>
          </FadeUp>
        </div>
      </section>

      {/* ── §3 WHERE IT GOES ── */}
      <section className={`${styles.section} ${styles.sectionAlt}`} id="where-it-goes">
        <div className={styles.container}>
          <div className={styles.whereInner}>
            <FadeUp className={styles.whereText}>
              <div className={styles.eyebrow}>Where It Goes</div>
              <h2>
                Every era unlocked a bottleneck. <em>Governance is still waiting on its tools.</em>
              </h2>
              <p>
                Agriculture eased the bottleneck of food, industry the bottleneck of production, the information age the bottleneck
                of knowledge. How we govern — how money gets allocated, how accountability gets enforced — still runs through the
                same few people in the same few rooms it always has.
              </p>
              <p>
                That&apos;s not a criticism of the people; it&apos;s an observation about the tools. Accountability at scale has
                always needed more coordination than any one person or press outlet could sustain.
              </p>
              <p>
                Democracy Distributed adds a parallel public layer alongside existing institutions — not to replace them. First by
                making the information that today reaches only a few available to everyone. Then by giving the people who care a way
                to find each other and form a position that can be reckoned with.
              </p>
              <p style={{ fontStyle: 'italic', color: 'var(--tm)', fontSize: 15, marginTop: 20 }}>
                This is a direction, not a near-term promise. The work starts in Toronto, with one chain: money, decision, outcome.
              </p>
              <div className={styles.whereCta}>
                <a
                  className={`${styles.btn} ${styles.btnGhost}`}
                  href="https://github.com/democracydistributed"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Follow the build →
                </a>
              </div>
            </FadeUp>

            <FadeUp className={styles.whereVisual}>
              <div className={styles.eraRow}>
                <div className={styles.eraLabel}>Agriculture</div>
                <div className={styles.eraContent}>Food scarcity → solved by the plow, the field, the harvest system.</div>
              </div>
              <div className={styles.eraRow}>
                <div className={styles.eraLabel}>Industry</div>
                <div className={styles.eraContent}>Physical production → solved by manufacturing, supply chains, logistics.</div>
              </div>
              <div className={styles.eraRow}>
                <div className={styles.eraLabel}>Information</div>
                <div className={styles.eraContent}>Knowledge access → solved by the internet, search, open data.</div>
              </div>
              <div className={`${styles.eraRow} ${styles.eraRowHighlight}`}>
                <div className={styles.eraLabel}>Governance</div>
                <div className={styles.eraContent}>Accountability at scale → still waiting for its structural moment.</div>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ── §4 WHO ── */}
      <section className={styles.section} id="who">
        <div className={styles.container}>
          <div className={styles.whoInner}>
            <FadeUp>
              <div className={styles.eyebrow}>Who&apos;s Building This</div>
              <h2>
                Built in the open,
                <br />
                <em>looking for collaborators.</em>
              </h2>
              <p>
                For now, Democracy Distributed is mostly one person — me. I&apos;m Ajay, I&apos;m in Toronto, and I&apos;m building
                this in the open: no org chart, no funding announcement, no press release. Just a working proof of concept in the
                city it started in, and an honest invitation.
              </p>
              <p>
                This is bigger than one person can take where it needs to go. If you&apos;re a developer, a researcher, a
                journalist, a civic technologist — or just someone who thinks this should exist and wants to help define it —
                there&apos;s room, and the direction is still being set.
              </p>
              <div style={{ marginTop: 32 }}>
                <a
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  href="https://civictechto.slack.com/archives/C09A5S6B7QE"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Find us on Slack →
                </a>
              </div>
            </FadeUp>

            <FadeUp className={styles.whoCard}>
              <div className={styles.avatarRow}>
                <div className={styles.avatar}>A</div>
                <div className={styles.avatarInfo}>
                  <div className={styles.avatarName}>Ajay</div>
                  <div className={styles.avatarRole}>Toronto · Builder</div>
                </div>
              </div>
              <p>
                Started Democracy Distributed after the same thing kept nagging at me: civic data is public, but it&apos;s never
                connected — and being public isn&apos;t the same as being useful. Building WikiGov to prove it can be both.
              </p>
              <div className={styles.collabNote}>Open to collaborators</div>
            </FadeUp>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
