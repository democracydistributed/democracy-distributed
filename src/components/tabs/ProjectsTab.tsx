'use client';

import Link from 'next/link';
import { createPortal } from 'react-dom';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { fetchProjects } from '@/lib/api';
import type { Formatter } from '@/lib/format';
import { clampWords, fmtMonthYear, fmtProjectDate, htmlToText, stripHtml } from '@/lib/text';
import type { Project, ProjectTask, ProjectsResponse } from '@/lib/types';

const PAGE = 25;
const UNSPECIFIED = 'unspecified';

// Consistent colour per domain; unknown domains fall back to muted.
// Colours live in globals.css (--dom-*) so light mode gets contrast-safe values.
const domainColor = (k: string) => `var(--dom-${k}, var(--tm))`;

type PreparedTask = ProjectTask & {
  key: string;
  full: string;
  preview: string;
};
type PreparedProject = Project & {
  desc: string;
  preparedTasks: PreparedTask[];
  domainKeys: string[];
  closed: boolean;
  taskCount: number;
  haystack: string;
};

const CLOSED_STATUSES = new Set(['done', 'cancelled', 'canceled']);

// Active work first, then Backlog.
const STATUS_ORDER = ['in progress', 'to do', 'backlog', 'done', 'cancelled', 'canceled'];
const statusRank = (s: string | null | undefined) => {
  const i = STATUS_ORDER.indexOf((s ?? '').trim().toLowerCase());
  return i < 0 ? 2 : i;
};

// Done/Cancelled tasks are left for the project's own page; this list shows active work only.
const isFinished = (status: string | null | undefined) =>
  ['done', 'cancelled', 'canceled'].includes((status ?? '').trim().toLowerCase());

const taskDomainKey = (d: string | null | undefined) => (d ? d.trim().toLowerCase() : '') || UNSPECIFIED;
const domainLabel = (key: string) => (key === UNSPECIFIED ? 'No domain' : key.charAt(0).toUpperCase() + key.slice(1));

/** Parse descriptions once on load, not on every render. */
function prepare(projects: Project[]): PreparedProject[] {
  return projects.map((p) => {
    const desc = stripHtml(p.description);
    const preparedTasks = (p.tasks ?? [])
      .filter((t) => !isFinished(t.status))
      .map((t) => {
        const full = htmlToText(t.description);
        return {
          ...t,
          key: taskDomainKey(t.domain),
          full,
          preview: clampWords(stripHtml(t.description), 140),
        };
      })
      .sort((a, b) => statusRank(a.status) - statusRank(b.status));
    return {
      ...p,
      desc,
      preparedTasks,
      closed: CLOSED_STATUSES.has((p.status ?? '').trim().toLowerCase()),
      haystack: [p.name, desc, p.domain, ...preparedTasks.map((t) => t.title)].join(' ').toLowerCase(),
      taskCount: preparedTasks.length,
      // Shown tasks drive the domain when there are any; otherwise fall back to the project's own domain.
      domainKeys: preparedTasks.length
        ? [...new Set(preparedTasks.map((t) => t.key))]
        : p.domain && p.domain.trim()
          ? [taskDomainKey(p.domain)]
          : [UNSPECIFIED],
    };
  });
}

const statusClass = (s: string) => {
  const k = s.trim().toLowerCase();
  return k === 'in progress' ? 'prog' : k === 'done' ? 'done' : k === 'cancelled' || k === 'canceled' ? 'off' : 'todo';
};

function DomainTag({ k }: { k: string }) {
  return (
    <span className="pj-dom" style={{ color: domainColor(k) }}>
      {domainLabel(k)}
    </span>
  );
}

function TaskRow({ t, onOpen }: { t: PreparedTask; onOpen: () => void }) {
  const assigned = t.assigneeId != null;
  return (
    <div className="pj-task">
      <button className="pj-task-btn" aria-haspopup="dialog" onClick={onOpen}>
        <div className="pj-task-top">
          <div className="pj-task-title">{t.title || '(Untitled task)'}</div>
          <span className="pj-caret">›</span>
        </div>
        <div className="pj-task-meta">
          {t.key !== UNSPECIFIED ? <DomainTag k={t.key} /> : null}
          {t.status ? <span>{t.status}</span> : null}
          <span className={assigned ? 'pj-assign-on' : 'pj-assign-off'}>{assigned ? 'Assigned' : 'Unassigned'}</span>
        </div>
        {t.preview ? <div className="pj-task-prev">{t.preview}</div> : null}
      </button>
    </div>
  );
}

/**
 * Who authorized this project. Falls back: Item number -> truncated Item subject ->
 * an honest "no authorizing item" line with the project number or created month.
 */
function AuthLine({ p }: { p: Project }) {
  const num = p.itemNumber?.trim();
  const subj = p.itemSubject?.trim();
  const label = num || (subj ? clampWords(subj, 40) : p.itemId ? 'linked item' : '');
  if (label) {
    const text = <>Authorized by {label}</>;
    return (
      <div className="pj-auth">
        {p.itemId ? (
          <Link href={`/item/${encodeURIComponent(p.itemId)}`} title={subj || undefined}>
            {text} →
          </Link>
        ) : (
          text
        )}
      </div>
    );
  }
  const pn = p.projectNumber?.trim();
  const added = fmtMonthYear(p.createdAt);
  const tail = pn ? `Project ${pn}` : added ? `Added ${added}` : '';
  return <div className="pj-auth pj-auth-none">No authorizing item on record{tail ? ` · ${tail}` : ''}</div>;
}

type OpenTask = { project: PreparedProject; index: number };

const STATUS_STEPS = ['Backlog', 'To Do', 'In Progress', 'Done'];

/**
 * Task detail: a right-hand panel on wide screens, a full-width bottom sheet on phones
 * (layout switches in CSS). Prev/next step through the tasks shown on that project's card.
 */
function TaskPanel({ o, onClose, onStep }: { o: OpenTask; onClose: () => void; onStep: (d: number) => void }) {
  // Play the exit animation, then unmount.
  const [closing, setClosing] = useState(false);
  const requestClose = useCallback(() => {
    if (closing) return;
    setClosing(true);
    window.setTimeout(onClose, 220);
  }, [closing, onClose]);

  const { project: p, index } = o;
  const list = p.preparedTasks;
  const t = list[index];
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus?.();
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') requestClose();
      else if (e.key === 'ArrowLeft' && index > 0) onStep(-1);
      else if (e.key === 'ArrowRight' && index < list.length - 1) onStep(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [requestClose, onStep, index, list.length]);

  if (!t) return null;

  const assigned = t.assigneeId != null;
  const rep = Number(t.reputationReward);
  const due = fmtProjectDate(t.dueDate);
  const paras = t.full ? t.full.split('\n').filter(Boolean) : [];
  const stepIdx = STATUS_STEPS.findIndex((s) => s.toLowerCase() === (t.status ?? '').trim().toLowerCase());
  const c = p.counts;
  const pDue = fmtProjectDate(p.dueDate);

  const facts: { label: string; node: ReactNode }[] = [];
  if (t.key !== UNSPECIFIED) {
    facts.push({
      label: 'Domain',
      node: <span style={{ color: domainColor(t.key), fontWeight: 500 }}>{domainLabel(t.key)}</span>,
    });
  }
  facts.push({
    label: 'Assignment',
    node: <span className={assigned ? undefined : 'pj-assign-off'}>{assigned ? 'Assigned' : 'Unassigned'}</span>,
  });
  if (Number.isFinite(rep) && rep > 0) {
    facts.push({ label: 'Reputation reward', node: <span className="pj-mono">+{rep}</span> });
  }
  if (due) facts.push({ label: 'Due', node: due });
  if (facts.length % 2 === 1) facts.push({ label: '', node: null });

  // Portal to <body>: an ancestor with a transform would otherwise anchor position:fixed to itself.
  return createPortal(
    <>
      <div className={'pj-scrim' + (closing ? ' out' : '')} onClick={requestClose} />
      <div
        className={'pj-panel' + (closing ? ' out' : '')}
        role="dialog"
        aria-modal="true"
        aria-label={t.title || 'Task detail'}
      >
        <div className="pj-panel-grab" aria-hidden="true">
          <span />
        </div>
        <div className="pj-panel-head">
          <div className="pj-panel-crumb">
            <span>Task in</span>
            {p.projectId ? (
              <Link href={`/project/${encodeURIComponent(p.projectId)}`}>{p.name || '(Untitled)'}</Link>
            ) : (
              <span>{p.name || '(Untitled)'}</span>
            )}
          </div>
          {list.length > 1 ? (
            <div className="pj-panel-nav">
              <button aria-label="Previous task" disabled={index === 0} onClick={() => onStep(-1)}>
                ‹
              </button>
              <span>
                {index + 1}/{list.length}
              </span>
              <button aria-label="Next task" disabled={index === list.length - 1} onClick={() => onStep(1)}>
                ›
              </button>
            </div>
          ) : null}
          <button ref={closeRef} className="pj-panel-x" aria-label="Close" onClick={requestClose}>
            ×
          </button>
        </div>

        <div className="pj-panel-body">
          <h3 className="pj-panel-title">{t.title || '(Untitled task)'}</h3>

          {stepIdx >= 0 ? (
            <ol className="pj-steps" aria-label={`Status: ${t.status}`}>
              {STATUS_STEPS.map((s, i) => (
                <li
                  key={s}
                  className={i < stepIdx ? 'past' : i === stepIdx ? 'now' : ''}
                  aria-current={i === stepIdx ? 'step' : undefined}
                >
                  <i />
                  {s}
                </li>
              ))}
            </ol>
          ) : t.status ? (
            <div className="pj-mono" style={{ marginBottom: 22 }}>
              {t.status}
            </div>
          ) : null}

          <div className="pj-facts">
            {facts.map((f, i) => (
              <div key={i}>
                <div className="pj-lbl">{f.label}</div>
                <div className="pj-fact-v">{f.node}</div>
              </div>
            ))}
          </div>

          <div className="pj-lbl" style={{ marginBottom: 10 }}>
            Description
          </div>
          {paras.length ? (
            paras.map((x, i) => (
              <p className="pj-para" key={i}>
                {x}
              </p>
            ))
          ) : (
            <p className="pj-para pj-empty">No description yet.</p>
          )}

          <div className="pj-pcard">
            <div className="pj-lbl" style={{ marginBottom: 8 }}>
              Part of project
            </div>
            <div className="pj-pcard-top">
              <div className="pj-pcard-name">{p.name || '(Untitled)'}</div>
              {p.status ? <span className={'pj-status ' + statusClass(p.status)}>{p.status}</span> : null}
            </div>
            {c && c.total > 0 ? (
              <>
                <div className="pj-pcard-meta">
                  {c.done} of {c.total} {c.total === 1 ? 'task' : 'tasks'} done{pDue ? ` · Due ${pDue}` : ''}
                </div>
                <div className="proj-track">
                  <div
                    className="proj-fill"
                    style={{ width: `${Math.min(100, Math.round((c.done / c.total) * 100))}%` }}
                  />
                </div>
              </>
            ) : pDue ? (
              <div className="pj-pcard-meta">Due {pDue}</div>
            ) : null}
            <AuthLine p={p} />
          </div>
        </div>

        {p.projectId ? (
          <div className="pj-panel-foot">
            <Link className="pj-panel-cta" href={`/project/${encodeURIComponent(p.projectId)}`}>
              View project →
            </Link>
          </div>
        ) : null}
      </div>
    </>,
    document.body,
  );
}

export default function ProjectsTab({ orgId, fmt }: { orgId: string; fmt: Formatter }) {
  const [data, setData] = useState<ProjectsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(PAGE);
  const [domain, setDomain] = useState<string | null>(null);
  const [view, setView] = useState<'open' | 'closed'>('open');
  const [query, setQuery] = useState('');
  const [openTask, setOpenTask] = useState<OpenTask | null>(null);
  const closeTask = useCallback(() => setOpenTask(null), []);

  useEffect(() => {
    let alive = true;
    fetchProjects(orgId)
      .then((d) => {
        if (alive) setData(d);
      })
      .catch((e: Error) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [orgId]);

  const projects = useMemo(() => (data ? prepare(data.projects) : null), [data]);

  const tabCounts = useMemo(() => {
    const closed = (projects ?? []).filter((p) => p.closed).length;
    return { open: (projects?.length ?? 0) - closed, closed };
  }, [projects]);

  // Projects in the active tab that match the search; chips count these.
  const base = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (projects ?? []).filter((p) => (view === 'closed') === p.closed && (!q || p.haystack.includes(q)));
  }, [projects, view, query]);

  const chips = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of base) for (const k of new Set(p.domainKeys)) m.set(k, (m.get(k) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => Number(a[0] === UNSPECIFIED) - Number(b[0] === UNSPECIFIED));
  }, [base]);

  const filtered = useMemo(() => {
    if (!domain) return base;
    return base
      .filter((p) => p.domainKeys.includes(domain))
      .map((p) => ({
        ...p,
        preparedTasks: p.preparedTasks.filter((t) => t.key === domain),
      }))
      .filter((p) => p.preparedTasks.length > 0 || p.taskCount === 0);
  }, [base, domain]);

  if (error) {
    return (
      <>
        <div className="items-state">
          <span className="items-state-err">⚠ Failed to load projects</span>
          <span className="items-state-sub">{error}</span>
        </div>
      </>
    );
  }

  if (!projects || !data) {
    return (
      <>
        <div className="items-state">Loading projects…</div>
      </>
    );
  }

  if (projects.length === 0) {
    return (
      <>
        <div className="items-state">
          No projects on record yet.
          <br />
          <a href="/contribute" className="items-state-link">
            Contribute Data →
          </a>
        </div>
      </>
    );
  }

  const total = data.total ?? projects.length;
  const available = Number(data.totalAvailable);
  const partial = Number.isFinite(available) && available > total;
  const shown = filtered.slice(0, visible);
  const remaining = filtered.length - visible;

  return (
    <>
      <div className="pj-tabs" role="tablist">
        {(['open', 'closed'] as const).map((v) => (
          <button
            key={v}
            role="tab"
            aria-selected={view === v}
            className={'pj-tab' + (view === v ? ' on' : '')}
            onClick={() => {
              setView(v);
              setDomain(null);
              setVisible(PAGE);
            }}
          >
            {v === 'open' ? 'Open' : 'Closed'} <span className="pj-chip-n">{tabCounts[v]}</span>
          </button>
        ))}
      </div>
      <input
        className="items-search"
        style={{ width: '100%', marginBottom: 12 }}
        type="search"
        placeholder="Search projects and tasks"
        aria-label="Search projects and tasks"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setVisible(PAGE);
        }}
      />
      {chips.length > 0 ? (
        <div className="pj-chips" role="group" aria-label="Filter by domain">
          <button
            className={'pj-chip' + (domain === null ? ' on' : '')}
            aria-pressed={domain === null}
            onClick={() => {
              setDomain(null);
              setVisible(PAGE);
            }}
          >
            All <span className="pj-chip-n">{base.length}</span>
          </button>
          {chips.map(([k, n]) => (
            <button
              key={k}
              className={'pj-chip' + (domain === k ? ' on' : '')}
              aria-pressed={domain === k}
              onClick={() => {
                setDomain(domain === k ? null : k);
                setVisible(PAGE);
              }}
            >
              {domainLabel(k)} <span className="pj-chip-n">{n}</span>
            </button>
          ))}
        </div>
      ) : null}
      {partial ? (
        <div className="pj-note">
          Showing {total} of {available} projects
        </div>
      ) : null}
      <div id="projects-list">
        {shown.length === 0 ? (
          <div className="items-state">
            {query.trim() || domain ? 'No projects match those filters.' : `No ${view} projects.`}
          </div>
        ) : null}
        {shown.map((p, i) => {
          const dueStr = fmtProjectDate(p.dueDate);
          const meta = dueStr ? 'Due ' + dueStr : null;
          const c = p.counts;
          const hasProgress = !!c && c.total > 0;
          return (
            <div className="proj-card" key={p.projectId || i}>
              <div className="proj-hd">
                <div>
                  {p.projectId ? (
                    <Link
                      className="proj-name"
                      href={`/project/${encodeURIComponent(p.projectId)}`}
                      style={{ textDecoration: 'none', color: 'inherit' }}
                    >
                      {p.name || '(Untitled)'}
                    </Link>
                  ) : (
                    <span className="proj-name" style={{ color: 'inherit' }}>
                      {p.name || '(Untitled)'}
                    </span>
                  )}
                  {meta ? (
                    <div
                      style={{
                        fontSize: '11px',
                        color: 'var(--tm)',
                        marginTop: '2px',
                      }}
                    >
                      {meta}
                    </div>
                  ) : null}
                </div>
                {p.status ? <span className={'pj-status ' + statusClass(p.status)}>{p.status}</span> : null}
              </div>
              {p.preparedTasks.length === 0 && p.domainKeys.length === 1 && p.domainKeys[0] !== UNSPECIFIED ? (
                <div className="pj-task-meta" style={{ marginTop: 0, marginBottom: 8 }}>
                  <DomainTag k={p.domainKeys[0]} />
                </div>
              ) : null}
              {p.desc ? <div className="proj-desc">{p.desc}</div> : null}
              {hasProgress ? (
                <div className="pj-prog">
                  <div className="proj-pl">
                    <span>
                      {c.done} of {c.total} {c.total === 1 ? 'task' : 'tasks'} done
                    </span>
                  </div>
                  <div className="proj-track">
                    <div
                      className="proj-fill"
                      style={{
                        width: `${Math.min(100, Math.round((c.done / c.total) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              ) : null}
              {p.preparedTasks.length > 0 ? (
                <div className="pj-tasks">
                  {p.preparedTasks.map((t, j) => (
                    <TaskRow t={t} key={t.taskId || j} onOpen={() => setOpenTask({ project: p, index: j })} />
                  ))}
                </div>
              ) : null}
              <AuthLine p={p} />
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
      {openTask ? (
        <TaskPanel
          o={openTask}
          onClose={closeTask}
          onStep={(d) => setOpenTask((o) => (o ? { ...o, index: o.index + d } : o))}
        />
      ) : null}
    </>
  );
}
