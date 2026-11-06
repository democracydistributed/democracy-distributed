import type { MemberActivity as Activity } from '@/lib/member-activity';
import styles from './Member.module.css';

// A member's reputation score and the events behind it. Plain markup with no hooks, so the
// public page (a Server Component) and the account page (a Client Component) share it.

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

function formatAmount(n: number): string {
  const abs = Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 2 });
  return n < 0 ? `−${abs}` : `+${abs}`;
}

export default function MemberActivity({ activity }: { activity: Activity }) {
  const { score, total, events } = activity;

  return (
    <>
      <div className={styles.tiles}>
        <div className={styles.tile}>
          <div className={styles.tileLabel}>Reputation</div>
          <div className={`${styles.tileValue} ${styles.amber}`}>{score === null ? '—' : score.toLocaleString('en-US', { maximumFractionDigits: 2 })}</div>
        </div>
        <div className={styles.tile}>
          <div className={styles.tileLabel}>Events</div>
          <div className={`${styles.tileValue} ${styles.teal}`}>{total.toLocaleString('en-US')}</div>
        </div>
      </div>

      <div className={styles.sectionLabel}>Reputation events</div>

      {events.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyText}>No reputation events yet.</div>
        </div>
      ) : (
        <>
          <ul className={styles.list}>
            {events.map((e) => (
              <li key={e.id} className={styles.row}>
                <div className={styles.rowMain}>
                  <div className={styles.org}>{e.title}</div>
                  <div className={styles.meta}>{[e.type, e.detail, formatDate(e.when)].filter(Boolean).join(' · ')}</div>
                </div>
                <span className={`${styles.badge} ${e.amount < 0 ? styles.negative : styles.positive}`}>{formatAmount(e.amount)}</span>
              </li>
            ))}
          </ul>
          {total > events.length && (
            <div className={styles.more}>
              Showing the latest {events.length} of {total.toLocaleString('en-US')}.
            </div>
          )}
        </>
      )}
    </>
  );
}
