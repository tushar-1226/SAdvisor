import { useMemo, useState } from 'react';
import type { Trial } from '../types';
import { Calendar, AlertTriangle, HelpCircle } from 'lucide-react';
import './TrialVisualizer.css';

interface TrialVisualizerProps {
  trials: Trial[];
}

// Simple date parser helper
function parseYearAndMonth(dateStr?: string): { year: number; month: number } | null {
  if (!dateStr) return null;
  
  // Format 1: "2021-06-15" or "2021-06"
  const isoMatch = dateStr.match(/^(\d{4})-(\d{2})/);
  if (isoMatch) {
    return { year: parseInt(isoMatch[1], 10), month: parseInt(isoMatch[2], 10) };
  }

  // Format 2: "June 2021" or "Jun 2021"
  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const monthMatch = dateStr.match(/([a-zA-Z]+)\s+(\d{4})/);
  if (monthMatch) {
    const monthIndex = months.findIndex((m) => monthMatch[1].toLowerCase().startsWith(m));
    return {
      year: parseInt(monthMatch[2], 10),
      month: monthIndex !== -1 ? monthIndex + 1 : 6
    };
  }

  // Fallback: search for a 4 digit year
  const yearMatch = dateStr.match(/\d{4}/);
  if (yearMatch) {
    return { year: parseInt(yearMatch[0], 10), month: 6 };
  }

  return null;
}

export default function TrialVisualizer({ trials }: TrialVisualizerProps) {
  const [activeSubTab, setActiveSubTab] = useState<'timeline' | 'risk'>('timeline');

  // Filter out trials without enough details and compute timeline coordinates
  const timelineData = useMemo(() => {
    const minTrialsToPlot = trials.slice(0, 15); // limit to 15 trials for readability
    const items = minTrialsToPlot
      .map((t) => {
        const start = parseYearAndMonth(t.startDate);
        const comp = parseYearAndMonth(t.completionDate);
        
        if (!start) return null;

        // If no completion date, assume 2 years duration
        const end = comp || { year: start.year + 2, month: start.month };

        const startFraction = start.year + (start.month - 1) / 12;
        const endFraction = end.year + (end.month - 1) / 12;

        return {
          trial: t,
          start: startFraction,
          end: Math.max(endFraction, startFraction + 0.25), // minimum 3 months width
          label: t.briefTitle,
          nctId: t.nctId,
          phase: (t.phases || []).join(', ') || 'N/A',
          status: t.overallStatus || 'Unknown',
          sponsor: t.sponsor || 'Unknown Sponsor'
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    const minYear = Math.min(2026, ...items.map(i => Math.floor(i.start)));
    let maxYear = Math.max(2028, ...items.map(i => Math.ceil(i.end)));

    // Keep range reasonable
    if (maxYear - minYear < 2) {
      maxYear = minYear + 3;
    }
    
    return { items, minYear, maxYear };
  }, [trials]);

  // Risk Matrix Data
  // X axis: Phase 1, Phase 2, Phase 3, Phase 4
  // Y axis: RECRUITING, COMPLETED, ACTIVE, TERMINATED / OTHER
  const riskMatrixData = useMemo(() => {
    const phases = ['Phase 1', 'Phase 2', 'Phase 3', 'Phase 4'];
    const statuses = ['RECRUITING', 'COMPLETED', 'ACTIVE_NOT_RECRUITING', 'TERMINATED'];

    const items = trials.map((t) => {
      // Find phase coordinate
      const phaseStr = (t.phases || []).join(', ');
      let phaseIdx = -1;
      if (phaseStr.includes('Phase 1')) phaseIdx = 0;
      else if (phaseStr.includes('Phase 2')) phaseIdx = 1;
      else if (phaseStr.includes('Phase 3')) phaseIdx = 2;
      else if (phaseStr.includes('Phase 4')) phaseIdx = 3;

      // Find status coordinate
      const statusStr = (t.overallStatus || '').toUpperCase();
      let statusIdx = -1;
      if (statusStr.includes('RECRUITING')) statusIdx = 0;
      else if (statusStr.includes('COMPLETED')) statusIdx = 1;
      else if (statusStr.includes('ACTIVE') || statusStr.includes('RUNNING')) statusIdx = 2;
      else if (statusStr.includes('TERMINATED') || statusStr.includes('WITHDRAWN') || statusStr.includes('SUSPENDED')) statusIdx = 3;

      const enrollment = Number(t.enrollmentCount) || 0;
      
      return {
        trial: t,
        x: phaseIdx,
        y: statusIdx,
        enrollment,
        label: t.briefTitle,
        nctId: t.nctId,
        sponsor: t.sponsor || 'Unknown'
      };
    }).filter(item => item.x !== -1 && item.y !== -1);

    // Find max enrollment to scale bubble radius
    const maxEnrollment = Math.max(...items.map((i) => i.enrollment), 100);

    return { items, maxEnrollment, phases, statuses };
  }, [trials]);

  if (trials.length === 0) {
    return (
      <div className="visualizer-empty-state">
        <p>No trials available to generate visualizations.</p>
      </div>
    );
  }

  // Draw timeline Gantt Chart
  const renderTimeline = () => {
    const { items, minYear, maxYear } = timelineData;
    if (items.length === 0) {
      return (
        <div className="visualizer-no-data">
          <AlertTriangle size={24} className="warning-icon" />
          <p>Not enough trial date parameters were found to construct a Gantt timeline.</p>
        </div>
      );
    }

    const chartWidth = 700;
    const paddingLeft = 140;
    const paddingRight = 40;
    const rowHeight = 35;
    const chartHeight = items.length * rowHeight + 50;
    const timelineWidth = chartWidth - paddingLeft - paddingRight;

    // Years to show on grid (step dynamically to avoid overlapping labels)
    const range = maxYear - minYear;
    let step = 1;
    if (range > 30) {
      step = 10;
    } else if (range > 12) {
      step = 5;
    } else if (range > 6) {
      step = 2;
    }

    const years = [];
    for (let y = minYear; y <= maxYear; y += step) {
      years.push(y);
    }

    return (
      <div className="gantt-chart-wrapper">
        <div className="chart-info-bar">
          <Calendar size={15} />
          <span>Timeline mapping out projected study durations (showing top {items.length} studies).</span>
        </div>
        <div className="gantt-svg-container">
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} width="100%">
            {/* Year labels & Grid lines */}
            {years.map((year) => {
              const x = paddingLeft + ((year - minYear) / (maxYear - minYear || 1)) * timelineWidth;
              return (
                <g key={year}>
                  <line x1={x} y1="0" x2={x} y2={chartHeight - 40} className="gantt-gridline" />
                  <text x={x} y={chartHeight - 20} className="gantt-axis-text">{year}</text>
                </g>
              );
            })}

            {/* Render Rows */}
            {items.map((item, idx) => {
              const y = idx * rowHeight + 20;
              const rangeFraction = maxYear - minYear;
              const startPct = (item.start - minYear) / rangeFraction;
              const endPct = (item.end - minYear) / rangeFraction;

              const barX = paddingLeft + startPct * timelineWidth;
              const barW = Math.max((endPct - startPct) * timelineWidth, 12); // minimum width

              const isCompleted = item.status.toUpperCase().includes('COMPLETED');
              const isTerminated = ['TERMINATED', 'SUSPENDED', 'WITHDRAWN'].some(s => item.status.toUpperCase().includes(s));
              const isRecruiting = item.status.toUpperCase().includes('RECRUITING');

              const barColorClass = isCompleted 
                ? 'bar-fill--completed' 
                : isTerminated 
                ? 'bar-fill--terminated' 
                : isRecruiting 
                ? 'bar-fill--recruiting' 
                : 'bar-fill--other';

              return (
                <g key={item.nctId} className="gantt-row">
                  {/* Row background hover strip */}
                  <rect x="0" y={y - 8} width={chartWidth} height={rowHeight - 4} className="row-hover-strip" />

                  {/* NCT label */}
                  <text x="15" y={y + 10} className="gantt-label-text gantt-label-text--nct">
                    {item.nctId}
                  </text>
                  {/* Sponsor label */}
                  <text x="15" y={y + 20} className="gantt-label-text gantt-label-text--sponsor">
                    {item.sponsor.length > 18 ? item.sponsor.substring(0, 16) + '...' : item.sponsor}
                  </text>

                  {/* Timeline Bar */}
                  <rect
                    x={barX}
                    y={y + 4}
                    width={barW}
                    height="12"
                    rx="6"
                    className={`gantt-bar-fill ${barColorClass}`}
                  />

                  {/* Tooltip Overlay */}
                  <g className="gantt-tooltip">
                    <rect
                      x={Math.max(10, Math.min(chartWidth - 270, barX - 100))}
                      y={y - 75}
                      width="260"
                      height="70"
                      rx="6"
                      className="gantt-tooltip-box"
                    />
                    <text x={Math.max(20, Math.min(chartWidth - 260, barX - 90))} y={y - 58} className="gantt-tooltip-title">
                      {item.label.length > 38 ? item.label.substring(0, 36) + '...' : item.label}
                    </text>
                    <text x={Math.max(20, Math.min(chartWidth - 260, barX - 90))} y={y - 42} className="gantt-tooltip-desc">
                      Sponsor: {item.sponsor}
                    </text>
                    <text x={Math.max(20, Math.min(chartWidth - 260, barX - 90))} y={y - 26} className="gantt-tooltip-meta">
                      Phase: {item.phase} | Status: {item.status}
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>
        </div>
        <div className="gantt-legend">
          <div className="legend-item"><span className="legend-dot bar-fill--recruiting" /> Recruiting</div>
          <div className="legend-item"><span className="legend-dot bar-fill--completed" /> Completed</div>
          <div className="legend-item"><span className="legend-dot bar-fill--terminated" /> Terminated / Suspended</div>
          <div className="legend-item"><span className="legend-dot bar-fill--other" /> Other Status</div>
        </div>
      </div>
    );
  };

  // Draw Risk Matrix Scatter Chart
  const renderRiskMatrix = () => {
    const { items, maxEnrollment, phases, statuses } = riskMatrixData;
    if (items.length === 0) {
      return (
        <div className="visualizer-no-data">
          <AlertTriangle size={24} className="warning-icon" />
          <p>Not enough phase/enrollment parameters found in these trials to build a Risk Matrix.</p>
        </div>
      );
    }

    const chartSize = 450;
    const padding = 60;
    const drawSize = chartSize - padding * 2;

    return (
      <div className="risk-matrix-wrapper">
        <div className="chart-info-bar">
          <HelpCircle size={15} />
          <span>Risk Matrix: bubble sizes represent study enrollment counts mapped against phase and status.</span>
        </div>
        <div className="risk-svg-container">
          <svg viewBox={`0 0 ${chartSize} ${chartSize}`} width="100%">
            {/* Draw Matrix Background Grids */}
            {phases.map((phase, pIdx) => {
              const x = padding + (pIdx / (phases.length - 1)) * drawSize;
              return (
                <g key={phase}>
                  <line x1={x} y1={padding} x2={x} y2={chartSize - padding} className="matrix-gridline" />
                  <text x={x} y={chartSize - padding + 20} className="matrix-axis-text matrix-axis-text--x">{phase}</text>
                </g>
              );
            })}

            {statuses.map((status, sIdx) => {
              const y = padding + (sIdx / (statuses.length - 1)) * drawSize;
              const formattedStatus = status.replace('_NOT_RECRUITING', '').toLowerCase();
              return (
                <g key={status}>
                  <line x1={padding} y1={y} x2={chartSize - padding} y2={y} className="matrix-gridline" />
                  <text x={padding - 10} y={y + 3} className="matrix-axis-text matrix-axis-text--y">
                    {formattedStatus.toUpperCase()}
                  </text>
                </g>
              );
            })}

            {/* Plot Bubbles */}
            {items.map((item, idx) => {
              const x = padding + (item.x / (phases.length - 1)) * drawSize;
              const y = padding + (item.y / (statuses.length - 1)) * drawSize;

              // Bubble radius (min 6px, max 30px)
              const maxR = 25;
              const minR = 6;
              const r = minR + (item.enrollment / maxEnrollment) * (maxR - minR);

              // Colors based on status
              const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];
              const color = colors[item.y % colors.length];

              return (
                <g key={idx} className="matrix-bubble-group">
                  <circle
                    cx={x}
                    cy={y}
                    r={r}
                    fill={color}
                    fillOpacity="0.65"
                    stroke={color}
                    strokeWidth="1.5"
                    className="matrix-bubble"
                  />
                  {/* Tooltip Overlay */}
                  <g className="matrix-tooltip">
                    <rect
                      x={Math.max(10, Math.min(chartSize - 230, x - 110))}
                      y={y - 65}
                      width="220"
                      height="55"
                      rx="6"
                      className="matrix-tooltip-box"
                    />
                    <text x={Math.max(20, Math.min(chartSize - 220, x - 100))} y={y - 48} className="matrix-tooltip-title">
                      {item.nctId}
                    </text>
                    <text x={Math.max(20, Math.min(chartSize - 220, x - 100))} y={y - 34} className="matrix-tooltip-desc">
                      Sponsor: {item.sponsor.length > 28 ? item.sponsor.substring(0, 26) + '...' : item.sponsor}
                    </text>
                    <text x={Math.max(20, Math.min(chartSize - 220, x - 100))} y={y - 20} className="matrix-tooltip-meta">
                      Enrollment: {item.enrollment.toLocaleString()} patients
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    );
  };

  return (
    <div className="trial-visualizer-panel">
      {/* Sub Tabs */}
      <div className="visualizer-sub-tabs">
        <button
          className={`sub-tab-btn ${activeSubTab === 'timeline' ? 'sub-tab-btn--active' : ''}`}
          onClick={() => setActiveSubTab('timeline')}
        >
          Study Gantt Timeline
        </button>
        <button
          className={`sub-tab-btn ${activeSubTab === 'risk' ? 'sub-tab-btn--active' : ''}`}
          onClick={() => setActiveSubTab('risk')}
        >
          Study Enrollment Risk Matrix
        </button>
      </div>

      {/* Renders */}
      {activeSubTab === 'timeline' ? renderTimeline() : renderRiskMatrix()}
    </div>
  );
}
