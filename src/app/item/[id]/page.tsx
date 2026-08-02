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

const CORTEZA_ITEM_RECORD_URL = 'https://app.democracydistributed.com/compose/ns/DD/pages/404424858932477953/record';

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
  const transactions = data.transactions || [];

  type TraceStep = {
    key: string;
    icon: string;
    type: string;
    text: string;
    sub: string | null;
    viewAllHref: string | null;
    viewAllLabel: string | null;
  };

  const tracesFromStepsRaw: (TraceStep | null)[] = [
    data.suggestion
      ? {
          key: 'suggestion',
          icon: '💡',
          type: 'Suggestion',
          text: data.suggestion.subject || 'Suggestion',
          sub: (data.suggestion.count ?? 0) > 1 ? `+${(data.suggestion.count ?? 1) - 1} more` : null,
          viewAllHref:
            (data.suggestion.count ?? 0) > 1 && data.itemId
              ? `${CORTEZA_ITEM_RECORD_URL}/${encodeURIComponent(data.itemId)}`
              : null,
          viewAllLabel: 'View all suggestions →',
        }
      : null,
    data.vote
      ? {
          key: 'vote',
          icon: '🗳️',
          type: 'Vote',
          text: [
            data.vote.outcome,
            data.vote.yes != null || data.vote.no != null ? `${data.vote.yes ?? 0}–${data.vote.no ?? 0}` : '',
          ]
            .filter(Boolean)
            .join(' · '),
          sub: null,
          viewAllHref: null,
          viewAllLabel: null,
        }
      : null,
  ];
  const tracesFromSteps = tracesFromStepsRaw.filter((s): s is TraceStep => s !== null);

  const leadsToSteps = [
    data.authorizedConstitution
      ? {
          key: 'constitution',
          icon: '📜',
          type: 'Constitution',
          text: data.authorizedConstitution.name || 'Constitution',
          href: data.authorizedConstitution.id ? `/constitution/${encodeURIComponent(data.authorizedConstitution.id)}` : null,
        }
      : null,
    ...projects.map((p) => ({
      key: `project-${p.projectId}`,
      icon: '🏗️',
      type: 'Project',
      text: [p.name || 'Project', p.phase ? `[${p.phase}]` : ''].filter(Boolean).join(' '),
      href: p.projectId ? `/project/${encodeURIComponent(p.projectId)}` : null,
    })),
    ...transactions.map((t) => ({
      key: `transaction-${t.transactionId}`,
      icon: '💵',
      type: 'Transaction',
      text: t.description || 'Transaction',
      href: t.transactionId ? `/transaction/${encodeURIComponent(t.transactionId)}` : null,
    })),
  ].filter((s): s is { key: string; icon: string; type: string; text: string; href: string | null } => s !== null);

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

        {/* Traces From — Suggestion/Vote */}
        <div className={styles.section}>
          <div className="sec-lbl">Traces From</div>
          {tracesFromSteps.length > 0 ? (
            <div className={styles.linkList}>
              {tracesFromSteps.map((step) => (
                <div key={step.key}>
                  <div className={styles.linkCardUnavailable}>
                    <div className={styles.linkIconUnavailable}>{step.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className={styles.linkTypeUnavailable}>{step.type}</div>
                      <div className={styles.linkText}>{step.text}</div>
                      {step.sub ? <div className={styles.cardMeta} style={{ marginTop: '4px' }}>{step.sub}</div> : null}
                    </div>
                  </div>
                  {step.viewAllHref ? (
                    <div style={{ marginTop: '8px' }}>
                      <a className={styles.contributeLink} href={step.viewAllHref} target="_blank" rel="noopener noreferrer">
                        {step.viewAllLabel}
                      </a>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className={styles.emptyNote}>We don&apos;t yet know what suggestion or vote led to this decision.</p>
          )}
        </div>

        {/* Leads To — Constitution + Project + Transactions */}
        <div className={styles.section}>
          <div className="sec-lbl">Leads To</div>
          {leadsToSteps.length > 0 ? (
            <div className={styles.linkList}>
              {leadsToSteps.map((step) =>
                step.href ? (
                  <Link className={styles.linkCard} href={step.href} key={step.key}>
                    <div className={styles.linkIcon}>{step.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className={styles.linkType}>{step.type}</div>
                      <div className={styles.linkText}>{step.text}</div>
                    </div>
                    <div className={styles.linkArrow}>→</div>
                  </Link>
                ) : (
                  <div className={styles.linkCardUnavailable} key={step.key}>
                    <div className={styles.linkIconUnavailable}>{step.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className={styles.linkTypeUnavailable}>{step.type}</div>
                      <div className={styles.linkText}>{step.text}</div>
                    </div>
                  </div>
                )
              )}
            </div>
          ) : (
            <>
              <p className={styles.emptyNote}>We don&apos;t yet know what this item led to.</p>
              <div style={{ marginTop: '8px' }}>
                <a className={styles.contributeLink} href="/contribute">
                  Help us link this record →
                </a>
              </div>
            </>
          )}
        </div>

        {/* Utility links — Source document (Item.Link) + Corteza record, side by side */}
        {data.link || data.itemId ? (
          <div className={styles.section} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {data.link ? (
              <a className={styles.cortezaLink} href={data.link} target="_blank" rel="noopener noreferrer">
                View source document ↗
              </a>
            ) : null}
            {data.itemId ? (
              <a
                className={styles.cortezaLink}
                href={`${CORTEZA_ITEM_RECORD_URL}/${encodeURIComponent(data.itemId)}`}
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
