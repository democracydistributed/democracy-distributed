'use client';

import { useEffect, useState } from 'react';
import { fetchProjects } from '@/lib/api';
import type { Formatter } from '@/lib/format';
import { fmtProjectDate, stripHtml } from '@/lib/text';
import type { Project } from '@/lib/types';

const PAGE = 25;

export default function ProjectsTab({ orgId, fmt }: { orgId: string; fmt: Formatter }) {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(PAGE);

  useEffect(() => {
    let alive = true;
    fetchProjects(orgId)
      .then((d) => {
        if (alive) setProjects(d.projects);
      })
      .catch((e: Error) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [orgId]);

  if (error) {
    return (
      <>
        <div className="sec-lbl">Projects</div>
        <div className="items-state">
          <span className="items-state-err">⚠ Failed to load projects</span>
          <span className="items-state-sub">{error}</span>
        </div>
      </>
    );
  }

  if (!projects) {
    return (
      <>
        <div className="sec-lbl">Projects</div>
        <div className="items-state">Loading projects…</div>
      </>
    );
  }

  if (projects.length === 0) {
    return (
      <>
        <div className="sec-lbl">Projects</div>
        <div className="items-state">
          No projects on record yet.
          <br />
          <a href="#contribute" className="items-state-link">
            Contribute Data →
          </a>
        </div>
      </>
    );
  }

  const shown = projects.slice(0, visible);
  const remaining = projects.length - visible;

  return (
    <>
      <div className="sec-lbl">Projects</div>
      <div id="projects-list">
        {shown.map((p, i) => {
          const dueStr = fmtProjectDate(p.dueDate);
          const meta = [p.status, dueStr ? 'Due ' + dueStr : null].filter(Boolean).join(' · ');
          const desc = stripHtml(p.description);
          return (
            <div className="proj-card" key={p.projectId || i}>
              <div className="proj-hd">
                <div>
                  <a
                    className="proj-name"
                    href={`#project-${p.projectId || ''}`}
                    onClick={(e) => e.preventDefault()}
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    {p.name || '(Untitled)'}
                  </a>
                  {meta ? <div style={{ fontSize: '11px', color: 'var(--tm)', marginTop: '2px' }}>{meta}</div> : null}
                </div>
                {p.financialReward != null ? <div className="proj-amt">{fmt(p.financialReward)}</div> : null}
              </div>
              {desc ? <div className="proj-desc">{desc}</div> : null}
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
      </div>
    </>
  );
}
