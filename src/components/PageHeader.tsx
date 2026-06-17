'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { OrgData } from '@/lib/types';

const DEFAULTS = {
  name: 'Riverdale Community Board',
  type: 'Community Board',
  status: 'Active',
  jurisdiction: 'Ontario, Canada',
  description:
    'A community board governing the Riverdale neighbourhood in Toronto. Responsible for local parks, programs, and community services.',
};

/** Collapsible description, mirroring the original 150-char "Read more" toggle. */
function Description({ text }: { text: string | null }) {
  const [expanded, setExpanded] = useState(false);
  if (!text) return null;
  if (text.length <= 150) return <p className="org-desc">{text}</p>;

  return (
    <p className="org-desc">
      {expanded ? text : text.slice(0, 150) + '…'}{' '}
      <button className="desc-toggle" onClick={() => setExpanded((v) => !v)}>
        {expanded ? 'Show less' : 'Read more'}
      </button>
    </p>
  );
}

export default function PageHeader({ org }: { org: OrgData | null }) {
  const name = org?.name || DEFAULTS.name;
  const status = org?.status || DEFAULTS.status;
  const statusActive = status.toLowerCase() === 'active';
  const jurisdiction = org ? org.jurisdiction : DEFAULTS.jurisdiction;
  const description = org ? org.description ?? null : DEFAULTS.description;

  return (
    <header className="page-header">
      <div className="bc">
        <Link href="/browse">Browse</Link>
        <span className="sep">›</span>
        <span>{name}</span>
      </div>
      <div className="org-id">
        <div className="org-seal">🏛</div>
        <div className="org-info">
          <h1>{name}</h1>
          <div className="org-tags">
            <span className={statusActive ? 'tag tag-amber' : 'tag tag-muted'}>{status}</span>
            {jurisdiction ? <span className="tag tag-muted">{jurisdiction}</span> : null}
          </div>
          <Description text={description} />
          {org?.website ? (
            <a href={org.website} target="_blank" rel="noopener" className="org-website-link">
              Visit Website →
            </a>
          ) : null}
        </div>
      </div>
    </header>
  );
}
