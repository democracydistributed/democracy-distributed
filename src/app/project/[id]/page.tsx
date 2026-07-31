import type { Metadata } from 'next';
import Link from 'next/link';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import { fetchProjectServer } from '@/lib/server-api';
import { fmtItemDate, stripHtml } from '@/lib/text';
import styles from '@/components/ItemRecord.module.css';

const CORTEZA_PROJECT_RECORD_URL = 'https://app.democracydistributed.com/compose/ns/DD/pages/400783829088927745/record';

function money(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '';
  return '$' + n.toLocaleString('en-CA');
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const data = await fetchProjectServer(params.id).catch(() => null);
  if (!data) return { title: 'Project Record — Democracy Distributed' };
  const summary = stripHtml(data.description);
  return {
    title: data.name || 'Project Record',
    description: summary ? summary.slice(0, 155) + (summary.length > 155 ? '…' : '') : `Project record on Democracy Distributed.`,
  };
}

export default async function ProjectPage({ params }: { params: { id: string } }) {
  // The gateway returns the same HTTP 500 for "doesn't exist" and "transient
  // error" — it can't tell them apart — so we show a retry-able message
  // rather than a hard notFound(), matching the original client component.
  const data = await fetchProjectServer(params.id).catch(() => null);
  if (!data) {
    return (
      <div className={styles.page}>
        <Nav />
        <div className={styles.state}>Could not load this project.</div>
        <Footer />
      </div>
    );
  }

  const summary = stripHtml(data.description);
  const due = fmtItemDate(data.dueDate);
  const item = data.authorizingItem;
  const ledger = data.ledgerEntries || [];

  return (
    <div className={styles.page}>
      <Nav />
      <div className={styles.main}>
        {/* Identity — all live from the Project record */}
        <div className={styles.headMeta}>
          {data.status ? <span className="tag tag-teal">{data.status}</span> : null}
          {data.priority ? <span className="tag tag-amber">{data.priority} priority</span> : null}
        </div>
        <h1 className={styles.title}>{data.name || 'Untitled project'}</h1>
        {due ? <div className={styles.subDate}>Due {due}</div> : null}

        {/* Description — Project.Description */}
        {summary ? (
          <div className={styles.section}>
            <div className="sec-lbl">Description</div>
            <p className={styles.desc}>{summary}</p>
          </div>
        ) : null}

        {/* Authorized by — the parent Item; links back to the item record */}
        {item && item.itemId ? (
          <div className={styles.section}>
            <div className="sec-lbl">Authorized by</div>
            <Link className={styles.card} href={`/item/${encodeURIComponent(item.itemId)}`} style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
              <div className={styles.cardTop}>
                <span className={styles.cardTitle}>{item.subject || 'Item'}</span>
                <span style={{ color: 'var(--amber)' }}>→</span>
              </div>
              {item.itemNumber || item.date ? (
                <div className={styles.cardMeta}>
                  {[item.itemNumber, fmtItemDate(item.date)].filter(Boolean).join(' · ')}
                </div>
              ) : null}
            </Link>
          </div>
        ) : null}

        {/* Money traced — Ledger entries where Ledger.Project = this project */}
        <div className={styles.section}>
          <div className="sec-lbl">Money traced</div>
          {ledger.length > 0 ? (
            <>
              {data.totalSpent != null ? (
                <div className={styles.projFoot} style={{ marginTop: 0, marginBottom: 12 }}>
                  <span>
                    Total traced <b>{money(data.totalSpent)}</b>
                  </span>
                </div>
              ) : null}
              {ledger.map((l, i) => (
                <div className={styles.card} key={l.ledgerId || i}>
                  <div className={styles.cardTop}>
                    <span className={styles.cardTitle}>{l.description || 'Ledger entry'}</span>
                    {l.amount != null ? <span className={styles.cardTitle}>{money(l.amount)}</span> : null}
                  </div>
                  {l.date ? <div className={styles.cardMeta}>{fmtItemDate(l.date)}</div> : null}
                </div>
              ))}
            </>
          ) : (
            <p className={styles.emptyNote}>No money traced to this project yet.</p>
          )}
        </div>

        {data.projectId ? (
          <div className={styles.section}>
            <a
              className={styles.cortezaLink}
              href={`${CORTEZA_PROJECT_RECORD_URL}/${encodeURIComponent(data.projectId)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              View in Corteza ↗
            </a>
          </div>
        ) : null}
      </div>
      <Footer />
    </div>
  );
}
