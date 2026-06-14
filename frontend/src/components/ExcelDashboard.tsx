import { useState, useMemo } from 'react';
import type { ParsedSheet } from './ExcelAnalyzer';
import { Grid3x3, BarChart3, Table2, TrendingUp, Search, ChevronUp, ChevronDown, ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight } from 'lucide-react';
import './ExcelDashboard.css';
import ExcelCharts from './ExcelCharts';


interface Props { sheet: ParsedSheet; }
type DashTab = 'summary' | 'columns' | 'table' | 'charts';

type ColType = 'numeric' | 'date' | 'text';
export interface ColStat {
  name: string; type: ColType; unique: number; nulls: number;
  min?: number; max?: number; sum?: number; avg?: number;
  topValues?: { val: string; count: number }[];
}

function detectType(vals: (string | number | boolean | null)[]): ColType {
  const nonNull = vals.filter((v) => v !== null && v !== '');
  const numericCount = nonNull.filter((v) => !isNaN(Number(v))).length;
  if (nonNull.length > 0 && numericCount / nonNull.length >= 0.8) return 'numeric';
  const dateRe = /^\d{4}[-/]\d{2}[-/]\d{2}|\d{2}[-/]\d{2}[-/]\d{4}/;
  const dateCount = nonNull.filter((v) => dateRe.test(String(v))).length;
  if (nonNull.length > 0 && dateCount / nonNull.length >= 0.7) return 'date';
  return 'text';
}

function analyzeColumns(sheet: ParsedSheet): ColStat[] {
  return sheet.headers.map((name, ci) => {
    const vals = sheet.rows.map((r) => (r[ci] !== undefined ? r[ci] : null));
    const nonNull = vals.filter((v) => v !== null && v !== '') as (string | number)[];
    const nulls = vals.length - nonNull.length;
    const unique = new Set(nonNull.map(String)).size;
    const type = detectType(vals);

    if (type === 'numeric') {
      const nums = nonNull.map(Number);
      const sum = nums.reduce((a, b) => a + b, 0);
      return { name, type, unique, nulls, min: Math.min(...nums), max: Math.max(...nums), sum, avg: nums.length ? sum / nums.length : 0 };
    }
    const freq: Record<string, number> = {};
    nonNull.forEach((v) => { const k = String(v); freq[k] = (freq[k] || 0) + 1; });
    const topValues = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([val, count]) => ({ val, count }));
    return { name, type, unique, nulls, topValues };
  });
}

export default function ExcelDashboard({ sheet }: Props) {
  const [tab, setTab] = useState<DashTab>('summary');
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  const colStats = useMemo(() => analyzeColumns(sheet), [sheet]);

  const filteredRows = useMemo(() => {
    let rows = sheet.rows;
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((r) => r.some((c) => c !== null && String(c).toLowerCase().includes(q)));
    }
    if (sortCol !== null) {
      rows = [...rows].sort((a, b) => {
        const av = a[sortCol] ?? ''; const bv = b[sortCol] ?? '';
        const an = Number(av); const bn = Number(bv);
        const cmp = !isNaN(an) && !isNaN(bn) ? an - bn : String(av).localeCompare(String(bv));
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return rows;
  }, [sheet.rows, search, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const pagedRows = filteredRows.slice(safePage * pageSize, safePage * pageSize + pageSize);

  const toggleSort = (ci: number) => {
    if (sortCol === ci) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortCol(ci); setSortDir('asc'); }
    setPage(0);
  };

  const emptyRate = sheet.totalRows > 0
    ? Math.round(((sheet.totalRows * sheet.totalColumns - sheet.totalCells) / (sheet.totalRows * sheet.totalColumns)) * 100)
    : 0;

  const numericCols = colStats.filter((c) => c.type === 'numeric').length;
  const textCols = colStats.filter((c) => c.type === 'text').length;
  const dateCols = colStats.filter((c) => c.type === 'date').length;

  const tabs: { id: DashTab; label: string; icon: React.ReactNode }[] = [
    { id: 'summary', label: 'Summary', icon: <Grid3x3 size={14} /> },
    { id: 'columns', label: 'Columns', icon: <BarChart3 size={14} /> },
    { id: 'table', label: 'Data Table', icon: <Table2 size={14} /> },
    { id: 'charts', label: 'Charts', icon: <TrendingUp size={14} /> },
  ];

  return (
    <div className="excel-dashboard">
      <div className="excel-dash-tabs">
        {tabs.map((t) => (
          <button key={t.id} id={`excel-tab-${t.id}`}
            className={`excel-dash-tab ${tab === t.id ? 'excel-dash-tab--active' : ''}`}
            onClick={() => setTab(t.id)}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* SUMMARY TAB */}
      {tab === 'summary' && (
        <div className="dash-tab-content fade-in-up">
          <div className="summary-grid">
            {[
              { label: 'Total Rows', value: sheet.totalRows.toLocaleString(), sub: 'data rows (excl. header)', accent: 'blue' },
              { label: 'Total Columns', value: sheet.totalColumns.toLocaleString(), sub: 'columns detected', accent: 'purple' },
              { label: 'Non-Empty Cells', value: sheet.totalCells.toLocaleString(), sub: `${emptyRate}% empty rate`, accent: 'green' },
              { label: 'Numeric Columns', value: numericCols, sub: `${textCols} text · ${dateCols} date`, accent: 'orange' },
            ].map((m) => (
              <div key={m.label} className={`summary-card summary-card--${m.accent}`}>
                <span className="summary-card-value">{m.value}</span>
                <span className="summary-card-label">{m.label}</span>
                <span className="summary-card-sub">{m.sub}</span>
              </div>
            ))}
          </div>

          <div className="summary-col-types">
            <h3 className="dash-section-title">Column Type Breakdown</h3>
            <div className="col-type-bars">
              {[
                { label: 'Numeric', count: numericCols, color: 'var(--color-accent)' },
                { label: 'Text / Categorical', count: textCols, color: '#8b5cf6' },
                { label: 'Date', count: dateCols, color: '#f59e0b' },
              ].map((item) => {
                const pct = sheet.totalColumns > 0 ? Math.round((item.count / sheet.totalColumns) * 100) : 0;
                return (
                  <div key={item.label} className="col-type-bar-item">
                    <div className="col-type-bar-header">
                      <span className="col-type-label">{item.label}</span>
                      <span className="col-type-count">{item.count} cols ({pct}%)</span>
                    </div>
                    <div className="col-type-track">
                      <div className="col-type-fill" style={{ width: `${pct}%`, background: item.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* COLUMNS TAB */}
      {tab === 'columns' && (
        <div className="dash-tab-content fade-in-up">
          <div className="col-stat-grid">
            {colStats.map((col) => (
              <div key={col.name} className="col-stat-card">
                <div className="col-stat-header">
                  <span className="col-stat-name" title={col.name}>{col.name}</span>
                  <span className={`col-stat-type col-stat-type--${col.type}`}>{col.type}</span>
                </div>
                <div className="col-stat-meta">
                  <span>{col.unique} unique</span>
                  <span>·</span>
                  <span>{col.nulls} empty</span>
                </div>
                {col.type === 'numeric' && (
                  <div className="col-numeric-stats">
                    {[
                      { label: 'Min', val: col.min?.toLocaleString() },
                      { label: 'Max', val: col.max?.toLocaleString() },
                      { label: 'Sum', val: col.sum?.toLocaleString(undefined, { maximumFractionDigits: 2 }) },
                      { label: 'Avg', val: col.avg?.toLocaleString(undefined, { maximumFractionDigits: 2 }) },
                    ].map((s) => (
                      <div key={s.label} className="col-num-stat">
                        <span className="col-num-label">{s.label}</span>
                        <span className="col-num-val">{s.val ?? '—'}</span>
                      </div>
                    ))}
                  </div>
                )}
                {col.type !== 'numeric' && col.topValues && col.topValues.length > 0 && (
                  <div className="col-top-values">
                    {col.topValues.slice(0, 3).map(({ val, count }) => {
                      const pct = sheet.totalRows > 0 ? Math.round((count / sheet.totalRows) * 100) : 0;
                      return (
                        <div key={val} className="col-top-val-item">
                          <div className="col-top-val-header">
                            <span className="col-top-val-name" title={val}>{val}</span>
                            <span className="col-top-val-pct">{count} ({pct}%)</span>
                          </div>
                          <div className="col-top-val-track">
                            <div className="col-top-val-fill" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TABLE TAB */}
      {tab === 'table' && (
        <div className="dash-tab-content fade-in-up">
          <div className="table-controls">
            <div className="table-search-wrap">
              <Search size={14} className="table-search-icon" />
              <input id="table-search" className="table-search" placeholder="Search all columns…"
                value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} />
            </div>
            <div className="table-meta">
              <span className="table-showing">{filteredRows.length.toLocaleString()} rows</span>
              <select className="table-page-size" value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}>
                {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n} / page</option>)}
              </select>
            </div>
          </div>

          <div className="table-scroll-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="data-table-th data-table-th--index">#</th>
                  {sheet.headers.map((h, ci) => (
                    <th key={ci} className="data-table-th" onClick={() => toggleSort(ci)}>
                      <div className="th-inner">
                        <span className="th-name">{h}</span>
                        <span className="th-sort-icon">
                          {sortCol === ci ? (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : <ChevronDown size={12} className="th-sort-idle" />}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagedRows.length === 0 ? (
                  <tr><td colSpan={sheet.headers.length + 1} className="table-empty-cell">No rows match your search.</td></tr>
                ) : pagedRows.map((row, ri) => (
                  <tr key={ri} className="data-table-row">
                    <td className="data-table-td data-table-td--index">{safePage * pageSize + ri + 1}</td>
                    {sheet.headers.map((_, ci) => (
                      <td key={ci} className="data-table-td">
                        {row[ci] !== null && row[ci] !== undefined ? String(row[ci]) : <span className="td-null">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="table-pagination">
            <button className="page-btn" onClick={() => setPage(0)} disabled={safePage === 0}><ChevronsLeft size={14} /></button>
            <button className="page-btn" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={safePage === 0}><ChevronLeft size={14} /></button>
            <span className="page-label">Page {safePage + 1} of {totalPages}</span>
            <button className="page-btn" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={safePage >= totalPages - 1}><ChevronRight size={14} /></button>
            <button className="page-btn" onClick={() => setPage(totalPages - 1)} disabled={safePage >= totalPages - 1}><ChevronsRight size={14} /></button>
          </div>
        </div>
      )}

      {/* CHARTS TAB */}
      {tab === 'charts' && (
        <div className="dash-tab-content fade-in-up">
          <ExcelCharts sheet={sheet} colStats={colStats} />
        </div>
      )}
    </div>
  );
}
