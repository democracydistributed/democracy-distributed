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

/**
 * Cleans a place that came from a link or a stale state: matches case-insensitively, uses the orgs'
 * own spelling, drops only the part that matches nothing (a bad city keeps its region), and fills in
 * the region when a link gave just a city.
 */
export function validPlace(place: PlaceScope, orgs: OrgSummary[], country: CountryOption | null): PlaceScope {
  if (!country || !isPlaceActive(place)) return NO_PLACE;
  const inCountry = orgs.filter((o) => orgInCountry(o, country));

  let region: string | null = null;
  if (place.region) region = inCountry.find((o) => o.region && norm(o.region) === norm(place.region))?.region ?? null;

  let city: string | null = null;
  if (place.city) {
    const hit = inCountry.find(
      (o) => o.city && norm(o.city) === norm(place.city) && (!region || norm(o.region) === norm(region)),
    );
    if (hit) {
      city = hit.city ?? null;
      if (!region && hit.region) region = hit.region;
    }
  }
  return region || city ? { region, city } : NO_PLACE;
}

/** One row that opens the next level down: a country, a state / province, or a city / district. */
export interface ChildRow {
  key: string;
  name: string;
  /** Level, e.g. "State" or "Municipal". */
  label: string;
  /** Orgs in this place, including everything nested under it. */
  count: number;
  /** Where the row goes when opened. */
  scope: { country: string; place: PlaceScope };
  /** The orgs under it (anything nested too), for the logo strip. */
  orgs: OrgSummary[];
}

/** What the browse list shows for the current place: its own bodies, then one row per direct child. */
export interface LevelView {
  /** Heading for the place's own bodies ("India"), or '' when there are none to head. */
  ownName: string;
  /** Level of those bodies, e.g. "Federal". */
  ownLabel: string;
  own: OrgSummary[];
  /** Heading for the rows ("States and union territories"). */
  childHeading: string;
  children: ChildRow[];
  /** Worldwide orgs, shown after the rows. Only at the top two levels (never inside a place). */
  worldwide: OrgSummary[];
}

function regionLabel(code: string | null): string {
  const c = (code || '').toUpperCase();
  if (c === 'CA') return 'Provincial';
  if (['US', 'IN', 'AU', 'MX', 'BR', 'NG', 'DE'].includes(c)) return 'State';
  return 'Regional';
}

function regionHeading(code: string | null): string {
  const c = (code || '').toUpperCase();
  if (c === 'CA') return 'Provinces and territories';
  if (c === 'IN') return 'States and union territories';
  if (['US', 'AU', 'MX', 'BR', 'NG', 'DE'].includes(c)) return 'States';
  return 'Regions';
}

function cityHeading(code: string | null): string {
  return (code || '').toUpperCase() === 'IN' ? 'Districts' : 'Cities';
}

/**
 * One level at a time. The place's own bodies (a country's federal bodies, a state's, a city's)
 * plus one row per direct child, each counting everything beneath it. Never lists grandchildren:
 * a country shows states, not their districts. Inside a city there is nothing left to group.
 */
export function levelView(
  orgs: OrgSummary[],
  selected: CountryOption | null,
  place: PlaceScope,
  countries: CountryOption[],
): LevelView {
  const local = orgs.filter((o) => !isGlobalOrg(o));
  const worldwide = orgs.filter(isGlobalOrg);
  const empty = { ownName: '', ownLabel: '', own: [] as OrgSummary[], childHeading: '', children: [] as ChildRow[], worldwide };

  if (place.city) return { ...empty, own: local, worldwide: [] };

  if (!selected) {
    const children: ChildRow[] = [];
    for (const c of countries) {
      const count = local.filter((o) => orgInCountry(o, c)).length;
      if (count) children.push({ key: `c:${c.key}`, name: c.name, label: 'Country', count, scope: { country: c.key, place: NO_PLACE }, orgs: local.filter((o) => orgInCountry(o, c)) });
    }
    return { ...empty, childHeading: 'Countries', children };
  }

  const inCountry = local.filter((o) => orgInCountry(o, selected));

  if (!place.region) {
    const own = inCountry.filter((o) => !o.region && !o.city);
    const children: ChildRow[] = placeRows(inCountry, selected)
      .filter((r) => r.depth === 1)
      .map((r) => ({
        key: `p:${r.region ?? ''}/${r.city ?? ''}`,
        name: r.name,
        label: r.city && !r.region ? 'Municipal' : regionLabel(selected.code),
        count: r.count,
        scope: { country: selected.key, place: { region: r.region, city: r.city } },
        orgs: inCountry.filter((o) => (r.region ? norm(o.region) === norm(r.region) : !o.region && norm(o.city) === norm(r.city))),
      }));
    return {
      ownName: selected.name,
      ownLabel: 'Federal',
      own,
      childHeading: regionHeading(selected.code),
      children,
      worldwide,
    };
  }

  const inRegion = inCountry.filter((o) => norm(o.region) === norm(place.region));
  const children: ChildRow[] = placeRows(inRegion, selected)
    .filter((r) => r.depth === 2)
    .map((r) => ({
      key: `p:${r.region ?? ''}/${r.city ?? ''}`,
      name: r.name,
      label: 'Municipal',
      count: r.count,
      scope: { country: selected.key, place: { region: r.region, city: r.city } },
      orgs: inRegion.filter((o) => norm(o.city) === norm(r.city)),
    }));
  return {
    ownName: place.region,
    ownLabel: regionLabel(selected.code),
    own: inRegion.filter((o) => !o.city),
    childHeading: cityHeading(selected.code),
    children,
    worldwide: [],
  };
}
