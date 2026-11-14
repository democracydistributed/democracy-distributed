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
  matchCountry,
  orgInCountry,
  regionsFromLocales,
  resolveCountry,
  type CountryChoice,
  type CountryResolution,
} from '@/lib/country';
import { regionNameFromCode } from '@/lib/regions';
import { DEFAULT_LANDING, NO_PLACE, groupOrgs, isPlaceActive, orgInPlace, placeRows, samePlace, validPlace, type OrgGroup, type PlaceScope } from '@/lib/place';
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

const SMALL_WORDS = /^(of|the|and|for|de|la|a|an|in|on|to)$/i;

/** Acronym for the logo tile when there's no image: first letter of each significant word, up to 4. */
function initialsOf(name?: string): string {
  const words = (name || '').split(/\s+/).filter((w) => /^[\p{L}\p{N}]/u.test(w) && !SMALL_WORDS.test(w));
  const letters = words.length > 1 ? words.slice(0, 4).map((w) => w[0]).join('') : (words[0] || '?').slice(0, 2);
  return letters.toUpperCase();
}

function OrgLogo({ photoId, name, small }: { photoId?: string | null; name?: string; small?: boolean }) {
  const [failed, setFailed] = useState(false);
  const showImg = !!photoId && !failed;
  const initials = initialsOf(name);
  return (
    <div
      className={`${styles.orgLogo} ${small ? styles.orgLogoSm : ''} ${showImg ? styles.orgLogoImg : ''} ${!showImg && initials.length > 3 ? styles.orgLogoLong : ''}`}
      aria-hidden={showImg ? undefined : true}
    >
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/org-image/${encodeURIComponent(photoId)}`}
          alt={`${name ?? 'Organization'} logo`}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        initials
      )}
    </div>
  );
}

function OrgCard({ org, index }: { org: OrgSummary; index: number }) {
  const id = orgKey(org);
  const isCommunity = categoryOf(org) === 'community';
  return (
    <Link
      href={`/org/${encodeURIComponent(id)}`}
      className={`${styles.orgCard} ${isCommunity ? styles.community : styles.government} ${styles.fadeUp}`}
      style={{ animationDelay: `${(index % 5) * 0.05}s` }}
    >
      <div className={styles.cardBody}>
        <div className={styles.orgIdRow}>
          <OrgLogo photoId={org.coverPhoto} name={org.name} />
          <div className={styles.orgIdText}>
            <div className={styles.orgName}>{org.name || 'Unknown Organization'}</div>
          </div>
        </div>
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

type Shortcut = NonNullable<OrgGroup['shortcut']>;

interface AddProps {
  title: string;
  body: string;
  cta: string;
  community?: boolean;
}

/** Full-width dashed prompt under a list: title, one line of text and a link on one line. */
function AddCard({ title, body, cta, community }: AddProps) {
  return (
    <div className={styles.addRow}>
      <span className={styles.addRowTitle}>{title}</span>
      <span className={styles.addRowBody}>{body}</span>
      <a href="/contribute" className={`${styles.addCardLink} ${community ? styles.addCardLinkCommunity : ''}`}>
        {cta} →
      </a>
    </div>
  );
}

/** True on phones, where previews and tile strips are shorter so the page doesn't just get longer. */
function useCompact(): boolean {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const m = window.matchMedia('(max-width: 640px)');
    const update = () => setCompact(m.matches);
    update();
    m.addEventListener('change', update);
    return () => m.removeEventListener('change', update);
  }, []);
  return compact;
}

/**
 * Org cards. With more than one place group, each group is a row you tap open. The group that
 * matches the visitor's place starts open (else the biggest one) with a short preview; the
 * others start collapsed to a row showing a few of the orgs inside. One group is a plain grid.
 */
function OrgList({
  orgs,
  groups,
  add,
  onShortcut,
}: {
  orgs: OrgSummary[];
  groups: OrgGroup[];
  add: AddProps;
  onShortcut: (s: Shortcut) => void;
}) {
  const compact = useCompact();
  const preview = compact ? 3 : 6;
  const tileCount = compact ? 3 : 4;

  const defaultOpen = useMemo(() => {
    const current = groups.find((g) => g.current);
    if (current) return current.key;
    return groups.reduce<OrgGroup | null>((best, g) => (!best || g.orgs.length > best.orgs.length ? g : best), null)?.key ?? null;
  }, [groups]);

  // Groups the visitor flipped from their starting state, and the starting group once shown in full.
  // Callers remount this component (key) when the scope changes, which resets both.
  const [flipped, setFlipped] = useState<Set<string>>(() => new Set());
  const [full, setFull] = useState<Set<string>>(() => new Set());
  const flip = (set: Set<string>, key: string) => {
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  };

  if (groups.length < 2) {
    return (
      <div>
        <div className={styles.orgGrid}>
          {orgs.map((org, i) => (
            <OrgCard key={orgKey(org) || i} org={org} index={i} />
          ))}
        </div>
        <AddCard {...add} />
      </div>
    );
  }

  return (
    <div className={styles.groups}>
      {groups.map((g) => {
        const starts = g.key === defaultOpen;
        const isOpen = starts !== flipped.has(g.key);
        // Only the starting group previews; a group the visitor opens themselves shows everything.
        const previewing = isOpen && starts && !full.has(g.key) && g.orgs.length > preview;
        const shown = previewing ? g.orgs.slice(0, preview) : g.orgs;
        const count = previewing ? `${shown.length} of ${g.orgs.length}` : String(g.orgs.length);
        const meta = g.label ? `${g.label} · ${count}` : count;
        const panelId = `group-${g.key.replace(/[^a-z0-9]+/gi, '-')}`;
        const extra = g.orgs.length - tileCount;
        return (
          <div key={g.key} className={`${styles.group} ${isOpen ? styles.groupOpen : ''}`}>
            <div className={`${styles.groupRow} ${isOpen ? styles.groupRowOpen : ''}`}>
              <button
                type="button"
                className={`${styles.groupToggle} ${g.shortcut ? styles.groupToggleOnly : ''}`}
                onClick={() => setFlipped((prev) => flip(prev, g.key))}
                aria-expanded={isOpen}
                aria-controls={panelId}
              >
                <span className={styles.groupLine}>
                  <span className={styles.groupArrow} aria-hidden="true">{isOpen ? '▾' : '▸'}</span>
                  <span className={styles.groupName}>{g.name}</span>
                </span>
                <span className={styles.groupLine}>
                  <span className={styles.groupMeta}>{meta}</span>
                  {!isOpen ? (
                    <span className={styles.groupTiles} aria-hidden="true">
                      {g.orgs.slice(0, tileCount).map((o, i) => (
                        <OrgLogo key={orgKey(o) || i} photoId={o.coverPhoto} name={o.name} small />
                      ))}
                      {extra > 0 ? <span className={styles.groupMore}>+{extra}</span> : null}
                    </span>
                  ) : null}
                </span>
              </button>
              {g.shortcut ? (
                <button type="button" className={styles.groupOnly} onClick={() => onShortcut(g.shortcut as Shortcut)}>
                  Only {g.name} →
                </button>
              ) : null}
            </div>
            {isOpen ? (
              <div id={panelId}>
                <div className={styles.orgGrid} style={{ marginTop: 12 }}>
                  {shown.map((org, i) => (
                    <OrgCard key={orgKey(org) || i} org={org} index={i} />
                  ))}
                </div>
                {starts && g.orgs.length > preview ? (
                  <button type="button" className={styles.showMore} onClick={() => setFull((prev) => flip(prev, g.key))}>
                    {full.has(g.key) ? 'Show fewer ↑' : `Show ${g.orgs.length - preview} more ↓`}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}
      <AddCard {...add} />
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

/** The cookie only remembers the country; region and city live in the link, so a drill-down is shareable but not sticky. */
function rememberCountry(key: string, place: PlaceScope) {
  try {
    document.cookie = `${COUNTRY_COOKIE}=${encodeURIComponent(key)}; path=/; max-age=31536000; samesite=lax`;
  } catch {}
  try {
    const url = new URL(window.location.href);
    url.searchParams.set('country', key);
    if (place.region) url.searchParams.set('region', place.region);
    else url.searchParams.delete('region');
    if (place.city) url.searchParams.set('city', place.city);
    else url.searchParams.delete('city');
    url.searchParams.delete('simulateCountry');
    window.history.replaceState(null, '', url.toString());
  } catch {}
}

interface Props {
  ipCountry: string | null;
  ipRegion: string | null;
  savedCountry: string | null;
  urlCountry: string | null;
  urlRegion: string | null;
  urlCity: string | null;
}

export default function BrowsePage({ ipCountry, ipRegion, savedCountry, urlCountry, urlRegion, urlCity }: Props) {
  const [orgs, setOrgs] = useState<OrgSummary[]>([]);
  const [state, setState] = useState<LoadState>('loading');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category>('all');
  const [view, setView] = useState<View>('list');
  const [resolution, setResolution] = useState<CountryResolution | null>(null);
  const [rawPlace, setRawPlace] = useState<PlaceScope>({ region: urlRegion, city: urlCity });
  /** Set when we narrowed to the visitor's province / state on our own, so we can say so and offer a way out. */
  const [autoRegion, setAutoRegion] = useState<string | null>(null);
  /** True when we had no location signal and landed on the default place. */
  const [usedDefault, setUsedDefault] = useState(false);
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
    // No signal at all (no link, saved pick, IP country or browser region): start on the default
    // place rather than the busiest country, as long as we actually have orgs there.
    if (!urlCountry && !savedCountry && !ipCountry && regionsFromLocales(locales).length === 0) {
      const country = matchCountry(DEFAULT_LANDING.country, countries);
      const landing = { region: DEFAULT_LANDING.region as string | null, city: DEFAULT_LANDING.city as string | null };
      if (country && orgs.some((o) => orgInCountry(o, country) && orgInPlace(o, landing))) {
        setResolution({ choice: { kind: 'country', key: country.key }, auto: true, fallbackFrom: null, emptyCountry: null });
        setRawPlace(landing);
        setUsedDefault(true);
        return;
      }
    }

    const resolved = resolveCountry({ url: urlCountry, saved: savedCountry, ip: ipCountry, locales }, countries);
    setResolution(resolved);

    // Go one level deeper only when the country itself came from the visitor's IP (not a link,
    // a saved pick, or a fallback) and we have orgs in their province / state. Never the city:
    // IP cities are too often wrong. A wrong guess is one tap away from undone (see the note).
    if (resolved.auto && !resolved.fallbackFrom && resolved.choice.kind === 'country' && ipCountry && ipRegion) {
      const country = matchCountry(ipCountry, countries);
      const name = country && country.key === resolved.choice.key ? regionNameFromCode(country.code, ipRegion) : null;
      const fold = (v: string) => v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
      const hit = name && country
        ? orgs.find((o) => o.region && orgInCountry(o, country) && fold(o.region) === fold(name))
        : null;
      if (hit?.region) {
        setRawPlace({ region: hit.region, city: null });
        setAutoRegion(hit.region);
      }
    }
  }, [state, resolution, countries, orgs, urlCountry, savedCountry, ipCountry, ipRegion]);

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

  const choose = (choice: CountryChoice, place: PlaceScope = NO_PLACE) => {
    setResolution({ choice, auto: false, fallbackFrom: null, emptyCountry: null });
    setRawPlace(place);
    setAutoRegion(null);
    setUsedDefault(false);
    setPickerOpen(false);
    pillRef.current?.focus();
    rememberCountry(choice.kind === 'all' ? ALL_COUNTRIES : choice.key, place);
  };

  const choice = resolution?.choice ?? { kind: 'all' as const };
  const selected = choice.kind === 'country' ? countries.find((c) => c.key === choice.key) || null : null;
  const place = useMemo(() => validPlace(rawPlace, orgs, selected), [rawPlace, orgs, selected]);
  const placeActive = isPlaceActive(place);
  const rows = useMemo(() => (selected ? placeRows(orgs, selected) : []), [orgs, selected]);
  // Worldwide orgs ride along with a country, but not once you've drilled into a place.
  const inScope = selected
    ? orgs.filter((o) => (isGlobalOrg(o) ? !placeActive : orgInCountry(o, selected) && orgInPlace(o, place)))
    : orgs;
  const gov = inScope.filter((o) => categoryOf(o) === 'government').sort(byName);
  const community = inScope.filter((o) => categoryOf(o) === 'community').sort(byName);

  const govGroups = useMemo(() => groupOrgs(gov, selected, place, countries), [gov, selected, place, countries]);
  const communityGroups = useMemo(() => groupOrgs(community, selected, place, countries), [community, selected, place, countries]);
  const scopeKey = `${selected ? selected.key : 'all'}|${place.region ?? ''}|${place.city ?? ''}`;
  const shortcut = (s: Shortcut) => choose({ kind: 'country', key: s.country }, s.place);

  const q = query.toLowerCase().trim();
  const searchResults = q
    ? orgs
        .filter((o) =>
          [o.name, o.jurisdiction, o.city, o.region, o.country].some((f) => !!f && f.toLowerCase().includes(q)),
        )
        .sort(byName)
    : [];

  const ready = state === 'ready' && resolution !== null;
  const pillPath = selected ? [selected.name, place.region, place.city].filter((p): p is string => !!p) : ['All countries'];
  const pillLabel = pillPath[pillPath.length - 1];
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
                  <span className={styles.countryPillName}>
                    {ready ? (
                      pillPath.map((seg, i) => (
                        <span key={i}>
                          {i > 0 ? <span className={styles.pillSep} aria-hidden="true">›</span> : null}
                          <span className={i === pillPath.length - 1 ? styles.pillLast : styles.pillTrail}>{seg}</span>
                        </span>
                      ))
                    ) : (
                      'Finding your country…'
                    )}
                  </span>
                </button>
                {pickerOpen ? (
                  <div className={styles.countryMenu} role="listbox" aria-label="Country">
                    {selected ? (
                      <>
                        <button
                          type="button"
                          role="option"
                          aria-selected={!placeActive}
                          className={`${styles.countryOption} ${styles.countryOptionTop} ${!placeActive ? styles.countryOptionActive : ''}`}
                          onClick={() => choose({ kind: 'country', key: selected.key })}
                        >
                          <span>{selected.name}</span>
                          <span className={styles.countryCount}>{selected.count}</span>
                        </button>
                        {rows.map((r) => {
                          const active = placeActive && samePlace(r, place);
                          return (
                            <button
                              key={`${r.region ?? ''}/${r.city ?? ''}`}
                              type="button"
                              role="option"
                              aria-selected={active}
                              className={`${styles.countryOption} ${r.depth === 2 ? styles.countryOptionDeep : styles.countryOptionNested} ${active ? styles.countryOptionActive : ''}`}
                              onClick={() => choose({ kind: 'country', key: selected.key }, { region: r.region, city: r.city })}
                            >
                              <span>{r.name}</span>
                              <span className={styles.countryCount}>{r.count}</span>
                            </button>
                          );
                        })}
                        {countries.length > 1 ? <div className={styles.menuDivider} role="separator" /> : null}
                      </>
                    ) : null}
                    {countries
                      .filter((c) => c.key !== selected?.key)
                      .map((c) => (
                        <button
                          key={c.key}
                          type="button"
                          role="option"
                          aria-selected={false}
                          className={styles.countryOption}
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

          {ready && usedDefault && place.city ? (
            <div className={styles.notice}>
              We couldn&apos;t tell where you are, so we&apos;re showing {place.city}.{' '}
              <button type="button" className={styles.inlineLink} onClick={() => setPickerOpen(true)}>
                Change place
              </button>
            </div>
          ) : null}

          {ready && autoRegion && place.region === autoRegion && !place.city && selected ? (
            <div className={styles.notice}>
              Showing {autoRegion}, based on your location.{' '}
              <button type="button" className={styles.inlineLink} onClick={() => choose({ kind: 'country', key: selected.key })}>
                Show all of {selected.name}
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
                  <OrgList
                    key={`gov|${scopeKey}`}
                    orgs={gov}
                    groups={govGroups}
                    onShortcut={shortcut}
                    add={{
                      title: 'Missing an organization?',
                      body: 'Government agencies, boards, and departments can be added to the database.',
                      cta: 'Contribute data',
                    }}
                  />
                </section>
              ) : null}

              {showCommunity ? (
                <section className={styles.section}>
                  <SectionHead eyebrow={`Community · ${community.length} ${community.length === 1 ? 'group' : 'groups'}`} title="Groups organizing in the open." community />
                  {community.length ? (
                    <OrgList
                      key={`community|${scopeKey}`}
                      orgs={community}
                      groups={communityGroups}
                      onShortcut={shortcut}
                      add={{
                        title: "Don't see your group?",
                        body: 'Neighbourhood associations, tenant groups, and co-ops can run their votes and budgets here.',
                        cta: 'Add your group',
                        community: true,
                      }}
                    />
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
