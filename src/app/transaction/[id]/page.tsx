import type { Metadata } from 'next';
import Link from 'next/link';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import { fetchLedgerServer, fetchTraceServer } from '@/lib/server-api';
import { fmtItemDate } from '@/lib/text';
import styles from '@/components/ItemRecord.module.css';

const CORTEZA_LEDGER_RECORD_URL = 'https://app.democracydistributed.com/compose/ns/DD/pages/395676862363205633/record';

function money(n: number | string | null | undefined, currency?: string | null): string {
  const num = typeof n === 'string' ? parseFloat(n) : n;
  if (num == null || isNaN(num)) return '';
  const amount = '$' + num.toLocaleString('en-CA');
  return currency && currency !== 'CAD' ? `${amount} ${currency}` : amount;
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const data = await fetchLedgerServer(params.id).catch(() => null);
  if (!data) return { title: 'Transaction Record — Democracy Distributed' };
  return {
    title: data.merchant || data.description || 'Transaction Record',
    description: `Ledger entry${data.referenceNumber ? ` ${data.referenceNumber}` : ''} on Democracy Distributed.`,
  };
}

export default async function TransactionPage({ params }: { params: { id: string } }) {
  const [ledgerResult, traceResult] = await Promise.allSettled([
    fetchLedgerServer(params.id),
    fetchTraceServer(params.id),
  ]);

  if (ledgerResult.status !== 'fulfilled') {
    return (
      <div className={styles.page}>
        <Nav />
        <div className={styles.state}>Could not load this transaction.</div>
        <Footer />
      </div>
    );
  }

  const data = ledgerResult.value;
  const trace = traceResult.status === 'fulfilled' ? traceResult.value : null;
  const chain = trace?.chain;

  const isExpense = data.type === 'Debit';
  const isRevenue = data.type === 'Credit';
  const eyebrow = isExpense ? 'EXPENSE' : isRevenue ? 'REVENUE' : 'TRANSACTION';
  const date = fmtItemDate(data.date);
  const title = data.merchant || data.description || 'Untitled entry';

  const detailRows: { label: string; value: string }[] = [];
  if (data.description) detailRows.push({ label: 'Description', value: data.description });
  if (data.referenceNumber) detailRows.push({ label: 'Reference Number', value: data.referenceNumber });
  if (data.budgetCategory?.name || data.budgetCategory?.number) {
    detailRows.push({ label: 'Budget Category', value: data.budgetCategory.name || data.budgetCategory.number || '' });
  }
  if (data.currency) detailRows.push({ label: 'Currency', value: data.currency });
  if (data.transaction?.transactionNumber) {
    detailRows.push({ label: 'Transaction Number', value: data.transaction.transactionNumber });
  }

  // "available" requires BOTH: /trace resolved it AND it's a direct field on
  // this Ledger record (not resolved indirectly, e.g. Legal Basis -> Amendment
  // -> Item) — this page only shows what's directly linked to the ledger entry.
  const linkSteps = [
    {
      key: 'item',
      icon: '📋',
      type: 'Item',
      available: Boolean(chain?.item?.id) && Boolean(data.hasDirectItem),
      href: chain?.item?.id ? `/item/${encodeURIComponent(chain.item.id)}` : null,
      text: chain?.item ? [chain.item.number, chain.item.subject].filter(Boolean).join(' — ') : '',
    },
    {
      key: 'legalBasis',
      icon: '📜',
      type: 'Legal Basis',
      available: Boolean(chain?.legalBasis?.id) && Boolean(data.hasDirectLegalBasis),
      href: chain?.legalBasis?.id ? `/constitution/${encodeURIComponent(chain.legalBasis.id)}` : null,
      text: chain?.legalBasis?.name || '',
    },
    {
      key: 'project',
      icon: '🏗️',
      type: 'Project',
      available: Boolean(chain?.project?.id) && Boolean(data.hasDirectProject),
      href: chain?.project?.id ? `/project/${encodeURIComponent(chain.project.id)}` : null,
      text: chain?.project ? [chain.project.name, chain.project.status ? `[${chain.project.status}]` : ''].filter(Boolean).join(' ') : '',
    },
  ];
  const anyLinked = linkSteps.some((s) => s.available);

  return (
    <div className={styles.page}>
      <Nav />
      <div className={styles.main}>
        {/* Header — Ledger.Type/Date/Merchant/Amount */}
        <div className={styles.headMeta}>
          <span className="tag tag-amber">{eyebrow}</span>
          {date ? <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '11px', color: 'var(--tm)' }}>{date}</span> : null}
        </div>
        <h1 className={styles.title}>{title}</h1>
        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '28px', fontWeight: 500, color: 'var(--amber-text, var(--amber))', marginBottom: '30px' }}>
          {money(data.amount, data.currency)}
        </div>

        {/* Money flow — Transaction.From / Transaction.To */}
        {data.transaction?.from || data.transaction?.to ? (
          <div className={styles.section}>
            <div className="sec-lbl">Money Flow</div>
            <div className={styles.moneyFlowCard}>
              <div className={styles.moneyFlowSide}>
                <div className={styles.moneyFlowLabel}>From Account</div>
                <div className={styles.moneyFlowName}>{data.transaction.from?.nickname || 'Unknown account'}</div>
                {data.transaction.from?.accountNumber ? <div className={styles.moneyFlowRef}>{data.transaction.from.accountNumber}</div> : null}
              </div>
              <div className={styles.moneyFlowArrow}>→</div>
              <div className={styles.moneyFlowSide}>
                <div className={styles.moneyFlowLabel}>To Account</div>
                <div className={styles.moneyFlowName}>{data.transaction.to?.nickname || 'Unknown account'}</div>
                {data.transaction.to?.accountNumber ? <div className={styles.moneyFlowRef}>{data.transaction.to.accountNumber}</div> : null}
              </div>
            </div>
          </div>
        ) : null}

        {/* Transaction details — Ledger.Description/Reference_Number/Budget_Category/Currency, Transaction.Transaction_Number */}
        {detailRows.length > 0 ? (
          <div className={styles.section}>
            <div className="sec-lbl">Transaction Details</div>
            <div className={styles.detailList}>
              {detailRows.map((row) => (
                <div className={styles.detailRow} key={row.label}>
                  <div className={styles.detailLabel}>{row.label}</div>
                  <div className={styles.detailValue}>{row.value}</div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Linked records — Item / Legal Basis / Project, via /trace */}
        <div className={styles.section}>
          <div className="sec-lbl">Linked Records</div>
          {anyLinked ? (
            <div className={styles.linkList}>
              {linkSteps
                .filter((step) => step.available && step.href)
                .map((step) => (
                  <Link className={styles.linkCard} href={step.href as string} key={step.key}>
                    <div className={styles.linkIcon}>{step.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className={styles.linkType}>{step.type}</div>
                      <div className={styles.linkText}>{step.text}</div>
                    </div>
                    <div className={styles.linkArrow}>→</div>
                  </Link>
                ))}
            </div>
          ) : (
            <>
              <p className={styles.emptyNote}>No linked decision chain for this transaction yet.</p>
              <div style={{ marginTop: '8px' }}>
                <a className={styles.contributeLink} href="/contribute">
                  Help us link this transaction →
                </a>
              </div>
            </>
          )}
        </div>

        {CORTEZA_LEDGER_RECORD_URL && data.ledgerId ? (
          <div className={styles.section}>
            <a
              className={styles.cortezaLink}
              href={`${CORTEZA_LEDGER_RECORD_URL}/${encodeURIComponent(data.ledgerId)}`}
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
