#!/usr/bin/env node
// Backend health check for the Sankey data pipeline: hits the upstream gateway
// directly (bypassing the local proxy/cache) so results reflect real upstream
// health, and reports latency + basic data-sanity checks.
//
// Usage: node scripts/check-sankey-health.mjs [orgId]
//   (defaults to city-of-toronto-government)
//
// Add more org IDs as `npm run check:sankey -- <orgId>` if you want to spot-check others.

const GATEWAY = 'https://app.democracydistributed.com/api/gateway';
const SLOW_MS = 1500;
const orgId = process.argv[2] || 'city-of-toronto-government';

const results = [];

function isTestPlaceholder(name) {
  const seg = (name.split(' → ').pop() || '').trim();
  return /^test(\s*[$]?\s*10(\.00)?)?$/i.test(seg);
}

function findPlaceholders(node, hits) {
  if (!node) return;
  if (isTestPlaceholder(node.name || '')) hits.push(node.name);
  (node.children || []).forEach((c) => findPlaceholders(c, hits));
  (node.entries || []).forEach((e) => findPlaceholders(e, hits));
}

function findLedgerId(node) {
  if (!node) return null;
  if (node.ledgerID) return node.ledgerID;
  for (const c of node.children || []) {
    const found = findLedgerId(c);
    if (found) return found;
  }
  for (const e of node.entries || []) {
    const found = findLedgerId(e);
    if (found) return found;
  }
  return null;
}

async function timed(label, fn) {
  const start = Date.now();
  try {
    const detail = await fn();
    const ms = Date.now() - start;
    results.push({ label, ok: true, ms, detail });
    return detail;
  } catch (err) {
    const ms = Date.now() - start;
    results.push({ label, ok: false, ms, detail: err.message });
    return null;
  }
}

async function main() {
  console.log(`\nChecking gateway health for orgId="${orgId}"...\n`);

  await timed('GET /orgs', async () => {
    const res = await fetch(`${GATEWAY}/orgs`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const list = Array.isArray(data) ? data : data.orgs;
    if (!Array.isArray(list)) throw new Error('unexpected shape');
    return `${list.length} orgs`;
  });

  await timed('GET /org', async () => {
    const res = await fetch(`${GATEWAY}/org?orgId=${encodeURIComponent(orgId)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data?.name) throw new Error('missing name field');
    return data.name;
  });

  let sankeyData = null;
  await timed('GET /sankey', async () => {
    const res = await fetch(`${GATEWAY}/sankey?orgId=${encodeURIComponent(orgId)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.json();
    const data = typeof raw.sankeyJSON === 'string' ? JSON.parse(raw.sankeyJSON) : raw;
    if (!data?.revenue_data || !data?.spending_data) throw new Error('missing revenue_data/spending_data');
    if (!(data.revenue > 0) || !(data.spending > 0)) throw new Error('revenue/spending not positive numbers');

    const placeholders = [];
    (data.revenue_data.children || []).forEach((c) => findPlaceholders(c, placeholders));
    (data.spending_data.children || []).forEach((c) => findPlaceholders(c, placeholders));
    if (placeholders.length) throw new Error(`test/placeholder records present: ${placeholders.join(', ')}`);

    sankeyData = data;
    return `revenue=${data.revenue}, spending=${data.spending}`;
  });

  if (sankeyData) {
    const ledgerId =
      findLedgerId({ children: sankeyData.spending_data.children }) ||
      findLedgerId({ children: sankeyData.revenue_data.children });

    if (ledgerId) {
      await timed(`GET /trace (ledgerId=${ledgerId})`, async () => {
        const res = await fetch(`${GATEWAY}/trace?ledgerId=${encodeURIComponent(ledgerId)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (typeof data?.hasChain !== 'boolean') throw new Error('missing hasChain field');
        return `hasChain=${data.hasChain}`;
      });
    } else {
      results.push({ label: 'GET /trace', ok: false, ms: 0, detail: 'no ledgerID found in sankey data to test with' });
    }
  }

  console.log('Result'.padEnd(28), 'Status'.padEnd(8), 'Time'.padEnd(10), 'Detail');
  console.log('-'.repeat(90));
  let failures = 0;
  for (const r of results) {
    const status = r.ok ? (r.ms > SLOW_MS ? 'SLOW' : 'OK') : 'FAIL';
    if (!r.ok) failures++;
    console.log(r.label.padEnd(28), status.padEnd(8), `${r.ms}ms`.padEnd(10), r.detail);
  }

  const avgMs = Math.round(results.reduce((s, r) => s + r.ms, 0) / results.length);
  console.log('-'.repeat(90));
  console.log(`\n${results.length - failures}/${results.length} checks passed. Average latency: ${avgMs}ms.\n`);

  process.exit(failures > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Health check crashed:', err);
  process.exit(1);
});
