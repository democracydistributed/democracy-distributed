'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import Nav from './Nav';
import Footer from './Footer';
import PageHeader from './PageHeader';
import Drawer from './Drawer';
import MobileSankeySummary from './MobileSankeySummary';
import { useTheme } from '@/context/ThemeContext';
import { useDrawer } from '@/hooks/useDrawer';
import { useIsMobile } from '@/hooks/useIsMobile';
import { detectScale, makeFmt } from '@/lib/format';
import type { OrgData, SankeyData } from '@/lib/types';
import ItemsTab from './tabs/ItemsTab';
import ProjectsTab from './tabs/ProjectsTab';
import PeopleTab from './tabs/PeopleTab';
import SuggestionsTab from './tabs/SuggestionsTab';

// D3 reads window during render, so keep the chart client-only.
const SankeyChart = dynamic(() => import('./SankeyChart'), { ssr: false });

type Tab = 'finances' | 'suggestions' | 'items' | 'rules' | 'projects' | 'people';

const GOV_TABS: { id: Tab; label: string }[] = [
  { id: 'finances', label: 'Finances' },
  { id: 'items', label: 'Items' },
  { id: 'projects', label: 'Projects' },
  { id: 'people', label: 'People' },
];

// Community Group orgs get two extra tabs (Suggestions, Rules) in a
// different order — see Org Page.dc.html in the mockup folder.
const COMMUNITY_TABS: { id: Tab; label: string }[] = [
  { id: 'suggestions', label: 'Suggestions' },
  { id: 'items', label: 'Items' },
  { id: 'projects', label: 'Projects' },
  { id: 'finances', label: 'Finances' },
  { id: 'rules', label: 'Rules' },
  { id: 'people', label: 'People' },
];

interface Props {
  orgId: string;
  initialOrg: OrgData | null;
  initialSankey: SankeyData | null;
  initialError: string | null;
}

export default function OrgPage({ orgId, initialOrg, initialSankey, initialError }: Props) {
  const { theme } = useTheme();
  const drawer = useDrawer();
  const isMobile = useIsMobile();
  const [showFullChart, setShowFullChart] = useState(false);

  const [activeTab, setActiveTab] = useState<Tab>('finances');
  // Tabs are lazy-loaded: a pane mounts (and fetches) only once visited.
  const [visited, setVisited] = useState<Set<Tab>>(() => new Set<Tab>(['finances']));
  const [org] = useState<OrgData | null>(initialOrg);
  const [data] = useState<SankeyData | null>(initialSankey);
  const [error] = useState<string | null>(initialError);

  // 'DD Government' covers Democracy Distributed's own internal/POD-governed
  // bodies (e.g. DD Central Government) — those get the community layout
  // too, same as an actual Community Group org. Everything else (the real
  // government orgs being tracked, e.g. "Local Government") keeps the
  // original finance-transparency layout.
  const isCommunity = org?.type === 'Community Group' || org?.type === 'DD Government';
  const TABS = isCommunity ? COMMUNITY_TABS : GOV_TABS;

  // Org/sankey data is fetched server-side and handed in as props — this is
  // what makes the page's real content (not a "Loading…" shell) visible to
  // crawlers that don't execute JS. Only the document title is a client effect.
  useEffect(() => {
    if (org?.name) document.title = `${org.name} — Democracy Distributed`;
  }, [org]);

  const fmt = useMemo(() => makeFmt(data ? detectScale(data.revenue) : false), [data]);

  function openTab(id: Tab) {
    setActiveTab(id);
    setVisited((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
  }

  return (
    <>
      <div data-org-type={isCommunity ? 'community' : 'gov'} style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Nav />
      <PageHeader org={org} />

      <div className="tab-bar" role="tablist" aria-label="Page sections">
        {TABS.map((t) => (
          <button key={t.id} role="tab" id={`tab-${t.id}`} aria-selected={activeTab === t.id} aria-controls={`panel-${t.id}`} className={`tab${activeTab === t.id ? ' active' : ''}`} onClick={() => openTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="content" style={{ flex: '1 0 auto' }}>
        {/* FINANCES */}
        <div className={`tab-pane${activeTab === 'finances' ? ' active' : ''}`} role="tabpanel" id="panel-finances" aria-labelledby="tab-finances">
          <div className="fin-top">
            <div>
              <div className="sec-lbl">Financial Overview</div>
              <div className="fin-title">Follow the Money</div>
            </div>
          </div>
          {data ? (
            // Plain-text summary of the same totals the chart visualizes — the
            // D3 Sankey below is client-only (it reads `window`), so this is
            // what gives crawlers and AI summarizers an actual number to quote.
            <p style={{ fontSize: 14, color: 'var(--tm)', maxWidth: 640, margin: '0 0 20px', lineHeight: 1.6 }}>
              {org?.name || 'This organization'} reports {fmt(data.revenue)} in revenue and {fmt(data.spending)} in
              spending across the records below. Explore the flow from each revenue source to where it&apos;s spent.
            </p>
          ) : null}
          <div className="sankey-card">
            <div className="sankey-hint">Click any node to trace transactions</div>
            {error ? (
              <div className="sankey-error">
                <span className="err-title">⚠ Failed to load financial data</span>
                <br />
                <span className="err-msg">{error}</span>
                <br />
                <span className="err-tip">Tip: add ?org=toronto to URL to load demo data</span>
              </div>
            ) : data ? (
              isMobile && !showFullChart ? (
                <MobileSankeySummary
                  data={data}
                  fmt={fmt}
                  onOpenNode={drawer.openNode}
                  onViewFullChart={() => setShowFullChart(true)}
                />
              ) : (
                <SankeyChart data={data} fmt={fmt} theme={theme} onOpenNode={drawer.openNode} />
              )
            ) : (
              <div className="sankey-wrap">
                <div style={{ padding: '40px', fontFamily: "'DM Mono',monospace", fontSize: '12px', color: 'var(--tm)' }}>Loading financial data…</div>
              </div>
            )}
          </div>
          <div className="cs">
            <div className="cs-txt">
              <h4>Know something we don&apos;t?</h4>
              <p>Add a missing transaction, correct a vote outcome, or link a project to its source item.</p>
            </div>
            <a href="/contribute" className="cs-btn">
              Contribute Data →
            </a>
          </div>
        </div>

        {/* SUGGESTIONS (Community Group orgs only) */}
        {isCommunity ? (
          <div className={`tab-pane${activeTab === 'suggestions' ? ' active' : ''}`} role="tabpanel" id="panel-suggestions" aria-labelledby="tab-suggestions">
            {visited.has('suggestions') ? <SuggestionsTab orgId={orgId} /> : null}
          </div>
        ) : null}

        {/* ITEMS */}
        <div className={`tab-pane${activeTab === 'items' ? ' active' : ''}`} role="tabpanel" id="panel-items" aria-labelledby="tab-items">{visited.has('items') ? <ItemsTab orgId={orgId} /> : null}</div>

        {/* RULES (Community Group orgs only) */}
        {isCommunity ? (
          <div className={`tab-pane${activeTab === 'rules' ? ' active' : ''}`} role="tabpanel" id="panel-rules" aria-labelledby="tab-rules">
            <div className="sec-lbl">Rules</div>
            <div className="items-state">Rules are on their way to this page.</div>
          </div>
        ) : null}

        {/* PROJECTS */}
        <div className={`tab-pane${activeTab === 'projects' ? ' active' : ''}`} role="tabpanel" id="panel-projects" aria-labelledby="tab-projects">{visited.has('projects') ? <ProjectsTab orgId={orgId} fmt={fmt} /> : null}</div>

        {/* PEOPLE */}
        <div className={`tab-pane${activeTab === 'people' ? ' active' : ''}`} role="tabpanel" id="panel-people" aria-labelledby="tab-people">{visited.has('people') ? <PeopleTab orgId={orgId} /> : null}</div>
      </div>

      <Footer />
      </div>

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
