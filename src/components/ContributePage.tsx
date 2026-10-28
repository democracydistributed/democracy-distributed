'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Nav from './Nav';
import Footer from './Footer';
import ItemsTab from './tabs/ItemsTab';
import ProjectsTab from './tabs/ProjectsTab';
import PeopleTab from './tabs/PeopleTab';
import SuggestionsTab from './tabs/SuggestionsTab';
import { makeFmt } from '@/lib/format';
import { useTabKeys } from '@/hooks/useTabKeys';
import styles from './Contribute.module.css';

const DOCS_URL = 'https://democracy-distributed.gitbook.io/democracy-distributed-docs';
const SLACK_URL = 'http://link.civictech.ca/slack';
const CONTACT_EMAIL = 'democracydistributed@gmail.com';

type GovTab = 'suggestions' | 'items' | 'projects' | 'finances' | 'rules' | 'people';
const GOV_TABS: { id: GovTab; label: string }[] = [
  { id: 'suggestions', label: 'Suggestions' },
  { id: 'items', label: 'Items' },
  { id: 'projects', label: 'Projects' },
  { id: 'finances', label: 'Finances' },
  { id: 'rules', label: 'Rules' },
  { id: 'people', label: 'People' },
];

const GOV_TAB_IDS = GOV_TABS.map((t) => t.id);

const TASKS = [
  { title: 'Connect the chain', desc: 'Match a transaction to the council item, meeting, or vote that authorized the spend. This is the core work.', result: 'Builds a verified link' },
  { title: 'Enter source data', desc: 'Enter budget line items, transactions, or council decisions from official government documents.', result: 'Adds a source record' },
  { title: 'Verify & correct', desc: "Review data others have entered. Flag errors, suggest corrections, or confirm what's right.", result: 'Keeps the data honest' },
];

const STEPS = [
  { n: '1', title: "Spot what's missing", desc: 'On any org page, incomplete links in the chain are visible.' },
  { n: '2', title: 'Pick the match', desc: 'Search existing records and choose the right one. No forms.' },
  { n: '3', title: 'Submit', desc: 'The community verifies your link, then it goes live, credited to you.' },
];

export default function ContributePage({ govOrgId }: { govOrgId: string | null }) {
  const [ready, setReady] = useState(false);
  const [activeTab, setActiveTab] = useState<GovTab>('suggestions');
  const fmt = useMemo(() => makeFmt(false), []);
  const tabKeys = useTabKeys(GOV_TAB_IDS, activeTab, setActiveTab);
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
              Join us, and help <em>make city spending easy to follow.</em>
            </h1>
          </div>
          <p className={`${styles.heroDesc} ${styles.heroFade}`}>
            Find us on the Civic Tech Toronto Slack in #proj-dd, or send an email.
          </p>
          <div className={`${styles.joinGrid} ${styles.heroFade}`}>
            <a className={styles.joinCard} href={SLACK_URL} target="_blank" rel="noopener noreferrer">
              <div className={`${styles.joinKind} ${styles.joinKindTeal}`}>Slack</div>
              <div className={styles.joinTitle}>#proj-dd</div>
              <div className={styles.joinSub}>Civic Tech Toronto Slack</div>
            </a>
            <a className={styles.joinCard} href={`mailto:${CONTACT_EMAIL}`}>
              <div className={styles.joinKind}>Email</div>
              <div className={`${styles.joinTitle} ${styles.joinTitleEmail}`}>{CONTACT_EMAIL}</div>
              <div className={styles.joinSub}>Write to us directly</div>
            </a>
          </div>
        </div>
      </div>

      {/* ── HOW WE GOVERN ── */}
      <div className={`${styles.section} ${styles.sectionGovern}`}>
        <div className={styles.sectionLabel}>How we govern</div>
        <h2>
          We run on the <em>same tools</em> we publish.
        </h2>
        <p className={`${styles.sectionIntro} ${styles.introTight}`}>
          Democracy Distributed is self-governing. Our own decisions live in an organization on the platform, DD Central Government,
          and are recorded the way any public body&apos;s would be.
        </p>
        <p className={`${styles.sectionIntro} ${styles.introLast}`}>
          Anyone can post a suggestion. Suggestions become items that members vote on. Approved items become projects with budgets,
          and the rules that bind all of it are written down in the open. What follows is the live page.
        </p>
      </div>

      <div className={styles.liveWrap}>
        <div className={styles.liveFrame}>
          <div className={styles.liveHead}>
            <div>
              <div className={styles.liveLabel}>Organization</div>
              <div className={styles.liveName}>DD Central Government</div>
            </div>
            {govOrgId ? (
              <Link className={styles.liveOpen} href={`/org/${govOrgId}`}>
                Open full page →
              </Link>
            ) : null}
          </div>
          <div className={styles.liveTabs} role="tablist" aria-label="DD Central Government sections" onKeyDown={tabKeys.onKeyDown}>
            {GOV_TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                id={`tab-${t.id}`}
                aria-controls="panel-gov"
                aria-selected={activeTab === t.id}
                tabIndex={tabKeys.tabIndex(t.id)}
                className={`${styles.liveTab} ${activeTab === t.id ? styles.liveTabOn : ''}`}
                onClick={() => setActiveTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className={styles.liveBody} role="tabpanel" id="panel-gov" aria-labelledby={`tab-${activeTab}`}>
            {!govOrgId ? (
              <div className="items-state">The live organization page is unavailable right now.</div>
            ) : activeTab === 'suggestions' ? (
              <SuggestionsTab orgId={govOrgId} />
            ) : activeTab === 'items' ? (
              <ItemsTab orgId={govOrgId} />
            ) : activeTab === 'projects' ? (
              <ProjectsTab orgId={govOrgId} fmt={fmt} />
            ) : activeTab === 'people' ? (
              <PeopleTab orgId={govOrgId} />
            ) : (
              <div className="items-state">
                {activeTab === 'finances' ? 'Finances' : 'Rules'} live on the{' '}
                <Link href={`/org/${govOrgId}`} style={{ color: 'var(--teal)' }}>
                  full organization page
                </Link>
                .
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── WHAT CONTRIBUTORS DO ── */}
      <div className={styles.sectionWrapAlt}>
        <div className={styles.section}>
          <div className={styles.sectionLabel}>What contributors do</div>
          <h2>
            Link records that <em>already exist.</em>
          </h2>

          <div className={styles.taskGrid}>
            {TASKS.map((k) => (
              <div className={styles.taskCard} key={k.title}>
                <div className={styles.taskTitle}>{k.title}</div>
                <p className={styles.taskDesc}>{k.desc}</p>
                <div className={styles.taskProduces}>{k.result}</div>
              </div>
            ))}
          </div>

          <div className={styles.steps}>
            {STEPS.map((p) => (
              <div className={styles.step} key={p.n}>
                <div className={styles.stepNum}>{p.n}</div>
                <div>
                  <h3>{p.title}</h3>
                  <p>{p.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.heroActions}>
            <a className={styles.btnPrimary} href={DOCS_URL} target="_blank" rel="noopener noreferrer">
              Learn more →
            </a>
            <Link className={styles.btnSecondary} href="/browse">
              Explore the data first
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
