'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Nav from './Nav';
import Footer from './Footer';
import { fetchOrgs } from '@/lib/api';
import {
  ALL_COUNTRIES,
  COUNTRY_COOKIE,
  countryOptions,
  isGlobalOrg,
  orgInCountry,
  resolveCountry,
  type CountryChoice,
  type CountryResolution,
} from '@/lib/country';
import type { OrgSummary } from '@/lib/types';
import styles from './Browse.module.css';

type LoadState = 'loading' | 'error' | 'ready';
type Category = 'all' | 'government' | 'community';
type View = 'list' | 'map';

function orgKey(o: OrgSummary): string {
  return o.orgId || o.id || '';
}

/** Native orgs (run on DD) are community; everything else is observed government. */
const NATIVE_TYPES = ['Community Group', 'DD Government'];

function categoryOf(o: OrgSummary): 'government' | 'community' {
  if (o.category) return o.category;
  return o.type && NATIVE_TYPES.includes(o.type) ? 'community' : 'government';
}

function jurisdictionOf(o: OrgSummary): string {
  if (isGlobalOrg(o) && !o.city && !o.region) return 'Global';
  const parts = [o.city || o.jurisdiction, o.region || o.province || o.state, o.country];
  return parts.filter((p, i): p is string => !!p && parts.indexOf(p) === i).join(' · ');
}

const byName = (a: OrgSummary, b: OrgSummary) => (a.name || '').localeCompare(b.name || '');

function Arrow() {
  return (
    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M2 7h10M8 3l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function OrgCard({ org, index }: { org: OrgSummary; index: number }) {
  const id = orgKey(org);
  const isLive = org.status === 'Active';
  const isCommunity = categoryOf(org) === 'community';
  const badge = [org.type, org.subType].filter(Boolean).join(' · ') || 'Organization';
  const jurisdiction = jurisdictionOf(org);
  return (
    <Link
      href={`/org/${encodeURIComponent(id)}`}
      className={`${styles.orgCard} ${isCommunity ? styles.community : styles.government} ${styles.fadeUp}`}
      style={{ animationDelay: `${(index % 5) * 0.05}s` }}
    >
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
            <Arrow />
          </span>
        </div>
      </div>
    </Link>
  );
}

function AddCard({ title, body, cta, community }: { title: string; body: string; cta: string; community?: boolean }) {
  return (
    <div className={styles.addCard}>
      <div className={styles.addCardTitle}>{title}</div>
      <div className={styles.addCardBody}>{body}</div>
      <a href="/contribute" className={`${styles.addCardLink} ${community ? styles.addCardLinkCommunity : ''}`}>
        {cta} →
      </a>
    </div>
  );
}

function SectionHead({ eyebrow, title, community }: { eyebrow: string; title: string; community?: boolean }) {
  return (
    <div className={styles.sectionHead}>
      <div className={`${styles.sectionEyebrow} ${community ? styles.sectionEyebrowCommunity : ''}`}>
        <span className={styles.sectionRule} />
        {eyebrow}
      </div>
      <h2 className={styles.sectionTitle}>{title}</h2>
    </div>
  );
}

function rememberCountry(key: string) {
  try {
    document.cookie = `${COUNTRY_COOKIE}=${encodeURIComponent(key)}; path=/; max-age=31536000; samesite=lax`;
  } catch {}
  try {
    const url = new URL(window.location.href);
    url.searchParams.set('country', key);
    url.searchParams.delete('simulateCountry');
    window.history.replaceState(null, '', url.toString());
  } catch {}
}

interface Props {
  ipCountry: string | null;
  savedCountry: string | null;
  urlCountry: string | null;
}

export default function BrowsePage({ ipCountry, savedCountry, urlCountry }: Props) {
  const [orgs, setOrgs] = useState<OrgSummary[]>([]);
  const [state, setState] = useState<LoadState>('loading');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category>('all');
  const [view, setView] = useState<View>('list');
  const [resolution, setResolution] = useState<CountryResolution | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLButtonElement>(null);

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

  const countries = useMemo(() => countryOptions(orgs), [orgs]);

  // Resolve once the org list is in, so detection only lands on countries we can show.
  useEffect(() => {
    if (state !== 'ready' || resolution) return;
    const locales = typeof navigator !== 'undefined' ? navigator.languages || [navigator.language] : [];
    setResolution(resolveCountry({ url: urlCountry, saved: savedCountry, ip: ipCountry, locales }, countries));
  }, [state, resolution, countries, urlCountry, savedCountry, ipCountry]);

  useEffect(() => {
    if (!pickerOpen) return;
    const options = () => Array.from(pickerRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') || []);
    // Start on the current country so Enter on open is a no-op, like a native select.
    (options().find((b) => b.getAttribute('aria-selected') === 'true') || options()[0])?.focus();
    const onDown = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPickerOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPickerOpen(false);
        pillRef.current?.focus();
        return;
      }
      const list = options();
      const i = list.indexOf(document.activeElement as HTMLButtonElement);
      const next =
        e.key === 'ArrowDown' ? list[(i + 1) % list.length]
        : e.key === 'ArrowUp' ? list[(i - 1 + list.length) % list.length]
        : e.key === 'Home' ? list[0]
        : e.key === 'End' ? list[list.length - 1]
        : null;
      if (next) {
        e.preventDefault();
        next.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [pickerOpen]);

  const choose = (choice: CountryChoice) => {
    setResolution({ choice, auto: false, fallbackFrom: null, emptyCountry: null });
    setPickerOpen(false);
    pillRef.current?.focus();
    rememberCountry(choice.kind === 'all' ? ALL_COUNTRIES : choice.key);
  };

  const choice = resolution?.choice ?? { kind: 'all' as const };
  const selected = choice.kind === 'country' ? countries.find((c) => c.key === choice.key) || null : null;
  const inScope = selected ? orgs.filter((o) => isGlobalOrg(o) || orgInCountry(o, selected)) : orgs;
  const gov = inScope.filter((o) => categoryOf(o) === 'government').sort(byName);
  const community = inScope.filter((o) => categoryOf(o) === 'community').sort(byName);

  const q = query.toLowerCase().trim();
  const searchResults = q
    ? orgs
        .filter((o) =>
          [o.name, o.jurisdiction, o.city, o.region, o.country].some((f) => !!f && f.toLowerCase().includes(q)),
        )
        .sort(byName)
    : [];

  const ready = state === 'ready' && resolution !== null;
  const pillLabel = selected ? selected.name : 'All countries';
  const showGov = category !== 'community';
  const showCommunity = category !== 'government';

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

        <div className={styles.controls}>
          <div className={styles.searchWrap}>
            <span className={styles.searchIcon}>
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} width={16} height={16}>
                <circle cx="8.5" cy="8.5" r="5.5" />
                <path d="M15 15l-3-3" strokeLinecap="round" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search any organization on file…"
              aria-label="Search organizations"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className={styles.filterRow}>
            <div className={styles.filterGroup}>
              <div className={styles.countryPicker} ref={pickerRef}>
                <button
                  ref={pillRef}
                  type="button"
                  className={`${styles.countryPill} ${resolution && !resolution.auto ? styles.countryPillChosen : ''}`}
                  onClick={() => setPickerOpen((o) => !o)}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                      e.preventDefault();
                      setPickerOpen(true);
                    }
                  }}
                  aria-haspopup="listbox"
                  aria-expanded={pickerOpen}
                  disabled={!ready}
                >
                  <span className={styles.countryPillName}>{ready ? pillLabel : 'Finding your country…'}</span>
                  <span className={styles.countryPillCaret} aria-hidden="true">▾</span>
                </button>
                {pickerOpen ? (
                  <div className={styles.countryMenu} role="listbox" aria-label="Country">
                    {countries.map((c) => (
                      <button
                        key={c.key}
                        type="button"
                        role="option"
                        aria-selected={selected?.key === c.key}
                        className={`${styles.countryOption} ${selected?.key === c.key ? styles.countryOptionActive : ''}`}
                        onClick={() => choose({ kind: 'country', key: c.key })}
                      >
                        <span>{c.name}</span>
                        <span className={styles.countryCount}>{c.count}</span>
                      </button>
                    ))}
                    <button
                      type="button"
                      role="option"
                      aria-selected={!selected}
                      className={`${styles.countryOption} ${styles.countryOptionAll} ${!selected ? styles.countryOptionActive : ''}`}
                      onClick={() => choose({ kind: 'all' })}
                    >
                      <span>All countries</span>
                      <span className={styles.countryCount}>{orgs.length}</span>
                    </button>
                  </div>
                ) : null}
              </div>

              <div className={styles.chips} role="group" aria-label="Category">
                <button type="button" aria-pressed={category === 'all'} className={`${styles.chip} ${category === 'all' ? styles.chipAll : ''}`} onClick={() => setCategory('all')}>
                  All
                </button>
                <button type="button" aria-pressed={category === 'government'} className={`${styles.chip} ${category === 'government' ? styles.chipGov : ''}`} onClick={() => setCategory('government')}>
                  Government · {ready ? gov.length : '…'}
                </button>
                <button type="button" aria-pressed={category === 'community'} className={`${styles.chip} ${category === 'community' ? styles.chipCommunity : ''}`} onClick={() => setCategory('community')}>
                  Community · {ready ? community.length : '…'}
                </button>
              </div>
            </div>

            <div className={styles.viewToggle} role="group" aria-label="View">
              <button type="button" aria-pressed={view === 'list'} className={`${styles.viewBtn} ${view === 'list' ? styles.viewBtnActive : ''}`} onClick={() => setView('list')}>
                List
              </button>
              <button type="button" aria-pressed={view === 'map'} className={`${styles.viewBtn} ${view === 'map' ? styles.viewBtnActive : ''}`} onClick={() => setView('map')}>
                Map
              </button>
            </div>
          </div>

          {ready && resolution.fallbackFrom ? (
            <div className={styles.notice}>
              No organizations for {resolution.fallbackFrom} yet, so we&apos;re showing {pillLabel}, where there&apos;s the most to see.{' '}
              <button type="button" className={styles.inlineLink} onClick={() => setPickerOpen(true)}>
                Change country
              </button>
            </div>
          ) : null}
        </div>

        <div className={styles.content}>
          {state === 'loading' || (state === 'ready' && !resolution) ? (
            <div className={`${styles.gridStatus} ${styles.loadingState}`}>Loading organizations…</div>
          ) : state === 'error' ? (
            <div className={`${styles.gridStatus} ${styles.errorState}`}>
              <span>Failed to load organizations. Check your connection and try again.</span>
              <button className={styles.retryBtn} onClick={load}>
                Retry
              </button>
            </div>
          ) : q ? (
            <div>
              <div className={styles.searchEyebrow}>Search results</div>
              <div className={styles.searchCaption}>
                {searchResults.length} match{searchResults.length === 1 ? '' : 'es'} across all countries.
              </div>
              {searchResults.length ? (
                <div className={styles.resultRows}>
                  {searchResults.map((o, i) => (
                    <Link
                      key={orgKey(o) || i}
                      href={`/org/${encodeURIComponent(orgKey(o))}`}
                      className={`${styles.resultRow} ${categoryOf(o) === 'community' ? styles.community : styles.government}`}
                    >
                      <div className={styles.resultText}>
                        <div className={styles.resultMeta}>{jurisdictionOf(o)}</div>
                        <div className={styles.resultName}>{o.name || 'Unknown Organization'}</div>
                      </div>
                      <span className={styles.resultCta}>Explore →</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className={styles.emptyPanel}>No organizations match &ldquo;{query.trim()}&rdquo;.</div>
              )}
            </div>
          ) : resolution?.emptyCountry ? (
            <div className={styles.bigEmpty}>
              <div className={styles.bigEmptyTitle}>No organizations in {resolution.emptyCountry} yet.</div>
              <div className={styles.bigEmptyBody}>
                The database currently covers {countries.map((c) => c.name).join(' and ')}. Switch to one of those, or browse everything on file.
              </div>
              <div className={styles.bigEmptyActions}>
                {countries.map((c) => (
                  <button key={c.key} type="button" className={styles.switchBtn} onClick={() => choose({ kind: 'country', key: c.key })}>
                    Switch to {c.name}
                  </button>
                ))}
                <button type="button" className={`${styles.switchBtn} ${styles.switchBtnGhost}`} onClick={() => choose({ kind: 'all' })}>
                  View all countries
                </button>
              </div>
            </div>
          ) : view === 'map' ? (
            <div className={styles.mapSoon}>
              <div className={styles.mapSoonPattern} />
              <div className={styles.mapSoonInner}>
                <div className={styles.mapSoonTag}>Coming soon</div>
                <div className={styles.mapSoonTitle}>Map view is on its way.</div>
                <div className={styles.mapSoonBody}>Soon you&apos;ll be able to find organizations by where they are. For now, the list has everything on file.</div>
                <button type="button" className={styles.switchBtn} onClick={() => setView('list')}>
                  Back to list
                </button>
              </div>
            </div>
          ) : (
            <>
              {showGov ? (
                <section className={styles.section}>
                  <SectionHead eyebrow={`Government · ${gov.length} on file`} title="Public bodies you can look into." />
                  <div className={styles.orgGrid}>
                    {gov.map((org, i) => (
                      <OrgCard key={orgKey(org) || i} org={org} index={i} />
                    ))}
                    <AddCard
                      title="Missing an organization?"
                      body="Government agencies, boards, and departments can be added to the database."
                      cta="Contribute data"
                    />
                  </div>
                </section>
              ) : null}

              {showCommunity ? (
                <section className={styles.section}>
                  <SectionHead eyebrow={`Community · ${community.length} ${community.length === 1 ? 'group' : 'groups'}`} title="Groups organizing in the open." community />
                  {community.length ? (
                    <div className={styles.orgGrid}>
                      {community.map((org, i) => (
                        <OrgCard key={orgKey(org) || i} org={org} index={i} />
                      ))}
                      <AddCard
                        title="Don't see your group?"
                        body="Neighbourhood associations, tenant groups, and co-ops can run their votes and budgets here."
                        cta="Add your group"
                        community
                      />
                    </div>
                  ) : (
                    <div className={styles.communityEmpty}>
                      <div className={styles.bigEmptyTitle}>No community groups yet.</div>
                      <div className={styles.bigEmptyBody}>Be the first neighbourhood association, tenant group, or co-op to organize here.</div>
                      <a href="/contribute" className={styles.communityBtn}>
                        Add your group →
                      </a>
                    </div>
                  )}
                </section>
              ) : null}
            </>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
