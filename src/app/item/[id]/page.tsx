import type { Metadata } from 'next';
import Link from 'next/link';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import { fetchItemServer } from '@/lib/server-api';
import { fmtItemDate, stripHtml } from '@/lib/text';
import styles from '@/components/ItemRecord.module.css';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const data = await fetchItemServer(params.id).catch(() => null);
  if (!data) return { title: 'Item Record — Democracy Distributed' };
  const summary = stripHtml(data.plainSummary);
  return {
    title: data.subject || 'Item Record',
    description: summary ? summary.slice(0, 155) + (summary.length > 155 ? '…' : '') : `Item record${data.itemNumber ? ` ${data.itemNumber}` : ''} on Democracy Distributed.`,
  };
}

export default async function ItemPage({ params }: { params: { id: string } }) {
  // The gateway returns the same HTTP 500 for "doesn't exist" and "transient
  // error" — it can't tell them apart — so we show a retry-able message
  // rather than a hard notFound(), matching the original client component.
  const data = await fetchItemServer(params.id).catch(() => null);
  if (!data) {
    return (
      <div className={styles.page}>
        <Nav />
        <div className={styles.state}>Could not load this item.</div>
        <Footer />
      </div>
    );
  }

  const summary = stripHtml(data.plainSummary);
  const meetings = data.meetingDiscussedIn || [];
  const projects = data.projects || [];

  return (
    <div className={styles.page}>
      <Nav />
      <div className={styles.main}>
        {/* Identity — all live from the Item record */}
        <div className={styles.headMeta}>
          {data.itemNumber ? <span className={styles.itemNum}>{data.itemNumber}</span> : null}
          {data.status ? <span className="tag tag-teal">{data.status}</span> : null}
        </div>
        <h1 className={styles.title}>{data.subject || 'Untitled item'}</h1>
        {data.date ? <div className={styles.subDate}>{fmtItemDate(data.date)}</div> : null}

        {/* Description — Item.Description */}
        {summary ? (
          <div className={styles.section}>
            <div className="sec-lbl">Description</div>
            <p className={styles.desc}>{summary}</p>
          </div>
        ) : null}

        {/* Decided at — Meeting record(s); only rendered when present */}
        {meetings.length > 0 ? (
          <div className={styles.section}>
            <div className="sec-lbl">Decided at</div>
            {meetings.map((m, i) => {
              const meta = [fmtItemDate(m.date), m.meetingNumber ? `#${m.meetingNumber}` : '']
                .filter(Boolean)
                .join(' · ');
              return (
                <div className={styles.card} key={m.meetingId || i}>
                  <div className={styles.cardTop}>
                    <span className={styles.cardTitle}>{m.committee || 'Meeting'}</span>
                  </div>
                  {meta ? <div className={styles.cardMeta}>{meta}</div> : null}
                </div>
              );
            })}
          </div>
        ) : null}

        {/* What it became — Project record(s) */}
        <div className={styles.section}>
          <div className="sec-lbl">What it became — Projects</div>
          {projects.length > 0 ? (
            projects.map((p, i) => {
              const due = fmtItemDate(p.endDate);
              const inner = (
                <>
                  <div className={styles.cardTop}>
                    <span className={styles.cardTitle}>{p.name || 'Project'}</span>
                    {p.phase ? <span className="tag tag-amber">{p.phase}</span> : null}
                  </div>
                  {due || p.budget ? (
                    <div className={styles.projFoot}>
                      {due ? (
                        <span>
                          Due <b>{due}</b>
                        </span>
                      ) : null}
                      {p.budget ? (
                        <span>
                          Budget <b>{p.budget}</b>
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </>
              );
              return p.projectId ? (
                <Link
                  className={styles.card}
                  key={p.projectId}
                  href={`/project/${encodeURIComponent(p.projectId)}`}
                  style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
                >
                  {inner}
                </Link>
              ) : (
                <div className={styles.card} key={i}>
                  {inner}
                </div>
              );
            })
          ) : (
            <p className={styles.emptyNote}>No projects traced to this item yet.</p>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
