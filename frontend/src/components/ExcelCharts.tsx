import { useState, useMemo } from 'react';
import type { ParsedSheet } from './ExcelAnalyzer';
import type { ColStat } from './ExcelDashboard';


interface Props {
  sheet: ParsedSheet;
  colStats: ColStat[];
}

type ChartType = 'bar' | 'line' | 'area' | 'pie' | 'scatter';
type AggType = 'count' | 'sum' | 'avg';

const COLORS = ['#4f6ef7','#8b5cf6','#06b6d4','#f59e0b','#ef4444','#22c55e','#ec4899','#f97316','#14b8a6','#a855f7'];

function groupBy(rows: (string | number | boolean | null)[][], xIdx: number, yIdx: number | null, agg: AggType) {
  const map: Record<string, number[]> = {};
  rows.forEach((row) => {
    const key = row[xIdx] !== null && row[xIdx] !== undefined ? String(row[xIdx]) : '(empty)';
    if (!map[key]) map[key] = [];
    if (yIdx !== null) {
      const v = Number(row[yIdx]);
      if (!isNaN(v)) map[key].push(v);
    } else {
      map[key].push(1);
    }
  });
  return Object.entries(map).map(([label, vals]) => {
    let value = 0;
    if (agg === 'count' || yIdx === null) value = vals.length;
    else if (agg === 'sum') value = vals.reduce((a, b) => a + b, 0);
    else if (agg === 'avg') value = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    return { label, value };
  }).sort((a, b) => b.value - a.value).slice(0, 20);
}

// ── SVG Bar Chart ──
function BarChart({ data, color }: { data: { label: string; value: number }[]; color: string }) {
  const [hovered, setHovered] = useState<number | null>(null);
  if (!data.length) return <div className="chart-empty">No data to display.</div>;
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const W = 700, H = 280, padL = 50, padB = 60, padT = 16, padR = 16;
  const barW = Math.max(4, Math.floor((W - padL - padR) / data.length) - 4);
  const slotW = (W - padL - padR) / data.length;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" aria-label="Bar chart">
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const y = padT + (1 - t) * (H - padT - padB);
        return (
          <g key={t}>
            <line x1={padL} x2={W - padR} y1={y} y2={y} stroke="#e4e7ed" strokeWidth={1} />
            <text x={padL - 6} y={y + 4} textAnchor="end" fontSize={10} fill="#9098ad">
              {(t * maxVal).toLocaleString(undefined, { maximumFractionDigits: 1 })}
            </text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const x = padL + i * slotW + slotW / 2 - barW / 2;
        const barH = ((d.value / maxVal) * (H - padT - padB));
        const y = padT + (H - padT - padB) - barH;
        const isHov = hovered === i;
        return (
          <g key={i} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
            <rect x={x} y={y} width={barW} height={barH} rx={3}
              fill={isHov ? '#3b56d9' : color} opacity={hovered !== null && !isHov ? 0.4 : 1}
              style={{ transition: 'all 150ms ease' }} />
            {isHov && (
              <g>
                <rect x={x + barW / 2 - 36} y={y - 28} width={72} height={22} rx={4} fill="#1a1d26" />
                <text x={x + barW / 2} y={y - 13} textAnchor="middle" fontSize={11} fill="#fff" fontWeight={600}>
                  {d.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </text>
              </g>
            )}
            {data.length <= 12 && (
              <text x={x + barW / 2} y={H - padB + 14} textAnchor="middle" fontSize={10} fill="#5f6577"
                transform={data.length > 7 ? `rotate(-30, ${x + barW / 2}, ${H - padB + 14})` : undefined}>
                {d.label.length > 10 ? d.label.slice(0, 10) + '…' : d.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ── SVG Line / Area Chart ──
function LineChart({ data, color, area }: { data: { label: string; value: number }[]; color: string; area?: boolean }) {
  const [hovered, setHovered] = useState<number | null>(null);
  if (!data.length) return <div className="chart-empty">No data to display.</div>;
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const W = 700, H = 280, padL = 50, padB = 60, padT = 16, padR = 16;
  const pts = data.map((d, i) => {
    const x = padL + (i / Math.max(data.length - 1, 1)) * (W - padL - padR);
    const y = padT + (1 - d.value / maxVal) * (H - padT - padB);
    return { x, y, ...d };
  });
  const polyline = pts.map((p) => `${p.x},${p.y}`).join(' ');
  const areaPath = `M${pts[0].x},${H - padB} ` + pts.map((p) => `L${p.x},${p.y}`).join(' ') + ` L${pts[pts.length - 1].x},${H - padB} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg">
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const y = padT + (1 - t) * (H - padT - padB);
        return (
          <g key={t}>
            <line x1={padL} x2={W - padR} y1={y} y2={y} stroke="#e4e7ed" strokeWidth={1} />
            <text x={padL - 6} y={y + 4} textAnchor="end" fontSize={10} fill="#9098ad">
              {(t * maxVal).toLocaleString(undefined, { maximumFractionDigits: 1 })}
            </text>
          </g>
        );
      })}
      {area && <path d={areaPath} fill={color} opacity={0.12} />}
      <polyline points={polyline} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => {
        const isHov = hovered === i;
        return (
          <g key={i} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
            <circle cx={p.x} cy={p.y} r={isHov ? 6 : 4} fill={color} stroke="#fff" strokeWidth={2} style={{ transition: 'r 150ms' }} />
            {isHov && (
              <g>
                <rect x={p.x - 40} y={p.y - 34} width={80} height={22} rx={4} fill="#1a1d26" />
                <text x={p.x} y={p.y - 19} textAnchor="middle" fontSize={11} fill="#fff" fontWeight={600}>
                  {p.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </text>
              </g>
            )}
          </g>
        );
      })}
      {data.length <= 12 && pts.map((p, i) => (
        <text key={i} x={p.x} y={H - padB + 14} textAnchor="middle" fontSize={10} fill="#5f6577"
          transform={data.length > 7 ? `rotate(-30, ${p.x}, ${H - padB + 14})` : undefined}>
          {p.label.length > 10 ? p.label.slice(0, 10) + '…' : p.label}
        </text>
      ))}
    </svg>
  );
}

// ── SVG Pie Chart ──
function PieChart({ data }: { data: { label: string; value: number }[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  if (!data.length) return <div className="chart-empty">No data to display.</div>;
  const top = data.slice(0, 10);
  const total = top.reduce((a, b) => a + b.value, 0);
  if (total === 0) return <div className="chart-empty">All values are zero.</div>;
  const R = 100, cx = 160, cy = 140;
  const slices = top.map((d, i) => {
    const pct = d.value / total;
    const sweep = pct * 2 * Math.PI;
    const prevSum = top.slice(0, i).reduce((sum, item) => sum + item.value, 0);
    const startAngle = -Math.PI / 2 + (prevSum / total) * 2 * Math.PI;
    const endAngle = startAngle + sweep;
    const x1 = cx + R * Math.cos(startAngle), y1 = cy + R * Math.sin(startAngle);
    const x2 = cx + R * Math.cos(endAngle), y2 = cy + R * Math.sin(endAngle);
    const largeArc = sweep > Math.PI ? 1 : 0;
    const path = `M${cx},${cy} L${x1},${y1} A${R},${R} 0 ${largeArc},1 ${x2},${y2} Z`;
    return { path, color: COLORS[i % COLORS.length], label: d.label, value: d.value, pct };
  });

  return (
    <svg viewBox="0 0 480 280" className="chart-svg">
      {slices.map((s, i) => {
        const isHov = hovered === i;
        return (
          <path key={i} d={s.path} fill={s.color} stroke="#fff" strokeWidth={2}
            opacity={hovered !== null && !isHov ? 0.5 : 1}
            transform={isHov ? `translate(${Math.cos(0) * 6}, ${Math.sin(0) * 6})` : ''}
            style={{ transition: 'all 150ms ease', cursor: 'pointer' }}
            onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)} />
        );
      })}
      {/* Legend */}
      {slices.map((s, i) => (
        <g key={i} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)} style={{ cursor: 'pointer' }}>
          <rect x={330} y={20 + i * 24} width={12} height={12} rx={3} fill={s.color} opacity={hovered !== null && hovered !== i ? 0.4 : 1} />
          <text x={348} y={31 + i * 24} fontSize={11} fill="#5f6577">
            {s.label.length > 14 ? s.label.slice(0, 14) + '…' : s.label} ({(s.pct * 100).toFixed(1)}%)
          </text>
        </g>
      ))}
    </svg>
  );
}

// ── Scatter Chart ──
function ScatterChart({ sheet, xIdx, yIdx }: { sheet: ParsedSheet; xIdx: number; yIdx: number }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const pts = useMemo(() => {
    return sheet.rows.map((r) => ({ x: Number(r[xIdx]), y: Number(r[yIdx]) }))
      .filter((p) => !isNaN(p.x) && !isNaN(p.y));
  }, [sheet.rows, xIdx, yIdx]);
  if (!pts.length) return <div className="chart-empty">No numeric data pairs found.</div>;
  const minX = Math.min(...pts.map((p) => p.x)), maxX = Math.max(...pts.map((p) => p.x));
  const minY = Math.min(...pts.map((p) => p.y)), maxY = Math.max(...pts.map((p) => p.y));
  const W = 700, H = 280, padL = 55, padB = 40, padT = 16, padR = 16;
  const nx = (v: number) => padL + ((v - minX) / (maxX - minX || 1)) * (W - padL - padR);
  const ny = (v: number) => padT + (1 - (v - minY) / (maxY - minY || 1)) * (H - padT - padB);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg">
      {[0, 0.5, 1].map((t) => {
        const y = padT + (1 - t) * (H - padT - padB);
        const x = padL + t * (W - padL - padR);
        return (
          <g key={t}>
            <line x1={padL} x2={W - padR} y1={y} y2={y} stroke="#e4e7ed" strokeWidth={1} />
            <line x1={x} x2={x} y1={padT} y2={H - padB} stroke="#e4e7ed" strokeWidth={1} />
            <text x={padL - 6} y={y + 4} textAnchor="end" fontSize={10} fill="#9098ad">
              {(minY + t * (maxY - minY)).toLocaleString(undefined, { maximumFractionDigits: 1 })}
            </text>
          </g>
        );
      })}
      {pts.slice(0, 500).map((p, i) => {
        const isHov = hovered === i;
        return (
          <circle key={i} cx={nx(p.x)} cy={ny(p.y)} r={isHov ? 6 : 3.5}
            fill="#4f6ef7" opacity={isHov ? 1 : 0.55} stroke={isHov ? '#fff' : 'none'} strokeWidth={1.5}
            style={{ cursor: 'pointer', transition: 'r 150ms' }}
            onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
            <title>{`x: ${p.x}, y: ${p.y}`}</title>
          </circle>
        );
      })}
    </svg>
  );
}

export default function ExcelCharts({ sheet, colStats }: Props) {
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [xCol, setXCol] = useState(0);
  const [yMode, setYMode] = useState<'count' | 'column'>('count');
  const [yCol, setYCol] = useState<number>(colStats.findIndex((c) => c.type === 'numeric') ?? 0);
  const [agg, setAgg] = useState<AggType>('sum');

  const numericColIdxs = colStats.map((c, i) => ({ ...c, i })).filter((c) => c.type === 'numeric');

  const chartData = useMemo(() => {
    if (chartType === 'scatter') return [];
    const yIdx = yMode === 'count' ? null : yCol;
    return groupBy(sheet.rows, xCol, yIdx, yMode === 'count' ? 'count' : agg);
  }, [sheet.rows, xCol, yCol, yMode, agg, chartType]);

  const color = COLORS[0];

  return (
    <div className="excel-charts">
      <div className="chart-controls">
        <div className="chart-control-group">
          <label className="chart-control-label">Chart Type</label>
          <div className="chart-type-btns">
            {(['bar','line','area','pie','scatter'] as ChartType[]).map((t) => (
              <button key={t} id={`chart-type-${t}`}
                className={`chart-type-btn ${chartType === t ? 'chart-type-btn--active' : ''}`}
                onClick={() => setChartType(t)}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="chart-control-row">
          <div className="chart-control-group">
            <label className="chart-control-label" htmlFor="chart-x-col">X Axis (Group By)</label>
            <select id="chart-x-col" className="chart-select" value={xCol} onChange={(e) => setXCol(Number(e.target.value))}>
              {sheet.headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
            </select>
          </div>

          {chartType !== 'scatter' && (
            <div className="chart-control-group">
              <label className="chart-control-label">Y Axis</label>
              <div className="chart-y-row">
                <select className="chart-select chart-select--sm" value={yMode} onChange={(e) => setYMode(e.target.value as 'count' | 'column')}>
                  <option value="count">Count of rows</option>
                  <option value="column">Values of column</option>
                </select>
                {yMode === 'column' && (
                  <>
                    <select className="chart-select chart-select--sm" value={yCol}
                      onChange={(e) => setYCol(Number(e.target.value))}>
                      {numericColIdxs.map((c) => <option key={c.i} value={c.i}>{c.name}</option>)}
                    </select>
                    <select className="chart-select chart-select--sm" value={agg} onChange={(e) => setAgg(e.target.value as AggType)}>
                      <option value="sum">Sum</option>
                      <option value="avg">Average</option>
                      <option value="count">Count</option>
                    </select>
                  </>
                )}
              </div>
            </div>
          )}

          {chartType === 'scatter' && (
            <div className="chart-control-group">
              <label className="chart-control-label" htmlFor="chart-y-col">Y Axis (Numeric)</label>
              <select id="chart-y-col" className="chart-select" value={yCol} onChange={(e) => setYCol(Number(e.target.value))}>
                {numericColIdxs.map((c) => <option key={c.i} value={c.i}>{c.name}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="chart-canvas">
        {chartType === 'bar' && <BarChart data={chartData} color={color} />}
        {chartType === 'line' && <LineChart data={chartData} color={color} />}
        {chartType === 'area' && <LineChart data={chartData} color={color} area />}
        {chartType === 'pie' && <PieChart data={chartData} />}
        {chartType === 'scatter' && <ScatterChart sheet={sheet} xIdx={xCol} yIdx={yCol} />}
      </div>

      <div className="chart-legend-row">
        <span className="chart-legend-info">
          {chartType !== 'scatter'
            ? `Showing top ${Math.min(chartData.length, 20)} groups from ${sheet.totalRows.toLocaleString()} rows`
            : `Plotting up to 500 data points`}
        </span>
      </div>
    </div>
  );
}
