import { useState, useCallback, useRef } from 'react';

const FONT = `@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400&family=Jost:wght@300;400;500;600&display=swap');`;

/* ── CSV PARSER ──────────────────────────────────────────── */

function parseCSVText(text) {
  const lines = [];
  let current = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (ch === '"') {
      if (inQuotes && next === '"') { field += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      current.push(field.trim()); field = '';
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && next === '\n') i++;
      current.push(field.trim()); field = '';
      if (current.some(f => f !== '')) lines.push([...current]);
      current = [];
    } else {
      field += ch;
    }
  }
  if (field || current.length) {
    current.push(field.trim());
    if (current.some(f => f !== '')) lines.push(current);
  }
  if (lines.length < 2) return [];
  const headers = lines[0];
  return lines.slice(1).filter(row => row.length > 1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { if (h) obj[h] = row[i] ?? ''; });
    return obj;
  });
}

/* ── COLUMN NORMALIZATION ────────────────────────────────── */

function normCol(col) {
  return col.toLowerCase().trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

function parseNum(val) {
  if (!val && val !== 0) return 0;
  const s = String(val).trim();
  if (s === '' || s === '--' || s === 'n/a' || s.toLowerCase() === 'nan') return 0;
  return parseFloat(s.replace(/[$,%]/g, '').replace(/,/g, '')) || 0;
}

function findCol(row, aliases) {
  for (const a of aliases) {
    if (row[a] !== undefined && row[a] !== '') return row[a];
  }
  return undefined;
}

// Returns both the value and which alias matched (to detect report type)
function findColWithKey(row, aliases) {
  for (const a of aliases) {
    if (row[a] !== undefined && row[a] !== '') return { value: row[a], key: a };
  }
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

// Detect whether this row is a customer search query or an actual keyword/target
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
  const termSource = detectTermSource(termKey, term);

  return {
    term,
    termSource,
    campaign: (findCol(r, CAMPAIGN_ALIASES) || '').trim(),
    adGroup:  (findCol(r, ADGROUP_ALIASES)  || '').trim(),
    matchType:(findCol(r, MATCH_ALIASES)     || '').trim(),
    clicks:     parseNum(findCol(r, CLICK_ALIASES)),
    spend:      parseNum(findCol(r, SPEND_ALIASES)),
    sales:      parseNum(findCol(r, SALES_ALIASES)),
    orders:     parseNum(findCol(r, ORDERS_ALIASES)),
    acosRaw:    parseNum(findCol(r, ACOS_ALIASES)),
    impressions:parseNum(findCol(r, IMPR_ALIASES)),
    cpc:        parseNum(findCol(r, CPC_ALIASES)),
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

  if (clicks === 0 && spend < 0.01)               return { action: 'WATCH',   reason: 'No activity recorded' };
  if (clicks < 5 && spend < minSpendToCut)        return { action: 'WATCH',   reason: 'Collecting data' };
  if (clicks >= minClicksToCut && orders === 0)   return { action: 'CUT',     reason: `${clicks} clicks · $${spend.toFixed(2)} spent · zero orders` };
  if (spend >= minSpendToCut && orders === 0 && clicks >= 5) return { action: 'CUT', reason: `$${spend.toFixed(2)} spent · ${clicks} clicks · zero orders` };
  if (acos === Infinity && spend >= minSpendToCut) return { action: 'CUT',     reason: `$${spend.toFixed(2)} spent · no tracked sales` };
  if (acos > 200 && spend >= minSpendToCut && orders > 0) return { action: 'CUT', reason: `ACoS ${acos.toFixed(0)}% — not recoverable` };
  if (acos <= targetAcos && orders > 0) {
    const conf = clicks >= 20 ? 'strong signal' : clicks >= 10 ? 'good signal' : 'early signal';
    return { action: 'SCALE', reason: `ACoS ${acos.toFixed(0)}% · ${conf}` };
  }
  if (acos > targetAcos && acos <= 100 && orders > 0)  return { action: 'ISOLATE', reason: `ACoS ${acos.toFixed(0)}% · converting, needs tuning` };
  if (acos > 100  && acos <= 200 && orders > 0)        return { action: 'ISOLATE', reason: `ACoS ${acos.toFixed(0)}% · marginal return` };
  return { action: 'WATCH', reason: 'Collecting data' };
}

// What the seller should physically do in Seller Central
function recommendedAction(action, termSource) {
  if (action === 'CUT') {
    if (termSource === 'search_term')     return 'Add as Negative Keyword';
    if (termSource === 'asin_target')     return 'Pause ASIN Target';
    if (termSource === 'category_target') return 'Pause Category Target';
    return 'Pause Keyword';
  }
  if (action === 'SCALE')   return 'Raise Bid ~25%';
  if (action === 'ISOLATE') return 'Move to Test Campaign';
  return 'Hold — Monitor';
}

function suggestedBid(action, cpc) {
  if (!cpc || cpc <= 0) return null;
  if (action === 'SCALE')   return (cpc * 1.25).toFixed(2);
  if (action === 'CUT')     return (cpc * 0.10).toFixed(2);
  if (action === 'ISOLATE') return cpc.toFixed(2);
  return null;
}

const PRIORITY = { CUT: 1, ISOLATE: 2, SCALE: 3, WATCH: 4 };

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
  const headers = [
    'Priority','Action','Recommended Action','Term Type',
    'Term / Target','Campaign','Ad Group','Match Type',
    'Clicks','Spend','Sales','Orders','ACoS (%)','Suggested Bid','Reason',
  ];
  const dataRows = rows.map(r => [
    r.priority,
    r.action,
    r.recAction,
    termSourceLabel(r.termSource),
    r.term,
    r.campaign,
    r.adGroup,
    r.matchType,
    r.clicks,
    r.spend.toFixed(2),
    r.sales.toFixed(2),
    r.orders,
    r.acos === Infinity ? '∞' : r.acos.toFixed(1),
    r.suggestedBid ?? '',
    r.reason,
  ]);
  const csv = [headers, ...dataRows].map(row => row.map(escapeCSV).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = (fileName.replace('.csv', '') || 'bid-plan') + '_action-plan.csv';
  a.click();
  URL.revokeObjectURL(url);
}

/* ── ACTION + SORT CONFIG ────────────────────────────────── */

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
  // Search term rows (from Search Term Report) — safe to add as negatives
  { term: 'black pepper grinder',          termSource: 'search_term',    campaign: 'SP - Auto',   adGroup: 'Grinders - Auto',   matchType: '',      clicks: 32, spend: 14.80, sales: 0,      orders: 0, acosRaw: 0,    impressions: 890,  cpc: 0.46 },
  { term: 'electric pepper mill',          termSource: 'search_term',    campaign: 'SP - Auto',   adGroup: 'Grinders - Auto',   matchType: '',      clicks: 48, spend: 31.20, sales: 118.50, orders: 4, acosRaw: 26.3, impressions: 1240, cpc: 0.65 },
  { term: 'salt and pepper grinder set',   termSource: 'search_term',    campaign: 'SP - Auto',   adGroup: 'Grinders - Auto',   matchType: '',      clicks: 19, spend: 8.55,  sales: 54.90,  orders: 2, acosRaw: 15.6, impressions: 620,  cpc: 0.45 },
  { term: 'cheap pepper grinder',          termSource: 'search_term',    campaign: 'SP - Auto',   adGroup: 'Grinders - Auto',   matchType: '',      clicks: 41, spend: 16.40, sales: 0,      orders: 0, acosRaw: 0,    impressions: 1100, cpc: 0.40 },
  { term: 'pepper grinder for table',      termSource: 'search_term',    campaign: 'SP - Auto',   adGroup: 'Grinders - Auto',   matchType: '',      clicks: 7,  spend: 2.80,  sales: 0,      orders: 0, acosRaw: 0,    impressions: 310,  cpc: 0.40 },
  // Keyword target rows (from Targeting Report) — pause, don't negative
  { term: 'manual pepper grinder stainless', termSource: 'keyword_target', campaign: 'SP - Manual', adGroup: 'Exact - Core',    matchType: 'Exact', clicks: 61, spend: 42.70, sales: 246.00, orders: 9, acosRaw: 17.4, impressions: 1850, cpc: 0.70 },
  { term: 'best pepper grinder',            termSource: 'keyword_target', campaign: 'SP - Manual', adGroup: 'Broad - Discovery',matchType: 'Broad', clicks: 22, spend: 17.60, sales: 28.95,  orders: 1, acosRaw: 60.8, impressions: 740,  cpc: 0.80 },
  { term: 'kitchen pepper mill',            termSource: 'keyword_target', campaign: 'SP - Manual', adGroup: 'Phrase - Core',    matchType: 'Phrase',clicks: 14, spend: 9.80,  sales: 54.90,  orders: 2, acosRaw: 17.9, impressions: 520,  cpc: 0.70 },
  { term: 'refillable pepper grinder',      termSource: 'keyword_target', campaign: 'SP - Manual', adGroup: 'Exact - Core',    matchType: 'Exact', clicks: 28, spend: 19.60, sales: 54.90,  orders: 2, acosRaw: 35.7, impressions: 810,  cpc: 0.70 },
  { term: 'grinder mill spice',             termSource: 'keyword_target', campaign: 'SP - Manual', adGroup: 'Broad - Discovery',matchType: 'Broad', clicks: 3,  spend: 1.20,  sales: 0,      orders: 0, acosRaw: 0,    impressions: 180,  cpc: 0.40 },
];

/* ── HELPERS ─────────────────────────────────────────────── */

function fmt$(n) { return '$' + n.toFixed(2); }
function fmtPct(n) { return n === Infinity ? '∞%' : n.toFixed(1) + '%'; }

function ActionBadge({ action, size = 'sm' }) {
  const cfg = AC[action];
  const pad = size === 'lg' ? '6px 14px' : '3px 9px';
  const fs  = size === 'lg' ? 13 : 11;
  return (
    <span style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color, borderRadius: 4, padding: pad, fontSize: fs, fontFamily: 'monospace', fontWeight: 700, letterSpacing: 0.5, whiteSpace: 'nowrap' }}>
      {action}
    </span>
  );
}

function TermTypePill({ termSource }) {
  const labels = {
    search_term:     { label: 'Search Term', color: '#7A9BD4', bg: 'rgba(30,50,110,0.2)' },
    keyword_target:  { label: 'Keyword',     color: '#9a8a72', bg: 'rgba(60,45,20,0.3)'  },
    asin_target:     { label: 'ASIN',        color: '#C4A44A', bg: 'rgba(80,60,10,0.3)'  },
    category_target: { label: 'Category',    color: '#8B8BD4', bg: 'rgba(40,40,100,0.3)' },
  };
  const cfg = labels[termSource];
  if (!cfg) return null;
  return (
    <span style={{ fontSize: 9, fontFamily: 'monospace', color: cfg.color, background: cfg.bg, padding: '2px 6px', borderRadius: 3, letterSpacing: 0.5, whiteSpace: 'nowrap' }}>
      {cfg.label}
    </span>
  );
}

function StatCard({ label, value, sub, color, highlight }) {
  return (
    <div style={{ background: highlight ? 'rgba(180,30,30,0.12)' : '#0e0b07', border: `1px solid ${highlight ? 'rgba(255,107,107,0.25)' : '#2a2010'}`, borderRadius: 10, padding: '14px 18px', flex: 1, minWidth: 0 }}>
      <div style={{ fontFamily: 'monospace', fontSize: 10, color: highlight ? '#FF6B6B' : '#5a4a30', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: "'Fraunces',serif", fontSize: 26, color: color || '#e8ddcc', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontFamily: 'monospace', fontSize: 11, color: highlight ? '#FF6B6B' : '#7a6b58', marginTop: 5 }}>{sub}</div>}
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
  const [sortBy, setSortBy]             = useState('spend');
  const [filterAction, setFilterAction] = useState('ALL');
  const [termView, setTermView]         = useState('all'); // 'all' | 'search_terms' | 'targets'
  const [showSettings, setShowSettings] = useState(false);
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
        if (norm.length === 0) { setError('No keyword rows with activity found. Make sure this is a Search Term, Targeting, or Campaign report.'); return; }
        setRows(norm);
        setFileName(file.name);
        setFilterAction('ALL');
        setTermView('all');
      } catch (err) {
        setError('Parse error: ' + err.message);
      }
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
    setError(''); setFilterAction('ALL'); setTermView('all');
  };

  const settings = { targetAcos, minClicksToCut, minSpendToCut };

  const processed = rows.map(row => {
    const acos        = effectiveAcos(row);
    const { action, reason } = classify(row, settings);
    const recAction   = recommendedAction(action, row.termSource);
    const bid         = suggestedBid(action, row.cpc);
    const priority    = PRIORITY[action];
    return { ...row, acos, action, reason, recAction, suggestedBid: bid, priority };
  });

  const hasSearchTerms = processed.some(r => r.termSource === 'search_term');
  const hasTargets     = processed.some(r => r.termSource !== 'search_term' && r.termSource !== 'unknown');

  const termFiltered = processed.filter(r => {
    if (termView === 'search_terms') return r.termSource === 'search_term';
    if (termView === 'targets')      return r.termSource !== 'search_term';
    return true;
  });

  const filtered = [...termFiltered]
    .filter(r => filterAction === 'ALL' || r.action === filterAction)
    .sort((a, b) => {
      if (sortBy === 'priority') return a.priority - b.priority;
      if (sortBy === 'acos') {
        const av = a.acos === Infinity ? 9999 : a.acos;
        const bv = b.acos === Infinity ? 9999 : b.acos;
        return bv - av;
      }
      return b[sortBy] - a[sortBy];
    });

  const counts     = termFiltered.reduce((acc, r) => { acc[r.action] = (acc[r.action] || 0) + 1; return acc; }, {});
  const totalSpend = processed.reduce((s, r) => s + r.spend, 0);
  const totalSales = processed.reduce((s, r) => s + r.sales, 0);
  const overallAcos= totalSales > 0 ? (totalSpend / totalSales) * 100 : 0;
  const wastedSpend= processed.filter(r => r.action === 'CUT').reduce((s, r) => s + r.spend, 0);

  const hasData = rows.length > 0;

  const acosColor = overallAcos > 0 && overallAcos <= targetAcos ? '#4ECA4E'
                  : overallAcos > targetAcos ? '#FF6B6B' : '#e8ddcc';

  return (
    <div style={{ minHeight: '100vh', background: '#080603', color: '#e8ddcc', fontFamily: "'Jost', sans-serif" }}>
      <style>{FONT}{`
        * { box-sizing: border-box; }
        body { margin: 0; }
        button:hover { opacity: 0.82; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: #0e0b07; }
        ::-webkit-scrollbar-thumb { background: #3a2a10; border-radius: 2px; }
        @media (max-width: 640px) {
          .hide-mobile { display: none !important; }
          .tbl { font-size: 12px !important; }
        }
      `}</style>

      {/* Header */}
      <div style={{ borderBottom: '1px solid #2a2010', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0c0905', position: 'sticky', top: 0, zIndex: 50 }}>
        <div>
          <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#9a7b4f', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 2 }}>Amazon Ads</div>
          <div style={{ fontFamily: "'Fraunces',serif", fontSize: 20, fontWeight: 400 }}>Bid Decision Tool</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {hasData && (
            <button
              onClick={() => exportToCSV(filtered, fileName)}
              style={{ background: '#b59266', border: 'none', color: '#0c0905', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontFamily: 'monospace', fontWeight: 700, letterSpacing: 0.5 }}>
              ↓ EXPORT ACTION PLAN
            </button>
          )}
          {hasData && (
            <button onClick={() => setShowSettings(s => !s)}
              style={{ background: showSettings ? '#2a2010' : 'transparent', border: '1px solid #3a2a10', color: '#9a7b4f', padding: '8px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontFamily: 'monospace' }}>
              SETTINGS
            </button>
          )}
          {hasData && (
            <button onClick={() => { setRows([]); setFileName(''); setError(''); }}
              style={{ background: 'transparent', border: '1px solid #3a2a10', color: '#7a6b58', padding: '8px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontFamily: 'monospace' }}>
              CLEAR
            </button>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px' }}>

        {/* Settings panel */}
        {showSettings && hasData && (
          <div style={{ background: '#0e0b07', border: '1px solid #2a2010', borderRadius: 12, padding: '20px 24px', marginBottom: 24 }}>
            <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#5a4a30', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16 }}>Rules Configuration</div>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              {[
                { label: 'Target ACoS (%)', value: targetAcos, set: setTargetAcos, min: 5, max: 100, step: 1 },
                { label: 'Min clicks before CUT', value: minClicksToCut, set: setMinClicks, min: 5, max: 50, step: 1 },
                { label: 'Min spend before CUT ($)', value: minSpendToCut, set: setMinSpend, min: 1, max: 50, step: 1 },
              ].map(({ label, value, set, min, max, step }) => (
                <div key={label} style={{ flex: 1, minWidth: 160 }}>
                  <label style={{ display: 'block', fontSize: 12, color: '#9a8a72', marginBottom: 6 }}>{label}</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input type="range" min={min} max={max} step={step} value={value}
                      onChange={e => set(Number(e.target.value))}
                      style={{ flex: 1, accentColor: '#b59266' }} />
                    <span style={{ fontFamily: 'monospace', fontSize: 14, color: '#b59266', minWidth: 32, textAlign: 'right' }}>{value}</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #2a2010' }}>
              <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#5a4a30', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>Action Logic</div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {Object.entries(AC).map(([action, cfg]) => (
                  <div key={action} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <ActionBadge action={action} />
                    <span style={{ fontSize: 12, color: '#7a6b58' }}>{cfg.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Upload area */}
        {!hasData && (
          <div>
            <div
              onDrop={onDrop}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onClick={() => fileRef.current?.click()}
              style={{ border: `2px dashed ${dragging ? '#b59266' : '#3a2a10'}`, borderRadius: 16, padding: '60px 40px', textAlign: 'center', cursor: 'pointer', background: dragging ? 'rgba(181,146,102,0.05)' : '#0c0905', transition: 'all 0.2s', marginBottom: 20 }}>
              <input ref={fileRef} type="file" accept=".csv" onChange={onFileChange} style={{ display: 'none' }} />
              <div style={{ fontFamily: "'Fraunces',serif", fontSize: 28, color: '#c8b79a', marginBottom: 10 }}>Drop your Amazon report here</div>
              <div style={{ color: '#7a6b58', fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
                Search Term Report · Targeting Report · Campaign Report<br />
                <span style={{ fontSize: 12 }}>Export as CSV from Amazon Ads console → Reports</span>
              </div>
              <div style={{ display: 'inline-block', background: '#b59266', color: '#0c0905', padding: '11px 28px', borderRadius: 8, fontFamily: 'monospace', fontSize: 13, fontWeight: 700, letterSpacing: 1 }}>CHOOSE CSV FILE</div>
            </div>

            {error && (
              <div style={{ background: 'rgba(180,30,30,0.15)', border: '1px solid rgba(255,107,107,0.3)', borderRadius: 8, padding: '12px 16px', color: '#FF6B6B', fontSize: 13, fontFamily: 'monospace', marginBottom: 16 }}>
                {error}
              </div>
            )}

            <div style={{ textAlign: 'center' }}>
              <button onClick={loadSample}
                style={{ background: 'transparent', border: '1px solid #3a2a10', color: '#7a6b58', padding: '10px 22px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontFamily: 'monospace' }}>
                LOAD SAMPLE DATA
              </button>
              <div style={{ fontSize: 11, color: '#4a3a20', marginTop: 8 }}>10 sample keywords so you can see how it works</div>
            </div>

            <div style={{ marginTop: 40, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
              {[
                { step: '01', title: 'Download report', body: 'Amazon Ads → Reports → Search Term, Targeting, or Campaign. Download as CSV.' },
                { step: '02', title: 'Drop it in', body: 'Drag the CSV onto the upload area above. Nothing leaves your browser.' },
                { step: '03', title: 'Read the action table', body: 'Each row gets a verdict: CUT, ISOLATE, SCALE, or WATCH — with the exact reason.' },
                { step: '04', title: 'Export & execute', body: 'Download the action plan CSV. Apply changes in Seller Central. Revisit in 7–10 days.' },
              ].map(({ step, title, body }) => (
                <div key={step} style={{ background: '#0c0905', border: '1px solid #1e1608', borderRadius: 10, padding: '16px 18px' }}>
                  <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#5a4a30', letterSpacing: 2, marginBottom: 8 }}>{step}</div>
                  <div style={{ fontFamily: "'Fraunces',serif", fontSize: 16, color: '#c8b79a', marginBottom: 6 }}>{title}</div>
                  <div style={{ fontSize: 13, color: '#7a6b58', lineHeight: 1.55 }}>{body}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {hasData && (
          <>
            {/* Summary stats */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#5a4a30', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>
                {fileName} · {processed.length} terms
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <StatCard label="Total Spend" value={fmt$(totalSpend)} />
                <StatCard label="Total Sales"  value={fmt$(totalSales)} />
                <StatCard label="Overall ACoS"
                  value={totalSales > 0 ? fmtPct(overallAcos) : '—'}
                  color={acosColor}
                  sub={`target: ${targetAcos}%`}
                />
                <StatCard
                  label="Estimated Wasted Spend"
                  value={fmt$(wastedSpend)}
                  color="#FF6B6B"
                  sub={`${processed.filter(r => r.action === 'CUT').length} terms to cut`}
                  highlight
                />
              </div>
            </div>

            {/* Search term vs target tabs — only show if report has both */}
            {(hasSearchTerms && hasTargets) && (
              <div style={{ marginBottom: 16, padding: '12px 16px', background: 'rgba(122,155,212,0.08)', border: '1px solid rgba(122,155,212,0.2)', borderRadius: 10 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#7A9BD4', letterSpacing: 1, marginRight: 4 }}>VIEW</div>
                  {[
                    { key: 'all',          label: 'All rows',     count: processed.length },
                    { key: 'search_terms', label: 'Search Terms', count: processed.filter(r => r.termSource === 'search_term').length },
                    { key: 'targets',      label: 'Targets / Keywords', count: processed.filter(r => r.termSource !== 'search_term').length },
                  ].map(({ key, label, count }) => (
                    <button key={key} onClick={() => setTermView(key)}
                      style={{ background: termView === key ? 'rgba(122,155,212,0.2)' : 'transparent', border: `1px solid ${termView === key ? 'rgba(122,155,212,0.5)' : '#2a2010'}`, color: termView === key ? '#7A9BD4' : '#5a4a30', padding: '5px 12px', borderRadius: 5, cursor: 'pointer', fontSize: 12, fontFamily: 'monospace', display: 'flex', gap: 6, alignItems: 'center' }}>
                      {label} <span style={{ opacity: 0.7 }}>{count}</span>
                    </button>
                  ))}
                </div>
                {termView === 'search_terms' && (
                  <div style={{ marginTop: 10, fontSize: 12, color: '#7A9BD4', opacity: 0.8 }}>
                    CUT = add as <strong>Negative Keyword</strong> in the campaign. These are search queries, not keywords you added.
                  </div>
                )}
                {termView === 'targets' && (
                  <div style={{ marginTop: 10, fontSize: 12, color: '#D4C43A', opacity: 0.9 }}>
                    CUT = <strong>Pause or lower bid</strong> on the keyword/ASIN — do not add as a negative. These are targets you explicitly set.
                  </div>
                )}
              </div>
            )}

            {/* Filter + sort bar */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {['ALL', 'CUT', 'ISOLATE', 'SCALE', 'WATCH'].map(a => {
                  const active = filterAction === a;
                  const cfg = a === 'ALL' ? null : AC[a];
                  const cnt = a === 'ALL' ? termFiltered.length : counts[a] || 0;
                  return (
                    <button key={a} onClick={() => setFilterAction(a)}
                      style={{ background: active ? (cfg?.bg || 'rgba(181,146,102,0.15)') : 'transparent', border: `1px solid ${active ? (cfg?.border || 'rgba(181,146,102,0.4)') : '#2a2010'}`, color: active ? (cfg?.color || '#b59266') : '#5a4a30', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {a} <span style={{ opacity: 0.7 }}>{cnt}</span>
                    </button>
                  );
                })}
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#5a4a30', letterSpacing: 1 }}>SORT</span>
                {SORT_OPTIONS.map(({ key, label }) => (
                  <button key={key} onClick={() => setSortBy(key)}
                    style={{ background: sortBy === key ? '#2a2010' : 'transparent', border: `1px solid ${sortBy === key ? '#4a3a20' : '#1e1608'}`, color: sortBy === key ? '#b59266' : '#4a3a20', padding: '5px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Action table */}
            <div style={{ overflowX: 'auto' }}>
              <table className="tbl" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #2a2010' }}>
                    {[
                      { h: 'Action',           mobile: true  },
                      { h: 'Term / Target',     mobile: true  },
                      { h: 'Campaign',          mobile: false },
                      { h: 'Ad Group',          mobile: false },
                      { h: 'Clicks',            mobile: true  },
                      { h: 'Spend',             mobile: true  },
                      { h: 'Sales',             mobile: false },
                      { h: 'ACoS',              mobile: true  },
                      { h: 'Recommended Action',mobile: false },
                      { h: 'Bid →',             mobile: true  },
                    ].map(({ h, mobile }) => (
                      <th key={h}
                        className={!mobile ? 'hide-mobile' : ''}
                        style={{ padding: '10px 12px', textAlign: 'left', fontFamily: 'monospace', fontSize: 10, color: '#5a4a30', letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 400, whiteSpace: 'nowrap', background: '#0c0905' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row, i) => {
                    const cfg = AC[row.action];
                    const acosVal = row.acos;
                    const acosColor = acosVal === 0 && row.spend === 0 ? '#4a3a20'
                      : acosVal <= targetAcos && acosVal > 0 ? '#4ECA4E'
                      : acosVal > targetAcos && acosVal !== Infinity ? '#FF6B6B'
                      : acosVal === Infinity ? '#FF6B6B' : '#4a3a20';
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid #1a1208', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                        <td style={{ padding: '11px 12px', whiteSpace: 'nowrap' }}>
                          <ActionBadge action={row.action} />
                        </td>
                        <td style={{ padding: '11px 12px', maxWidth: 200 }}>
                          <div style={{ color: '#e8ddcc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.term}>
                            {row.term}
                          </div>
                          <div style={{ marginTop: 3, display: 'flex', gap: 5, alignItems: 'center' }}>
                            <TermTypePill termSource={row.termSource} />
                            {row.matchType && <span style={{ fontFamily: 'monospace', fontSize: 9, color: '#4a3a20' }}>{row.matchType}</span>}
                          </div>
                        </td>
                        <td className="hide-mobile" style={{ padding: '11px 12px', maxWidth: 160 }}>
                          <div style={{ color: '#7a6b58', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }} title={row.campaign}>
                            {row.campaign || '—'}
                          </div>
                        </td>
                        <td className="hide-mobile" style={{ padding: '11px 12px', maxWidth: 140 }}>
                          <div style={{ color: '#5a4a30', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }} title={row.adGroup}>
                            {row.adGroup || '—'}
                          </div>
                        </td>
                        <td style={{ padding: '11px 12px', fontFamily: 'monospace', color: '#c8b79a', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {row.clicks.toLocaleString()}
                        </td>
                        <td style={{ padding: '11px 12px', fontFamily: 'monospace', color: '#c8b79a', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {fmt$(row.spend)}
                        </td>
                        <td className="hide-mobile" style={{ padding: '11px 12px', fontFamily: 'monospace', color: row.sales > 0 ? '#4ECA4E' : '#4a3a20', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {row.sales > 0 ? fmt$(row.sales) : '—'}
                        </td>
                        <td style={{ padding: '11px 12px', fontFamily: 'monospace', textAlign: 'right', whiteSpace: 'nowrap', color: acosColor }}>
                          {acosVal === 0 && row.spend === 0 ? '—' : fmtPct(acosVal)}
                        </td>
                        <td className="hide-mobile" style={{ padding: '11px 12px', whiteSpace: 'nowrap' }}>
                          <span style={{ fontSize: 12, color: cfg.color, fontFamily: 'monospace' }}>
                            {row.recAction}
                          </span>
                        </td>
                        <td style={{ padding: '11px 12px', fontFamily: 'monospace', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {row.suggestedBid ? (
                            <span style={{ color: cfg.color, fontSize: 12 }}>
                              {row.action === 'CUT' ? '↓' : row.action === 'SCALE' ? '↑' : '→'} ${row.suggestedBid}
                            </span>
                          ) : (
                            <span style={{ color: '#3a2a10' }}>—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={10} style={{ padding: '40px 20px', textAlign: 'center', color: '#4a3a20', fontFamily: 'monospace', fontSize: 12 }}>
                        No terms match this filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Action summary footer */}
            <div style={{ marginTop: 28, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              {['CUT', 'ISOLATE', 'SCALE', 'WATCH'].map(action => {
                const cfg   = AC[action];
                const terms = processed.filter(r => r.action === action);
                if (terms.length === 0) return null;
                const sp = terms.reduce((s, r) => s + r.spend, 0);
                return (
                  <div key={action} style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 10, padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <ActionBadge action={action} size="lg" />
                      <span style={{ fontFamily: 'monospace', fontSize: 18, color: cfg.color }}>{terms.length}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#7a6b58' }}>{cfg.desc}</div>
                    <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#5a4a30', marginTop: 6 }}>
                      {fmt$(sp)} spend
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
