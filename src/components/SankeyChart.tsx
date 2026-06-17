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

    function render() {
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

      const W = Math.max(wrap.clientWidth - 24, LABEL_ZONE * 2 + numCols * COL_STRIDE);
      const LM = LABEL_ZONE;

      const totalLeaves = Math.max(countLeaves(data.revenue_data.children[0]), countLeaves(data.spending_data.children[0]));
      const nodePad = totalLeaves > 30 ? 6 : totalLeaves > 15 ? 12 : 20;
      const H = Math.max(480, Math.min(860, window.innerHeight * 0.8));
      const BAR_W = 24;

      svg.setAttribute('width', String(W));
      svg.setAttribute('height', String(H));
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);

      const { nodes, links } = buildGraph(data);

      const sankeyGen = sankey<any, any>()
        .nodeId((d: any) => d.index)
        .nodeWidth(BAR_W)
        .nodePadding(nodePad)
        .extent([
          [LM, 16],
          [W - LM, H - 16],
        ])
        .nodeAlign(sankeyLeft);

      // Typed as `any`: after layout, d3-sankey marks x0/y0/etc as optional,
      // which fights strict-mode arithmetic. We know they're populated here.
      const graph: any = sankeyGen({
        nodes: nodes.map((n, i) => ({ ...n, index: i })),
        links: links.map((l) => ({ ...l })),
      });

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

      // Align revenue root categories to the same column.
      {
        const creditCats = graph.nodes.filter((n: any) => n.type === 'credit-category');
        if (creditCats.length > 1) {
          const maxX0 = Math.max(...creditCats.map((n: any) => n.x0));
          const barW = creditCats[0].x1 - creditCats[0].x0;
          creditCats.forEach((n: any) => {
            if (n.x0 < maxX0) {
              n.x0 = maxX0;
              n.x1 = maxX0 + barW;
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
              .style('cursor', 'pointer')
              .on('click', () => onOpenRef.current(n as GraphNode & { value: number }));
          }

          const valText = fmt(n.value);
          const lblText = n.label.length > MAXCHAR ? n.label.slice(0, MAXCHAR) + '…' : n.label;
          const lx = isRight ? nW + 8 : -8;
          const anchor = isRight ? 'start' : 'end';

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
            .style('cursor', 'pointer')
            .on('click', () => onOpenRef.current(clickNode as GraphNode & { value: number }));
        }
      });

      // Scroll the container so the org-centre bar is horizontally centered in the viewport.
      // The wrap has 12px left padding, so SVG x=0 sits at container offset 12.
      // We want: 12 + orgCentreX == scrollLeft + clientWidth/2
      {
        const orgBar = graph.nodes.find((n: any) => n.id === 'org-centre');
        const centreX = orgBar ? orgBar.x0 + BAR_W / 2 : W / 2;
        wrap.scrollLeft = Math.max(0, 12 + centreX - wrap.clientWidth / 2);
      }
    }

    const ro = new ResizeObserver(render);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [data, fmt, theme]);

  return (
    <div className="sankey-wrap" ref={wrapRef}>
      <svg id="sankey-svg" ref={svgRef} />
    </div>
  );
}
