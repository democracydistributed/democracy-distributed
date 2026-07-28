'use client';

import { useEffect, useRef } from 'react';
import { sankey, sankeyLinkHorizontal, sankeyLeft } from 'd3-sankey';
import { select } from 'd3-selection';
import { buildGraph, countLeaves, treeDepth, CREDIT_COLOURS, DEBIT_COLOURS } from '@/lib/sankey';
import type { Formatter } from '@/lib/format';
import type { GraphNode, SankeyData } from '@/lib/types';

interface Props {
  data: SankeyData;
  fmt: Formatter;
  theme: 'light' | 'dark';
  onOpenNode: (node: GraphNode & { value: number }) => void;
}

function palette(theme: 'light' | 'dark') {
  const light = theme === 'light';
  return {
    muted: light ? '#5a6275' : '#8896b3',
    cream: light ? '#1a1a2e' : '#f5f0e8',
    amber: '#e8a020',
    teal: '#2dd4bf',
    purple: '#a78bfa',
  };
}

export default function SankeyChart({ data, fmt, theme, onOpenNode }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  // Keep the latest click handler without re-running the whole render effect.
  const onOpenRef = useRef(onOpenNode);
  onOpenRef.current = onOpenNode;

  useEffect(() => {
    const svg = svgRef.current;
    const wrap = wrapRef.current;
    if (!svg || !wrap) return;

    function render(shouldCentre: boolean) {
      if (!svg || !wrap) return;
      const C = palette(theme);
      const MIN_NODE_H = 3;

      svg.innerHTML = '';

      const revDepth = treeDepth(data.revenue_data.children[0]);
      const spendDepth = treeDepth(data.spending_data.children[0]);
      const numCols = revDepth + 1 + spendDepth;

      const LABEL_ZONE = 220;
      const COL_STRIDE = 200;
      const HIT_EXT = 160;
      const MAXCHAR = 32;

      const W = LABEL_ZONE * 2 + numCols * COL_STRIDE;
      const LM = LABEL_ZONE;

      const totalLeaves = Math.max(countLeaves(data.revenue_data.children[0]), countLeaves(data.spending_data.children[0]));
      const nodePad = totalLeaves > 30 ? 6 : totalLeaves > 15 ? 12 : 20;
      // Two separate heights, on purpose:
      //  • H is the RENDER height — it still tracks the viewport (0.8×), so the
      //    chart shrinks to fit small screens and fills big ones.
      //  • FOLD_REF_H is a FIXED reference the fold decision is measured against.
      // Deciding folds against a constant height (not the viewport) keeps the
      // SAME items folded on every screen. Otherwise a short viewport shrinks
      // every bar, drops more of them under MERGE_H, and buckets far more (e.g.
      // "24 more" hiding ~$1.5B) than a big screen does ("21 more" hiding
      // ~$363M) for the identical org. HEIGHT_SCALE is a purely visual knob.
      const HEIGHT_SCALE = 0.9;
      const H = Math.round(Math.max(480, Math.min(860, window.innerHeight * 0.8)) * HEIGHT_SCALE);
      const FOLD_REF_H = Math.round(760 * HEIGHT_SCALE); // ≈684 — the density that yields "21 more" on this data
      const BAR_W = 24;

      svg.setAttribute('width', String(W));
      svg.setAttribute('height', String(H));
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);

      const { nodes, links } = buildGraph(data);

      // Typed as `any`: after layout, d3-sankey marks x0/y0/etc as optional,
      // which fights strict-mode arithmetic. We know they're populated here.
      const makeSankey = (height: number, align: (node: any, n: number) => number = sankeyLeft) =>
        sankey<any, any>()
          .nodeId((d: any) => d.index)
          .nodeWidth(BAR_W)
          .nodePadding(nodePad)
          .extent([
            [LM, 16],
            [W - LM, height - 16],
          ])
          .nodeAlign(align);

      // ── How the chart gets built (3 steps) ───────────────────────────────
      // Dense orgs have columns with dozens of line items whose labels collide.
      // Rather than hide labels or shrink text, we fold the unreadable tail into
      // "N more" bands. That happens in three steps:
      //   1. MEASURE  — lay the full tree out once at a fixed reference height,
      //                 purely to learn how tall each node would be.
      //   2. DECIDE   — any node too short for its label is a fold candidate;
      //                 group them per parent into one "N more" band each.
      //   3. RELAYOUT — rebuild a reduced graph (bands replacing their members,
      //                 folded subtrees removed) and run the layout AGAIN on it.
      // Step 3 re-running d3 is what keeps this simple: d3 positions the bands
      // and anchors every ribbon itself, so there's no manual geometry to
      // maintain. Folding is visual only — no underlying data is merged.
      //
      // ---- Pass 1: measure --------------------------------------------------
      // Lay the full tree out at the FIXED reference height purely to learn each
      // node's pixel height there, so the fold decision (below) is the same on
      // every screen regardless of the actual render height.
      const measured: any = makeSankey(FOLD_REF_H)({
        nodes: nodes.map((n, i) => ({ ...n, index: i })),
        links: links.map((l) => ({ ...l })),
      });

      // A node shorter than its two-line label is a merge candidate. When a
      // parent has 2+ such children we fold ALL of them — wherever the layout
      // happened to scatter them — into ONE "N more" band for that parent (one
      // band per parent, never one per accidental adjacency). Nothing merges in
      // the underlying data: the band's dataNode just lists its real children,
      // so its drawer shows them exactly as they'd appear on their own. A merged
      // node's own descendants drop out of the chart and are reached by clicking
      // the band, so they don't orphan-render with no parent bar to hang off.
      const MERGE_H = 20;
      // Group thin siblings by parent AND side. org-centre is the shared parent
      // of both revenue (credit, flowing category→org) and spending (debit,
      // flowing org→category) top-level nodes; merging across that boundary
      // would build a band with links pointing both into and out of org — a
      // cycle d3-sankey rejects ("circular link"). Every non-org parent has
      // single-side children, so keying by side only ever splits org's group.
      const sideOf = (n: any) => (typeof n.type === 'string' && n.type.startsWith('credit') ? 'c' : 'd');
      const thinByParent = new Map<string, any[]>();
      measured.nodes.forEach((n: any) => {
        if (n.id === 'org-centre' || n.parent === undefined || n.parent === null) return;
        if (n.y1 - n.y0 >= MERGE_H) return;
        const key = n.parent + ':' + sideOf(n);
        if (!thinByParent.has(key)) thinByParent.set(key, []);
        thinByParent.get(key)!.push(n);
      });

      const childrenOf = new Map<number, number[]>();
      measured.nodes.forEach((n: any) => {
        if (n.parent === undefined || n.parent === null) return;
        if (!childrenOf.has(n.parent)) childrenOf.set(n.parent, []);
        childrenOf.get(n.parent)!.push(n.index);
      });

      // Everything that gets folded away: each thin node in a 2+ group, plus
      // its whole subtree. Compute this FIRST — before making any bands — so we
      // can tell a surviving parent (which needs an "N more" band for its thin
      // children) from a folded one (whose entire subtree is gone, so its thin
      // children must NOT spawn their own band and orphan-render).
      const mergedAwayIdx = new Set<number>();
      thinByParent.forEach((thin) => {
        if (thin.length >= 2) thin.forEach((t: any) => mergedAwayIdx.add(t.index));
      });
      const excludedIdx = new Set<number>();
      const collectSubtree = (idx: number) => {
        excludedIdx.add(idx);
        (childrenOf.get(idx) || []).forEach(collectSubtree);
      };
      mergedAwayIdx.forEach((idx) => collectSubtree(idx));

      const bandForNode = new Map<number, any>(); // original node index -> its band
      const bandsList: any[] = [];
      thinByParent.forEach((thin) => {
        if (thin.length < 2) return;
        const parentIdx = thin[0].parent; // all siblings in a group share one parent
        if (excludedIdx.has(parentIdx)) return; // parent is folded too → no band, subtree just drops
        const first = thin[0];
        const band: any = {
          ...first,
          id: `merged-${first.id}`,
          label: `${thin.length} more`,
          dataNode: { name: `${thin.length} more`, children: thin.map((t: any) => t.dataNode) },
        };
        thin.forEach((t: any) => bandForNode.set(t.index, band));
        bandsList.push(band);
      });

      // ---- Build the reduced graph -----------------------------------------
      // d3-sankey matches links to nodes by array position, so the surviving
      // nodes + new bands need fresh positions. `__newIndex` is that position,
      // stashed on each node just long enough to rewrite the links below.
      const survivors = measured.nodes.filter((n: any) => !excludedIdx.has(n.index));
      const reducedNodes = [...survivors, ...bandsList];
      reducedNodes.forEach((n: any, i: number) => { n.__newIndex = i; });

      // Where an original node ended up: its band if it was folded, null if it
      // vanished with a folded ancestor, otherwise the node itself.
      const resolve = (oldIdx: number): any | null => {
        const band = bandForNode.get(oldIdx);
        if (band) return band;
        if (excludedIdx.has(oldIdx)) return null;
        return measured.nodes[oldIdx];
      };

      const reducedLinkByKey = new Map<string, any>();
      const reducedLinks: any[] = [];
      links.forEach((l: any) => {
        const s = resolve(l.source);
        const t = resolve(l.target);
        if (!s || !t || s === t) return;
        const key = `${s.__newIndex}->${t.__newIndex}`;
        let acc = reducedLinkByKey.get(key);
        if (!acc) {
          acc = { source: s.__newIndex, target: t.__newIndex, value: 0 };
          reducedLinkByKey.set(key, acc);
          reducedLinks.push(acc);
        }
        acc.value += l.value || 0;
      });

      // ---- Pass 2: final layout --------------------------------------------
      // Re-run the layout on the reduced graph at the actual (viewport-tracking)
      // render height. The fold set is already fixed from pass 1, so this only
      // affects how tall the same nodes/bands are drawn — not which ones exist.
      //
      // Revenue categories don't all sit at the same natural depth: one whose
      // children are all leaves (Property Tax) is a level shallower than one
      // with a sub-category tier (Government transfers → Ontario Conditional
      // Grants → leaf). They still have to line up in a single column.
      //
      // So pin the WHOLE revenue side relative to that column: each node sits
      // `d` columns to its left, where `d` is the node's distance below its
      // top-level category. Pinning only the categories is not enough — that
      // strands their children at their natural depth, so a shallow category's
      // leaves have to fly over an intervening column to reach their parent
      // (Property Tax's leaves sailing over the sub-category column, twice as
      // long as every other ribbon). Pinning the whole side keeps every revenue
      // ribbon exactly one column long.
      //
      // Expressing this as a nodeAlign — i.e. BEFORE layout — is what lets d3
      // own all spacing and collision handling per column. An earlier version
      // moved bars sideways *after* layout instead, which dropped them on top
      // of whatever already occupied the destination column.
      const distCache = new Map<number, number>();
      const distFromIdx = (idx: number): number => {
        const hit = distCache.get(idx);
        if (hit !== undefined) return hit;
        const n: any = nodes[idx];
        const d =
          !n || n.type === 'credit-category' || n.parent === undefined || n.parent === null
            ? 0
            : 1 + distFromIdx(n.parent);
        distCache.set(idx, d);
        return d;
      };
      // A band is spread from one of its members, so it inherits that member's
      // parent and lands in the column its members would have occupied.
      const distBelowCategory = (n: any): number =>
        n.type === 'credit-category' || n.parent === undefined || n.parent === null
          ? 0
          : 1 + distFromIdx(n.parent);

      const isCredit = (n: any) => typeof n.type === 'string' && n.type.startsWith('credit');
      let categoryCol = 0;
      reducedNodes.forEach((n: any) => {
        if (isCredit(n)) categoryCol = Math.max(categoryCol, distBelowCategory(n));
      });
      const align = (node: any, n: number) =>
        isCredit(node) ? categoryCol - distBelowCategory(node) : sankeyLeft(node, n);

      // d3 mutates whatever it's handed (links get their source/target rewritten
      // from indices to node objects), so hand it a fresh copy each attempt.
      const layoutOn = (alignFn?: (node: any, n: number) => number) =>
        makeSankey(H, alignFn)({
          nodes: reducedNodes.map((n: any) => ({ ...n })),
          links: reducedLinks.map((l: any) => ({ ...l })),
        });

      // Fall back to d3's own alignment if the pinned layout turns out unusable
      // — e.g. folding emptied a whole level, leaving a column with no nodes,
      // which d3 can't scale. A slightly misaligned chart beats a white screen.
      let graph: any;
      try {
        graph = layoutOn(align);
      } catch {
        graph = layoutOn();
      }

      // Force org-centre to visual center; scale each side proportionally into its half.
      {
        const centre = graph.nodes.find((n: any) => n.id === 'org-centre');
        if (centre) {
          const targetX0 = (W - BAR_W) / 2;
          const srcCX0 = centre.x0;
          const srcCX1 = centre.x1;

          graph.nodes.forEach((n: any) => {
            if (n.id === 'org-centre') {
              n.x0 = targetX0;
              n.x1 = targetX0 + BAR_W;
              return;
            }
            const nW = n.x1 - n.x0;
            if (n.x1 <= srcCX0) {
              // Revenue node: scale [LM, srcCX0] → [LM, targetX0]
              const srcRange = srcCX0 - LM;
              n.x0 = srcRange > 0 ? LM + (n.x0 - LM) * (targetX0 - LM) / srcRange : LM;
              n.x1 = n.x0 + nW;
            } else if (n.x0 >= srcCX1) {
              // Spending node: scale [srcCX1, W-LM] → [targetX0+BAR_W, W-LM]
              const newLeft = targetX0 + BAR_W;
              const srcRange = (W - LM) - srcCX1;
              n.x0 = srcRange > 0 ? newLeft + (n.x0 - srcCX1) * ((W - LM) - newLeft) / srcRange : newLeft;
              n.x1 = n.x0 + nW;
            }
          });
        }
      }

      const gNodes = graph.nodes;
      const gLinks = graph.links;

      const svgEl = select(svg);
      const root = svgEl.append('g');

      // Nodes.
      const nodeG = root.append('g');
      gNodes.forEach((n: any) => {
        const isOrg = n.id === 'org-centre';
        const g = nodeG.append('g').attr('transform', `translate(${n.x0},${n.y0})`);
        const nW = n.x1 - n.x0;
        const nH = Math.max(n.y1 - n.y0, MIN_NODE_H);

        if (isOrg) {
          g.append('text').attr('x', nW / 2).attr('y', -32).attr('text-anchor', 'middle').attr('fill', C.muted).attr('font-family', 'DM Mono, monospace').attr('font-size', '9px').attr('letter-spacing', '0.15em').text('REVENUE');
          g.append('text').attr('x', nW / 2).attr('y', -16).attr('text-anchor', 'middle').attr('fill', '#2dd4bf').attr('font-family', 'DM Mono, monospace').attr('font-size', '12px').attr('font-weight', '500').text(fmt(data.revenue));
          const revH = nH * (data.revenue / (data.revenue + data.spending));
          const spendH = nH - revH;
          g.append('rect').attr('width', nW).attr('height', revH).attr('fill', '#2dd4bf').attr('rx', 2);
          g.append('rect').attr('y', revH).attr('width', nW).attr('height', spendH).attr('fill', C.amber).attr('rx', 2);
          g.append('text').attr('x', nW / 2).attr('y', nH + 16).attr('text-anchor', 'middle').attr('fill', C.muted).attr('font-family', 'DM Mono, monospace').attr('font-size', '9px').attr('letter-spacing', '0.15em').text('SPENDING');
          g.append('text').attr('x', nW / 2).attr('y', nH + 30).attr('text-anchor', 'middle').attr('fill', C.amber).attr('font-family', 'DM Mono, monospace').attr('font-size', '12px').attr('font-weight', '500').text(fmt(data.spending));
        } else {
          const isRight = ['debit-category', 'debit-leaf', 'debit-sub'].includes(n.type);
          const isLeaf = n.type === 'credit-leaf' || n.type === 'debit-leaf';
          const isClickable = ['debit-category', 'credit-category', 'debit-sub', 'credit-sub', 'debit-leaf', 'credit-leaf'].includes(n.type);

          const bar = g
            .append('rect')
            .attr('class', isClickable ? 'node-bar node-bar-click' : 'node-bar')
            .attr('width', nW)
            .attr('height', nH)
            .attr('fill', n.colour || C.muted)
            .attr('rx', 2)
            .attr('opacity', 0.9);
          bar.append('title').text(`${n.label}  ${fmt(n.value)}`);

          if (isClickable) {
            const hitX = isRight ? 0 : -HIT_EXT;
            const hitW = nW + HIT_EXT;
            g.append('rect')
              .attr('x', hitX)
              .attr('y', 0)
              .attr('width', hitW)
              .attr('height', Math.max(nH, 20))
              .attr('fill', 'transparent')
              .attr('stroke', 'none')
              .attr('tabindex', '0')
              .attr('role', 'button')
              .attr('aria-label', `${n.label}: ${fmt(n.value)}`)
              .style('cursor', 'pointer')
              .style('outline', 'none')
              .on('mouseover', () => bar.attr('opacity', 0.72))
              .on('mouseout', () => bar.attr('opacity', 0.9))
              .on('focus', () => {
                bar.attr('opacity', 0.72)
                  .attr('stroke', '#e8a020')
                  .attr('stroke-width', '2');
              })
              .on('blur', () => {
                bar.attr('opacity', 0.9).attr('stroke', 'none');
              })
              .on('keydown', (event: KeyboardEvent) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onOpenRef.current(n as GraphNode & { value: number });
                }
              })
              .on('click', () => onOpenRef.current(n as GraphNode & { value: number }));
          }

          const valText = fmt(n.value);
          const lblText = n.label.length > MAXCHAR ? n.label.slice(0, MAXCHAR) + '…' : n.label;
          const labelOnRight = n.type === 'debit-leaf' || n.type === 'credit-category' || n.type === 'credit-sub';
          const lx = labelOnRight ? nW + 8 : -8;
          const anchor = labelOnRight ? 'start' : 'end';

          if (!isLeaf) {
            g.append('text').attr('x', lx).attr('y', Math.max(nH / 2 - 5, 6)).attr('text-anchor', anchor).attr('fill', C.amber).attr('font-family', 'DM Mono, monospace').attr('font-size', '12px').attr('font-weight', '500').text(valText);
            g.append('text').attr('x', lx).attr('y', Math.max(nH / 2 + 10, 20)).attr('text-anchor', anchor).attr('fill', C.muted).attr('font-family', 'DM Mono, monospace').attr('font-size', '10px').text(lblText);
          } else {
            g.append('text').attr('x', lx).attr('y', Math.max(nH / 2 - 4, 6)).attr('text-anchor', anchor).attr('fill', C.amber).attr('font-family', 'DM Mono, monospace').attr('font-size', '11px').attr('font-weight', '500').text(valText);
            g.append('text').attr('x', lx).attr('y', Math.max(nH / 2 + 9, 17)).attr('text-anchor', anchor).attr('fill', C.muted).attr('font-family', 'DM Mono, monospace').attr('font-size', '9px').text(lblText);
          }
        }
      });

      // Links — rendered after nodes so flow paths sit on top of HIT_EXT rects,
      // giving flows click priority over the node hit areas.
      const linkG = root.append('g');
      gLinks.forEach((l: any) => {
        const sN = l.source;
        const tN = l.target;
        if (!sN || !tN) return;
        let colour = C.muted;
        if (['credit-leaf', 'credit-category', 'credit-sub'].includes(sN.type)) colour = sN.colour || CREDIT_COLOURS[0];
        if (['debit-category', 'debit-leaf', 'debit-sub'].includes(tN.type)) colour = tN.colour || DEBIT_COLOURS[0];
        if (['debit-category', 'debit-sub'].includes(sN.type)) colour = sN.colour || DEBIT_COLOURS[0];

        // A merged band is a normal node in the reduced graph, so its single
        // combined ribbon lands here like any other — clicking it opens the
        // same drawer the band's bar does.
        const clickNode: any =
          ['credit-leaf', 'credit-category', 'credit-sub'].includes(sN.type) ? sN :
          ['debit-category', 'debit-leaf', 'debit-sub'].includes(tN.type) ? tN :
          null;

        const path = linkG
          .append('path')
          .attr('class', 'sankey-link')
          .attr('d', sankeyLinkHorizontal()(l) as string)
          .attr('stroke', colour)
          .attr('stroke-width', Math.max(1, l.width))
          .attr('stroke-opacity', 0.38);

        if (clickNode) {
          path
            .attr('tabindex', '0')
            .attr('role', 'button')
            .attr('aria-label', `${clickNode.label}: ${fmt(clickNode.value)}`)
            .style('cursor', 'pointer')
            .style('outline', 'none')
            .on('mouseover', () => path.attr('stroke-opacity', 0.62))
            .on('mouseout', () => path.attr('stroke-opacity', 0.38))
            .on('focus', () => path.attr('stroke-opacity', 0.72))
            .on('blur', () => path.attr('stroke-opacity', 0.38))
            .on('keydown', (event: KeyboardEvent) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onOpenRef.current(clickNode as GraphNode & { value: number });
              }
            })
            .on('click', () => onOpenRef.current(clickNode as GraphNode & { value: number }));
        }
      });

      // Scroll the container so the org-centre bar is horizontally centered in the viewport.
      // The wrap has 12px left padding, so SVG x=0 sits at container offset 12.
      // We want: 12 + orgCentreX == scrollLeft + clientWidth/2
      // Only done on first layout / data change — re-centering on every resize would
      // clobber the user's scroll position whenever the container resizes.
      if (shouldCentre) {
        const orgBar = graph.nodes.find((n: any) => n.id === 'org-centre');
        const centreX = orgBar ? orgBar.x0 + BAR_W / 2 : W / 2;
        wrap.scrollLeft = Math.max(0, 12 + centreX - wrap.clientWidth / 2);
      }
    }

    render(true);
    let first = true;
    let rafId = 0;
    const ro = new ResizeObserver(() => {
      if (first) { first = false; return; }
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => render(false));
    });
    ro.observe(wrap);
    return () => { ro.disconnect(); cancelAnimationFrame(rafId); };
  }, [data, fmt, theme]);

  return (
    <div className="sankey-wrap" ref={wrapRef}>
      <svg id="sankey-svg" ref={svgRef} />
    </div>
  );
}
