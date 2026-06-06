import { useState, useCallback, useRef } from 'react';

const FONT = `@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400&family=Jost:wght@300;400;500;600&display=swap');`;

/* ── CSV PARSER ──────────────────────────────────────────── */

function parseCSVText(text) {
  const lines = [];
  let current = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i], next = text[i + 1];
    if (ch === '"') {
      if (inQuotes && next === '"') { field += '"'; i++; } else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      current.push(field.trim()); field = '';
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && next === '\n') i++;
      current.push(field.trim()); field = '';
      if (current.some(f => f !== '')) lines.push([...current]);
      current = [];
    } else { field += ch; }
  }
  if (field || current.length) { current.push(field.trim()); if (current.some(f => f !== '')) lines.push(current); }
  if (lines.length < 2) return [];
  const headers = lines[0];
  return lines.slice(1).filter(r => r.length > 1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { if (h) obj[h] = row[i] ?? ''; });
    return obj;
  });
}

/* ── COLUMN NORMALIZATION ────────────────────────────────── */

function normCol(col) {
  return col.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
}
function parseNum(val) {
  if (!val && val !== 0) return 0;
  const s = String(val).trim();
  if (s === '' || s === '--' || s === 'n/a' || s.toLowerCase() === 'nan') return 0;
  return parseFloat(s.replace(/[$,%]/g, '').replace(/,/g, '')) || 0;
}
function findCol(row, aliases) {
  for (const a of aliases) { if (row[a] !== undefined && row[a] !== '') return row[a]; }
  return undefined;
}
function findColWithKey(row, aliases) {
  for (const a of aliases) { if (row[a] !== undefined && row[a] !== '') return { value: row[a], key: a }; }
  return { value: undefined, key: null };
}

const TERM_ALIASES    = ['customer_search_term','targeting','keyword','search_term','keyword_or_product_targeting','keyword_text'];
const CLICK_ALIASES   = ['clicks'];
const SPEND_ALIASES   = ['spend'];
const SALES_ALIASES   = ['7_day_total_sales','14_day_total_sales','total_sales','sales','7_day_total_sales__1_'];
const ORDERS_ALIASES  = ['7_day_total_orders','14_day_total_orders','total_orders','orders','units_ordered','7_day_total_orders__1_'];
const ACOS_ALIASES    = ['acos','advertising_cost_of_sales','total_advertising_cost_of_sales','7_day_advertising_cost_of_sales__acos_'];
const IMPR_ALIASES    = ['impressions'];
const CAMPAIGN_ALIASES= ['campaign_name','campaign'];
const ADGROUP_ALIASES = ['ad_group_name','ad_group','adgroup'];
const MATCH_ALIASES   = ['match_type'];
const CPC_ALIASES     = ['avg_cpc','cost_per_click','cpc','average_cpc'];

function detectTermSource(matchedKey, termValue) {
  if (matchedKey === 'customer_search_term' || matchedKey === 'search_term') return 'search_term';
  if (matchedKey === 'targeting' || matchedKey === 'keyword_or_product_targeting') {
    const v = (termValue || '').toLowerCase().trim();
    if (v.startsWith('b0') || v.startsWith('asin:') || /^b[0-9a-z]{9}$/i.test(v)) return 'asin_target';
    if (v.startsWith('category:')) return 'category_target';
    return 'keyword_target';
  }
  if (matchedKey === 'keyword' || matchedKey === 'keyword_text') return 'keyword_target';
  return 'unknown';
}

function normalizeRow(raw) {
  const r = {};
  for (const [k, v] of Object.entries(raw)) r[normCol(k)] = v;
  const { value: termRaw, key: termKey } = findColWithKey(r, TERM_ALIASES);
  const term = (termRaw || '').trim() || '—';
  return {
    term,
    termSource: detectTermSource(termKey, term),
    campaign:   (findCol(r, CAMPAIGN_ALIASES) || '').trim(),
    adGroup:    (findCol(r, ADGROUP_ALIASES)  || '').trim(),
    matchType:  (findCol(r, MATCH_ALIASES)    || '').trim(),
    clicks:      parseNum(findCol(r, CLICK_ALIASES)),
    spend:       parseNum(findCol(r, SPEND_ALIASES)),
    sales:       parseNum(findCol(r, SALES_ALIASES)),
    orders:      parseNum(findCol(r, ORDERS_ALIASES)),
    acosRaw:     parseNum(findCol(r, ACOS_ALIASES)),
    impressions: parseNum(findCol(r, IMPR_ALIASES)),
    cpc:         parseNum(findCol(r, CPC_ALIASES)),
  };
}

/* ── RULES ENGINE ────────────────────────────────────────── */

function effectiveAcos(row) {
  if (row.acosRaw > 0) return row.acosRaw;
  if (row.sales > 0) return (row.spend / row.sales) * 100;
  return row.spend > 0 ? Infinity : 0;
}

function classify(row, { targetAcos, minClicksToCut, minSpendToCut }) {
  const { clicks, spend, orders } = row;
  const acos = effectiveAcos(row);
  if (clicks === 0 && spend < 0.01)                        return { action: 'WATCH',   reason: 'No activity recorded' };
  if (clicks < 5 && spend < minSpendToCut)                 return { action: 'WATCH',   reason: 'Collecting data' };
  if (clicks >= minClicksToCut && orders === 0)            return { action: 'CUT',     reason: `${clicks} clicks · $${spend.toFixed(2)} spent · zero orders` };
  if (spend >= minSpendToCut && orders === 0 && clicks >= 5) return { action: 'CUT',  reason: `$${spend.toFixed(2)} spent · ${clicks} clicks · zero orders` };
  if (acos === Infinity && spend >= minSpendToCut)         return { action: 'CUT',     reason: `$${spend.toFixed(2)} spent · no tracked sales` };
  if (acos > 200 && spend >= minSpendToCut && orders > 0)  return { action: 'CUT',    reason: `ACoS ${acos.toFixed(0)}% — not recoverable` };
  if (acos <= targetAcos && orders > 0) {
    const conf = clicks >= 20 ? 'strong signal' : clicks >= 10 ? 'good signal' : 'early signal';
    return { action: 'SCALE', reason: `ACoS ${acos.toFixed(0)}% · ${conf}` };
  }
  if (acos > targetAcos && acos <= 100 && orders > 0)      return { action: 'ISOLATE', reason: `ACoS ${acos.toFixed(0)}% · converting, needs tuning` };
  if (acos > 100 && acos <= 200 && orders > 0)             return { action: 'ISOLATE', reason: `ACoS ${acos.toFixed(0)}% · marginal return` };
  return { action: 'WATCH', reason: 'Collecting data' };
}

function recommendedAction(action, termSource) {
  if (action === 'CUT') {
    if (termSource === 'search_term')     return 'Add Negative Exact';
    if (termSource === 'asin_target')     return 'Pause ASIN Target';
    if (termSource === 'category_target') return 'Pause Category Target';
    return 'Pause Keyword';
  }
  if (action === 'SCALE')   return 'Increase Bid ~25%';
  if (action === 'ISOLATE') return 'Move to Test Campaign';
  return 'Monitor — No Action Yet';
}

function suggestedBid(action, cpc) {
  if (!cpc || cpc <= 0) return null;
  if (action === 'SCALE')   return (cpc * 1.25).toFixed(2);
  if (action === 'CUT')     return (cpc * 0.10).toFixed(2);
  if (action === 'ISOLATE') return cpc.toFixed(2);
  return null;
}

// Human-readable explanation for the card
function expandReason(row, targetAcos) {
  const { action, clicks, spend, orders, acos } = row;
  if (action === 'CUT') {
    if (orders === 0) return `${clicks} click${clicks !== 1 ? 's' : ''} and $${spend.toFixed(2)} spent with zero orders. This term doesn't convert. Every dollar here is wasted.`;
    return `ACoS of ${fmtPct(acos)} — ${(acos / targetAcos).toFixed(1)}× your ${targetAcos}% target. Not recoverable at this volume.`;
  }
  if (action === 'SCALE') {
    const multiple = acos > 0 ? (targetAcos / acos).toFixed(1) : null;
    return `Converting at ${fmtPct(acos)} ACoS${multiple ? ` — ${multiple}× better than your ${targetAcos}% target` : ''}. Raise the bid to buy more of this traffic.`;
  }
  if (action === 'ISOLATE') {
    return `${orders} order${orders !== 1 ? 's' : ''} at ${fmtPct(acos)} ACoS — converting but above your ${targetAcos}% target. Move to a test campaign to optimize the bid in isolation.`;
  }
  if (clicks === 0) return 'No clicks yet. Leave it running and check back in 7–10 days.';
  return `${clicks} click${clicks !== 1 ? 's' : ''} so far — not enough data to make a call. Check again in 7–10 days.`;
}

const PRIORITY_LABEL = { CUT: 'High', SCALE: 'High', ISOLATE: 'Medium', WATCH: 'Low' };
const PRIORITY_COLOR = { High: '#FF6B6B', Medium: '#D4C43A', Low: '#7A9BD4' };
const PRIORITY_ORDER = { CUT: 0, SCALE: 1, ISOLATE: 2, WATCH: 3 };

/* ── EXPORT ──────────────────────────────────────────────── */

function termSourceLabel(ts) {
  if (ts === 'search_term')     return 'Search Term';
  if (ts === 'keyword_target')  return 'Keyword Target';
  if (ts === 'asin_target')     return 'ASIN Target';
  if (ts === 'category_target') return 'Category Target';
  return 'Unknown';
}

function escapeCSV(v) {
  const s = String(v ?? '');
  return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
}

function exportToCSV(rows, fileName) {
  const headers = ['Priority','Action','Recommended Action','Term Type','Term / Target','Campaign','Ad Group','Match Type','Clicks','Spend','Sales','Orders','ACoS (%)','Suggested Bid','Reason'];
  const data = rows.map(r => [
    r.priority, r.action, r.recAction, termSourceLabel(r.termSource),
    r.term, r.campaign, r.adGroup, r.matchType,
    r.clicks, r.spend.toFixed(2), r.sales.toFixed(2), r.orders,
    r.acos === Infinity ? '∞' : r.acos.toFixed(1),
    r.suggestedBid ?? '', r.reason,
  ]);
  const csv = [headers, ...data].map(row => row.map(escapeCSV).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = (fileName.replace('.csv', '') || 'bid-plan') + '_action-plan.csv';
  a.click(); URL.revokeObjectURL(url);
}

function copyTodayActions(processed) {
  const cuts   = processed.filter(r => r.action === 'CUT');
  const scales = processed.filter(r => r.action === 'SCALE');
  const isos   = processed.filter(r => r.action === 'ISOLATE');
  const negatives = cuts.filter(r => r.termSource === 'search_term');
  const pauses    = cuts.filter(r => r.termSource !== 'search_term');
  const wastedSpend = cuts.reduce((s, r) => s + r.spend, 0);

  const lines = ['TODAY\'S ACTIONS', ''];
  if (negatives.length) {
    lines.push(`ADD ${negatives.length} NEGATIVE EXACT${negatives.length > 1 ? 'S' : ''}:`);
    negatives.forEach((r, i) => lines.push(`  ${i + 1}. "${r.term}" — ${r.campaign}`));
    lines.push('');
  }
  if (pauses.length) {
    lines.push(`PAUSE ${pauses.length} KEYWORD${pauses.length > 1 ? 'S' : ''}:`);
    pauses.forEach((r, i) => lines.push(`  ${i + 1}. "${r.term}" — ${r.campaign}`));
    lines.push('');
  }
  if (scales.length) {
    lines.push(`RAISE BIDS ON ${scales.length} KEYWORD${scales.length > 1 ? 'S' : ''}:`);
    scales.forEach((r, i) => lines.push(`  ${i + 1}. "${r.term}" — $${r.cpc?.toFixed(2) || '?'} → $${r.suggestedBid || '?'} — ${r.campaign}`));
    lines.push('');
  }
  if (isos.length) {
    lines.push(`MOVE TO TEST CAMPAIGN (${isos.length}):`);
    isos.forEach((r, i) => lines.push(`  ${i + 1}. "${r.term}" — ${r.campaign}`));
    lines.push('');
  }
  lines.push('ESTIMATED IMPACT:');
  if (wastedSpend > 0) lines.push(`  Stop wasting $${wastedSpend.toFixed(2)} per period`);
  if (scales.length)   lines.push(`  Scale ${scales.length} profitable keyword${scales.length > 1 ? 's' : ''}`);
  if (isos.length)     lines.push(`  Test ${isos.length} borderline keyword${isos.length > 1 ? 's' : ''}`);

  navigator.clipboard.writeText(lines.join('\n')).catch(() => {});
}

/* ── ACTION CONFIG ───────────────────────────────────────── */

const AC = {
  CUT:     { color: '#FF6B6B', bg: 'rgba(180,30,30,0.18)', border: 'rgba(255,107,107,0.35)', desc: 'Kill or drop bid to near-zero' },
  SCALE:   { color: '#4ECA4E', bg: 'rgba(30,130,30,0.18)', border: 'rgba(78,202,78,0.35)',  desc: 'Increase bid ~25%' },
  ISOLATE: { color: '#D4C43A', bg: 'rgba(110,100,10,0.18)', border: 'rgba(212,196,58,0.35)', desc: 'Move to isolated test campaign' },
  WATCH:   { color: '#7A9BD4', bg: 'rgba(30,50,110,0.18)', border: 'rgba(122,155,212,0.35)', desc: 'Hold — needs more data' },
};

const SORT_OPTIONS = [
  { key: 'priority', label: 'Action Priority' },
  { key: 'spend',    label: 'Highest Spend' },
  { key: 'acos',     label: 'Highest ACoS' },
  { key: 'clicks',   label: 'Most Clicks' },
  { key: 'sales',    label: 'Most Sales' },
];

/* ── SAMPLE DATA ─────────────────────────────────────────── */

const SAMPLE_ROWS = [
  { term: 'black pepper grinder',           termSource: 'search_term',    campaign: 'SP - Auto',   adGroup: 'Grinders - Auto',    matchType: '',      clicks: 32, spend: 14.80, sales: 0,      orders: 0, acosRaw: 0,    impressions: 890,  cpc: 0.46 },
  { term: 'electric pepper mill',           termSource: 'search_term',    campaign: 'SP - Auto',   adGroup: 'Grinders - Auto',    matchType: '',      clicks: 48, spend: 31.20, sales: 118.50, orders: 4, acosRaw: 26.3, impressions: 1240, cpc: 0.65 },
  { term: 'salt and pepper grinder set',    termSource: 'search_term',    campaign: 'SP - Auto',   adGroup: 'Grinders - Auto',    matchType: '',      clicks: 19, spend: 8.55,  sales: 54.90,  orders: 2, acosRaw: 15.6, impressions: 620,  cpc: 0.45 },
  { term: 'cheap pepper grinder',           termSource: 'search_term',    campaign: 'SP - Auto',   adGroup: 'Grinders - Auto',    matchType: '',      clicks: 41, spend: 16.40, sales: 0,      orders: 0, acosRaw: 0,    impressions: 1100, cpc: 0.40 },
  { term: 'pepper grinder for table',       termSource: 'search_term',    campaign: 'SP - Auto',   adGroup: 'Grinders - Auto',    matchType: '',      clicks: 7,  spend: 2.80,  sales: 0,      orders: 0, acosRaw: 0,    impressions: 310,  cpc: 0.40 },
  { term: 'manual pepper grinder stainless',termSource: 'keyword_target', campaign: 'SP - Manual', adGroup: 'Exact - Core',       matchType: 'Exact', clicks: 61, spend: 42.70, sales: 246.00, orders: 9, acosRaw: 17.4, impressions: 1850, cpc: 0.70 },
  { term: 'best pepper grinder',            termSource: 'keyword_target', campaign: 'SP - Manual', adGroup: 'Broad - Discovery',  matchType: 'Broad', clicks: 22, spend: 17.60, sales: 28.95,  orders: 1, acosRaw: 60.8, impressions: 740,  cpc: 0.80 },
  { term: 'kitchen pepper mill',            termSource: 'keyword_target', campaign: 'SP - Manual', adGroup: 'Phrase - Core',      matchType: 'Phrase',clicks: 14, spend: 9.80,  sales: 54.90,  orders: 2, acosRaw: 17.9, impressions: 520,  cpc: 0.70 },
  { term: 'refillable pepper grinder',      termSource: 'keyword_target', campaign: 'SP - Manual', adGroup: 'Exact - Core',       matchType: 'Exact', clicks: 28, spend: 19.60, sales: 54.90,  orders: 2, acosRaw: 35.7, impressions: 810,  cpc: 0.70 },
  { term: 'grinder mill spice',             termSource: 'keyword_target', campaign: 'SP - Manual', adGroup: 'Broad - Discovery',  matchType: 'Broad', clicks: 3,  spend: 1.20,  sales: 0,      orders: 0, acosRaw: 0,    impressions: 180,  cpc: 0.40 },
];

/* ── HELPERS ─────────────────────────────────────────────── */

function fmt$(n) { return '$' + n.toFixed(2); }
function fmtPct(n) { return n === Infinity ? '∞%' : n.toFixed(1) + '%'; }

function ActionBadge({ action, size = 'sm' }) {
  const cfg = AC[action];
  const pad = size === 'lg' ? '6px 16px' : '3px 9px';
  const fs  = size === 'lg' ? 13 : 11;
  return (
    <span style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color, borderRadius: 4, padding: pad, fontSize: fs, fontFamily: 'monospace', fontWeight: 700, letterSpacing: 0.5, whiteSpace: 'nowrap' }}>
      {action}
    </span>
  );
}

function TermTypePill({ termSource }) {
  const map = {
    search_term:     { label: 'Search Term', color: '#7A9BD4' },
    keyword_target:  { label: 'Keyword',     color: '#9a8a72' },
    asin_target:     { label: 'ASIN',        color: '#C4A44A' },
    category_target: { label: 'Category',    color: '#8B8BD4' },
  };
  const cfg = map[termSource];
  if (!cfg) return null;
  return <span style={{ fontSize: 10, fontFamily: 'monospace', color: cfg.color, letterSpacing: 0.5 }}>{cfg.label}</span>;
}

function MiniMetric({ label, value, color }) {
  return (
    <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '10px 12px' }}>
      <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#5a4a30', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: "'Fraunces',serif", fontSize: 20, color: color || '#c8b79a', lineHeight: 1 }}>{value}</div>
    </div>
  );
}

/* ── ACTION CARD ─────────────────────────────────────────── */

function ActionCard({ row, targetAcos }) {
  const cfg = AC[row.action];
  const priLabel = PRIORITY_LABEL[row.action];
  const priColor = PRIORITY_COLOR[priLabel];

  return (
    <div style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 16, padding: '20px', marginBottom: 14 }}>

      {/* Top: action badge + priority */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <ActionBadge action={row.action} size="lg" />
        <span style={{ fontFamily: 'monospace', fontSize: 11, color: priColor, letterSpacing: 0.5 }}>
          Priority: {priLabel}
        </span>
      </div>

      {/* Term */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 5 }}>
          <TermTypePill termSource={row.termSource} />
        </div>
        <div style={{ fontFamily: "'Fraunces',serif", fontSize: 22, color: '#e8ddcc', lineHeight: 1.25, wordBreak: 'break-word' }}>
          "{row.term}"
        </div>
      </div>

      {/* Campaign / Ad Group */}
      {(row.campaign || row.adGroup) && (
        <div style={{ marginBottom: 16, fontSize: 13, color: '#7a6b58', lineHeight: 1.4 }}>
          {row.campaign && <div>Campaign: {row.campaign}</div>}
          {row.adGroup  && <div>Ad Group: {row.adGroup}</div>}
          {row.matchType && <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#4a3a20', marginTop: 3 }}>{row.matchType}</div>}
        </div>
      )}

      {/* Metrics grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 8, marginBottom: 18 }}>
        {row.action === 'CUT' && <>
          <MiniMetric label="Spend"  value={fmt$(row.spend)} />
          <MiniMetric label="Sales"  value={row.sales > 0 ? fmt$(row.sales) : '$0'} color={row.sales > 0 ? '#4ECA4E' : '#4a3a20'} />
          <MiniMetric label="Clicks" value={row.clicks} />
          <MiniMetric label="Orders" value={row.orders} color={row.orders === 0 ? '#FF6B6B' : '#4ECA4E'} />
          <MiniMetric label="ACoS"   value={row.acos === Infinity || (row.acos === 0 && row.orders === 0) ? 'N/A' : fmtPct(row.acos)} color="#FF6B6B" />
        </>}
        {row.action === 'SCALE' && <>
          <MiniMetric label="ACoS"   value={fmtPct(row.acos)} color="#4ECA4E" />
          <MiniMetric label="Orders" value={row.orders} color="#4ECA4E" />
          <MiniMetric label="Sales"  value={fmt$(row.sales)} color="#4ECA4E" />
          <MiniMetric label="Spend"  value={fmt$(row.spend)} />
        </>}
        {(row.action === 'ISOLATE' || row.action === 'WATCH') && <>
          <MiniMetric label="ACoS"   value={row.acos === 0 && row.spend === 0 ? '—' : fmtPct(row.acos)} />
          <MiniMetric label="Spend"  value={fmt$(row.spend)} />
          <MiniMetric label="Orders" value={row.orders} />
          <MiniMetric label="Clicks" value={row.clicks} />
        </>}
      </div>

      {/* Recommended Action */}
      <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
        <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#5a4a30', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
          Recommended Action
        </div>
        <div style={{ color: cfg.color, fontSize: 17, fontWeight: 600, marginBottom: row.suggestedBid && row.cpc ? 6 : 0 }}>
          {row.recAction}
        </div>
        {row.suggestedBid && row.cpc > 0 && (
          <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#7a6b58' }}>
            Current bid: ${row.cpc.toFixed(2)} → ${row.suggestedBid}
          </div>
        )}
      </div>

      {/* Reason */}
      <div style={{ marginBottom: row.action === 'WATCH' ? 0 : 16 }}>
        <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#5a4a30', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
          Reason
        </div>
        <div style={{ fontSize: 15, color: '#c8b79a', lineHeight: 1.55 }}>
          {expandReason(row, targetAcos)}
        </div>
      </div>

      {/* Estimated impact */}
      {row.action === 'CUT' && (
        <div style={{ background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.2)', borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#FF6B6B', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>
            Estimated Savings
          </div>
          <div style={{ fontFamily: "'Fraunces',serif", fontSize: 24, color: '#FF6B6B' }}>{fmt$(row.spend)}</div>
          <div style={{ fontSize: 12, color: '#7a6b58', marginTop: 4 }}>per reporting period</div>
        </div>
      )}
      {row.action === 'SCALE' && (
        <div style={{ background: 'rgba(78,202,78,0.1)', border: '1px solid rgba(78,202,78,0.2)', borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#4ECA4E', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>
            Estimated Opportunity
          </div>
          <div style={{ fontSize: 14, color: '#4ECA4E', lineHeight: 1.5 }}>
            More sales volume while staying below {targetAcos}% ACoS.
          </div>
        </div>
      )}
    </div>
  );
}

/* ── TODAY'S ACTIONS SHEET ───────────────────────────────── */

function TaskGroup({ color, border, bg, title, items, detail }) {
  if (items.length === 0) return null;
  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: '16px 18px', marginBottom: 12 }}>
      <div style={{ fontFamily: 'monospace', fontSize: 10, color, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>{title} ({items.length})</div>
      {items.map((r, i) => (
        <div key={i} style={{ padding: '10px 0', borderBottom: i < items.length - 1 ? `1px solid ${border}` : 'none' }}>
          <div style={{ fontSize: 15, color: '#e8ddcc', fontFamily: "'Fraunces',serif", lineHeight: 1.3, marginBottom: 4 }}>
            "{r.term}"
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#5a4a30' }}>
            {r.campaign}{r.adGroup ? ` · ${r.adGroup}` : ''}
            {detail && detail(r) ? <span style={{ color }}> · {detail(r)}</span> : ''}
          </div>
        </div>
      ))}
    </div>
  );
}

function TodayActionsSheet({ processed, onClose }) {
  const [copied, setCopied] = useState(false);
  const cuts      = processed.filter(r => r.action === 'CUT');
  const scales    = processed.filter(r => r.action === 'SCALE');
  const isos      = processed.filter(r => r.action === 'ISOLATE');
  const negatives = cuts.filter(r => r.termSource === 'search_term');
  const pauses    = cuts.filter(r => r.termSource !== 'search_term');
  const wastedSpend = cuts.reduce((s, r) => s + r.spend, 0);
  const totalTasks  = (negatives.length > 0 ? 1 : 0) + (pauses.length > 0 ? 1 : 0) + scales.length + isos.length;
  const handleCopy  = () => { copyTodayActions(processed); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: '#0e0b07', borderRadius: '20px 20px 0 0', border: '1px solid #2a2010', maxHeight: '88vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        {/* Sheet header */}
        <div style={{ padding: '20px 20px 0', flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, background: '#3a2a10', borderRadius: 2, margin: '0 auto 20px' }} />
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
            <div>
              <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#9a7b4f', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 4 }}>Do This Now</div>
              <div style={{ fontFamily: "'Fraunces',serif", fontSize: 24 }}>Today's Actions</div>
            </div>
            <div style={{ fontFamily: "'Fraunces',serif", fontSize: 36, color: '#b59266', lineHeight: 1 }}>{totalTasks}</div>
          </div>
          <div style={{ fontSize: 13, color: '#7a6b58', marginBottom: 16, lineHeight: 1.5 }}>
            {totalTasks} action{totalTasks !== 1 ? 's' : ''} to take in Seller Central.
            {wastedSpend > 0 ? ` Save ${fmt$(wastedSpend)} in wasted spend.` : ''}
          </div>
          <div style={{ borderBottom: '1px solid #2a2010', marginBottom: 16 }} />
        </div>

        {/* Scrollable task list */}
        <div style={{ overflowY: 'auto', padding: '0 20px', flex: 1 }}>
          <TaskGroup
            title="Add Negative Exacts"
            items={negatives}
            color="#FF6B6B" border="rgba(255,107,107,0.25)" bg="rgba(180,30,30,0.1)"
            detail={r => `save ${fmt$(r.spend)}`}
          />
          <TaskGroup
            title="Pause Keywords"
            items={pauses}
            color="#FF6B6B" border="rgba(255,107,107,0.25)" bg="rgba(180,30,30,0.1)"
            detail={r => `save ${fmt$(r.spend)}`}
          />
          <TaskGroup
            title="Raise Bids"
            items={scales}
            color="#4ECA4E" border="rgba(78,202,78,0.25)" bg="rgba(30,130,30,0.1)"
            detail={r => r.suggestedBid && r.cpc ? `$${r.cpc.toFixed(2)} → $${r.suggestedBid}` : null}
          />
          <TaskGroup
            title="Move to Test Campaign"
            items={isos}
            color="#D4C43A" border="rgba(212,196,58,0.25)" bg="rgba(110,100,10,0.1)"
            detail={null}
          />

          {/* Impact summary */}
          <div style={{ background: '#0c0905', border: '1px solid #2a2010', borderRadius: 12, padding: '16px 18px', marginBottom: 20 }}>
            <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#5a4a30', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>Estimated Impact</div>
            {wastedSpend > 0 && (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
                <span style={{ fontFamily: "'Fraunces',serif", fontSize: 22, color: '#FF6B6B' }}>{fmt$(wastedSpend)}</span>
                <span style={{ fontSize: 13, color: '#7a6b58' }}>wasted spend stopped</span>
              </div>
            )}
            {scales.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
                <span style={{ fontFamily: "'Fraunces',serif", fontSize: 22, color: '#4ECA4E' }}>{scales.length}</span>
                <span style={{ fontSize: 13, color: '#7a6b58' }}>profitable keyword{scales.length > 1 ? 's' : ''} scaled</span>
              </div>
            )}
            {isos.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontFamily: "'Fraunces',serif", fontSize: 22, color: '#D4C43A' }}>{isos.length}</span>
                <span style={{ fontSize: 13, color: '#7a6b58' }}>borderline keyword{isos.length > 1 ? 's' : ''} moved to test</span>
              </div>
            )}
          </div>
        </div>

        {/* Bottom actions */}
        <div style={{ padding: '12px 20px 28px', flexShrink: 0, borderTop: '1px solid #2a2010', display: 'flex', gap: 10 }}>
          <button onClick={handleCopy}
            style={{ flex: 1, background: copied ? '#2a2010' : '#b59266', border: 'none', color: copied ? '#b59266' : '#0c0905', padding: '14px', borderRadius: 10, cursor: 'pointer', fontFamily: 'monospace', fontSize: 13, fontWeight: 700, letterSpacing: 0.5 }}>
            {copied ? '✓ COPIED' : '↗ COPY ACTION LIST'}
          </button>
          <button onClick={onClose}
            style={{ background: 'transparent', border: '1px solid #3a2a10', color: '#7a6b58', padding: '14px 20px', borderRadius: 10, cursor: 'pointer', fontFamily: 'monospace', fontSize: 13 }}>
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── MAIN COMPONENT ──────────────────────────────────────── */

export default function AmazonBidTool() {
  const [rows, setRows]                 = useState([]);
  const [fileName, setFileName]         = useState('');
  const [dragging, setDragging]         = useState(false);
  const [error, setError]               = useState('');
  const [targetAcos, setTargetAcos]     = useState(25);
  const [minClicksToCut, setMinClicks]  = useState(15);
  const [minSpendToCut, setMinSpend]    = useState(5);
  const [sortBy, setSortBy]             = useState('priority');
  const [filterAction, setFilterAction] = useState('ALL');
  const [view, setView]                 = useState('cards'); // 'cards' | 'table'
  const [showSettings, setShowSettings] = useState(false);
  const [showTodayActions, setShowTodayActions] = useState(false);
  const fileRef = useRef(null);

  const processFile = useCallback((file) => {
    if (!file) return;
    setError('');
    if (!file.name.endsWith('.csv')) { setError('Please upload a .csv file.'); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = parseCSVText(e.target.result);
        if (parsed.length === 0) { setError('Could not parse CSV — check the file format.'); return; }
        const norm = parsed.map(normalizeRow).filter(r => r.clicks > 0 || r.spend > 0 || r.impressions > 0);
        if (norm.length === 0) { setError('No keyword rows with activity found.'); return; }
        setRows(norm); setFileName(file.name);
        setFilterAction('ALL'); setView('cards');
      } catch (err) { setError('Parse error: ' + err.message); }
    };
    reader.readAsText(file);
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const onFileChange = (e) => { if (e.target.files[0]) processFile(e.target.files[0]); };

  const loadSample = () => {
    setRows(SAMPLE_ROWS); setFileName('sample_data.csv');
    setError(''); setFilterAction('ALL'); setView('cards');
  };

  const settings = { targetAcos, minClicksToCut, minSpendToCut };

  const processed = rows.map(row => {
    const acos     = effectiveAcos(row);
    const { action, reason } = classify(row, settings);
    const recAction = recommendedAction(action, row.termSource);
    const bid       = suggestedBid(action, row.cpc);
    const priority  = PRIORITY_ORDER[action];
    return { ...row, acos, action, reason, recAction, suggestedBid: bid, priority };
  });

  const filtered = [...processed]
    .filter(r => filterAction === 'ALL' || r.action === filterAction)
    .sort((a, b) => {
      if (sortBy === 'priority') return a.priority - b.priority;
      if (sortBy === 'acos') { const av = a.acos === Infinity ? 9999 : a.acos, bv = b.acos === Infinity ? 9999 : b.acos; return bv - av; }
      return b[sortBy] - a[sortBy];
    });

  const counts      = processed.reduce((acc, r) => { acc[r.action] = (acc[r.action] || 0) + 1; return acc; }, {});
  const totalSpend  = processed.reduce((s, r) => s + r.spend, 0);
  const totalSales  = processed.reduce((s, r) => s + r.sales, 0);
  const overallAcos = totalSales > 0 ? (totalSpend / totalSales) * 100 : 0;
  const wastedSpend = processed.filter(r => r.action === 'CUT').reduce((s, r) => s + r.spend, 0);
  const actionableCount = processed.filter(r => r.action !== 'WATCH').length;

  const hasData = rows.length > 0;
  const acosColor = overallAcos > 0 && overallAcos <= targetAcos ? '#4ECA4E' : overallAcos > targetAcos ? '#FF6B6B' : '#e8ddcc';

  return (
    <div style={{ minHeight: '100vh', background: '#080603', color: '#e8ddcc', fontFamily: "'Jost', sans-serif" }}>
      <style>{FONT}{`
        * { box-sizing: border-box; }
        body { margin: 0; }
        button { cursor: pointer; }
        button:hover { opacity: 0.82; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: #0e0b07; }
        ::-webkit-scrollbar-thumb { background: #3a2a10; border-radius: 2px; }
        @media (max-width: 640px) { .hide-sm { display: none !important; } }
      `}</style>

      {showTodayActions && <TodayActionsSheet processed={processed} onClose={() => setShowTodayActions(false)} />}

      {/* Header */}
      <div style={{ borderBottom: '1px solid #2a2010', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0c0905', position: 'sticky', top: 0, zIndex: 50 }}>
        <div>
          <div style={{ fontFamily: 'monospace', fontSize: 9, color: '#9a7b4f', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 1 }}>Amazon Ads</div>
          <div style={{ fontFamily: "'Fraunces',serif", fontSize: 18, fontWeight: 400 }}>Bid Decision Tool</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {hasData && (
            <button onClick={() => setShowTodayActions(true)}
              style={{ background: '#b59266', border: 'none', color: '#0c0905', padding: '9px 16px', borderRadius: 8, fontSize: 12, fontFamily: 'monospace', fontWeight: 700, letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>Today's Actions</span>
              {actionableCount > 0 && <span style={{ background: '#0c0905', color: '#b59266', borderRadius: 10, padding: '1px 7px', fontSize: 11 }}>{actionableCount}</span>}
            </button>
          )}
          {hasData && (
            <button onClick={() => exportToCSV(filtered, fileName)} className="hide-sm"
              style={{ background: 'transparent', border: '1px solid #3a2a10', color: '#9a7b4f', padding: '9px 14px', borderRadius: 8, fontSize: 12, fontFamily: 'monospace' }}>
              ↓ CSV
            </button>
          )}
          {hasData && (
            <button onClick={() => setShowSettings(s => !s)} className="hide-sm"
              style={{ background: showSettings ? '#2a2010' : 'transparent', border: '1px solid #3a2a10', color: '#9a7b4f', padding: '9px 14px', borderRadius: 8, fontSize: 12, fontFamily: 'monospace' }}>
              SETTINGS
            </button>
          )}
          {hasData && (
            <button onClick={() => { setRows([]); setFileName(''); setError(''); }}
              style={{ background: 'transparent', border: '1px solid #3a2a10', color: '#5a4a30', padding: '9px 14px', borderRadius: 8, fontSize: 12, fontFamily: 'monospace' }}>
              CLEAR
            </button>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '20px 16px' }}>

        {/* Settings panel */}
        {showSettings && hasData && (
          <div style={{ background: '#0e0b07', border: '1px solid #2a2010', borderRadius: 12, padding: '18px 20px', marginBottom: 20 }}>
            <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#5a4a30', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 14 }}>Rules Configuration</div>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              {[
                { label: 'Target ACoS (%)', value: targetAcos, set: setTargetAcos, min: 5, max: 100, step: 1 },
                { label: 'Min clicks to CUT', value: minClicksToCut, set: setMinClicks, min: 5, max: 50, step: 1 },
                { label: 'Min spend to CUT ($)', value: minSpendToCut, set: setMinSpend, min: 1, max: 50, step: 1 },
              ].map(({ label, value, set, min, max, step }) => (
                <div key={label} style={{ flex: 1, minWidth: 140 }}>
                  <label style={{ display: 'block', fontSize: 12, color: '#9a8a72', marginBottom: 6 }}>{label}</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input type="range" min={min} max={max} step={step} value={value}
                      onChange={e => set(Number(e.target.value))} style={{ flex: 1, accentColor: '#b59266' }} />
                    <span style={{ fontFamily: 'monospace', fontSize: 14, color: '#b59266', minWidth: 32, textAlign: 'right' }}>{value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload area */}
        {!hasData && (
          <div>
            <div onDrop={onDrop} onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
              onClick={() => fileRef.current?.click()}
              style={{ border: `2px dashed ${dragging ? '#b59266' : '#3a2a10'}`, borderRadius: 16, padding: '50px 32px', textAlign: 'center', cursor: 'pointer', background: dragging ? 'rgba(181,146,102,0.05)' : '#0c0905', transition: 'all 0.2s', marginBottom: 20 }}>
              <input ref={fileRef} type="file" accept=".csv" onChange={onFileChange} style={{ display: 'none' }} />
              <div style={{ fontFamily: "'Fraunces',serif", fontSize: 26, color: '#c8b79a', marginBottom: 10 }}>Drop your Amazon report here</div>
              <div style={{ color: '#7a6b58', fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
                Search Term · Targeting · Campaign Report<br />
                <span style={{ fontSize: 12 }}>Export CSV from Amazon Ads → Reports</span>
              </div>
              <div style={{ display: 'inline-block', background: '#b59266', color: '#0c0905', padding: '11px 28px', borderRadius: 8, fontFamily: 'monospace', fontSize: 13, fontWeight: 700, letterSpacing: 1 }}>CHOOSE CSV FILE</div>
            </div>
            {error && <div style={{ background: 'rgba(180,30,30,0.15)', border: '1px solid rgba(255,107,107,0.3)', borderRadius: 8, padding: '12px 16px', color: '#FF6B6B', fontSize: 13, fontFamily: 'monospace', marginBottom: 16 }}>{error}</div>}
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
              <button onClick={loadSample} style={{ background: 'transparent', border: '1px solid #3a2a10', color: '#7a6b58', padding: '10px 22px', borderRadius: 8, fontSize: 13, fontFamily: 'monospace' }}>
                LOAD SAMPLE DATA
              </button>
              <div style={{ fontSize: 11, color: '#4a3a20', marginTop: 8 }}>10 sample keywords to preview the tool</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
              {[
                { step: '01', title: 'Download report', body: 'Amazon Ads → Reports → Search Term, Targeting, or Campaign. Download as CSV.' },
                { step: '02', title: 'Drop it in', body: 'Nothing leaves your browser. All processing is local.' },
                { step: '03', title: 'Read the action cards', body: 'Each keyword gets a verdict with the exact reason.' },
                { step: '04', title: 'Hit Today\'s Actions', body: 'Get a prioritized task list and copy it straight to clipboard.' },
              ].map(({ step, title, body }) => (
                <div key={step} style={{ background: '#0c0905', border: '1px solid #1e1608', borderRadius: 10, padding: '16px' }}>
                  <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#5a4a30', letterSpacing: 2, marginBottom: 8 }}>{step}</div>
                  <div style={{ fontFamily: "'Fraunces',serif", fontSize: 15, color: '#c8b79a', marginBottom: 6 }}>{title}</div>
                  <div style={{ fontSize: 13, color: '#7a6b58', lineHeight: 1.55 }}>{body}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {hasData && (
          <>
            {/* Summary stats — 2×2 grid on mobile */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#5a4a30', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>
                {fileName} · {processed.length} terms
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                {[
                  { label: 'Total Spend',    value: fmt$(totalSpend),  color: '#e8ddcc', highlight: false },
                  { label: 'Total Sales',    value: fmt$(totalSales),  color: totalSales > 0 ? '#4ECA4E' : '#e8ddcc', highlight: false },
                  { label: 'Overall ACoS',   value: totalSales > 0 ? fmtPct(overallAcos) : '—', color: acosColor, sub: `target ${targetAcos}%`, highlight: false },
                  { label: 'Wasted Spend',   value: fmt$(wastedSpend), color: '#FF6B6B', sub: `${counts.CUT || 0} terms to cut`, highlight: true },
                ].map(({ label, value, color, sub, highlight }) => (
                  <div key={label} style={{ background: highlight ? 'rgba(180,30,30,0.12)' : '#0e0b07', border: `1px solid ${highlight ? 'rgba(255,107,107,0.25)' : '#2a2010'}`, borderRadius: 12, padding: '16px' }}>
                    <div style={{ fontFamily: 'monospace', fontSize: 10, color: highlight ? '#FF6B6B' : '#5a4a30', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8, whiteSpace: 'nowrap' }}>{label}</div>
                    <div style={{ fontFamily: "'Fraunces',serif", fontSize: 28, color, lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
                    {sub && <div style={{ fontFamily: 'monospace', fontSize: 11, color: highlight ? '#FF6B6B' : '#7a6b58', marginTop: 6, opacity: 0.8 }}>{sub}</div>}
                  </div>
                ))}
              </div>
            </div>

            {/* View toggle */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
              {[{ key: 'cards', label: 'Action Plan' }, { key: 'table', label: 'Data Table' }].map(({ key, label }) => (
                <button key={key} onClick={() => setView(key)}
                  style={{ background: view === key ? '#2a2010' : 'transparent', border: `1px solid ${view === key ? '#4a3a20' : '#2a2010'}`, color: view === key ? '#b59266' : '#5a4a30', padding: '7px 16px', borderRadius: 6, fontSize: 12, fontFamily: 'monospace' }}>
                  {label}
                </button>
              ))}
              {view === 'table' && (
                <button onClick={() => exportToCSV(filtered, fileName)}
                  style={{ marginLeft: 'auto', background: 'transparent', border: '1px solid #3a2a10', color: '#9a7b4f', padding: '7px 14px', borderRadius: 6, fontSize: 12, fontFamily: 'monospace' }}>
                  ↓ Export CSV
                </button>
              )}
            </div>

            {/* Filter bar */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              {['ALL', 'CUT', 'SCALE', 'ISOLATE', 'WATCH'].map(a => {
                const active = filterAction === a;
                const cfg = a === 'ALL' ? null : AC[a];
                const cnt = a === 'ALL' ? processed.length : counts[a] || 0;
                return (
                  <button key={a} onClick={() => setFilterAction(a)}
                    style={{ background: active ? (cfg?.bg || 'rgba(181,146,102,0.15)') : 'transparent', border: `1px solid ${active ? (cfg?.border || 'rgba(181,146,102,0.4)') : '#2a2010'}`, color: active ? (cfg?.color || '#b59266') : '#5a4a30', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 5 }}>
                    {a} <span style={{ opacity: 0.7 }}>{cnt}</span>
                  </button>
                );
              })}
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#5a4a30' }}>SORT</span>
                <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                  style={{ background: '#0e0b07', border: '1px solid #2a2010', color: '#b59266', padding: '5px 8px', borderRadius: 6, fontSize: 11, fontFamily: 'monospace', cursor: 'pointer' }}>
                  {SORT_OPTIONS.map(({ key, label }) => <option key={key} value={key}>{label}</option>)}
                </select>
              </div>
            </div>

            {/* Card view */}
            {view === 'cards' && (
              <div>
                {filtered.length === 0 && (
                  <div style={{ padding: '40px 20px', textAlign: 'center', color: '#4a3a20', fontFamily: 'monospace', fontSize: 12 }}>
                    No terms match this filter.
                  </div>
                )}
                {filtered.map((row, i) => (
                  <ActionCard key={i} row={row} targetAcos={targetAcos} />
                ))}
              </div>
            )}

            {/* Table view */}
            {view === 'table' && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #2a2010' }}>
                      {['Action','Term / Target','Campaign','Ad Group','Clicks','Spend','Sales','ACoS','Recommended Action','Bid →'].map(h => (
                        <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontFamily: 'monospace', fontSize: 10, color: '#5a4a30', letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 400, whiteSpace: 'nowrap', background: '#0c0905' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((row, i) => {
                      const cfg = AC[row.action];
                      const acosVal = row.acos;
                      const acosC = acosVal === 0 && row.spend === 0 ? '#4a3a20' : acosVal <= targetAcos && acosVal > 0 ? '#4ECA4E' : '#FF6B6B';
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid #1a1208', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                          <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}><ActionBadge action={row.action} /></td>
                          <td style={{ padding: '10px 12px', maxWidth: 200 }}>
                            <div style={{ color: '#e8ddcc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.term}>{row.term}</div>
                            <TermTypePill termSource={row.termSource} />
                          </td>
                          <td style={{ padding: '10px 12px', color: '#7a6b58', fontSize: 12, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.campaign || '—'}</td>
                          <td style={{ padding: '10px 12px', color: '#5a4a30', fontSize: 12, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.adGroup || '—'}</td>
                          <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#c8b79a', textAlign: 'right', whiteSpace: 'nowrap' }}>{row.clicks}</td>
                          <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#c8b79a', textAlign: 'right', whiteSpace: 'nowrap' }}>{fmt$(row.spend)}</td>
                          <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: row.sales > 0 ? '#4ECA4E' : '#4a3a20', textAlign: 'right', whiteSpace: 'nowrap' }}>{row.sales > 0 ? fmt$(row.sales) : '—'}</td>
                          <td style={{ padding: '10px 12px', fontFamily: 'monospace', textAlign: 'right', whiteSpace: 'nowrap', color: acosC }}>{acosVal === 0 && row.spend === 0 ? '—' : fmtPct(acosVal)}</td>
                          <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', color: cfg.color, fontFamily: 'monospace', fontSize: 12 }}>{row.recAction}</td>
                          <td style={{ padding: '10px 12px', fontFamily: 'monospace', textAlign: 'right', whiteSpace: 'nowrap' }}>
                            {row.suggestedBid ? <span style={{ color: cfg.color, fontSize: 12 }}>{row.action === 'CUT' ? '↓' : row.action === 'SCALE' ? '↑' : '→'} ${row.suggestedBid}</span> : <span style={{ color: '#3a2a10' }}>—</span>}
                          </td>
                        </tr>
                      );
                    })}
                    {filtered.length === 0 && (
                      <tr><td colSpan={10} style={{ padding: '40px 20px', textAlign: 'center', color: '#4a3a20', fontFamily: 'monospace', fontSize: 12 }}>No terms match this filter.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
