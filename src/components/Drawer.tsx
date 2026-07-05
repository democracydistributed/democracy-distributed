'use client';

import { Fragment, useEffect, useRef } from 'react';
import Link from 'next/link';
import type { Formatter } from '@/lib/format';
import { countLeaves, sumTreeValue } from '@/lib/sankey';
import type { DrawerCategoryFrame, DrawerFrame, DrawerTraceFrame, RawNode } from '@/lib/types';

interface Props {
  stack: DrawerFrame[];
  isOpen: boolean;
  fmt: Formatter;
  onBack: () => void;
  onClose: () => void;
  onDrill: (idx: number) => void;
  onTrace: (idx: number) => void;
}

interface ChainStep {
  icon: string;
  type: React.ReactNode;
  text: React.ReactNode;
  link?: React.ReactNode;
}

export default function Drawer({ stack, isOpen, fmt, onBack, onClose, onDrill, onTrace }: Props) {
  const frame = stack[stack.length - 1];
  const hasBack = stack.length > 1;
  const closeRef = useRef<HTMLButtonElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Move focus to close button when drawer opens
  useEffect(() => {
    if (isOpen) closeRef.current?.focus();
  }, [isOpen]);

  const backBtn = hasBack ? (
    <button className="drw-back" onClick={onBack}>
      ← Back
    </button>
  ) : null;

  return (
    <>
      <div className={`overlay${isOpen ? ' open' : ''}`} onClick={onClose} aria-hidden="true" />
      <div
        className={`drw${isOpen ? ' open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Transaction details"
      >
        <button className="drw-close" ref={closeRef} onClick={onClose} aria-label="Close details">
          ✕
        </button>
        {frame ? (
          frame.kind === 'trace' ? (
            <TracePanel frame={frame} fmt={fmt} backBtn={backBtn} />
          ) : (
            <CategoryPanel frame={frame} fmt={fmt} backBtn={backBtn} onDrill={onDrill} onTrace={onTrace} />
          )
        ) : (
          <>
            <div className="drw-head" />
            <div className="drw-body" />
          </>
        )}
      </div>
    </>
  );
}

function leafTitle(child: RawNode): string {
  if (child.merchant) return child.merchant;
  const desc = child.description;
  if (desc && !/^\d+$/.test(desc)) return desc;
  if (child.reference) return child.reference;
  if (child.ledgerID) return `LDG-${child.ledgerID}`;
  return child.name.split(' → ').pop() as string;
}

function leafDate(child: RawNode): string | null {
  if (!child.date) return null;
  const d = new Date(child.date);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' });
}

function CategoryPanel({
  frame,
  fmt,
  backBtn,
  onDrill,
  onTrace,
}: {
  frame: DrawerCategoryFrame;
  fmt: Formatter;
  backBtn: React.ReactNode;
  onDrill: (idx: number) => void;
  onTrace: (idx: number) => void;
}) {
  const { dataNode, label, amount, eyebrow } = frame;
  const children: RawNode[] = (dataNode?.entries?.length ? dataNode.entries : dataNode?.children) || [];

  return (
    <>
      <div className="drw-head">
        {backBtn}
        <div className="drw-eyebrow">{eyebrow || 'Category'}</div>
        <div className="drw-title">{label}</div>
        <div className="drw-amount">{fmt(amount)}</div>
      </div>
      <div className="drw-body">
        {children.length === 0 ? (
          <div style={{ padding: '20px 0', color: 'var(--tm)', fontFamily: "'DM Mono',monospace", fontSize: '12px' }}>
            No transactions found for this category.
          </div>
        ) : (
          children.map((child, i) => {
            const childLabel = child.name.split(' → ').pop() as string;
            const isLeaf = !child.children && !child.entries;
            if (isLeaf) {
              const title = leafTitle(child);
              const date = leafDate(child);
              return (
                <div
                  className="txn-row"
                  key={i}
                  role="button"
                  tabIndex={0}
                  onClick={() => onTrace(i)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onTrace(i); } }}
                >
                  <div className="txn-left">
                    <div className="txn-name">{title}</div>
                    {date ? (
                      <div className="txn-meta">
                        <span>{date}</span>
                      </div>
                    ) : null}
                  </div>
                  <div className="txn-right">
                    <div className="txn-amount">{fmt(child.amount)}</div>
                    {child.hasChain ? <div className="chain-dot" title="Decision chain linked" /> : null}
                  </div>
                </div>
              );
            }
            const childTotal = sumTreeValue(child);
            const leafCount = child.entries ? child.entries.length : countLeaves(child);
            const metaParts: string[] = [];
            if (child.merchant) metaParts.push('Merchant group');
            metaParts.push(`${leafCount} transaction${leafCount !== 1 ? 's' : ''}`);
            return (
              <div
                className="txn-row"
                key={i}
                role="button"
                tabIndex={0}
                onClick={() => onDrill(i)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onDrill(i); } }}
              >
                <div className="txn-left">
                  <div className="txn-name">{childLabel}</div>
                  <div className="txn-meta">
                    <span>{metaParts.join(' · ')}</span>
                  </div>
                </div>
                <div className="txn-right">
                  <div className="txn-amount">{fmt(childTotal)}</div>
                  <div style={{ color: 'var(--tm)', fontSize: '18px', lineHeight: 1, marginLeft: '4px' }}>›</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}

function eyebrowDate(dateStr: string | undefined): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function TracePanel({ frame, fmt, backBtn }: { frame: DrawerTraceFrame; fmt: Formatter; backBtn: React.ReactNode }) {
  const { entry, label, side, traceData, traceError } = frame;
  const sideLabel = side === 'debit' ? 'Expense' : 'Revenue';
  const date = eyebrowDate(entry.date);
  const meta = [sideLabel, date].filter(Boolean).join(' · ');
  const idTooltip = [entry.transactionID, entry.ledgerID].filter(Boolean).join(' · ') || undefined;
  const eyebrow = (
    <div className="drw-eyebrow" title={idTooltip}>
      {meta || 'Decision Chain'}
    </div>
  );

  // Loading
  if (!traceData && !traceError) {
    return (
      <>
        <div className="drw-head">
          {backBtn}
          {eyebrow}
          <div className="drw-title">{label}</div>
          <div className="drw-amount">{fmt(entry.amount)}</div>
        </div>
        <div className="drw-body">
          <div style={{ padding: '20px 0', color: 'var(--tm)', fontFamily: "'DM Mono',monospace", fontSize: '12px', letterSpacing: '.05em' }}>
            Loading chain…
          </div>
        </div>
      </>
    );
  }

  // Error
  if (traceError) {
    return (
      <>
        <div className="drw-head">
          {backBtn}
          {eyebrow}
          <div className="drw-title">{label}</div>
          <div className="drw-amount">{fmt(entry.amount)}</div>
        </div>
        <div className="drw-body">
          <div style={{ padding: '20px 0' }}>
            <span style={{ color: '#e05252', fontFamily: "'DM Mono',monospace", fontSize: '12px' }}>⚠ Failed to load chain</span>
            <br />
            <span style={{ color: '#8896b3', fontSize: '11px', fontFamily: "'DM Mono',monospace" }}>{traceError}</span>
          </div>
        </div>
      </>
    );
  }

  const data = traceData!;
  const chain = data.chain;
  const title = chain?.item?.subject || label;

  const head = (
    <div className="drw-head">
      {backBtn}
      {eyebrow}
      <div className="drw-title">{title}</div>
      <div className="drw-amount">{fmt(entry.amount)}</div>
    </div>
  );

  // No decision chain. If the gateway still resolved a Project, show the
  // partial chain (Project → Transaction) rather than a bare empty state —
  // the gap row doubles as the contribution hook, same pattern as the People tab.
  if (!data.hasChain) {
    const partialProject = chain?.project;
    return (
      <>
        {head}
        <div className="drw-body">
          {data.legalBasis ? (
            <div style={{ marginBottom: '16px', padding: '12px 14px', border: '1px solid rgba(167,139,250,0.2)', borderRadius: '6px', background: 'rgba(167,139,250,0.06)' }}>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#a78bfa', marginBottom: '6px' }}>
                Legal Basis
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.5 }}>{data.legalBasis}</div>
            </div>
          ) : null}
          {partialProject ? (
            <div className="chain-section">
              <div className="chain-step">
                <div className="chain-line-wrap">
                  <div className="chain-icon" style={{ opacity: 0.45 }}>❓</div>
                  <div className="chain-connector" />
                </div>
                <div className="chain-content">
                  <div className="chain-type">Decision</div>
                  <div className="chain-text" style={{ color: 'var(--tm)', fontStyle: 'italic' }}>
                    Not yet linked to a council item
                  </div>
                  <a href="/contribute" className="chain-link">
                    Help us find the council item →
                  </a>
                </div>
              </div>
              <div className="chain-step">
                <div className="chain-line-wrap">
                  <div className="chain-icon">🏗️</div>
                  <div className="chain-connector" />
                </div>
                <div className="chain-content">
                  <div className="chain-type">Project</div>
                  <div className="chain-text">
                    {partialProject.name || ''}
                    {partialProject.status ? <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '9px', color: 'var(--tm)' }}> [{partialProject.status}]</span> : null}
                  </div>
                  {partialProject.id ? (
                    <Link className="chain-link" href={`/project/${encodeURIComponent(partialProject.id)}`}>
                      View project →
                    </Link>
                  ) : null}
                </div>
              </div>
              <div className="chain-step">
                <div className="chain-line-wrap">
                  <div className="chain-icon">💸</div>
                </div>
                <div className="chain-content">
                  <div className="chain-type">{data.transactionId ? <span title={data.transactionId}>Transaction</span> : 'Transaction'}</div>
                  <div className="chain-text">{`${label} — ${fmt(entry.amount)}`}</div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div style={{ padding: '12px 0', color: 'var(--tm)', fontSize: '13px', fontFamily: "'DM Mono',monospace", letterSpacing: '0.05em' }}>
                No linked decision chain for this transaction.
              </div>
              <div style={{ marginTop: '8px' }}>
                <a href="/contribute" style={{ fontFamily: "'DM Mono',monospace", fontSize: '10px', color: 'var(--teal)', textDecoration: 'none', letterSpacing: '0.1em' }}>
                  Help us link this transaction →
                </a>
              </div>
            </>
          )}
        </div>
      </>
    );
  }

  // Build chain steps.
  const steps: ChainStep[] = [];

  if (chain?.suggestion && (chain.suggestion.count ?? 0) > 0) {
    const sugg = chain.suggestion;
    const count = sugg.count ?? 0;
    steps.push({
      icon: '💡',
      type: 'Suggestion',
      text: (
        <>
          {sugg.previewSubject ? `"${sugg.previewSubject}"` : 'Suggestion linked'}
          {count > 1 ? (
            <>
              <br />
              <span style={{ fontSize: '11px', color: 'var(--tm)', fontFamily: "'DM Mono',monospace" }}>+{count - 1} more</span>
            </>
          ) : null}
        </>
      ),
      link: chain.item?.id ? (
        <Link className="chain-link" href={`/item/${encodeURIComponent(chain.item.id)}`}>
          View all suggestions →
        </Link>
      ) : null,
    });
  }

  if (chain?.item) {
    const num = chain.item.number || '';
    steps.push({
      icon: '📋',
      type: `Item${num ? ' · ' + num : ''}`,
      text: chain.item.subject || '',
      link: chain.item.id ? (
        <Link className="chain-link" href={`/item/${encodeURIComponent(chain.item.id)}`}>
          View {num || 'item'} →
        </Link>
      ) : null,
    });
  }

  if (chain?.vote) {
    steps.push({ icon: '🗳️', type: 'Vote', text: chain.vote.outcome || 'Vote recorded' });
  }
  if (chain?.legalBasis?.name) {
    steps.push({
      icon: '📜',
      type: 'Authorization',
      text: (
        <span
          title={chain.legalBasis.name}
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          Authorized by {chain.legalBasis.name}
        </span>
      ),
    });
  }

  if (chain?.project) {
    const proj = chain.project;
    steps.push({
      icon: '🏗️',
      type: 'Project',
      text: (
        <>
          {proj.name || ''}
          {proj.status ? <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '9px', color: 'var(--tm)' }}> [{proj.status}]</span> : null}
        </>
      ),
    });
  }

  steps.push({
    icon: '💸',
    type: data.transactionId ? <span title={data.transactionId}>Transaction</span> : 'Transaction',
    text: `${label} — ${fmt(entry.amount)}`,
  });

  return (
    <>
      {head}
      <div className="drw-body">
        <div className="chain-section">
          {steps.map((s, i) => {
            const isLast = i === steps.length - 1;
            return (
              <div className="chain-step" key={i}>
                <div className="chain-line-wrap">
                  <div className="chain-icon">{s.icon}</div>
                  {isLast ? null : <div className="chain-connector" />}
                </div>
                <div className="chain-content">
                  <div className="chain-type">{s.type}</div>
                  <div className="chain-text">{s.text}</div>
                  {s.link ? <Fragment>{s.link}</Fragment> : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
