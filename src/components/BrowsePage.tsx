'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import Nav from './Nav';
import Footer from './Footer';
import { fetchOrgs } from '@/lib/api';
import type { OrgSummary } from '@/lib/types';
import styles from './Browse.module.css';

type LoadState = 'loading' | 'error' | 'ready';

function orgKey(o: OrgSummary): string {
  return o.orgId || o.id || '';
}

function jurisdictionOf(o: OrgSummary): string {
  return o.jurisdiction || [o.city, o.province || o.state, o.country].filter(Boolean).join(' · ');
}

function OrgCard({ org, index }: { org: OrgSummary; index: number }) {
  const id = orgKey(org);
  const isLive = org.status === 'Active';
  const badge = [org.type, org.subType].filter(Boolean).join(' · ') || 'Organization';
  const jurisdiction = jurisdictionOf(org);
  return (
    <Link href={`/?orgId=${encodeURIComponent(id)}`} className={`${styles.orgCard} ${styles.fadeUp}`} style={{ animationDelay: `${(index % 5) * 0.05}s` }}>
      <div className={styles.cardBanner}>
        <div className={styles.cardBannerPattern} />
        <div className={styles.cardBannerGlow} />
        <div className={styles.orgTypeBadge}>{badge}</div>
        {isLive ? (
          <div className={styles.dataBadge}>
            <span className={styles.dataBadgeDot} />
            Live Data
          </div>
        ) : null}
      </div>
      <div className={styles.cardBody}>
        {jurisdiction ? <div className={styles.orgJurisdiction}>{jurisdiction}</div> : null}
        <div className={styles.orgName}>{org.name || 'Unknown Organization'}</div>
        {org.description ? <div className={styles.orgDesc}>{org.description}</div> : null}
        <div className={styles.cardCta}>
          <span className={styles.ctaLink}>
            Explore
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path d="M2 7h10M8 3l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function BrowsePage() {
  const [orgs, setOrgs] = useState<OrgSummary[]>([]);
  const [state, setState] = useState<LoadState>('loading');
  const [query, setQuery] = useState('');

  const load = useCallback(() => {
    setState('loading');
    fetchOrgs()
      .then((data) => {
        setOrgs(data.orgs || []);
        setState('ready');
      })
      .catch(() => setState('error'));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const q = query.toLowerCase().trim();
  const filtered = q ? orgs.filter((o) => (o.name || '').toLowerCase().includes(q)) : orgs;

  return (
    <div className={styles.page}>
      <Nav />

      <div className={styles.main}>
      <div className={styles.pageHeader}>
        <div className={styles.breadcrumb}>
          <Link href="/">Home</Link>
          <span>/</span>
          <span>Browse Organizations</span>
        </div>
        <h1 className={styles.title}>
          Browse <em>Organizations</em>
        </h1>
        <p className={styles.lede}>
          Explore organizations where public finances, decisions, and projects are connected and tracked in a single accountability chain.
        </p>
      </div>

      <div className={styles.controlsBar}>
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon}>
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} width={16} height={16}>
              <circle cx="8.5" cy="8.5" r="5.5" />
              <path d="M15 15l-3-3" strokeLinecap="round" />
            </svg>
          </span>
          <input type="text" placeholder="Search organizations…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>

      <div className={styles.mainLayout}>
        <div>
          <div className={styles.resultsHeader}>
            <span className={styles.resultsCount}>
              <strong>{state === 'ready' ? filtered.length : '—'}</strong> organizations
            </span>
          </div>

          <div className={styles.orgGrid}>
            {state === 'loading' ? (
              <div className={`${styles.gridStatus} ${styles.loadingState}`}>Loading organizations…</div>
            ) : state === 'error' ? (
              <div className={`${styles.gridStatus} ${styles.errorState}`}>
                <span>Failed to load organizations. Check your connection and try again.</span>
                <button className={styles.retryBtn} onClick={load}>
                  Retry
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <div className={`${styles.gridStatus} ${styles.noResults}`}>No organizations match your search.</div>
            ) : (
              filtered.map((org, i) => <OrgCard key={orgKey(org) || i} org={org} index={i} />)
            )}
          </div>
        </div>

        <aside className={styles.sidebar}>
          <div className={styles.contributeCard}>
            <h3>Help build this database</h3>
            <p>Every connection you make between a decision and a dollar is a piece of the accountability chain nobody else has built.</p>
            <a className={styles.btnPrimary} href="#contribute">
              Start Contributing →
            </a>
          </div>
        </aside>
      </div>
      </div>

      <Footer />
    </div>
  );
}
