'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Nav from './Nav';
import Footer from './Footer';
import { TORONTO_ORG_ID } from '@/lib/api';
import styles from './Landing.module.css';

const TORONTO_HREF = `/org/${TORONTO_ORG_ID}`;

export default function LandingPage() {
  const [ready, setReady] = useState(false);
  const flowRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    // Compute per-path dash lengths so all four lines reveal evenly
    if (flowRef.current) {
      flowRef.current.querySelectorAll('path').forEach((p) => {
        const len = p.getTotalLength();
        p.style.strokeDasharray = `${len}`;
        p.style.strokeDashoffset = `${len}`;
      });
    }

    // Brief delay so browser paints the initial hidden state before animating
    const t = setTimeout(() => {
      setReady(true);
      if (flowRef.current) {
        flowRef.current.querySelectorAll('path').forEach((p) => {
          p.style.transition = 'stroke-dashoffset 1.8s cubic-bezier(.16,1,.3,1)';
          p.style.strokeDashoffset = '0';
        });
      }
    }, 80);

    return () => clearTimeout(t);
  }, []);

  const heroClass = `${styles.hero} ${ready ? styles.heroPlay : ''}`;

  return (
    <div className={styles.page}>
      <Nav />

      {/* ── HERO ── */}
      <section className={heroClass}>
        <svg
          ref={flowRef}
          viewBox="0 0 1100 480"
          preserveAspectRatio="none"
          className={styles.flowBg}
          aria-hidden="true"
        >
          <path d="M -50,90 C 250,90 300,200 600,200 C 850,200 900,60 1150,60" stroke="var(--amber)" opacity="0.09" />
          <path d="M -50,180 C 200,180 320,330 600,330 C 880,330 920,420 1150,420" stroke="var(--teal)" opacity="0.08" />
          <path d="M -50,300 C 280,300 260,140 560,140 C 820,140 950,260 1150,260" stroke="var(--tm)" opacity="0.055" />
          <path d="M -50,420 C 220,420 300,440 500,440 C 760,440 880,300 1150,300" stroke="var(--amber)" opacity="0.05" />
        </svg>

        <div className={styles.heroLeft}>
          <h1 className={`${styles.heroH1} ${styles.revealWipe}`}>
            Follow the <em>Money.</em>
          </h1>
          <div className={`${styles.heroH1Line2} ${styles.revealWipe2}`}>Trace the Decisions.</div>
          <p className={`${styles.heroDesc} ${styles.revealFade}`}>
            Your city spends billions, but the decisions, rules, and people behind that money are scattered across documents
            few people can follow. Democracy Distributed aims to show how they all connect, so we can understand them together and act on what we
            find.
          </p>
          <div className={`${styles.heroActions} ${styles.revealFade}`}>
            <Link href={TORONTO_HREF} className={styles.btnPrimary}>
              Explore Toronto Data →
            </Link>
          </div>
        </div>

        <div className={`${styles.heroRight} ${styles.revealFadeSlow}`}>
          <Link href={TORONTO_HREF} className={styles.sankeyContainer} aria-label="Explore City of Toronto financial information">
            <div className={styles.sankeyHeader}>
              <span className={styles.sankeyTitle}>City of Toronto · Financial Information</span>
              <span className={styles.sankeyCue}>Trace ↗</span>
            </div>
            <div className={styles.sankeySvgWrap}>
              <svg viewBox="0 0 500 336" width="100%">
                <defs>
                  <linearGradient id="g1" x1="0%" x2="100%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#e8a020" />
                  </linearGradient>
                  <linearGradient id="g2" x1="0%" x2="100%">
                    <stop offset="0%" stopColor="#2dd4bf" />
                    <stop offset="100%" stopColor="#e05252" />
                  </linearGradient>
                  <linearGradient id="g3" x1="0%" x2="100%">
                    <stop offset="0%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#4ade80" />
                  </linearGradient>
                  <linearGradient id="g4" x1="0%" x2="100%">
                    <stop offset="0%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#e8a020" />
                  </linearGradient>
                </defs>

                {/* Source nodes (left) — heights proportional to share of $14.0B */}
                <rect x="8" y="15" width="12" height="88" rx="2" fill="#3b82f6" opacity="0.9" transform="scale(1 1.2)" />
                <rect x="8" y="111" width="12" height="80" rx="2" fill="#2dd4bf" opacity="0.9" transform="scale(1 1.2)" />
                <rect x="8" y="199" width="12" height="32" rx="2" fill="#8b5cf6" opacity="0.9" transform="scale(1 1.2)" />
                <rect x="8" y="239" width="12" height="14" rx="2" fill="#f59e0b" opacity="0.9" transform="scale(1 1.2)" />

                <text x="26" y="64.8" fontFamily="DM Mono, monospace" fontSize="9" fill="#8896b3">Provincial Tfr.</text>
                <text x="26" y="76.8" fontFamily="DM Mono, monospace" fontSize="8" fill="#8896b3">$5.8B CAD</text>
                <text x="26" y="174.0" fontFamily="DM Mono, monospace" fontSize="9" fill="#8896b3">Property Tax</text>
                <text x="26" y="186.0" fontFamily="DM Mono, monospace" fontSize="8" fill="#8896b3">$5.2B CAD</text>
                <text x="26" y="249.6" fontFamily="DM Mono, monospace" fontSize="9" fill="#8896b3">User Fees</text>
                <text x="26" y="261.6" fontFamily="DM Mono, monospace" fontSize="8" fill="#8896b3">$2.1B CAD</text>
                <text x="26" y="292.8" fontFamily="DM Mono, monospace" fontSize="9" fill="#8896b3">Federal Grants</text>
                <text x="26" y="304.8" fontFamily="DM Mono, monospace" fontSize="8" fill="#8896b3">$0.9B CAD</text>

                {/* Centre node */}
                <rect x="195" y="10" width="14" height="255" rx="3" fill="#e8a020" opacity="0.95" transform="scale(1 1.2)" />
                <text x="202" y="7.2" fontFamily="Playfair Display, serif" fontSize="10" fill="#e8a020" textAnchor="middle">City of Toronto</text>
                <text x="202" y="331.2" fontFamily="DM Mono, monospace" fontSize="8" fill="#e8a020" textAnchor="middle">$14.0B</text>

                {/* Flows left to centre */}
                <path className={styles.flowPath} d="M20,59 C108,59 108,88 195,88" fill="none" stroke="url(#g1)" strokeWidth="50" opacity="0.18" transform="scale(1 1.2)" />
                <path d="M20,59 C108,59 108,88 195,88" fill="none" stroke="url(#g1)" strokeWidth="1.5" opacity="0.6" transform="scale(1 1.2)" />

                <path className={styles.flowPath} d="M20,151 C108,151 108,132 195,132" fill="none" stroke="url(#g2)" strokeWidth="45" opacity="0.18" style={{ animationDelay: '0.5s' }} transform="scale(1 1.2)" />
                <path d="M20,151 C108,151 108,132 195,132" fill="none" stroke="url(#g2)" strokeWidth="1.2" opacity="0.6" transform="scale(1 1.2)" />

                <path className={styles.flowPath} d="M20,215 C108,215 108,175 195,175" fill="none" stroke="url(#g3)" strokeWidth="18" opacity="0.18" style={{ animationDelay: '1s' }} transform="scale(1 1.2)" />
                <path d="M20,215 C108,215 108,175 195,175" fill="none" stroke="url(#g3)" strokeWidth="1" opacity="0.6" transform="scale(1 1.2)" />

                <path className={styles.flowPath} d="M20,246 C108,246 108,210 195,210" fill="none" stroke="url(#g4)" strokeWidth="8" opacity="0.18" style={{ animationDelay: '1.5s' }} transform="scale(1 1.2)" />
                <path d="M20,246 C108,246 108,210 195,210" fill="none" stroke="url(#g4)" strokeWidth="0.8" opacity="0.6" transform="scale(1 1.2)" />

                {/* Output nodes (right) — heights proportional to share of $14.0B */}
                <rect x="478" y="15" width="12" height="132" rx="2" fill="#e05252" opacity="0.9" transform="scale(1 1.2)" />
                <rect x="478" y="155" width="12" height="47" rx="2" fill="#f59e0b" opacity="0.9" transform="scale(1 1.2)" />
                <rect x="478" y="210" width="12" height="25" rx="2" fill="#4ade80" opacity="0.9" transform="scale(1 1.2)" />

                <text x="472" y="88.8" fontFamily="DM Mono, monospace" fontSize="9" fill="#8896b3" textAnchor="end">Services</text>
                <text x="472" y="100.8" fontFamily="DM Mono, monospace" fontSize="8" fill="#8896b3" textAnchor="end">$9.1B CAD</text>
                <text x="472" y="210.0" fontFamily="DM Mono, monospace" fontSize="9" fill="#8896b3" textAnchor="end">Capital Debt</text>
                <text x="472" y="222.0" fontFamily="DM Mono, monospace" fontSize="8" fill="#8896b3" textAnchor="end">$3.2B CAD</text>
                <text x="472" y="264.0" fontFamily="DM Mono, monospace" fontSize="9" fill="#8896b3" textAnchor="end">Corporate</text>
                <text x="472" y="276.0" fontFamily="DM Mono, monospace" fontSize="8" fill="#8896b3" textAnchor="end">$1.7B CAD</text>

                {/* Flows centre to right */}
                <path className={styles.flowPath} d="M209,74 C320,74 320,81 478,81" fill="none" stroke="#e05252" strokeWidth="74" opacity="0.15" style={{ animationDelay: '0.3s' }} transform="scale(1 1.2)" />
                <path d="M209,74 C320,74 320,81 478,81" fill="none" stroke="#e05252" strokeWidth="1.5" opacity="0.5" transform="scale(1 1.2)" />

                <path className={styles.flowPath} d="M209,162 C320,162 320,178 478,178" fill="none" stroke="#f59e0b" strokeWidth="26" opacity="0.15" style={{ animationDelay: '0.8s' }} transform="scale(1 1.2)" />
                <path d="M209,162 C320,162 320,178 478,178" fill="none" stroke="#f59e0b" strokeWidth="1.2" opacity="0.5" transform="scale(1 1.2)" />

                <path className={styles.flowPath} d="M209,215 C320,215 320,222 478,222" fill="none" stroke="#4ade80" strokeWidth="14" opacity="0.15" style={{ animationDelay: '1.3s' }} transform="scale(1 1.2)" />
                <path d="M209,215 C320,215 320,222 478,222" fill="none" stroke="#4ade80" strokeWidth="1" opacity="0.5" transform="scale(1 1.2)" />
              </svg>
            </div>
          </Link>
        </div>
      </section>

      {/* ── HOW IT WORKS / CHAIN ── */}
      <section className={styles.section} id="features">
        <div className={styles.sectionLabel}>Trace It</div>
        <h2 className={styles.sectionH2}>
          How it all <em>connects.</em>
        </h2>
        <p className={styles.sectionDesc}>
          Every dollar your city spends started as someone&apos;s idea. Democracy Distributed makes every step between that idea and
          the money visible and connected.
        </p>

        <div className={styles.chainRow}>
          <div className={styles.chainCol} data-node="suggestion">
            <div className={styles.chainNodeWrap}>
              <div className={`${styles.chainNodeDot} ${styles.cnSuggestion}`}>💬</div>
              <div className={styles.chainNodeLine} />
            </div>
            <div className={`${styles.chainNodeTag} ${styles.cnTagSuggestion}`}>Suggestion</div>
            <div className={styles.chainNodeTitle}>Someone speaks up</div>
            <p className={styles.chainNodeDesc}>
              &quot;The path near Riverdale Park is cracked, wheelchairs can&apos;t get through.&quot; Open to anyone. No credentials
              needed.
            </p>
          </div>

          <div className={styles.chainCol} data-node="item">
            <div className={styles.chainNodeWrap}>
              <div className={`${styles.chainNodeDot} ${styles.cnItem}`}>⚖️</div>
              <div className={styles.chainNodeLine} />
            </div>
            <div className={`${styles.chainNodeTag} ${styles.cnTagItem}`}>Item / Motion</div>
            <div className={styles.chainNodeTitle}>It becomes a decision</div>
            <p className={styles.chainNodeDesc}>
              Staff formalize it. A motion is debated, amended, recorded, with the names of everyone involved.
            </p>
          </div>

          <div className={styles.chainCol} data-node="vote">
            <div className={styles.chainNodeWrap}>
              <div className={`${styles.chainNodeDot} ${styles.cnVote}`}>✓</div>
              <div className={styles.chainNodeLine} />
            </div>
            <div className={`${styles.chainNodeTag} ${styles.cnTagVote}`}>Vote</div>
            <div className={styles.chainNodeTitle}>Council authorizes</div>
            <p className={styles.chainNodeDesc}>
              22 in favour, 3 opposed. The vote is the gate: before it, no money moves. After it, $45,000 is committed.
            </p>
          </div>

          <div className={styles.chainCol} data-node="project">
            <div className={styles.chainNodeWrap}>
              <div className={`${styles.chainNodeDot} ${styles.cnProject}`}>📁</div>
              <div className={styles.chainNodeLine} />
            </div>
            <div className={`${styles.chainNodeTag} ${styles.cnTagProject}`}>Project</div>
            <div className={styles.chainNodeTitle}>Work begins</div>
            <p className={styles.chainNodeDesc}>
              A contractor is selected. Milestones are tracked. The $45,000 shows as a greyed flow in the Sankey: planned, not yet
              spent.
            </p>
          </div>

          <div className={styles.chainCol} data-node="money">
            <div className={styles.chainNodeWrap}>
              <div className={`${styles.chainNodeDot} ${styles.cnMoney}`}>$</div>
              <div className={`${styles.chainNodeLine} ${styles.chainNodeLineLast}`} />
            </div>
            <div className={`${styles.chainNodeTag} ${styles.cnTagMoney}`}>Ledger Entry</div>
            <div className={styles.chainNodeTitle}>The dollar moves</div>
            <p className={styles.chainNodeDesc}>
              Each invoice paid fills the Sankey with colour. Tap any flow to trace it back to the vote, the complaint, the person who
              raised it.
            </p>
          </div>
        </div>

        <p className={styles.chainCtaLine}>
          This is the Trace Panel.{' '}
          <Link href={TORONTO_HREF} className={styles.chainCtaLink}>
            See it live in the Toronto org page →
          </Link>
        </p>
      </section>

      {/* ── CONTRIBUTE ── */}
      <section className={styles.contributeSection} id="contribute">
        <div className={styles.contributeInner}>
          <div>
            <div className={styles.sectionLabel}>Contribute</div>
            <h2 className={styles.sectionH2}>
              Build it <em>together.</em>
            </h2>
            <p className={styles.sectionDesc} style={{ marginBottom: 32 }}>
              Democracy Distributed runs on community contributions. Every verified data point, correction, or new organization you
              add is credited to you and builds your reputation.
            </p>
            <div className={styles.contributePoints}>
              <div>
                <h3 className={styles.contributePointTitle}>Understand together</h3>
                <p className={styles.contributePointText}>
                  Ask questions, share what you know, and make sense of decisions alongside people who know the story first-hand.
                </p>
              </div>
              <div>
                <h3 className={styles.contributePointTitle}>Act together</h3>
                <p className={styles.contributePointText}>
                  Follow the issues you care about, take what you find to council, and organize with others who care about the
                  same thing.
                </p>
              </div>
            </div>
            <Link href="/contribute" className={styles.btnPrimary}>
              Start Contributing →
            </Link>
          </div>

          <div className={styles.repDemo}>
            <div className={styles.repHeader}>
              <span className={styles.repTitle}>Reputation Activity</span>
              <span className={styles.repScore}>847 pts</span>
            </div>
            <div className={styles.repEvents}>
              <div className={styles.repEvent}>
                <div className={styles.repEventIcon} style={{ background: 'rgba(74,222,128,0.1)' }}>📊</div>
                <div className={styles.repEventText}>
                  Added Paramedic Services budget data
                  <small>City of Toronto · Verified by 3 members · 2 days ago</small>
                </div>
                <span className={`${styles.repEventPoints} ${styles.pos}`}>+50</span>
              </div>
              <div className={styles.repEvent}>
                <div className={styles.repEventIcon} style={{ background: 'rgba(232,160,32,0.1)' }}>🔗</div>
                <div className={styles.repEventText}>
                  Linked a contract to its authorizing vote
                  <small>City of Toronto · 4 days ago</small>
                </div>
                <span className={`${styles.repEventPoints} ${styles.pos}`}>+30</span>
              </div>
              <div className={styles.repEvent}>
                <div className={styles.repEventIcon} style={{ background: 'rgba(59,130,246,0.1)' }}>✅</div>
                <div className={styles.repEventText}>
                  Verified a transaction record
                  <small>Toronto Community Housing · 1 week ago</small>
                </div>
                <span className={`${styles.repEventPoints} ${styles.pos}`}>+15</span>
              </div>
              <div className={styles.repEvent}>
                <div className={styles.repEventIcon} style={{ background: 'rgba(224,82,82,0.1)' }}>⚠️</div>
                <div className={styles.repEventText}>
                  Flagged incorrect data
                  <small>Correction accepted · 2 weeks ago</small>
                </div>
                <span className={`${styles.repEventPoints} ${styles.pos}`}>+10</span>
              </div>
              <div className={styles.repEvent}>
                <div className={styles.repEventIcon} style={{ background: 'rgba(139,92,246,0.1)' }}>🏛️</div>
                <div className={styles.repEventText}>
                  Added new organization profile
                  <small>Toronto Public Library · 3 weeks ago</small>
                </div>
                <span className={`${styles.repEventPoints} ${styles.pos}`}>+30</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <div className={styles.ctaSection}>
        <h2 className={styles.ctaH2}>
          Your city&apos;s data
          <br />
          deserves to be <em>seen.</em>
        </h2>
        <p className={styles.ctaDesc}>
          Help us map every government, track every decision, and make civic data a public right, not a privilege.
        </p>
        <div className={styles.ctaActions}>
          <Link href={TORONTO_HREF} className={styles.btnPrimary}>
            Explore Live Data →
          </Link>
          <Link href="/contribute" className={styles.btnSecondary}>
            Contribute Data
          </Link>
        </div>
      </div>

      <Footer />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'Democracy Distributed',
            url: 'https://democracydistributed.com',
            description:
              'Open civic data platform connecting government finances, decisions, and outcomes. Follow money from vote to invoice.',
            foundingDate: '2024',
            knowsAbout: ['government spending', 'civic accountability', 'municipal finance', 'open data'],
            areaServed: ['Canada', 'India'],
          }),
        }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'DataCatalog',
            name: 'Democracy Distributed Civic Data Catalog',
            description:
              'Open, crowdsourced data connecting government finances, decisions, and outcomes: municipal budgets, council decisions, funded projects, and the ledger entries that trace spending back to the votes that authorized it.',
            url: 'https://democracydistributed.com/browse',
            creator: { '@type': 'Organization', name: 'Democracy Distributed' },
            keywords: ['municipal budget', 'government spending', 'civic accountability', 'open data', 'council decisions'],
          }),
        }}
      />
    </div>
  );
}
