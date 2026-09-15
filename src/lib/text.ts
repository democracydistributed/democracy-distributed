// Small text/date helpers shared by the Items and Projects tabs.

/** Strip HTML tags + decode the few common entities. SSR-safe (no DOM). */
export function stripHtml(str: string | null | undefined): string {
  if (!str) return '';
  return String(str)
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

/** Format an item date (handles bare YYYY-MM-DD by anchoring to midnight). */
export function fmtItemDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr + (dateStr.includes('T') ? '' : 'T00:00:00'));
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return null;
  }
}

/** Format a date as "Mon YYYY" (e.g. "Jun 2024"). Used for People tab tenure/since. */
export function fmtMonthYear(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr + (dateStr.includes('T') ? '' : 'T00:00:00'));
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString('en-CA', { year: 'numeric', month: 'short' });
  } catch {
    return null;
  }
}

// Leading honorifics to drop when deriving avatar initials (Indian-gov data is
// dense with these: "Sh. Sandeep Kumar", "Smt. Vaninder Kaur", "Dr. Shena…").
const HONORIFICS = new Set(['sh', 'shri', 'smt', 'dr', 'er', 'mr', 'mrs', 'ms', 's', 'sh.', 'shri.', 'smt.']);

/** Up to two-letter initials from a display name, skipping honorific prefixes. */
export function initialsOf(name: string | null | undefined): string {
  if (!name) return '';
  const words = name
    .trim()
    .split(/\s+/)
    .filter((w) => !HONORIFICS.has(w.toLowerCase().replace(/\.$/, '')) && /[a-z0-9]/i.test(w));
  const pick = words.length ? words : name.trim().split(/\s+/);
  return pick
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');
}

export function fmtProjectDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return null;
  }
}

/** "just now" / "3 days ago" style relative time. Used by the Suggestions tab. */
export function fmtRelativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const seconds = Math.max(0, (Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}
