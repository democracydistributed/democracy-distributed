// Country scoping for the browse page.
//
// The visitor's country comes in as an ISO 3166 alpha-2 code (Vercel's
// x-vercel-ip-country header, the browser locale's region, a ?country= link).
// Orgs carry `countryCode` from their Country jurisdiction's Code field, plus the
// country's name. We match by code first and fall back to the English country name
// (via Intl.DisplayNames), so a Country jurisdiction with a blank Code still works.
import type { OrgSummary } from './types';

export interface CountryOption {
  /** What goes in ?country= and the cookie: the ISO code when known, else the name. */
  key: string;
  code: string | null;
  name: string;
  /** Orgs that belong to this country (global orgs not included). */
  count: number;
}

export type CountryChoice = { kind: 'all' } | { kind: 'country'; key: string };

export interface CountrySignals {
  /** ?country= on the URL: an explicit, shareable choice. */
  url?: string | null;
  /** The visitor's last pick, from the dd-country cookie. */
  saved?: string | null;
  /** Vercel's IP geolocation (absent locally and on some networks). */
  ip?: string | null;
  /** navigator.languages, e.g. ['en-IN', 'en']. */
  locales?: readonly string[];
}

export interface CountryResolution {
  choice: CountryChoice;
  /** True when the country came from detection rather than a click or link. */
  auto: boolean;
  /** Set when we detected a country with no orgs and fell back to another. */
  fallbackFrom: string | null;
  /** Set when a link or saved pick names a country with no orgs. */
  emptyCountry: string | null;
}

export const COUNTRY_COOKIE = 'dd-country';
export const ALL_COUNTRIES = 'all';

let displayNames: Intl.DisplayNames | null | undefined;
/** 'CA' -> 'Canada'. Returns null for anything that isn't a known region code. */
export function countryNameFromCode(code: string): string | null {
  if (!/^[A-Za-z]{2}$/.test(code)) return null;
  if (displayNames === undefined) {
    try {
      displayNames = new Intl.DisplayNames(['en'], { type: 'region' });
    } catch {
      displayNames = null;
    }
  }
  try {
    const name = displayNames?.of(code.toUpperCase());
    // Unknown codes come back unchanged ('XX' -> 'XX').
    return name && name.toUpperCase() !== code.toUpperCase() ? name : null;
  } catch {
    return null;
  }
}

const norm = (s: string) => s.trim().toLowerCase();

/** Orgs whose jurisdiction chain never reaches a Country (e.g. DD Central Government, under World). */
export function isGlobalOrg(o: OrgSummary): boolean {
  return !o.countryCode && !o.country;
}

/** Countries that have at least one org, most orgs first. */
export function countryOptions(orgs: OrgSummary[]): CountryOption[] {
  const byKey = new Map<string, CountryOption>();
  for (const o of orgs) {
    if (isGlobalOrg(o)) continue;
    const code = o.countryCode ? o.countryCode.toUpperCase() : null;
    const name = o.country || (code && countryNameFromCode(code)) || code || '';
    const key = code || name;
    const existing = byKey.get(key);
    if (existing) existing.count++;
    else byKey.set(key, { key, code, name, count: 1 });
  }
  return Array.from(byKey.values()).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/** Finds the option a code or name refers to: exact key, then code, then name. */
export function matchCountry(value: string | null | undefined, options: CountryOption[]): CountryOption | null {
  if (!value) return null;
  const v = norm(value);
  const direct = options.find((c) => norm(c.key) === v || (c.code && norm(c.code) === v) || norm(c.name) === v);
  if (direct) return direct;
  const name = countryNameFromCode(value);
  return name ? options.find((c) => norm(c.name) === norm(name)) || null : null;
}

export function orgInCountry(o: OrgSummary, c: CountryOption): boolean {
  if (o.countryCode && c.code) return o.countryCode.toUpperCase() === c.code;
  return !!o.country && norm(o.country) === norm(c.name);
}

/** Region codes from browser locales, in preference order: ['en-IN', 'hi'] -> ['IN']. */
export function regionsFromLocales(locales: readonly string[] = []): string[] {
  const out: string[] = [];
  for (const l of locales) {
    let region: string | undefined;
    try {
      region = new Intl.Locale(l).region;
    } catch {
      region = l.split(/[-_]/)[1];
    }
    if (region && /^[A-Za-z]{2}$/.test(region) && !out.includes(region.toUpperCase())) out.push(region.toUpperCase());
  }
  return out;
}

/** Display name for whatever the visitor's signal said, even if we have no orgs there. */
function labelFor(value: string): string {
  return countryNameFromCode(value) || value;
}

/**
 * Picks the country to show. Order: link, saved pick, IP country, browser locale,
 * then the country with the most orgs. An explicit choice (link or saved) of a
 * country we have nothing for shows an empty state; a detected one falls back
 * quietly to the busiest country, with a note.
 */
export function resolveCountry(signals: CountrySignals, options: CountryOption[]): CountryResolution {
  const none = { fallbackFrom: null, emptyCountry: null };
  for (const explicit of [signals.url, signals.saved]) {
    if (!explicit) continue;
    if (norm(explicit) === ALL_COUNTRIES) return { choice: { kind: 'all' }, auto: false, ...none };
    const hit = matchCountry(explicit, options);
    if (hit) return { choice: { kind: 'country', key: hit.key }, auto: false, ...none };
    // A link to a country we have nothing for; a stale cookie is just ignored.
    if (explicit === signals.url) return { choice: { kind: 'all' }, auto: false, fallbackFrom: null, emptyCountry: labelFor(explicit) };
  }

  if (options.length === 0) return { choice: { kind: 'all' }, auto: true, ...none };

  const detected = [signals.ip, ...regionsFromLocales(signals.locales)].filter((v): v is string => !!v);
  for (const d of detected) {
    const hit = matchCountry(d, options);
    if (hit) return { choice: { kind: 'country', key: hit.key }, auto: true, ...none };
  }
  return {
    choice: { kind: 'country', key: options[0].key },
    auto: true,
    // Only the first signal is worth naming; it's the one we trust most.
    fallbackFrom: detected.length ? labelFor(detected[0]) : null,
    emptyCountry: null,
  };
}
