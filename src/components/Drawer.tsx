'use client';

import { Fragment } from 'react';
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
  const backBtn = hasBack ? (
    <button className="drw-back" onClick={onBack}>
      ← Back
    </button>
  ) : null;

  return (
    <>
      <div className={`overlay${isOpen ? ' open' : ''}`} onClick={onClose} />
      <div className={`drw${isOpen ? ' open' : ''}`}>
        <button className="drw-close" onClick={onClose}>
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
  const children: RawNode[] = (dataNode && (dataNode.entries || dataNode.children)) || [];

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
                <div className="txn-row" key={i} onClick={() => onTrace(i)}>
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
              <div className="txn-row" key={i} onClick={() => onDrill(i)}>
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

function TracePanel({ frame, fmt, backBtn }: { frame: DrawerTraceFrame; fmt: Formatter; backBtn: React.ReactNode }) {
  const { entry, label, traceData, traceError } = frame;
  const meta = [entry.transactionID, entry.ledgerID].filter(Boolean).join(' · ');
  const eyebrow = <div className="drw-eyebrow">{meta || 'Decision Chain'}</div>;

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

  const legalBasisPill = data.legalBasis ? (
    <div
      style={{
        marginTop: '10px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '5px 10px',
        border: '1px solid rgba(167,139,250,0.25)',
        borderRadius: '4px',
        background: 'rgba(167,139,250,0.07)',
      }}
    >
      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#a78bfa' }}>
        Legal basis
      </span>
      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '10px', color: 'var(--tm)' }}>{data.legalBasis}</span>
    </div>
  ) : null;

  const head = (
    <div className="drw-head">
      {backBtn}
      {eyebrow}
      <div className="drw-title">{title}</div>
      <div className="drw-amount">{fmt(entry.amount)}</div>
      {legalBasisPill}
    </div>
  );

  // No chain
  if (!data.hasChain) {
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
          <div style={{ padding: '12px 0', color: 'var(--tm)', fontSize: '13px', fontFamily: "'DM Mono',monospace", letterSpacing: '0.05em' }}>
            No linked decision chain for this transaction.
          </div>
          <div style={{ marginTop: '8px' }}>
            <a href="#contribute" style={{ fontFamily: "'DM Mono',monospace", fontSize: '10px', color: 'var(--teal)', textDecoration: 'none', letterSpacing: '0.1em' }}>
              Help us link this transaction →
            </a>
          </div>
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
      link: chain.item ? (
        <a className="chain-link" href="#" data-record-id={chain.item.id}>
          View all suggestions →
        </a>
      ) : null,
    });
  }

  if (chain?.item) {
    const num = chain.item.number || '';
    steps.push({
      icon: '📋',
      type: `Item${num ? ' · ' + num : ''}`,
      text: chain.item.subject || '',
      link: (
        <a className="chain-link" href="#" data-record-id={chain.item.id}>
          View {num || 'item'} →
        </a>
      ),
    });
  }

  if (chain?.vote) {
    steps.push({ icon: '🗳️', type: 'Vote', text: chain.vote.outcome || 'Vote recorded' });
  } else if (data.legalBasis) {
    steps.push({ icon: '📜', type: 'Authorization', text: `Authorized under legal basis: ${data.legalBasis}` });
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
    type: `Transaction${data.transactionId ? ' · ' + data.transactionId : ''}`,
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
