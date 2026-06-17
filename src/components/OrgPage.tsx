'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import Nav from './Nav';
import Footer from './Footer';
import PageHeader from './PageHeader';
import Drawer from './Drawer';
import { useTheme } from '@/context/ThemeContext';
import { useDrawer } from '@/hooks/useDrawer';
import { detectScale, makeFmt } from '@/lib/format';
import { DEFAULT_ORG_ID, fetchOrg, fetchSankey } from '@/lib/api';
import { TORONTO_2024_DATA } from '@/lib/toronto';
import type { OrgData, SankeyData } from '@/lib/types';
import ItemsTab from './tabs/ItemsTab';
import ProjectsTab from './tabs/ProjectsTab';
import MembersTab from './tabs/MembersTab';

// D3 reads window during render, so keep the chart client-only.
const SankeyChart = dynamic(() => import('./SankeyChart'), { ssr: false });

type Tab = 'finances' | 'items' | 'projects' | 'members';
const TABS: { id: Tab; label: string }[] = [
  { id: 'finances', label: 'Finances' },
  { id: 'items', label: 'Items' },
  { id: 'projects', label: 'Projects' },
  { id: 'members', label: 'Members' },
];

export default function OrgPage() {
  const { theme } = useTheme();
  const drawer = useDrawer();

  const [activeTab, setActiveTab] = useState<Tab>('finances');
  // Tabs are lazy-loaded: a pane mounts (and fetches) only once visited.
  const [visited, setVisited] = useState<Set<Tab>>(() => new Set<Tab>(['finances']));
  const [orgId, setOrgId] = useState<string>(DEFAULT_ORG_ID);
  const [org, setOrg] = useState<OrgData | null>(null);
  const [data, setData] = useState<SankeyData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orgIdParam = params.get('orgId') || '';
    const orgParam = params.get('org');
    const resolvedId = orgIdParam || DEFAULT_ORG_ID;
    setOrgId(resolvedId);

    // Org metadata (live) — only when an explicit orgId is given, matching the mockup.
    if (orgIdParam) {
      fetchOrg(orgIdParam)
        .then((d) => {
          setOrg(d);
          if (d.name) document.title = `${d.name} — WikiGov | Democracy Distributed`;
        })
        .catch(() => {
          /* keep defaults */
        });
    }

    // Sankey data.
    if (orgParam === 'toronto') {
      setData(TORONTO_2024_DATA);
      return;
    }
    fetchSankey(resolvedId)
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, []);

  const fmt = useMemo(() => makeFmt(data ? detectScale(data.revenue) : false), [data]);

  function openTab(id: Tab) {
    setActiveTab(id);
    setVisited((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
  }

  return (
    <>
      <Nav />
      <PageHeader org={org} />

      <div className="tab-bar">
        {TABS.map((t) => (
          <button key={t.id} className={`tab${activeTab === t.id ? ' active' : ''}`} onClick={() => openTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="content">
        {/* FINANCES */}
        <div className={`tab-pane${activeTab === 'finances' ? ' active' : ''}`}>
          <div className="fin-top">
            <div>
              <div className="sec-lbl">Financial Overview</div>
              <div className="fin-title">
                Where the money comes from
                <br />— and where it goes
              </div>
            </div>
          </div>
          <div className="s-toolbar">
            <div className="s-tl">
              <div className="live-dot" />
              <span className="s-tlbl">Live · Updated Apr 2026</span>
            </div>
            <button className="add-btn">+ Add data</button>
          </div>
          <div className="sankey-card">
            {error ? (
              <div className="sankey-error">
                <span className="err-title">⚠ Failed to load financial data</span>
                <br />
                <span className="err-msg">{error}</span>
                <br />
                <span className="err-tip">Tip: add ?org=toronto to URL to load demo data</span>
              </div>
            ) : data ? (
              <SankeyChart data={data} fmt={fmt} theme={theme} onOpenNode={drawer.openNode} />
            ) : (
              <div className="sankey-wrap">
                <div style={{ padding: '40px', fontFamily: "'DM Mono',monospace", fontSize: '12px', color: 'var(--tm)' }}>Loading financial data…</div>
              </div>
            )}
            <div className="sankey-hint">↑ Click any node to explore transactions</div>
          </div>
          <div className="cs">
            <div className="cs-txt">
              <h4>Know something we don&apos;t?</h4>
              <p>Add a missing transaction, correct a vote outcome, or link a project to its source item.</p>
            </div>
            <a href="#contribute" className="cs-btn">
              Contribute Data →
            </a>
          </div>
        </div>

        {/* ITEMS */}
        <div className={`tab-pane${activeTab === 'items' ? ' active' : ''}`}>{visited.has('items') ? <ItemsTab orgId={orgId} /> : null}</div>

        {/* PROJECTS */}
        <div className={`tab-pane${activeTab === 'projects' ? ' active' : ''}`}>{visited.has('projects') ? <ProjectsTab orgId={orgId} fmt={fmt} /> : null}</div>

        {/* MEMBERS */}
        <div className={`tab-pane${activeTab === 'members' ? ' active' : ''}`}>
          <MembersTab />
        </div>
      </div>

      <Footer />

      <Drawer
        stack={drawer.stack}
        isOpen={drawer.isOpen}
        fmt={fmt}
        onBack={drawer.back}
        onClose={drawer.close}
        onDrill={drawer.drill}
        onTrace={drawer.trace}
      />
    </>
  );
}
