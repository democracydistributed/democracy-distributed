'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Nav from './Nav';
import Footer from './Footer';
import styles from './Contribute.module.css';

const APP_URL = 'https://app.democracydistributed.com';

export default function ContributePage() {
  const [ready, setReady] = useState(false);
  const flowRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    // Compute per-path dash lengths so all four lines reveal evenly
    if (flowRef.current) {
      flowRef.current.querySelectorAll('path').forEach(p => {
        const len = p.getTotalLength();
        p.style.strokeDasharray = `${len}`;
        p.style.strokeDashoffset = `${len}`;
      });
    }

    // Brief delay so browser paints the initial hidden state before animating
    const t = setTimeout(() => {
      setReady(true);
      if (flowRef.current) {
        flowRef.current.querySelectorAll('path').forEach(p => {
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
      <div className={heroClass}>
        <div className={styles.gridOverlay} aria-hidden="true" />
        <svg
          ref={flowRef}
          viewBox="0 0 1100 480"
          preserveAspectRatio="none"
          className={styles.flowBg}
          aria-hidden="true"
        >
          <path d="M -50,90 C 250,90 300,200 600,200 C 850,200 900,60 1150,60"   fill="none" stroke="var(--amber)" strokeOpacity="0.18" strokeWidth="1.5" />
          <path d="M -50,180 C 200,180 320,330 600,330 C 880,330 920,420 1150,420" fill="none" stroke="var(--teal)"  strokeOpacity="0.16" strokeWidth="1.5" />
          <path d="M -50,300 C 280,300 260,140 560,140 C 820,140 950,260 1150,260" fill="none" stroke="var(--muted)" strokeOpacity="0.12" strokeWidth="1.5" />
          <path d="M -50,420 C 220,420 300,440 500,440 C 760,440 880,300 1150,300" fill="none" stroke="var(--amber)" strokeOpacity="0.10" strokeWidth="1.5" />
        </svg>

        <div className={styles.heroInner}>
          <div className={styles.heroEyebrow}>
            <span className={styles.eyebrowLine} aria-hidden="true" />
            <span className={styles.eyebrowText}>Contribute</span>
          </div>
          <div className={styles.headlineWrap}>
            <h1 className={styles.heroH1}>
              The data exists.<br />
              The <em>connections</em> don&apos;t — yet.
            </h1>
          </div>
          <p className={`${styles.heroDesc} ${styles.heroFade}`}>
            Government budgets are public. Council decisions are public. But nobody has connected them — transaction to decision,
            dollar to vote. That&apos;s what contributors do here.
          </p>
          <p className={`${styles.heroSubdesc} ${styles.heroFade}`}>
            Think Wikipedia, but for the accountability chain between public money and the decisions that authorized it. Every link
            you make is permanent, public, and credited to you.
          </p>
          <div className={`${styles.heroActions} ${styles.heroFade}`}>
            <a className={styles.btnPrimary} href={APP_URL} target="_blank" rel="noopener noreferrer">
              Create an account →
            </a>
            <Link className={styles.btnSecondary} href="/browse">
              Explore the data first
            </Link>
          </div>
        </div>
      </div>

      {/* ── WHAT CONTRIBUTORS DO — alt bg ── */}
      <div className={styles.sectionWrapAlt}>
        <div className={styles.section}>
          <div className={styles.sectionLabel}>What Contributors Do</div>
          <h2>
            Three kinds of work.<br />
            One <em>accountability chain.</em>
          </h2>
          <p className={styles.sectionIntro}>
            Every contribution moves the platform closer to a complete picture of how public money flows through decisions and into
            the world. You don&apos;t need to do everything — pick what fits your skills and interest.
          </p>

          <div className={styles.taskGrid}>
            <div className={styles.taskCard}>
              <span className={styles.taskIcon}>🔗</span>
              <div className={styles.taskTitle}>Connect the chain</div>
              <p className={styles.taskDesc}>
                Find a transaction that&apos;s missing its decision link. Match it to the council Item, meeting, or vote that
                authorized the spend. This is the core work — and the hardest data to find anywhere else.
              </p>
              <div className={styles.taskProduces}>Builds a verified link</div>
            </div>
            <div className={styles.taskCard}>
              <span className={styles.taskIcon}>📥</span>
              <div className={styles.taskTitle}>Enter source data</div>
              <p className={styles.taskDesc}>
                Pull budget line items, transaction records, or council decisions from official government documents and enter them
                into the platform. Grows the database that everything else depends on.
              </p>
              <div className={styles.taskProduces}>Adds a source record</div>
            </div>
            <div className={styles.taskCard}>
              <span className={styles.taskIcon}>✅</span>
              <div className={styles.taskTitle}>Verify &amp; correct</div>
              <p className={styles.taskDesc}>
                Review data others have entered. Flag errors, suggest corrections, or confirm accuracy. The platform only becomes
                trustworthy when the community checks each other&apos;s work.
              </p>
              <div className={styles.taskProduces}>Keeps the data honest</div>
            </div>
            <div className={`${styles.taskCard} ${styles.taskCardSecondary}`}>
              <span className={styles.taskIcon}>🏛️</span>
              <div className={styles.taskTitle}>Add a new organization</div>
              <p className={styles.taskDesc}>
                Set up the profile for a government body or civic org that isn&apos;t yet on the platform. Includes jurisdiction,
                structure, positions, and initial budget data.
              </p>
              <div className={styles.taskProduces}>Opens a new org page</div>
            </div>
            <div className={`${styles.taskCard} ${styles.taskCardSecondary}`}>
              <span className={styles.taskIcon}>📋</span>
              <div className={styles.taskTitle}>Pick up a platform job</div>
              <p className={styles.taskDesc}>
                The platform&apos;s central government posts structured Jobs — specific tasks with a defined scope. Browse open jobs
                and claim one.
              </p>
              <div className={`${styles.taskProduces} ${styles.taskProducesSoon}`}>Coming soon</div>
            </div>
            <div className={`${styles.taskCard} ${styles.taskCardSecondary}`}>
              <span className={styles.taskIcon}>💡</span>
              <div className={styles.taskTitle}>Submit a suggestion</div>
              <p className={styles.taskDesc}>
                Spot a data gap or a missing relationship between records? Submit a Suggestion. If it&apos;s accepted and acted on,
                you get credit for starting the chain.
              </p>
              <div className={styles.taskProduces}>Starts a new chain</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── HOW IT WORKS — plain bg ── */}
      <div className={styles.section} id="how-it-works">
        <div className={styles.sectionLabel}>How It Works · No account needed</div>
        <h2>
          Complete a chain that <em>already exists.</em>
        </h2>
        <p className={styles.sectionIntro}>
          The contribution flow is a guided search, not a data-entry form. You aren&apos;t creating records from scratch —
          you&apos;re linking records that already exist. The work is recognition, not recall.
        </p>

        <div className={styles.steps}>
          <div className={styles.step}>
            <div className={styles.stepNum}>1</div>
            <h3>Spot what&apos;s missing</h3>
            <p>
              On any org page, the money-to-decision chain is laid out — and incomplete links are visible. Find one you can help
              with.
            </p>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNum}>2</div>
            <h3>Pick the match</h3>
            <p>Search the records that already exist and choose the right one. One tap. No forms to fill.</p>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNum}>3</div>
            <h3>Submit</h3>
            <p>The community verifies your link, then it goes live on the page — credited to you.</p>
          </div>
        </div>
      </div>

      {/* ── WHAT YOU GET — alt bg ── */}
      <div className={styles.sectionWrapAlt}>
        <div className={styles.section}>
          <div className={styles.sectionLabel}>What You Get</div>
          <h2>
            Recognition that&apos;s <em>real</em> today.
          </h2>
          <p className={styles.sectionIntro}>
            Every contribution is logged against your account and visible on your public profile. Your name appears on the data you
            connected — permanently. The accountability chain you&apos;re building includes you.
          </p>

          <div className={styles.rewardsGrid}>
            <div className={styles.rewardCard}>
              <div className={styles.rewardIcon}>✍️</div>
              <h3>Your name on the data</h3>
              <p>Every link you make is credited to you, permanently — part of the public record you&apos;re helping build.</p>
            </div>
            <div className={styles.rewardCard}>
              <div className={styles.rewardIcon}>👤</div>
              <h3>A public profile</h3>
              <p>Every chain you&apos;ve closed, gathered on one shareable page. Recognition you can point to — not a points dashboard.</p>
            </div>
            <div className={styles.rewardCard}>
              <div className={styles.rewardIcon}>↗</div>
              <h3>A growing voice</h3>
              <p>As you contribute, you unlock higher-trust contributions, moderation, and a say in how the platform evolves.</p>
            </div>
          </div>
          <p className={styles.rewardNote}>
            A contribution currency is planned for later — for now, the record and the recognition are the reward.
          </p>
        </div>
      </div>

      {/* ── CTA ── */}
      <div className={styles.ctaSection}>
        <h2>
          Every connection you make<br />
          is a piece of the chain<br />
          <em>nobody else has built.</em>
        </h2>
        <p>The data is out there. It just hasn&apos;t been connected yet. That&apos;s the work — and it matters.</p>
        <div className={styles.ctaActions}>
          <a className={styles.btnPrimary} href={APP_URL} target="_blank" rel="noopener noreferrer">
            Create an account →
          </a>
          <Link className={styles.btnSecondary} href="/browse">
            Explore the data first
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}
