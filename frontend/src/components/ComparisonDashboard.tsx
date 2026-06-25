/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from 'react';
import { ArrowLeft, BarChart3, TrendingUp, Users, Calendar, ShieldCheck, Download, FileDown, Award } from 'lucide-react';
import './ComparisonDashboard.css';

interface ComparisonDashboardProps {
  comparisonList: any[];
  onBack: () => void;
  onRemove: (idx: number) => void;
}

export default function ComparisonDashboard({ comparisonList, onBack, onRemove }: ComparisonDashboardProps) {
  // 1. Calculate yearly totals and metrics for each forecast in the comparison list
  const processedData = useMemo(() => {
    return comparisonList.map((model) => {
      const years = model.forecast_years || [];
      
      // Calculate total market revenue per year
      const yearlyTotals = years.map((yr: number) => {
        let total = 0;
        Object.keys(model.revenue || {}).forEach((country) => {
          Object.keys(model.revenue[country][yr] || {}).forEach((prod) => {
            total += model.revenue[country][yr][prod] || 0;
          });
        });
        return { year: yr, revenue: total };
      });

      const revenues = yearlyTotals.map((y: any) => y.revenue);
      const peakRevenue = Math.max(...revenues);
      
      // Calculate CAGR: ((EndVal / StartVal) ^ (1 / n)) - 1
      const startVal = revenues[0] || 1;
      const endVal = revenues[revenues.length - 1] || 1;
      const n = years.length - 1;
      const cagr = (Math.pow(endVal / startVal, 1 / n) - 1) * 100;

      // Calculate total max patient pool (max of sum across countries)
      const maxPatients = Math.max(
        ...years.map((yr: number) => {
          let total = 0;
          Object.keys(model.epidemiology?.funnel || {}).forEach((country) => {
            total += model.epidemiology.funnel[country][yr]?.disease_pool || 0;
          });
          return total;
        })
      );

      return {
        disease: model.disease,
        geography: model.geography?.join(', ') || 'Global',
        modelType: model.model_type || 's_curve',
        confidenceScore: model.confidence_score || 100,
        yearlyTotals,
        peakRevenue,
        cagr,
        maxPatients,
        rawModel: model
      };
    });
  }, [comparisonList]);

  // 2. Line Chart Bounds & Paths
  const lineChartData = useMemo(() => {
    if (processedData.length === 0) return null;
    
    // Find absolute min/max across all datasets to scale the chart
    let maxRev = 0;
    processedData.forEach((d) => {
      d.yearlyTotals.forEach((yt: any) => {
        if (yt.revenue > maxRev) maxRev = yt.revenue;
      });
    });

    const chartWidth = 600;
    const chartHeight = 250;
    const padding = 45;

    // Standard colors for multi-line overlay
    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444'];

    const datasets = processedData.map((d, dIdx) => {
      const points = d.yearlyTotals.map((yt: any, yIdx: number) => {
        const x = padding + (yIdx / (d.yearlyTotals.length - 1)) * (chartWidth - padding * 2);
        const y = chartHeight - padding - (yt.revenue / (maxRev || 1)) * (chartHeight - padding * 2);
        return { x, y, revenue: yt.revenue, year: yt.year };
      });

      // Construct SVG path
      let path = '';
      if (points.length > 0) {
        path = `M ${points[0].x} ${points[0].y} ` + points.slice(1).map((p: any) => `L ${p.x} ${p.y}`).join(' ');
      }

      return {
        disease: d.disease,
        points,
        path,
        color: colors[dIdx % colors.length]
      };
    });

    // Y Axis Labels
    const yLabels = [0, 0.25, 0.5, 0.75, 1.0].map((ratio) => {
      const val = maxRev * ratio;
      const y = chartHeight - padding - ratio * (chartHeight - padding * 2);
      return { label: `$${(val / 1e6).toFixed(1)}M`, y };
    });

    // X Axis Labels (Years)
    const years = processedData[0]?.yearlyTotals.map((yt: any) => yt.year) || [];
    const xLabels = years.map((yr: number, idx: number) => {
      const x = padding + (idx / (years.length - 1)) * (chartWidth - padding * 2);
      return { label: yr, x };
    });

    return { datasets, yLabels, xLabels, width: chartWidth, height: chartHeight, maxRev };
  }, [processedData]);

  // 3. Comparison text generator
  const generatedInsights = useMemo(() => {
    if (processedData.length < 2) return '';
    
    // Sort by peak size
    const sortedBySize = [...processedData].sort((a, b) => b.peakRevenue - a.peakRevenue);
    // Sort by growth rate
    const sortedByCagr = [...processedData].sort((a, b) => b.cagr - a.cagr);

    const leaderSize = sortedBySize[0];
    const leaderGrowth = sortedByCagr[0];

    return (
      <div className="comparison-narrative">
        <h4 className="narrative-title">Comparative Executive Synthesis</h4>
        <p>
          A side-by-side analysis of the projected disease spaces shows that <strong>{leaderSize.disease}</strong> presents the largest commercial potential, reaching a peak net market size of <strong>${(leaderSize.peakRevenue / 1e6).toFixed(1)}M</strong>. 
          {leaderGrowth.disease === leaderSize.disease ? (
            ` It also leads in growth rate with a projected CAGR of ${leaderGrowth.cagr.toFixed(1)}%, indicating a dominant market trajectory.`
          ) : (
            ` However, the fastest expanding market is ${leaderGrowth.disease} with a projected CAGR of ${leaderGrowth.cagr.toFixed(1)}% (compared to ${leaderSize.disease}'s ${leaderSize.cagr.toFixed(1)}%), driven by pipeline compound adoption.`
          )}
        </p>
        <p>
          The maximum addressable patient pool sizes range from <strong>{processedData.map(d => `${d.disease} (${d.maxPatients.toLocaleString()})`).join(', ')}</strong>. 
          The analysts recommend prioritizing assets targeting the <strong>{leaderGrowth.disease}</strong> pipeline due to strong compound adoption dynamics.
        </p>
      </div>
    );
  }, [processedData]);

  // 4. Investment Attractiveness Index (composite score 0–100)
  const attractivenessData = useMemo(() => {
    if (processedData.length === 0) return [];

    const maxPeak = Math.max(...processedData.map((d) => d.peakRevenue)) || 1;
    const maxPatients = Math.max(...processedData.map((d) => d.maxPatients)) || 1;
    const maxCagr = Math.max(...processedData.map((d) => d.cagr)) || 1;

    return processedData
      .map((d) => {
        const revenueScore  = (d.peakRevenue / maxPeak)   * 40; // 40% weight
        const growthScore   = (d.cagr / maxCagr)          * 30; // 30% weight
        const patientScore  = (d.maxPatients / maxPatients) * 20; // 20% weight
        const confScore     = (d.confidenceScore / 100)    * 10; // 10% weight
        const total = revenueScore + growthScore + patientScore + confScore;
        return {
          disease: d.disease,
          score: Math.round(total),
          breakdown: {
            revenue: Math.round(revenueScore),
            growth:  Math.round(growthScore),
            patients: Math.round(patientScore),
            confidence: Math.round(confScore),
          },
          color: lineChartData?.datasets[processedData.indexOf(d)]?.color || '#6366f1',
        };
      })
      .sort((a, b) => b.score - a.score);
  }, [processedData, lineChartData]);

  // 5. CSV Export
  const handleDownloadCSV = () => {
    if (processedData.length === 0) return;

    // Build header row
    const yearHeaders = processedData[0]?.yearlyTotals.map((yt: any) => `Revenue_${yt.year}`).join(',') || '';
    const header = `Disease,Geography,Model Type,Peak Revenue ($M),CAGR (%),Max Patient Pool,Confidence Score,Investment Score,${yearHeaders}`;

    const rows = processedData.map((d) => {
      const yearValues = d.yearlyTotals.map((yt: any) => (yt.revenue / 1e6).toFixed(2)).join(',');
      const investScore = attractivenessData.find((a) => a.disease === d.disease)?.score ?? 'N/A';
      return [
        `"${d.disease}"`,
        `"${d.geography}"`,
        d.modelType.toUpperCase(),
        (d.peakRevenue / 1e6).toFixed(2),
        d.cagr.toFixed(2),
        d.maxPatients,
        d.confidenceScore,
        investScore,
        yearValues,
      ].join(',');
    });

    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SAdvisory_Market_Comparison.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 6. Download Comparison report as SVG
  const handleDownloadSVG = () => {
    if (!lineChartData) return;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 900" width="800" height="900" style="background:#ffffff; font-family:system-ui, -apple-system, sans-serif;">`;
    svg += `\n  <style>`;
    svg += `\n    .title { font-size: 24px; fill: #0f172a; font-weight: 800; }`;
    svg += `\n    .subtitle { font-size: 13px; fill: #64748b; font-weight: 500; }`;
    svg += `\n    .section-title { font-size: 16px; fill: #0f172a; font-weight: 700; }`;
    svg += `\n    .text { font-size: 12px; fill: #334155; }`;
    svg += `\n    .axis-label { font-size: 10px; fill: #64748b; }`;
    svg += `\n    .header-cell { font-size: 11px; fill: #64748b; font-weight: 700; text-transform: uppercase; }`;
    svg += `\n    .cell-text { font-size: 12px; fill: #0f172a; font-weight: 500; }`;
    svg += `\n  </style>`;

    // Background
    svg += `\n  <rect x="0" y="0" width="800" height="900" fill="#f8fafc" />`;
    svg += `\n  <rect x="15" y="15" width="770" height="870" rx="16" fill="#ffffff" stroke="#e2e8f0" stroke-width="1.5" />`;

    // Title
    svg += `\n  <text x="40" y="60" class="title">Comparative Market Forecast Report</text>`;
    svg += `\n  <text x="40" y="85" class="subtitle">Generated: ${new Date().toLocaleDateString()} | Multi-Model Overlay Projections</text>`;

    // Table Header
    svg += `\n  <text x="40" y="130" class="section-title">Market Forecast Metrics</text>`;
    svg += `\n  <rect x="40" y="150" width="720" height="35" fill="#f1f5f9" rx="4" />`;
    svg += `\n  <text x="60" y="172" class="header-cell">Disease / Area</text>`;
    svg += `\n  <text x="300" y="172" class="header-cell">Geography</text>`;
    svg += `\n  <text x="500" y="172" class="header-cell">Peak Size</text>`;
    svg += `\n  <text x="600" y="172" class="header-cell">CAGR</text>`;
    svg += `\n  <text x="680" y="172" class="header-cell">Model Type</text>`;

    // Table Rows
    processedData.forEach((d, idx) => {
      const y = 210 + idx * 40;
      svg += `\n  <line x1="40" y1="${y - 25}" x2="760" y2="${y - 25}" stroke="#e2e8f0" stroke-width="1" />`;
      svg += `\n  <text x="60" y="${y}" class="cell-text" font-weight="700">${d.disease}</text>`;
      svg += `\n  <text x="300" y="${y}" class="cell-text">${d.geography.length > 25 ? d.geography.substring(0, 22) + '...' : d.geography}</text>`;
      svg += `\n  <text x="500" y="${y}" class="cell-text" fill="#4f6ef7">$${(d.peakRevenue / 1e6).toFixed(1)}M</text>`;
      svg += `\n  <text x="600" y="${y}" class="cell-text" fill="#10b981">${d.cagr.toFixed(1)}%</text>`;
      svg += `\n  <text x="680" y="${y}" class="cell-text">${d.modelType.toUpperCase()}</text>`;
    });

    // Chart Title
    const chartStartY = 240 + processedData.length * 40;
    svg += `\n  <text x="40" y="${chartStartY}" class="section-title">10-Year Revenue Comparison ($ Millions)</text>`;

    // Line Chart Container
    svg += `\n  <rect x="40" y="${chartStartY + 20}" width="720" height="300" rx="12" fill="#ffffff" stroke="#e2e8f0" stroke-width="1" />`;

    // Draw Chart Axes & Gridlines
    const chartW = 640;
    const chartH = 240;
    const chartX = 80;
    const chartY = chartStartY + 40;

    lineChartData.yLabels.forEach((label) => {
      // scale y to current box
      const ratio = label.y / lineChartData.height;
      const yVal = chartY + ratio * chartH;
      svg += `\n  <line x1="${chartX}" y1="${yVal}" x2="${chartX + chartW}" y2="${yVal}" stroke="#f1f5f9" stroke-width="1" />`;
      svg += `\n  <text x="${chartX - 10}" y="${yVal + 3}" text-anchor="end" class="axis-label">${label.label}</text>`;
    });

    const years = processedData[0]?.yearlyTotals.map((yt: any) => yt.year) || [];
    years.forEach((yr: number, idx: number) => {
      const xVal = chartX + (idx / (years.length - 1)) * chartW;
      svg += `\n  <line x1="${xVal}" y1="${chartY}" x2="${xVal}" y2="${chartY + chartH}" stroke="#f8fafc" stroke-width="1" />`;
      svg += `\n  <text x="${xVal}" y="${chartY + chartH + 16}" text-anchor="middle" class="axis-label">${yr}</text>`;
    });

    // Draw Paths
    lineChartData.datasets.forEach((dataset) => {
      let pathD = '';
      dataset.points.forEach((p: any, idx: number) => {
        const xRatio = (p.x - 45) / (lineChartData.width - 90);
        const yRatio = (p.y - 45) / (lineChartData.height - 90);
        const xVal = chartX + xRatio * chartW;
        const yVal = chartY + yRatio * chartH;
        
        if (idx === 0) {
          pathD += `M ${xVal.toFixed(1)} ${yVal.toFixed(1)}`;
        } else {
          pathD += ` L ${xVal.toFixed(1)} ${yVal.toFixed(1)}`;
        }
      });
      svg += `\n  <path d="${pathD}" fill="none" stroke="${dataset.color}" stroke-width="3" stroke-linecap="round" />`;

      // Draw Dots
      dataset.points.forEach((p: any) => {
        const xRatio = (p.x - 45) / (lineChartData.width - 90);
        const yRatio = (p.y - 45) / (lineChartData.height - 90);
        const xVal = chartX + xRatio * chartW;
        const yVal = chartY + yRatio * chartH;
        svg += `\n  <circle cx="${xVal.toFixed(1)}" cy="${yVal.toFixed(1)}" r="4.5" fill="#ffffff" stroke="${dataset.color}" stroke-width="2.5" />`;
      });
    });

    // Draw Legend
    lineChartData.datasets.forEach((dataset, idx) => {
      const legX = chartX + idx * 160;
      const legY = chartY + chartH + 35;
      svg += `\n  <rect x="${legX}" y="${legY - 8}" width="12" height="12" rx="3" fill="${dataset.color}" />`;
      svg += `\n  <text x="${legX + 18}" y="${legY + 2}" class="axis-label" font-weight="600">${dataset.disease}</text>`;
    });

    // Synthesis
    const synthStartY = chartStartY + 380;
    svg += `\n  <text x="40" y="${synthStartY}" class="section-title">Comparative Analysis Insights</text>`;
    svg += `\n  <rect x="40" y="${synthStartY + 15}" width="720" height="110" rx="8" fill="rgba(99, 102, 241, 0.03)" stroke="rgba(99, 102, 241, 0.1)" stroke-width="1" />`;
    
    // Split synth text
    const text1 = `Comparison of the disease spaces shows that ${processedData[0]?.disease || 'Market'} reaches a peak size`;
    const text2 = `of $${((processedData[0]?.peakRevenue || 0) / 1e6).toFixed(1)}M. Growth rates range from ${processedData.map(d => `${d.disease} (${d.cagr.toFixed(1)}%)`).join(', ')}.`;
    const text3 = `Pipeline compounds have been factored based on historical trial probability metrics.`;

    svg += `\n  <text x="60" y="${synthStartY + 45}" class="text">${text1}</text>`;
    svg += `\n  <text x="60" y="${synthStartY + 65}" class="text">${text2}</text>`;
    svg += `\n  <text x="60" y="${synthStartY + 85}" class="text">${text3}</text>`;

    svg += `\n</svg>`;

    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SAdvisory_Market_Comparison.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="comparison-dashboard fade-in-up">
      {/* Header */}
      <div className="comparison-header">
        <button className="back-btn" onClick={onBack}>
          <ArrowLeft size={16} /> Back to Forecasting
        </button>
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <button className="export-comparison-btn export-comparison-btn--csv" onClick={handleDownloadCSV}>
            <FileDown size={14} /> Export CSV
          </button>
          <button className="export-comparison-btn" onClick={handleDownloadSVG}>
            <Download size={14} /> Export SVG
          </button>
        </div>
      </div>

      <div className="comparison-title-block">
        <h2>Disease Forecast Comparison</h2>
        <p>Analyzing {comparisonList.length} pinned therapeutic markets side-by-side.</p>
      </div>

      {/* Metrics Cards Grid */}
      <div className="comparison-grid">
        {processedData.map((data, idx) => (
          <div key={idx} className="comparison-card" style={{ borderTop: `4px solid ${lineChartData?.datasets[idx]?.color}` }}>
            <div className="card-header-row">
              <h3>{data.disease}</h3>
              <button className="remove-btn" onClick={() => onRemove(idx)}>Remove</button>
            </div>
            <div className="card-geo">{data.geography}</div>

            <div className="card-stats-grid">
              <div className="card-stat">
                <TrendingUp size={16} className="stat-icon stat-icon--revenue" />
                <div>
                  <span className="stat-label">Peak Revenue</span>
                  <span className="stat-value">${(data.peakRevenue / 1e6).toFixed(1)}M</span>
                </div>
              </div>
              <div className="card-stat">
                <BarChart3 size={16} className="stat-icon stat-icon--cagr" />
                <div>
                  <span className="stat-label">CAGR (10-Yr)</span>
                  <span className="stat-value">{data.cagr.toFixed(1)}%</span>
                </div>
              </div>
              <div className="card-stat">
                <Users size={16} className="stat-icon stat-icon--patients" />
                <div>
                  <span className="stat-label">Max Patient Pool</span>
                  <span className="stat-value">{data.maxPatients.toLocaleString()}</span>
                </div>
              </div>
              <div className="card-stat">
                <Calendar size={16} className="stat-icon stat-icon--model" />
                <div>
                  <span className="stat-label">Model Type</span>
                  <span className="stat-value">{data.modelType.toUpperCase()}</span>
                </div>
              </div>
            </div>
            <div className="card-footer-confidence">
              <ShieldCheck size={14} /> {data.confidenceScore}% Data Confidence
            </div>
          </div>
        ))}
      </div>

      {/* Overlay Charts Section */}
      {lineChartData && (
        <div className="comparison-charts-panel">
          <div className="chart-wrapper">
            <h3>10-Year Revenue Overlay Projection ($ Millions)</h3>
            <div className="chart-svg-container">
              <svg viewBox={`0 0 ${lineChartData.width} ${lineChartData.height}`} width="100%" height="100%">
                {/* Gridlines */}
                {lineChartData.yLabels.map((l: any, idx: number) => (
                  <g key={idx}>
                    <line x1="45" y1={l.y} x2={lineChartData.width - 45} y2={l.y} className="gridline" />
                    <text x="35" y={l.y + 3} className="axis-text axis-text--y">{l.label}</text>
                  </g>
                ))}

                {/* X labels */}
                {lineChartData.xLabels.map((l: any, idx: number) => (
                  <g key={idx}>
                    <line x1={l.x} y1={45} x2={l.x} y2={lineChartData.height - 45} className="gridline gridline--vertical" />
                    <text x={l.x} y={lineChartData.height - 25} className="axis-text axis-text--x">{l.label}</text>
                  </g>
                ))}

                {/* Paths */}
                {lineChartData.datasets.map((dataset: any, idx: number) => (
                  <path
                    key={idx}
                    d={dataset.path}
                    fill="none"
                    stroke={dataset.color}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    className="chart-path"
                  />
                ))}

                {/* Points & Interactive Tooltips */}
                {lineChartData.datasets.map((dataset: any, dIdx: number) => (
                  <g key={dIdx}>
                    {dataset.points.map((p: any, pIdx: number) => (
                      <g key={pIdx} className="chart-point-group">
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r="5.5"
                          fill="#ffffff"
                          stroke={dataset.color}
                          strokeWidth="2.5"
                          className="chart-point"
                        />
                        <g className="chart-tooltip">
                          <rect
                            x={p.x - 65}
                            y={p.y - 48}
                            width="130"
                            height="38"
                            rx="4"
                            className="tooltip-box"
                          />
                          <text x={p.x} y={p.y - 36} className="tooltip-text tooltip-text--title">
                            {dataset.disease} ({p.year})
                          </text>
                          <text x={p.x} y={p.y - 22} className="tooltip-text tooltip-text--val">
                            ${(p.revenue / 1e6).toFixed(1)}M
                          </text>
                        </g>
                      </g>
                    ))}
                  </g>
                ))}
              </svg>
            </div>
            {/* Legend */}
            <div className="chart-legend">
              {lineChartData.datasets.map((d: any, idx: number) => (
                <div key={idx} className="legend-item">
                  <span className="legend-dot" style={{ background: d.color }} />
                  <span className="legend-label">{d.disease}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Peak Revenue Bar Chart */}
      {processedData.length > 0 && (
        <div className="bar-chart-panel">
          <h3 className="panel-section-title">
            <BarChart3 size={15} /> Peak Revenue Ranking
          </h3>
          <div className="bar-chart-list">
            {[...processedData]
              .sort((a, b) => b.peakRevenue - a.peakRevenue)
              .map((d, idx) => {
                const maxPeak = Math.max(...processedData.map((x) => x.peakRevenue)) || 1;
                const pct = (d.peakRevenue / maxPeak) * 100;
                const color = lineChartData?.datasets[processedData.indexOf(d)]?.color || '#6366f1';
                return (
                  <div key={idx} className="bar-row">
                    <div className="bar-row-label">
                      <span className="bar-disease">{d.disease}</span>
                      <span className="bar-value">${(d.peakRevenue / 1e6).toFixed(1)}M</span>
                    </div>
                    <div className="bar-track">
                      <div
                        className="bar-fill"
                        style={{ width: `${pct}%`, background: color }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Investment Attractiveness Index */}
      {attractivenessData.length > 0 && (
        <div className="invest-panel">
          <h3 className="panel-section-title">
            <Award size={15} /> Investment Attractiveness Index
          </h3>
          <p className="invest-subtitle">Composite score based on Peak Revenue (40%), CAGR (30%), Patient Pool (20%), Data Confidence (10%)</p>
          <div className="invest-list">
            {attractivenessData.map((item, idx) => (
              <div key={idx} className={`invest-row ${idx === 0 ? 'invest-row--leader' : ''}`}>
                <div className="invest-rank">#{idx + 1}</div>
                <div className="invest-info">
                  <div className="invest-name-row">
                    <span className="invest-disease">{item.disease}</span>
                    <span className="invest-score" style={{ color: item.color }}>{item.score}<span className="invest-score-max">/100</span></span>
                  </div>
                  <div className="invest-gauge-track">
                    <div
                      className="invest-gauge-fill"
                      style={{ width: `${item.score}%`, background: item.color }}
                    />
                  </div>
                  <div className="invest-breakdown">
                    <span>Revenue <strong>{item.breakdown.revenue}</strong></span>
                    <span>Growth <strong>{item.breakdown.growth}</strong></span>
                    <span>Patients <strong>{item.breakdown.patients}</strong></span>
                    <span>Confidence <strong>{item.breakdown.confidence}</strong></span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Synthesis Narrative */}
      {generatedInsights}
    </div>
  );
}
