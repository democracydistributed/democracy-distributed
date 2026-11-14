// Place scoping below the country level, for the browse page's jurisdiction pill.
//
// An org carries `region` (province / state / territory) and `city`, walked up from
// its Jurisdiction (see the Browse Orgs workflow). The country is chosen separately
// (see country.ts); a PlaceScope narrows within it: country, then region, then city.
import type { OrgSummary } from './types';
import { isGlobalOrg, orgInCountry, type CountryOption } from './country';

export interface PlaceScope {
  region: string | null;
  city: string | null;
}

export const NO_PLACE: PlaceScope = { region: null, city: null };

/** Where a visitor lands when we have no location signal at all. Used only if we have orgs there. */
export const DEFAULT_LANDING = { country: 'CA', region: 'Ontario', city: 'Toronto' } as const;

/** One selectable row under a country: a region, or a city (inside its region when it has one). */
export interface PlaceRow extends PlaceScope {
  name: string;
  /** Orgs in this place, including everything nested under it. */
  count: number;
  /** 1 = region (or a city with no region), 2 = city inside a region. */
  depth: 1 | 2;
}

const norm = (s: string | null | undefined) => (s || '').trim().toLowerCase();

export const isPlaceActive = (p: PlaceScope) => !!(p.region || p.city);

export function samePlace(a: PlaceScope, b: PlaceScope): boolean {
  return norm(a.region) === norm(b.region) && norm(a.city) === norm(b.city);
}

export function orgInPlace(o: OrgSummary, p: PlaceScope): boolean {
  if (p.region && norm(o.region) !== norm(p.region)) return false;
  if (p.city && norm(o.city) !== norm(p.city)) return false;
  return true;
}

const byCountThenName = (a: { count: number; name: string }, b: { count: number; name: string }) =>
  b.count - a.count || a.name.localeCompare(b.name);

/** Regions and cities that have at least one org in `country`, busiest first. Empty places never appear. */
export function placeRows(orgs: OrgSummary[], country: CountryOption): PlaceRow[] {
  const inCountry = orgs.filter((o) => orgInCountry(o, country));

  const regions = new Map<string, { name: string; count: number; cities: Map<string, { name: string; count: number }> }>();
  const looseCities = new Map<string, { name: string; count: number }>();

  for (const o of inCountry) {
    const city = o.city ? { key: norm(o.city), name: o.city } : null;
    if (o.region) {
      const key = norm(o.region);
      const r = regions.get(key) || { name: o.region, count: 0, cities: new Map() };
      r.count++;
      if (city) {
        const c = r.cities.get(city.key) || { name: city.name, count: 0 };
        c.count++;
        r.cities.set(city.key, c);
      }
      regions.set(key, r);
    } else if (city) {
      const c = looseCities.get(city.key) || { name: city.name, count: 0 };
      c.count++;
      looseCities.set(city.key, c);
    }
  }

  const rows: PlaceRow[] = [];
  const top = [
    ...[...regions.values()].map((r) => ({ ...r, isRegion: true as const })),
    ...[...looseCities.values()].map((c) => ({ ...c, cities: new Map(), isRegion: false as const })),
  ].sort(byCountThenName);

  for (const t of top) {
    if (t.isRegion) {
      rows.push({ region: t.name, city: null, name: t.name, count: t.count, depth: 1 });
      for (const c of [...t.cities.values()].sort(byCountThenName)) {
        rows.push({ region: t.name, city: c.name, name: c.name, count: c.count, depth: 2 });
      }
    } else {
      rows.push({ region: null, city: t.name, name: t.name, count: t.count, depth: 1 });
    }
  }
  return rows;
}

/** Keeps a place only if some org in the country actually sits there (guards stale links). */
export function validPlace(place: PlaceScope, orgs: OrgSummary[], country: CountryOption | null): PlaceScope {
  if (!country || !isPlaceActive(place)) return NO_PLACE;
  return orgs.some((o) => orgInCountry(o, country) && orgInPlace(o, place)) ? place : NO_PLACE;
}

/** A heading plus the orgs under it, when the list is grouped by place. */
export interface OrgGroup {
  key: string;
  name: string;
  /** Level, e.g. "Federal" or "Municipal". Empty when the group is a whole country. */
  label: string;
  /** Where "Only X →" goes; null when the group already is the current scope. */
  shortcut: { country: string; place: PlaceScope } | null;
  orgs: OrgSummary[];
}

/** What to call the level below a country. Only the countries we know are worded specifically. */
function regionLabel(code: string | null): string {
  const c = (code || '').toUpperCase();
  if (c === 'CA') return 'Provincial';
  if (['US', 'IN', 'AU', 'MX', 'BR', 'NG', 'DE'].includes(c)) return 'State';
  return 'Regional';
}

/**
 * Splits a list into place groups, top-down: the country's own bodies, then each region's,
 * then each city's. With no country picked, groups are countries. A single place (a city)
 * returns [] and callers show a flat list. Worldwide orgs go last.
 */
export function groupOrgs(
  orgs: OrgSummary[],
  selected: CountryOption | null,
  place: PlaceScope,
  countries: CountryOption[],
): OrgGroup[] {
  if (place.city) return [];
  const local = orgs.filter((o) => !isGlobalOrg(o));
  const worldwide = orgs.filter(isGlobalOrg);
  const groups: OrgGroup[] = [];

  if (!selected) {
    for (const c of countries) {
      const members = local.filter((o) => orgInCountry(o, c));
      if (members.length) {
        groups.push({ key: `c:${c.key}`, name: c.name, label: '', shortcut: { country: c.key, place: NO_PLACE }, orgs: members });
      }
    }
  } else {
    if (!place.region) {
      const national = local.filter((o) => orgInCountry(o, selected) && !o.region && !o.city);
      if (national.length) {
        groups.push({ key: 'national', name: selected.name, label: 'Federal', shortcut: null, orgs: national });
      }
    }
    for (const r of placeRows(local, selected)) {
      if (place.region && norm(r.region) !== norm(place.region)) continue;
      const members = local.filter((o) => {
        if (!orgInCountry(o, selected)) return false;
        if (r.city) return norm(o.city) === norm(r.city) && (r.region ? norm(o.region) === norm(r.region) : !o.region);
        return norm(o.region) === norm(r.region) && !o.city;
      });
      if (!members.length) continue;
      const here = !r.city && !!place.region && norm(place.region) === norm(r.region);
      groups.push({
        key: `p:${r.region ?? ''}/${r.city ?? ''}`,
        name: r.name,
        label: r.city ? 'Municipal' : regionLabel(selected.code),
        shortcut: here ? null : { country: selected.key, place: { region: r.region, city: r.city } },
        orgs: members,
      });
    }
  }

  if (worldwide.length) groups.push({ key: 'world', name: 'Worldwide', label: 'Global', shortcut: null, orgs: worldwide });
  return groups;
}
