import { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import './ForestPlot.css';

export interface ForestPlotData {
  name: string;
  hazardRatio: number;
  ciLower: number;
  ciUpper: number;
  toxicityRate: number;
  sampleSize: number;
  favorableCount: number;
}

interface Props {
  disease: string;
  data?: ForestPlotData[];
}

export default function ForestPlot({ disease, data }: Props) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Fallback high-quality data comparing top therapies
  const defaultData: ForestPlotData[] = [
    { name: "Targeted Therapy A (Pipeline)", hazardRatio: 0.58, ciLower: 0.44, ciUpper: 0.76, toxicityRate: 14.5, sampleSize: 320, favorableCount: 185 },
    { name: "First-line Competitor B", hazardRatio: 0.72, ciLower: 0.59, ciUpper: 0.88, toxicityRate: 22.1, sampleSize: 450, favorableCount: 230 },
    { name: "Standard Immunotherapy C", hazardRatio: 0.85, ciLower: 0.71, ciUpper: 1.02, toxicityRate: 29.8, sampleSize: 510, favorableCount: 215 },
    { name: "Standard Chemotherapy Control", hazardRatio: 1.00, ciLower: 0.88, ciUpper: 1.14, toxicityRate: 46.2, sampleSize: 380, favorableCount: 120 }
  ];

  const plotData = data && data.length > 0 ? data : defaultData;

  // Plot configurations
  const width = 420;
  const height = 220;
  const paddingLeft = 30;
  const paddingRight = 30;
  
  // Scale function mapping HR [0.2, 1.5] to SVG X coordinates
  const minHR = 0.2;
  const maxHR = 1.5;
  const getX = (val: number) => {
    const pct = (val - minHR) / (maxHR - minHR);
    return paddingLeft + pct * (width - paddingLeft - paddingRight);
  };

  const lineOfNoEffectX = getX(1.0);
  const rowHeight = (height - 40) / plotData.length;

  return (
    <div className="forest-plot-root">
      <div className="forest-plot-header">
        <div className="forest-plot-title-row">
          <h3 className="forest-plot-title">Efficacy & Safety Meta-Analysis (Forest Plot)</h3>
          <div className="forest-plot-tooltip-trigger">
            <HelpCircle size={14} className="forest-plot-help-icon" />
            <div className="forest-plot-tooltip">
              A forest plot displays clinical efficacy comparison. Values left of 1.0 indicate superior survival/hazard reduction relative to chemotherapy control.
            </div>
          </div>
        </div>
        <p className="forest-plot-subtitle">Relative Hazard Ratios (HR) & 95% Confidence Intervals for {disease}</p>
      </div>

      <div className="forest-plot-container">
        <div className="forest-plot-table">
          {/* Table Headers */}
          <div className="forest-plot-th-row">
            <div className="forest-plot-th col-drug">Treatment Agent</div>
            <div className="forest-plot-th col-n">N</div>
            <div className="forest-plot-th col-ratio">HR (95% CI)</div>
            <div className="forest-plot-th col-visual">Hazard Ratio Relative Scale</div>
            <div className="forest-plot-th col-tox">Grade 3+ AE</div>
          </div>

          {/* Table Rows */}
          {plotData.map((item, index) => {
            const isHovered = hoveredIndex === index;
            const itemX = getX(item.hazardRatio);
            const lowerX = getX(item.ciLower);
            const upperX = getX(item.ciUpper);

            return (
              <div 
                key={item.name} 
                className={`forest-plot-tr ${isHovered ? 'forest-plot-tr--hovered' : ''}`}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <div className="forest-plot-td col-drug font-medium">{item.name}</div>
                <div className="forest-plot-td col-n text-muted">{item.sampleSize}</div>
                <div className="forest-plot-td col-ratio font-mono">
                  {item.hazardRatio.toFixed(2)} <span className="ci-bracket">[{item.ciLower.toFixed(2)}, {item.ciUpper.toFixed(2)}]</span>
                </div>
                
                {/* Visual SVG Column */}
                <div className="forest-plot-td col-visual">
                  <div className="svg-wrapper">
                    <svg viewBox={`0 0 ${width} ${rowHeight + 10}`} className="row-svg">
                      {/* Grid Background Line */}
                      <line x1={0} y1={rowHeight / 2} x2={width} y2={rowHeight / 2} stroke="rgba(0,0,0,0.05)" strokeWidth={1} />
                      
                      {/* Vertical line of no effect (HR = 1.0) */}
                      <line 
                        x1={lineOfNoEffectX} 
                        y1={0} 
                        x2={lineOfNoEffectX} 
                        y2={rowHeight + 10} 
                        stroke="rgba(239, 68, 68, 0.45)" 
                        strokeWidth={1.5} 
                        strokeDasharray="3,3" 
                      />

                      {/* Confidence Interval Whisker */}
                      <line 
                        x1={lowerX} 
                        y1={rowHeight / 2 + 5} 
                        x2={upperX} 
                        y2={rowHeight / 2 + 5} 
                        stroke={item.hazardRatio < 1.0 ? "var(--color-accent, #4f6ef7)" : "var(--text-muted, #64748b)"} 
                        strokeWidth={2} 
                        strokeLinecap="round"
                      />

                      {/* Tick bounds */}
                      <line x1={lowerX} y1={rowHeight / 2 + 1} x2={lowerX} y2={rowHeight / 2 + 9} stroke={item.hazardRatio < 1.0 ? "var(--color-accent, #4f6ef7)" : "var(--text-muted, #64748b)"} strokeWidth={2} />
                      <line x1={upperX} y1={rowHeight / 2 + 1} x2={upperX} y2={rowHeight / 2 + 9} stroke={item.hazardRatio < 1.0 ? "var(--color-accent, #4f6ef7)" : "var(--text-muted, #64748b)"} strokeWidth={2} />

                      {/* Point Estimate (Hazard Ratio Box) */}
                      <rect 
                        x={itemX - 5} 
                        y={rowHeight / 2} 
                        width={10} 
                        height={10} 
                        rx={1}
                        fill={item.hazardRatio < 1.0 ? "var(--color-accent, #4f6ef7)" : "var(--text-muted, #64748b)"} 
                        className="estimate-box"
                      />

                      {/* Hover details bubble */}
                      {isHovered && (
                        <g>
                          <rect x={itemX - 45} y={rowHeight / 2 - 32} width={90} height={20} rx={4} fill="#0f172a" stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
                          <text x={itemX} y={rowHeight / 2 - 18} textAnchor="middle" fontSize={10} fill="#f8fafc" fontWeight={600}>
                            HR: {item.hazardRatio.toFixed(2)}
                          </text>
                        </g>
                      )}
                    </svg>
                  </div>
                </div>

                <div className="forest-plot-td col-tox">
                  <div className="tox-bar-container">
                    <span className="tox-label font-mono">{item.toxicityRate}%</span>
                    <div className="tox-track">
                      <div 
                        className={`tox-fill ${item.toxicityRate > 30 ? 'tox-fill--high' : 'tox-fill--low'}`} 
                        style={{ width: `${item.toxicityRate}%` }} 
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* X Axis Legend */}
        <div className="forest-plot-legend-line">
          <svg viewBox={`0 0 ${width} 24`} className="legend-svg">
            <line x1={paddingLeft} y1={2} x2={width - paddingRight} y2={2} stroke="rgba(0,0,0,0.12)" strokeWidth={1.5} />
            
            {/* Axis labels */}
            {[0.2, 0.4, 0.6, 0.8, 1.0, 1.2, 1.4].map(val => (
              <g key={val}>
                <line x1={getX(val)} y1={2} x2={getX(val)} y2={6} stroke="rgba(0,0,0,0.15)" strokeWidth={1} />
                <text x={getX(val)} y={18} textAnchor="middle" fontSize={9} fill="var(--text-muted, #64748b)" fontWeight={500}>
                  {val.toFixed(1)}
                </text>
              </g>
            ))}
          </svg>
          <div className="legend-labels">
            <span className="favors-treatment">← Favors Treatment (Superior Efficacy)</span>
            <span className="favors-control">Favors Control / Placebo →</span>
          </div>
        </div>
      </div>
    </div>
  );
}
