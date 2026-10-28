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
            An open record of <em>how organizations spend and decide</em>, and a public that can use it.
          </h1>
          <p className={styles.heroSub}>
            The accountability data is public, but scattered, and understanding it alone changes nothing. We&apos;re connecting it,
            and building the public that can act on it. Built in the open, in Toronto, and looking for people to build it.
          </p>
        </div>
      </div>

      {/* ── WHAT THIS IS ── */}
      <section className={`${styles.section} ${styles.sectionAlt}`} id="what">
        <div className={styles.container}>
          <div className={styles.orientationInner}>
            <FadeUp>
              <div className={styles.eyebrow}>What This Is</div>
              <h2>
                More than a database. <em>A way to understand power, together.</em>
              </h2>
              <p>
                Democracy Distributed (DD) is one shared way of recording how any group runs: its decisions, rules, money,
                people, and projects. It works the same whether the group is a city government, your neighbourhood association,
                or your workplace.
              </p>
              <p>
                But the record is the means, not the point. The point is to help people understand how the system around them
                actually works (how money moves, who decides, and when) and to find others who see the same things. Toronto is
                where we started.
              </p>
            </FadeUp>

            <FadeUp className={styles.chainMotif}>
              <div className={`${styles.chainNode} ${styles.chainNodeAmber}`}>
                <div className={styles.chainNodeLabel}>Allocation</div>
                <div className={styles.chainNodeValue}>Money</div>
              </div>
              <div className={styles.chainArrow} />
              <div className={`${styles.chainNode} ${styles.chainNodeTeal}`}>
                <div className={styles.chainNodeLabel}>Vote / Policy</div>
                <div className={styles.chainNodeValue}>Decision</div>
              </div>
              <div className={styles.chainArrow} />
              <div className={`${styles.chainNode} ${styles.chainNodeAmber}`}>
                <div className={styles.chainNodeLabel}>Impact / Contract</div>
                <div className={styles.chainNodeValue}>Outcome</div>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ── THE PROBLEM ── */}
      <section className={styles.section} id="problem">
        <div className={styles.container}>
          <FadeUp>
            <div className={styles.eyebrow}>The Problem</div>
            <h2 className={styles.problemTitle}>
              It&apos;s hard to understand <em>how it all works.</em>
            </h2>
            <div className={styles.problemGrid}>
              <div className={styles.problemCard}>
                <h3>It feels distant</h3>
                <p>
                  What happens in government, and in most large organizations, feels far away. The information is scattered across
                  meeting minutes, budgets, contracts, and websites, and the system itself is complicated.
                </p>
              </div>
              <div className={styles.problemCard}>
                <h3>Stories disappear</h3>
                <p>
                  When an issue stops being covered in the news, it usually drops out of sight. Nobody knows what happened next:
                  whether the promise was kept, the money spent, or the project finished.
                </p>
              </div>
              <div className={styles.problemCard}>
                <h3>Understanding alone isn&apos;t enough</h3>
                <p>
                  Even when people do understand an issue, there&apos;s rarely a way to build on that understanding together: to
                  pool what everyone knows, find others who care about the same thing, and join forces so the outcomes we want
                  actually happen.
                </p>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── GET INVOLVED ── */}
      <section className={styles.section} id="who">
        <div className={styles.container}>
          <FadeUp className={styles.narrow}>
            <div className={styles.eyebrow}>Get Involved</div>
            <h2>
              Built in the open, <em>looking for collaborators.</em>
            </h2>
            <p>
              Democracy Distributed is a working proof of concept, built in Toronto and released in the open. No org chart, no
              funding round, no press release, just the thing itself, and an honest invitation.
            </p>
            <p>
              DD aims to be a self-governing project, running its own teams, decisions, and money in the open, the same way it
              asks every organization to.
            </p>
            <div className={styles.ctas}>
              <Link href={TORONTO_HREF} className={`${styles.btn} ${styles.btnPrimary}`}>
                Explore Toronto&apos;s data →
              </Link>
              <Link href="/contribute" className={`${styles.btn} ${styles.btnSecondary}`}>
                Contribute →
              </Link>
            </div>
          </FadeUp>
        </div>
      </section>

      <Footer />
    </div>
  );
}
