import type { Metadata } from 'next';
import Link from 'next/link';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import { fetchConstitutionServer } from '@/lib/server-api';
import { fmtItemDate, stripHtml } from '@/lib/text';
import styles from '@/components/ItemRecord.module.css';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const data = await fetchConstitutionServer(params.id).catch(() => null);
  if (!data) return { title: 'Authorization Record — Democracy Distributed' };
  const summary = stripHtml(data.description);
  return {
    title: data.name || 'Authorization Record',
    description: summary ? summary.slice(0, 155) + (summary.length > 155 ? '…' : '') : `Authorization record on Democracy Distributed.`,
  };
}

const CORTEZA_CONSTITUTION_RECORD_URL = 'https://app.democracydistributed.com/compose/ns/DD/pages/375482146103492611/record';

export default async function ConstitutionPage({ params }: { params: { id: string } }) {
  // The gateway returns the same HTTP 500 for "doesn't exist" and "transient
  // error" — it can't tell them apart — so we show a retry-able message
  // rather than a hard notFound(), matching the Item/Project record pages.
  const data = await fetchConstitutionServer(params.id).catch(() => null);
  if (!data) {
    return (
      <div className={styles.page}>
        <Nav />
        <div className={styles.state}>Could not load this authorization record.</div>
        <Footer />
      </div>
    );
  }

  const summary = stripHtml(data.description);
  const enacted = fmtItemDate(data.enacted);
  const authorizedItems = data.authorizedItems || [];

  return (
    <div className={styles.page}>
      <Nav />
      <div className={styles.main}>
        {/* Identity — all live from the Constitution record */}
        <div className={styles.headMeta}>
          {data.category ? <span className="tag tag-amber">{data.category}</span> : null}
          {data.status ? <span className="tag tag-teal">{data.status}</span> : null}
        </div>
        <h1 className={styles.title}>{data.name || 'Untitled authorization'}</h1>
        {data.subTitle ? <div className={styles.subDate}>{data.subTitle}</div> : null}
        {enacted ? <div className={styles.subDate}>Enacted {enacted}</div> : null}

        {/* Description — Constitution.Description */}
        {summary ? (
          <div className={styles.section}>
            <div className="sec-lbl">Description</div>
            <p className={styles.desc}>{summary}</p>
          </div>
        ) : null}

        {/* Traces From — the originating Item, via Passed Amendments referencing this Constitution */}
        <div className={styles.section}>
          <div className="sec-lbl">Traces From</div>
          {authorizedItems.length > 0 ? (
            authorizedItems.map((item, i) =>
              item.itemId ? (
                <Link
                  className={styles.card}
                  key={item.itemId}
                  href={`/item/${encodeURIComponent(item.itemId)}`}
                  style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
                >
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
              ) : (
                <div className={styles.card} key={i}>
                  <div className={styles.cardTop}>
                    <span className={styles.cardTitle}>{item.subject || 'Item'}</span>
                  </div>
                </div>
              )
            )
          ) : (
            <>
              <p className={styles.emptyNote}>We don&apos;t yet know what decision led to this record.</p>
              <div style={{ marginTop: '8px' }}>
                <a className={styles.contributeLink} href="/contribute">
                  Help us link this record →
                </a>
              </div>
            </>
          )}
        </div>

        {/* Utility links — Source document (Constitution.Link) + Corteza record, side by side */}
        {data.link || data.id ? (
          <div className={styles.section} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {data.link ? (
              <a className={styles.cortezaLink} href={data.link} target="_blank" rel="noopener noreferrer">
                View source document ↗
              </a>
            ) : null}
            {data.id ? (
              <a
                className={styles.cortezaLink}
                href={`${CORTEZA_CONSTITUTION_RECORD_URL}/${encodeURIComponent(data.id)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                View in Corteza ↗
              </a>
            ) : null}
          </div>
        ) : null}
      </div>
      <Footer />
    </div>
  );
}
