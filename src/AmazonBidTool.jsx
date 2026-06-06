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

const TERM_ALIASES    = ['customer_search_term','targeting','keyword','search_term','keyword_or_product_targeting','keyword_text'];
const CLICK_ALIASES   = ['clicks'];
const SPEND_ALIASES   = ['spend'];
const SALES_ALIASES   = ['7_day_total_sales','14_day_total_sales','total_sales','sales','7_day_total_sales__1_'];
const ORDERS_ALIASES  = ['7_day_total_orders','14_day_total_orders','total_orders','orders','units_ordered','7_day_total_orders__1_'];
const ACOS_ALIASES    = ['acos','advertising_cost_of_sales','total_advertising_cost_of_sales','7_day_advertising_cost_of_sales__acos_'];
const IMPR_ALIASES    = ['impressions'];
const CAMPAIGN_ALIASES= ['campaign_name','campaign'];
const MATCH_ALIASES   = ['match_type'];
const CPC_ALIASES     = ['avg_cpc','cost_per_click','cpc','average_cpc'];

function normalizeRow(raw) {
  const r = {};
  for (const [k, v] of Object.entries(raw)) r[normCol(k)] = v;

  const term = (findCol(r, TERM_ALIASES) || '').trim() || '—';
  const campaign = (findCol(r, CAMPAIGN_ALIASES) || '').trim();
  const matchType = (findCol(r, MATCH_ALIASES) || '').trim();
  const clicks = parseNum(findCol(r, CLICK_ALIASES));
  const spend = parseNum(findCol(r, SPEND_ALIASES));
  const sales = parseNum(findCol(r, SALES_ALIASES));
  const orders = parseNum(findCol(r, ORDERS_ALIASES));
  const acosRaw = parseNum(findCol(r, ACOS_ALIASES));
  const impressions = parseNum(findCol(r, IMPR_ALIASES));
  const cpc = parseNum(findCol(r, CPC_ALIASES));

  return { term, campaign, matchType, clicks, spend, sales, orders, acosRaw, impressions, cpc };
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

  if (clicks === 0 && spend < 0.01) {
    return { action: 'WATCH', reason: 'No activity recorded' };
  }
  if (clicks < 5 && spend < minSpendToCut) {
    return { action: 'WATCH', reason: 'Collecting data' };
  }
  if (clicks >= minClicksToCut && orders === 0) {
    return { action: 'CUT', reason: `${clicks} clicks · $${spend.toFixed(2)} spent · zero orders` };
  }
  if (spend >= minSpendToCut && orders === 0 && clicks >= 5) {
    return { action: 'CUT', reason: `$${spend.toFixed(2)} spent · ${clicks} clicks · zero orders` };
  }
  if (acos === Infinity && spend >= minSpendToCut) {
    return { action: 'CUT', reason: `$${spend.toFixed(2)} spent · no tracked sales` };
  }
  if (acos > 200 && spend >= minSpendToCut && orders > 0) {
    return { action: 'CUT', reason: `ACoS ${acos.toFixed(0)}% — not recoverable` };
  }
  if (acos <= targetAcos && orders > 0) {
    const conf = clicks >= 20 ? 'strong signal' : clicks >= 10 ? 'good signal' : 'early signal';
    return { action: 'SCALE', reason: `ACoS ${acos.toFixed(0)}% · ${conf}` };
  }
  if (acos > targetAcos && acos <= 100 && orders > 0) {
    return { action: 'ISOLATE', reason: `ACoS ${acos.toFixed(0)}% · converting, needs tuning` };
  }
  if (acos > 100 && acos <= 200 && orders > 0) {
    return { action: 'ISOLATE', reason: `ACoS ${acos.toFixed(0)}% · marginal return` };
  }
  return { action: 'WATCH', reason: 'Collecting data' };
}

function suggestedBid(action, cpc) {
  if (!cpc || cpc <= 0) return null;
  if (action === 'SCALE')   return (cpc * 1.25).toFixed(2);
  if (action === 'CUT')     return (cpc * 0.10).toFixed(2);
  if (action === 'ISOLATE') return cpc.toFixed(2);
  return null;
}

/* ── ACTION CONFIG ───────────────────────────────────────── */

const AC = {
  CUT:     { color: '#FF6B6B', bg: 'rgba(180,30,30,0.18)', border: 'rgba(255,107,107,0.35)', desc: 'Kill or drop bid to near-zero' },
  SCALE:   { color: '#4ECA4E', bg: 'rgba(30,130,30,0.18)', border: 'rgba(78,202,78,0.35)',  desc: 'Increase bid ~25%' },
  ISOLATE: { color: '#D4C43A', bg: 'rgba(110,100,10,0.18)', border: 'rgba(212,196,58,0.35)', desc: 'Move to isolated test campaign' },
  WATCH:   { color: '#7A9BD4', bg: 'rgba(30,50,110,0.18)', border: 'rgba(122,155,212,0.35)', desc: 'Hold — needs more data' },
};

const ACTION_ORDER = { CUT: 0, ISOLATE: 1, SCALE: 2, WATCH: 3 };

/* ── SAMPLE DATA ─────────────────────────────────────────── */

const SAMPLE_ROWS = [
  { term: 'black pepper grinder', campaign: 'SP - Auto', matchType: 'Broad', clicks: 32, spend: 14.80, sales: 0, orders: 0, acosRaw: 0, impressions: 890, cpc: 0.46 },
  { term: 'electric pepper mill', campaign: 'SP - Manual', matchType: 'Exact', clicks: 48, spend: 31.20, sales: 118.50, orders: 4, acosRaw: 26.3, impressions: 1240, cpc: 0.65 },
  { term: 'salt and pepper grinder set', campaign: 'SP - Auto', matchType: 'Phrase', clicks: 19, spend: 8.55, sales: 54.90, orders: 2, acosRaw: 15.6, impressions: 620, cpc: 0.45 },
  { term: 'pepper grinder for table', campaign: 'SP - Auto', matchType: 'Broad', clicks: 7, spend: 2.80, sales: 0, orders: 0, acosRaw: 0, impressions: 310, cpc: 0.40 },
  { term: 'best pepper grinder', campaign: 'SP - Manual', matchType: 'Broad', clicks: 22, spend: 17.60, sales: 28.95, orders: 1, acosRaw: 60.8, impressions: 740, cpc: 0.80 },
  { term: 'manual pepper grinder stainless', campaign: 'SP - Manual', matchType: 'Exact', clicks: 61, spend: 42.70, sales: 246.00, orders: 9, acosRaw: 17.4, impressions: 1850, cpc: 0.70 },
  { term: 'cheap pepper grinder', campaign: 'SP - Auto', matchType: 'Broad', clicks: 41, spend: 16.40, sales: 0, orders: 0, acosRaw: 0, impressions: 1100, cpc: 0.40 },
  { term: 'grinder mill spice', campaign: 'SP - Auto', matchType: 'Broad', clicks: 3, spend: 1.20, sales: 0, orders: 0, acosRaw: 0, impressions: 180, cpc: 0.40 },
  { term: 'kitchen pepper mill', campaign: 'SP - Manual', matchType: 'Phrase', clicks: 14, spend: 9.80, sales: 54.90, orders: 2, acosRaw: 17.9, impressions: 520, cpc: 0.70 },
  { term: 'refillable pepper grinder', campaign: 'SP - Manual', matchType: 'Exact', clicks: 28, spend: 19.60, sales: 54.90, orders: 2, acosRaw: 35.7, impressions: 810, cpc: 0.70 },
];

/* ── HELPERS ─────────────────────────────────────────────── */

function fmt$(n) { return '$' + n.toFixed(2); }
function fmtPct(n) { return n === Infinity ? '∞%' : n.toFixed(1) + '%'; }

function ActionBadge({ action, size = 'sm' }) {
  const cfg = AC[action];
  const pad = size === 'lg' ? '6px 14px' : '3px 9px';
  const fs = size === 'lg' ? 13 : 11;
  return (
    <span style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color, borderRadius: 4, padding: pad, fontSize: fs, fontFamily: 'monospace', fontWeight: 700, letterSpacing: 0.5, whiteSpace: 'nowrap' }}>
      {action}
    </span>
  );
}

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{ background: '#0e0b07', border: '1px solid #2a2010', borderRadius: 10, padding: '14px 18px', flex: 1, minWidth: 0 }}>
      <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#5a4a30', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: "'Fraunces',serif", fontSize: 26, color: color || '#e8ddcc', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#7a6b58', marginTop: 5 }}>{sub}</div>}
    </div>
  );
}

/* ── MAIN COMPONENT ──────────────────────────────────────── */

export default function AmazonBidTool() {
  const [rows, setRows]               = useState([]);
  const [fileName, setFileName]       = useState('');
  const [dragging, setDragging]       = useState(false);
  const [error, setError]             = useState('');
  const [targetAcos, setTargetAcos]   = useState(25);
  const [minClicksToCut, setMinClicks]= useState(15);
  const [minSpendToCut, setMinSpend]  = useState(5);
  const [sortBy, setSortBy]           = useState('spend');
  const [filterAction, setFilterAction] = useState('ALL');
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

  const onFileChange = (e) => {
    if (e.target.files[0]) processFile(e.target.files[0]);
  };

  const loadSample = () => {
    setRows(SAMPLE_ROWS); setFileName('sample_data.csv');
    setError(''); setFilterAction('ALL');
  };

  const settings = { targetAcos, minClicksToCut, minSpendToCut };

  const processed = rows.map(row => {
    const acos = effectiveAcos(row);
    const { action, reason } = classify(row, settings);
    const bid = suggestedBid(action, row.cpc);
    return { ...row, acos, action, reason, suggestedBid: bid };
  });

  const filtered = [...processed]
    .filter(r => filterAction === 'ALL' || r.action === filterAction)
    .sort((a, b) => {
      if (sortBy === 'action') return ACTION_ORDER[a.action] - ACTION_ORDER[b.action];
      if (sortBy === 'acos') {
        const av = a.acos === Infinity ? 9999 : a.acos;
        const bv = b.acos === Infinity ? 9999 : b.acos;
        return bv - av;
      }
      return b[sortBy] - a[sortBy];
    });

  const counts = processed.reduce((acc, r) => {
    acc[r.action] = (acc[r.action] || 0) + 1; return acc;
  }, {});

  const totalSpend = processed.reduce((s, r) => s + r.spend, 0);
  const totalSales = processed.reduce((s, r) => s + r.sales, 0);
  const overallAcos = totalSales > 0 ? (totalSpend / totalSales) * 100 : 0;
  const cutSpend = processed.filter(r => r.action === 'CUT').reduce((s, r) => s + r.spend, 0);

  const hasData = rows.length > 0;

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
          .table-scroll { font-size: 12px !important; }
        }
      `}</style>

      {/* Header */}
      <div style={{ borderBottom: '1px solid #2a2010', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0c0905', position: 'sticky', top: 0, zIndex: 50 }}>
        <div>
          <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#9a7b4f', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 2 }}>Amazon Ads</div>
          <div style={{ fontFamily: "'Fraunces',serif", fontSize: 20, fontWeight: 400 }}>Bid Decision Tool</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {hasData && (
            <button onClick={() => setShowSettings(s => !s)}
              style={{ background: showSettings ? '#2a2010' : 'transparent', border: '1px solid #3a2a10', color: '#9a7b4f', padding: '7px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontFamily: 'monospace' }}>
              SETTINGS
            </button>
          )}
          {hasData && (
            <button onClick={() => { setRows([]); setFileName(''); setError(''); }}
              style={{ background: 'transparent', border: '1px solid #3a2a10', color: '#7a6b58', padding: '7px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontFamily: 'monospace' }}>
              CLEAR
            </button>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 20px' }}>

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

            {/* Instructions */}
            <div style={{ marginTop: 40, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
              {[
                { step: '01', title: 'Download report', body: 'Amazon Ads → Reports → Search Term, Targeting, or Campaign. Download as CSV.' },
                { step: '02', title: 'Drop it in', body: 'Drag the CSV onto the upload area above. Nothing leaves your browser.' },
                { step: '03', title: 'Read the action table', body: 'Each keyword gets a verdict: CUT, ISOLATE, SCALE, or WATCH — with the reason.' },
                { step: '04', title: 'Make the changes', body: 'Apply bid changes in Seller Central. Revisit with fresh data in 7–10 days.' },
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
                <StatCard label="Total Sales" value={fmt$(totalSales)} />
                <StatCard
                  label="Overall ACoS"
                  value={totalSales > 0 ? fmtPct(overallAcos) : '—'}
                  color={overallAcos > 0 && overallAcos <= targetAcos ? '#4ECA4E' : overallAcos > targetAcos ? '#FF6B6B' : '#e8ddcc'}
                  sub={`target: ${targetAcos}%`}
                />
                <StatCard label="Reclaimable spend" value={cutSpend > 0 ? fmt$(cutSpend) : '$0'} color="#FF6B6B" sub={`${counts.CUT || 0} terms to cut`} />
              </div>
            </div>

            {/* Action filter + sort */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {['ALL', 'CUT', 'ISOLATE', 'SCALE', 'WATCH'].map(a => {
                  const active = filterAction === a;
                  const cfg = a === 'ALL' ? null : AC[a];
                  const cnt = a === 'ALL' ? processed.length : counts[a] || 0;
                  return (
                    <button key={a} onClick={() => setFilterAction(a)}
                      style={{ background: active ? (cfg?.bg || 'rgba(181,146,102,0.15)') : 'transparent', border: `1px solid ${active ? (cfg?.border || 'rgba(181,146,102,0.4)') : '#2a2010'}`, color: active ? (cfg?.color || '#b59266') : '#5a4a30', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {a} <span style={{ opacity: 0.7 }}>{cnt}</span>
                    </button>
                  );
                })}
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#5a4a30', letterSpacing: 1 }}>SORT</span>
                {['action', 'spend', 'clicks', 'acos', 'sales'].map(s => (
                  <button key={s} onClick={() => setSortBy(s)}
                    style={{ background: sortBy === s ? '#2a2010' : 'transparent', border: `1px solid ${sortBy === s ? '#4a3a20' : '#1e1608'}`, color: sortBy === s ? '#b59266' : '#4a3a20', padding: '5px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontFamily: 'monospace' }}>
                    {s.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Action table */}
            <div style={{ overflowX: 'auto' }}>
              <table className="table-scroll" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #2a2010' }}>
                    {['Action', 'Term / Target', 'Campaign', 'Clicks', 'Spend', 'Sales', 'ACoS', 'Reason', 'Bid →'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontFamily: 'monospace', fontSize: 10, color: '#5a4a30', letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 400, whiteSpace: 'nowrap', background: '#0c0905' }}
                        className={['Campaign', 'Reason'].includes(h) ? 'hide-mobile' : ''}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row, i) => {
                    const cfg = AC[row.action];
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid #1a1208', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                        <td style={{ padding: '11px 12px', whiteSpace: 'nowrap' }}>
                          <ActionBadge action={row.action} />
                        </td>
                        <td style={{ padding: '11px 12px', maxWidth: 220 }}>
                          <div style={{ color: '#e8ddcc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.term}>
                            {row.term}
                          </div>
                          {row.matchType && (
                            <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#4a3a20', marginTop: 2 }}>{row.matchType}</div>
                          )}
                        </td>
                        <td className="hide-mobile" style={{ padding: '11px 12px', maxWidth: 160 }}>
                          <div style={{ color: '#7a6b58', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }} title={row.campaign}>
                            {row.campaign || '—'}
                          </div>
                        </td>
                        <td style={{ padding: '11px 12px', fontFamily: 'monospace', color: '#c8b79a', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {row.clicks.toLocaleString()}
                        </td>
                        <td style={{ padding: '11px 12px', fontFamily: 'monospace', color: '#c8b79a', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {fmt$(row.spend)}
                        </td>
                        <td style={{ padding: '11px 12px', fontFamily: 'monospace', color: row.sales > 0 ? '#4ECA4E' : '#4a3a20', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {row.sales > 0 ? fmt$(row.sales) : '—'}
                        </td>
                        <td style={{ padding: '11px 12px', fontFamily: 'monospace', textAlign: 'right', whiteSpace: 'nowrap', color: row.acos === 0 && row.spend === 0 ? '#4a3a20' : row.acos <= targetAcos && row.acos > 0 ? '#4ECA4E' : row.acos > targetAcos && row.acos !== Infinity ? '#FF6B6B' : row.acos === Infinity ? '#FF6B6B' : '#4a3a20' }}>
                          {row.acos === 0 && row.spend === 0 ? '—' : fmtPct(row.acos)}
                        </td>
                        <td className="hide-mobile" style={{ padding: '11px 12px', color: '#7a6b58', fontSize: 12, maxWidth: 240 }}>
                          <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.reason}>
                            {row.reason}
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
                      <td colSpan={9} style={{ padding: '40px 20px', textAlign: 'center', color: '#4a3a20', fontFamily: 'monospace', fontSize: 12 }}>
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
                const cfg = AC[action];
                const terms = processed.filter(r => r.action === action);
                if (terms.length === 0) return null;
                const totalSp = terms.reduce((s, r) => s + r.spend, 0);
                return (
                  <div key={action} style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 10, padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <ActionBadge action={action} size="lg" />
                      <span style={{ fontFamily: 'monospace', fontSize: 18, color: cfg.color }}>{terms.length}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#7a6b58' }}>{cfg.desc}</div>
                    <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#5a4a30', marginTop: 6 }}>
                      {fmt$(totalSp)} total spend
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
