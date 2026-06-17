'use client';

import { useEffect, useMemo, useState } from 'react';
import { fetchItems } from '@/lib/api';
import { fmtItemDate, stripHtml } from '@/lib/text';
import type { Item } from '@/lib/types';

const PAGE = 25;
type Sort = 'newest' | 'oldest';

export default function ItemsTab({ orgId }: { orgId: string }) {
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('newest');
  const [visible, setVisible] = useState(PAGE);

  useEffect(() => {
    let alive = true;
    fetchItems(orgId)
      .then((d) => {
        if (alive) setItems(d.items);
      })
      .catch((e: Error) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [orgId]);

  // Reset pagination whenever the filter/sort changes.
  useEffect(() => {
    setVisible(PAGE);
  }, [query, sort]);

  const list = useMemo(() => {
    if (!items) return [];
    const q = query.toLowerCase().trim();
    let filtered = items.slice();
    if (q) {
      filtered = filtered.filter(
        (it) => (it.subject || '').toLowerCase().includes(q) || (it.itemNumber || '').toLowerCase().includes(q),
      );
    }
    const dated = filtered.filter((it) => it.date);
    const undated = filtered.filter((it) => !it.date);
    dated.sort((a, b) => (sort === 'newest' ? (b.date as string).localeCompare(a.date as string) : (a.date as string).localeCompare(b.date as string)));
    return [...dated, ...undated];
  }, [items, query, sort]);

  if (error) {
    return (
      <>
        <div className="sec-lbl">Items</div>
        <div className="items-state">
          <span className="items-state-err">⚠ Failed to load items</span>
          <span className="items-state-sub">{error}</span>
        </div>
      </>
    );
  }

  if (!items) {
    return (
      <>
        <div className="sec-lbl">Items</div>
        <div className="items-state">Loading items…</div>
      </>
    );
  }

  const shown = list.slice(0, visible);
  const remaining = list.length - visible;

  return (
    <>
      <div className="sec-lbl">Items</div>
      <div className="items-toolbar">
        <input
          className="items-search"
          type="search"
          placeholder="Search items…"
          autoComplete="off"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="items-sort-wrap">
          <select className="items-sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
          <span className="items-sort-arrow">▾</span>
        </div>
        <span className="items-count">
          {list.length} item{list.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div id="items-list">
        {list.length === 0 ? (
          query ? (
            <div className="items-state">No items match your search.</div>
          ) : (
            <div className="items-state">
              No items on record yet.
              <br />
              <a href="#contribute" className="items-state-link">
                Contribute Data →
              </a>
            </div>
          )
        ) : (
          <>
            {shown.map((it, i) => {
              const dateStr = fmtItemDate(it.date);
              const desc = stripHtml(it.description);
              return (
                <div className="item-card" key={it.itemId || i}>
                  <a className="item-subject" href={`#item-${it.itemId || ''}`} onClick={(e) => e.preventDefault()}>
                    {it.subject || '(Untitled)'}
                  </a>
                  {it.itemNumber || it.type || dateStr ? (
                    <div className="item-meta-row">
                      {it.itemNumber ? <span className="item-chip item-chip-num">{it.itemNumber}</span> : null}
                      {it.type ? <span className="item-chip item-chip-type">{it.type}</span> : null}
                      {dateStr ? <span className="item-date">{dateStr}</span> : null}
                    </div>
                  ) : null}
                  {desc ? <div className="item-desc">{desc}</div> : null}
                </div>
              );
            })}
            {remaining > 0 ? (
              <div style={{ textAlign: 'center', marginTop: '16px' }}>
                <button className="cs-btn" onClick={() => setVisible((v) => v + PAGE)}>
                  Load more ({remaining} remaining)
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </>
  );
}
