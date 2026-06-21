import { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  Users,
  Award,
  BookOpen,
  Layers,
  GitBranch,
  RefreshCw,
  Info,
  Check,
  Stethoscope,
  Pill,
  Download,
  AlertTriangle,
  ChevronDown
} from 'lucide-react';
import { generateForecast } from '../api';
import type { ForecastModel } from '../types';
import './PharmaceuticalForecast.css';

const PRESET_DISEASES = [
  { name: 'NSCLC', label: 'NSCLC (Oncology)', category: 'oncology' as const },
  { name: 'Breast Cancer', label: 'Breast Cancer (Oncology)', category: 'oncology' as const },
  { name: 'Type 2 Diabetes', label: 'Type 2 Diabetes (Non-Oncology)', category: 'non_oncology' as const },
  { name: 'Asthma', label: 'Asthma (Non-Oncology)', category: 'non_oncology' as const },
  { name: 'COPD', label: 'COPD (Non-Oncology)', category: 'non_oncology' as const }
];

const AVAILABLE_COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'CN', name: 'China' },
  { code: 'DE', name: 'Germany' },
  { code: 'JP', name: 'Japan' },
  { code: 'IT', name: 'Italy' },
  { code: 'FR', name: 'France' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'ES', name: 'Spain' },
  { code: 'BR', name: 'Brazil' },
  { code: 'IN', name: 'India' },
  { code: 'KR', name: 'South Korea' }
];

const CHART_COLORS = [
  '#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#f43f5e',
  '#8b5cf6', '#ec4899', '#f97316', '#14b8a6', '#94a3b8'
];

type ForecastTab = 'overview' | 'epidemiology' | 'segmentation' | 'treatment' | 'market_share' | 'citations';
type ChartType = 'line' | 'stacked_bar' | 'grouped_bar' | 'donut';

export default function PharmaceuticalForecast() {
  // Input Form States
  const [diseaseInput, setDiseaseInput] = useState('');
  const [categoryInput, setCategoryInput] = useState<'oncology' | 'non_oncology' | 'auto'>('auto');
  const [selectedCountries, setSelectedCountries] = useState<string[]>(['US', 'CN', 'DE', 'JP', 'IT']);
  
  // Forecast results states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forecastModel, setForecastModel] = useState<ForecastModel | null>(null);
  const [activeTab, setActiveTab] = useState<ForecastTab>('overview');

  // Interactive Chart Sub-tab
  const [chartType, setChartType] = useState<ChartType>('line');

  // Sliders/User Adjustments (stored by country and product for real-time recalcs)
  const [activeCountry, setActiveCountry] = useState<string>('US');
  const [priceOverrides, setPriceOverrides] = useState<Record<string, number>>({});
  const [discountOverrides, setDiscountOverrides] = useState<Record<string, number>>({});
  const [complianceOverride, setComplianceOverride] = useState<number>(80);
  const [selectedShareProduct, setSelectedShareProduct] = useState<string | null>(null);
  
  // Hover interactions for custom graphs
  const [hoveredChartYear, setHoveredChartYear] = useState<number | null>(null);
  const [hoveredDonutProduct, setHoveredDonutProduct] = useState<string | null>(null);

  // Update slider baselines when a new forecast loads
  useEffect(() => {
    if (forecastModel) {
      const firstCountry = forecastModel.geography[0]
        ? AVAILABLE_COUNTRIES.find(c => c.name === forecastModel.geography[0])?.code || 'US'
        : 'US';
      setActiveCountry(firstCountry);
      
      setPriceOverrides({ ...forecastModel.assumptions.pricing });
      
      const initialDiscounts: Record<string, number> = {};
      Object.keys(forecastModel.assumptions.pricing).forEach(p => {
        const discountVal = forecastModel.assumptions.discount_rate[firstCountry] || 0.25;
        initialDiscounts[p] = Math.round(discountVal * 100);
      });
      setDiscountOverrides(initialDiscounts);
      setComplianceOverride(Math.round(forecastModel.assumptions.compliance_rate * 100));
      
      const products = Object.keys(forecastModel.assumptions.pricing);
      if (products.length > 0) {
        setSelectedShareProduct(products[0]);
      }
    }
  }, [forecastModel]);

  // Generate forecast request
  const handleGenerateForecast = async (diseaseStr: string, catOverride?: 'oncology' | 'non_oncology' | 'auto') => {
    const diseaseName = diseaseStr.trim();
    if (!diseaseName) return;

    setIsLoading(true);
    setError(null);
    setForecastModel(null);

    const cat = catOverride || categoryInput;
    const body = {
      disease: diseaseName,
      category: cat,
      geography: selectedCountries
    };

    try {
      const data = await generateForecast(body);
      setForecastModel(data);
      setActiveTab('overview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while generating the forecast.');
    } finally {
      setIsLoading(false);
    }
  };

  // Select preset condition
  const handlePresetSelect = (preset: typeof PRESET_DISEASES[0]) => {
    setDiseaseInput(preset.name);
    setCategoryInput(preset.category);
    handleGenerateForecast(preset.name, preset.category);
  };

  const handleCountryCheckbox = (code: string) => {
    if (selectedCountries.includes(code)) {
      if (selectedCountries.length > 1) {
        setSelectedCountries(selectedCountries.filter(c => c !== code));
      }
    } else {
      setSelectedCountries([...selectedCountries, code]);
    }
  };

  // ---------------------------------------------------------------------------
  // INTERACTIVE RE-CALCULATION ENGINE (Client-side derived state)
  // recalculates epidemiology and revenue outputs live as user tweaks sliders
  // ---------------------------------------------------------------------------
  const derivedData = useMemo(() => {
    if (!forecastModel) return null;

    const complianceRate = complianceOverride / 100.0;
    const years = forecastModel.forecast_years;
    
    const updatedEpidemiology = JSON.parse(JSON.stringify(forecastModel.epidemiology));
    const updatedRevenue: Record<string, Record<number, Record<string, number>>> = {};

    // 1. Recalculate epidemiology adherent pool across all countries/years
    AVAILABLE_COUNTRIES.forEach(c => {
      const cCode = c.code;
      if (!updatedEpidemiology.funnel[cCode]) return;

      years.forEach(yr => {
        const dataPoint = updatedEpidemiology.funnel[cCode][yr];
        dataPoint.adherent = Math.round(dataPoint.treated * complianceRate);
      });
    });

    // 2. Recalculate Product Revenues
    AVAILABLE_COUNTRIES.forEach(c => {
      const cCode = c.code;
      if (!forecastModel.market_share[cCode]) return;
      updatedRevenue[cCode] = {};

      years.forEach(yr => {
        updatedRevenue[cCode][yr] = {};
        const treated = updatedEpidemiology.funnel[cCode][yr].treated;

        Object.keys(priceOverrides).forEach(prod => {
          const share = forecastModel.market_share[cCode][yr][prod] || 0.0;
          const price = priceOverrides[prod] || 0;
          const discPercent = discountOverrides[prod] !== undefined ? discountOverrides[prod] : 25;
          const netPrice = price * (1.0 - (discPercent / 100.0));

          const revVal = Math.round(treated * share * complianceRate * netPrice);
          updatedRevenue[cCode][yr][prod] = revVal;
        });
      });
    });

    return {
      epidemiology: updatedEpidemiology,
      revenue: updatedRevenue
    };
  }, [forecastModel, priceOverrides, discountOverrides, complianceOverride]);

  // Export updated forecast calculations to CSV
  const handleExportCSV = () => {
    if (!forecastModel || !derivedData) return;

    const cCode = activeCountry;
    const cName = AVAILABLE_COUNTRIES.find(c => c.code === cCode)?.name || cCode;
    const years = forecastModel.forecast_years;
    const products = Object.keys(priceOverrides);

    const headers = [
      'Year',
      'Geography',
      'Total Population',
      'Total Patient Pool',
      'Diagnosed',
      'Treated',
      'Compliant / Adherent',
      ...products.map(p => `${p} Market Share (%)`),
      ...products.map(p => `${p} Net Revenue (USD)`)
    ];

    const rows = [headers.join(',')];

    years.forEach(yr => {
      const epi = derivedData.epidemiology.funnel[cCode][yr];
      const row = [
        yr,
        cName,
        epi.population,
        epi.disease_pool,
        epi.diagnosed,
        epi.treated,
        epi.adherent,
        ...products.map(p => (forecastModel.market_share[cCode]?.[yr]?.[p] * 100 || 0).toFixed(1)),
        ...products.map(p => derivedData.revenue[cCode]?.[yr]?.[p] || 0)
      ];
      rows.push(row.join(','));
    });

    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SAdvisory_${forecastModel.disease}_Forecast_${cCode}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ---------------------------------------------------------------------------
  // RENDER GRAPHICS HELPERS (Custom SVG implementations for Glassmorphic themes)
  // ---------------------------------------------------------------------------

  // 1. Line Chart for Market Shares over time (2026-2035)
  const renderMarketShareChart = () => {
    if (!forecastModel) return null;
    const cCode = activeCountry;
    const years = forecastModel.forecast_years;
    const products = Object.keys(priceOverrides);

    const W = 740;
    const H = 340;
    const padL = 50;
    const padB = 45;
    const padT = 20;
    const padR = 170; // extra space on right for legend

    const minYr = years[0];
    const maxYr = years[years.length - 1];

    const getX = (yr: number) => padL + ((yr - minYr) / (maxYr - minYr)) * (W - padL - padR);
    const getY = (val: number) => padT + (1.0 - val) * (H - padT - padB);

    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="dashboard-svg-chart">
        {/* Y Axis Grid lines */}
        {[0, 0.2, 0.4, 0.6, 0.8, 1.0].map(val => {
          const y = getY(val);
          return (
            <g key={val}>
              <line x1={padL} x2={W - padR} y1={y} y2={y} stroke="rgba(255, 255, 255, 0.08)" strokeWidth={1} />
              <text x={padL - 8} y={y + 4} textAnchor="end" className="chart-label-text" fill="#94a3b8">
                {Math.round(val * 100)}%
              </text>
            </g>
          );
        })}

        {/* X Axis Years */}
        {years.map(yr => {
          const x = getX(yr);
          return (
            <g key={yr}>
              <line x1={x} x2={x} y1={padT} y2={H - padB} stroke="rgba(255, 255, 255, 0.04)" />
              <text x={x} y={H - padB + 18} textAnchor="middle" className="chart-label-text" fill="#94a3b8">
                {yr}
              </text>
            </g>
          );
        })}

        {/* Draw Product Paths */}
        {products.map((prod, idx) => {
          const color = CHART_COLORS[idx % CHART_COLORS.length];
          const points = years.map(yr => {
            const share = forecastModel.market_share[cCode]?.[yr]?.[prod] || 0.0;
            return { x: getX(yr), y: getY(share), share, yr };
          });

          const polyline = points.map(p => `${p.x},${p.y}`).join(' ');
          const isSelected = selectedShareProduct === prod;

          return (
            <g
              key={prod}
              className={`chart-line-group ${isSelected ? 'selected' : ''}`}
              onClick={() => setSelectedShareProduct(prod)}
              style={{ cursor: 'pointer' }}
            >
              {/* Highlight background path */}
              <polyline points={polyline} fill="none" stroke={color} strokeWidth={isSelected ? 6 : 3} opacity={isSelected ? 0.35 : 0} />
              {/* Main Line path */}
              <polyline points={polyline} fill="none" stroke={color} strokeWidth={isSelected ? 3.5 : 2} style={{ transition: 'all 150ms' }} />

              {/* Data points */}
              {points.map((p, i) => (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r={isSelected ? 5.5 : 3.5}
                  fill={color}
                  stroke="#111827"
                  strokeWidth={1.5}
                  onMouseEnter={() => setHoveredChartYear(p.yr)}
                  onMouseLeave={() => setHoveredChartYear(null)}
                  style={{ cursor: 'pointer', transition: 'r 150ms' }}
                >
                  <title>{`${prod} in ${p.yr}: ${(p.share * 100).toFixed(1)}%`}</title>
                </circle>
              ))}
            </g>
          );
        })}

        {/* Floating Vertical Hover Line */}
        {hoveredChartYear && (
          <line
            x1={getX(hoveredChartYear)}
            x2={getX(hoveredChartYear)}
            y1={padT}
            y2={H - padB}
            stroke="#a78bfa"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            opacity={0.8}
          />
        )}

        {/* Legend Panel on the Right */}
        {products.map((prod, idx) => {
          const color = CHART_COLORS[idx % CHART_COLORS.length];
          const isSelected = selectedShareProduct === prod;
          const currentShare = forecastModel.market_share[cCode]?.[2035]?.[prod] || 0.0;

          return (
            <g
              key={prod}
              transform={`translate(${W - padR + 15}, ${padT + idx * 24})`}
              className="chart-legend-item"
              onClick={() => setSelectedShareProduct(prod)}
              style={{ cursor: 'pointer' }}
            >
              <rect width={12} height={12} rx={3} fill={color} opacity={isSelected ? 1.0 : 0.55} />
              <text
                x={20}
                y={10}
                className="chart-legend-text"
                fontWeight={isSelected ? 600 : 400}
                fill={isSelected ? '#ffffff' : '#94a3b8'}
              >
                {prod.length > 18 ? `${prod.slice(0, 16)}...` : prod} ({Math.round(currentShare * 100)}%)
              </text>
            </g>
          );
        })}
      </svg>
    );
  };

  // 2. Stacked Bar Chart for Net Revenue over time (2026-2035)
  const renderStackedRevenueChart = () => {
    if (!forecastModel || !derivedData) return null;
    const cCode = activeCountry;
    const years = forecastModel.forecast_years;
    const products = Object.keys(priceOverrides);

    const W = 740;
    const H = 340;
    const padL = 60;
    const padB = 45;
    const padT = 20;
    const padR = 170;

    let maxTotalRevenue = 0;
    years.forEach(yr => {
      let annualTotal = 0;
      products.forEach(prod => {
        annualTotal += derivedData.revenue[cCode]?.[yr]?.[prod] || 0;
      });
      if (annualTotal > maxTotalRevenue) maxTotalRevenue = annualTotal;
    });
    maxTotalRevenue = Math.max(maxTotalRevenue * 1.1, 1000000);

    const getX = (yr: number) => padL + ((yr - years[0]) / (years.length)) * (W - padL - padR) + 12;
    const getY = (val: number) => padT + (1.0 - (val / maxTotalRevenue)) * (H - padT - padB);
    const barW = Math.max(12, Math.floor((W - padL - padR) / years.length) - 10);

    const formatRevenueLabel = (val: number) => {
      if (val >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
      if (val >= 1e6) return `$${(val / 1e6).toFixed(0)}M`;
      return `$${val.toLocaleString()}`;
    };

    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="dashboard-svg-chart">
        {/* Y Axis Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1.0].map(pct => {
          const val = pct * maxTotalRevenue;
          const y = getY(val);
          return (
            <g key={pct}>
              <line x1={padL} x2={W - padR} y1={y} y2={y} stroke="rgba(255, 255, 255, 0.08)" strokeWidth={1} />
              <text x={padL - 8} y={y + 4} textAnchor="end" className="chart-label-text" fill="#94a3b8">
                {formatRevenueLabel(val)}
              </text>
            </g>
          );
        })}

        {/* X Axis */}
        {years.map(yr => {
          const x = getX(yr) + barW / 2;
          return (
            <g key={yr}>
              <text x={x} y={H - padB + 18} textAnchor="middle" className="chart-label-text" fill="#94a3b8">
                {yr}
              </text>
            </g>
          );
        })}

        {/* Stacked Bars */}
        {years.map(yr => {
          const x = getX(yr);
          let currentYAccumulator = 0;
          
          return (
            <g key={yr} className="chart-bar-group">
              {products.map((prod, idx) => {
                const color = CHART_COLORS[idx % CHART_COLORS.length];
                const rev = derivedData.revenue[cCode]?.[yr]?.[prod] || 0;
                if (rev === 0) return null;

                const barH = (rev / maxTotalRevenue) * (H - padT - padB);
                const y = getY(currentYAccumulator) - barH;
                currentYAccumulator += rev;

                return (
                  <rect
                    key={prod}
                    x={x}
                    y={y}
                    width={barW}
                    height={barH}
                    fill={color}
                    opacity={0.8}
                    rx={2}
                    className="chart-revenue-bar"
                    style={{ transition: 'all 200ms ease' }}
                  >
                    <title>{`${prod} (${yr}): $${(rev / 1e6).toFixed(2)}M Net`}</title>
                  </rect>
                );
              })}
            </g>
          );
        })}

        {/* Legend on Right */}
        {products.map((prod, idx) => {
          const color = CHART_COLORS[idx % CHART_COLORS.length];
          const totalRev2035 = derivedData.revenue[cCode]?.[2035]?.[prod] || 0;

          return (
            <g key={prod} transform={`translate(${W - padR + 15}, ${padT + idx * 24})`}>
              <rect width={12} height={12} rx={3} fill={color} />
              <text x={20} y={10} className="chart-legend-text" fill="#94a3b8">
                {prod.length > 18 ? `${prod.slice(0, 16)}...` : prod} ({formatRevenueLabel(totalRev2035)})
              </text>
            </g>
          );
        })}
      </svg>
    );
  };

  // 3. Grouped Bar Chart for Net Revenue
  const renderGroupedRevenueChart = () => {
    if (!forecastModel || !derivedData) return null;
    const cCode = activeCountry;
    const years = forecastModel.forecast_years;
    const products = Object.keys(priceOverrides);

    const W = 740;
    const H = 340;
    const padL = 60;
    const padB = 45;
    const padT = 20;
    const padR = 170;

    let maxSingleBrandRev = 0;
    years.forEach(yr => {
      products.forEach(prod => {
        const rev = derivedData.revenue[cCode]?.[yr]?.[prod] || 0;
        if (rev > maxSingleBrandRev) maxSingleBrandRev = rev;
      });
    });
    maxSingleBrandRev = Math.max(maxSingleBrandRev * 1.15, 1000000);

    const getX = (yr: number) => padL + ((yr - years[0]) / years.length) * (W - padL - padR) + 6;
    const getY = (val: number) => padT + (1.0 - (val / maxSingleBrandRev)) * (H - padT - padB);

    const groupW = Math.max(12, Math.floor((W - padL - padR) / years.length) - 8);
    const singleBarW = Math.max(2, Math.floor(groupW / products.length) - 1.5);

    const formatRevenueLabel = (val: number) => {
      if (val >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
      if (val >= 1e6) return `$${(val / 1e6).toFixed(0)}M`;
      return `$${val.toLocaleString()}`;
    };

    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="dashboard-svg-chart">
        {/* Y Axis Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1.0].map(pct => {
          const val = pct * maxSingleBrandRev;
          const y = getY(val);
          return (
            <g key={pct}>
              <line x1={padL} x2={W - padR} y1={y} y2={y} stroke="rgba(255, 255, 255, 0.08)" strokeWidth={1} />
              <text x={padL - 8} y={y + 4} textAnchor="end" className="chart-label-text" fill="#94a3b8">
                {formatRevenueLabel(val)}
              </text>
            </g>
          );
        })}

        {/* X Axis */}
        {years.map(yr => {
          const x = getX(yr) + groupW / 2;
          return (
            <g key={yr}>
              <text x={x} y={H - padB + 18} textAnchor="middle" className="chart-label-text" fill="#94a3b8">
                {yr}
              </text>
            </g>
          );
        })}

        {/* Grouped Bars */}
        {years.map(yr => {
          const xStart = getX(yr);
          return (
            <g key={yr}>
              {products.map((prod, idx) => {
                const color = CHART_COLORS[idx % CHART_COLORS.length];
                const rev = derivedData.revenue[cCode]?.[yr]?.[prod] || 0;
                const barH = (rev / maxSingleBrandRev) * (H - padT - padB);
                const y = getY(rev);
                const x = xStart + idx * (singleBarW + 1.5);

                return (
                  <rect
                    key={prod}
                    x={x}
                    y={y}
                    width={singleBarW}
                    height={Math.max(1, barH)}
                    fill={color}
                    opacity={0.8}
                    rx={1.5}
                    className="chart-revenue-bar"
                    style={{ transition: 'all 200ms ease' }}
                  >
                    <title>{`${prod} (${yr}): ${formatRevenueLabel(rev)}`}</title>
                  </rect>
                );
              })}
            </g>
          );
        })}

        {/* Legend on Right */}
        {products.map((prod, idx) => {
          const color = CHART_COLORS[idx % CHART_COLORS.length];
          const peakRev = derivedData.revenue[cCode]?.[2035]?.[prod] || 0;
          return (
            <g key={prod} transform={`translate(${W - padR + 15}, ${padT + idx * 24})`}>
              <rect width={12} height={12} rx={3} fill={color} />
              <text x={20} y={10} className="chart-legend-text" fill="#94a3b8">
                {prod.length > 18 ? `${prod.slice(0, 16)}...` : prod} ({formatRevenueLabel(peakRev)})
              </text>
            </g>
          );
        })}
      </svg>
    );
  };

  // 4. Donut/Pie Chart representing Brand shares in 2035 (Peak year)
  const renderDonutChart = () => {
    if (!forecastModel || !derivedData) return null;
    const cCode = activeCountry;
    const products = Object.keys(priceOverrides);
    const year = 2035;

    const shares = products.map(prod => {
      return {
        name: prod,
        share: forecastModel.market_share[cCode]?.[year]?.[prod] || 0
      };
    }).filter(s => s.share > 0);

    const totalShare = shares.reduce((a, b) => a + b.share, 0);
    if (totalShare === 0) return <p className="no-data-msg">No market share data to display.</p>;

    const normalizedShares = shares.map(s => ({
      name: s.name,
      share: s.share / totalShare
    }));

    const W = 740;
    const H = 340;
    const cx = 220;
    const cy = 170;
    const r = 90;
    const strokeW = 34;

    let cumulativePercent = 0;

    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="dashboard-svg-chart">
        {normalizedShares.map((s, idx) => {
          if (s.share > 0.99) {
            const color = CHART_COLORS[idx % CHART_COLORS.length];
            const isHovered = hoveredDonutProduct === s.name;
            return (
              <circle
                key={s.name}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={color}
                strokeWidth={isHovered ? strokeW + 8 : strokeW}
                onMouseEnter={() => setHoveredDonutProduct(s.name)}
                onMouseLeave={() => setHoveredDonutProduct(null)}
                style={{ transition: 'all 150ms ease', cursor: 'pointer' }}
              />
            );
          }

          const startPercent = cumulativePercent;
          cumulativePercent += s.share;
          const endPercent = cumulativePercent;

          const startAngle = startPercent * 2 * Math.PI;
          const endAngle = endPercent * 2 * Math.PI;

          const x1 = cx + r * Math.sin(startAngle);
          const y1 = cy - r * Math.cos(startAngle);
          const x2 = cx + r * Math.sin(endAngle);
          const y2 = cy - r * Math.cos(endAngle);

          const largeArcFlag = s.share > 0.5 ? 1 : 0;
          const pathData = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2}`;
          const color = CHART_COLORS[idx % CHART_COLORS.length];
          const isHovered = hoveredDonutProduct === s.name;

          return (
            <path
              key={s.name}
              d={pathData}
              fill="none"
              stroke={color}
              strokeWidth={isHovered ? strokeW + 8 : strokeW}
              onMouseEnter={() => setHoveredDonutProduct(s.name)}
              onMouseLeave={() => setHoveredDonutProduct(null)}
              style={{ transition: 'all 150ms ease', cursor: 'pointer' }}
            />
          );
        })}

        {/* Center label */}
        <circle cx={cx} cy={cy} r={r - strokeW/2 - 2} fill="#1e293b" opacity={0.6} />
        <text x={cx} y={cy} textAnchor="middle" fill="#ffffff" fontWeight={700} fontSize={12}>
          {hoveredDonutProduct
            ? (hoveredDonutProduct.length > 15 ? `${hoveredDonutProduct.slice(0, 13)}...` : hoveredDonutProduct)
            : "Market Share"
          }
        </text>
        <text x={cx} y={cy + 18} textAnchor="middle" fill="#06b6d4" fontWeight={800} fontSize={16}>
          {hoveredDonutProduct
            ? `${((normalizedShares.find(s => s.name === hoveredDonutProduct)?.share || 0) * 100).toFixed(1)}%`
            : "Peak year 2035"
          }
        </text>

        {/* Legend on the right */}
        {normalizedShares.map((s, idx) => {
          const color = CHART_COLORS[idx % CHART_COLORS.length];
          const isHovered = hoveredDonutProduct === s.name;
          return (
            <g
              key={s.name}
              transform={`translate(${cx + r + 55}, ${35 + idx * 24})`}
              onMouseEnter={() => setHoveredDonutProduct(s.name)}
              onMouseLeave={() => setHoveredDonutProduct(null)}
              style={{ cursor: 'pointer' }}
            >
              <rect width={12} height={12} rx={3} fill={color} opacity={isHovered ? 1.0 : 0.6} />
              <text
                x={20}
                y={10}
                className="chart-legend-text"
                fontWeight={isHovered ? 700 : 400}
                fill={isHovered ? '#ffffff' : '#cbd5e1'}
              >
                {s.name.length > 20 ? `${s.name.slice(0, 18)}...` : s.name} ({(s.share * 100).toFixed(0)}%)
              </text>
            </g>
          );
        })}
      </svg>
    );
  };

  // Switch rendering of chart based on selected type sub-tab
  const renderInteractiveChart = () => {
    switch (chartType) {
      case 'line':
        return renderMarketShareChart();
      case 'stacked_bar':
        return renderStackedRevenueChart();
      case 'grouped_bar':
        return renderGroupedRevenueChart();
      case 'donut':
        return renderDonutChart();
      default:
        return renderMarketShareChart();
    }
  };

  // 5. Epidemiology Funnel Visualization
  const renderEpidemiologyFunnel = () => {
    if (!forecastModel || !derivedData) return null;
    const cCode = activeCountry;
    
    const data = derivedData.epidemiology.funnel[cCode]?.[2026];
    if (!data) return <p>No funnel data found for {cCode}.</p>;

    const funnelSteps = [
      { key: 'population', label: 'Total Population', value: data.population, color: '#6366f1' },
      { key: 'disease_pool', label: forecastModel.category === 'oncology' ? 'Incident Cancer Cases' : 'Prevalent Disease Pool', value: data.disease_pool, color: '#3b82f6' },
      { key: 'diagnosed', label: 'Diagnosed Patients', value: data.diagnosed, color: '#06b6d4' },
      { key: 'treated', label: 'Treated Patients', value: data.treated, color: '#10b981' },
      { key: 'adherent', label: 'Adherent / Compliant Pool', value: data.adherent, color: '#8b5cf6' }
    ];

    return (
      <div className="funnel-container">
        {funnelSteps.map((step, idx) => {
          let conversionText = "";
          if (idx > 0) {
            const prevVal = funnelSteps[idx - 1].value;
            const pct = prevVal > 0 ? (step.value / prevVal) * 100 : 0;
            conversionText = `Conversion: ${pct.toFixed(1)}%`;
          }

          const baseRatio = Math.max(15, (step.value / funnelSteps[0].value) * 100);
          const visualWidth = idx === 0 ? 100 : Math.max(90 - idx * 15, baseRatio);

          return (
            <div key={step.key} className="funnel-tier-wrapper">
              {idx > 0 && (
                <div className="funnel-conversion-badge">
                  <div className="funnel-arrow-down" />
                  <span>{conversionText}</span>
                </div>
              )}
              <div
                className="funnel-tier"
                style={{
                  width: `${visualWidth}%`,
                  background: `linear-gradient(90deg, ${step.color}cf, ${step.color}44)`,
                  borderLeft: `5px solid ${step.color}`
                }}
              >
                <div className="funnel-tier-info">
                  <span className="funnel-tier-label">{step.label}</span>
                  <span className="funnel-tier-value">{step.value.toLocaleString()}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // 6. Segmentation Subtypes
  const renderSegmentationDetails = () => {
    if (!forecastModel) return null;
    const isOnc = forecastModel.category === 'oncology';
    const cCode = activeCountry;

    if (isOnc) {
      const isChina = cCode === 'CN';
      const biomarkers = isChina && forecastModel.segmentation.biomarkers_china_override
        ? forecastModel.segmentation.biomarkers_china_override
        : (forecastModel.segmentation.biomarkers || {});

      const stages = forecastModel.segmentation.stages || {};
      const resect = forecastModel.segmentation.resectable_vs_unresectable || {};

      return (
        <div className="segmentation-grid">
          <div className="segment-card glass-panel">
            <h4 className="segment-card-title"><Layers size={14} /> Actionable Biomarkers {isChina && "(China Specific)"}</h4>
            <div className="bar-list">
              {Object.entries(biomarkers).map(([name, val], idx) => {
                const pct = val * 100;
                const color = CHART_COLORS[idx % CHART_COLORS.length];
                return (
                  <div key={name} className="bar-item">
                    <div className="bar-header">
                      <span className="bar-name">{name}</span>
                      <span className="bar-value">{pct.toFixed(1)}%</span>
                    </div>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="segment-card glass-panel">
            <h4 className="segment-card-title"><Layers size={14} /> Stage at Diagnosis</h4>
            <div className="bar-list">
              {Object.entries(stages).map(([name, val]) => {
                const pct = val * 100;
                return (
                  <div key={name} className="bar-item">
                    <div className="bar-header">
                      <span className="bar-name">{name}</span>
                      <span className="bar-value">{pct.toFixed(1)}%</span>
                    </div>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${pct}%`, backgroundColor: '#8b5cf6' }} />
                    </div>
                  </div>
                );
              })}
            </div>
            
            <h4 className="segment-card-title" style={{ marginTop: '1.5rem' }}><Layers size={14} /> Resectability Split</h4>
            <div className="resect-pie-row">
              {Object.entries(resect).map(([name, val], idx) => {
                const pct = val * 100;
                const color = idx === 0 ? '#10b981' : '#f43f5e';
                return (
                  <div key={name} className="resect-stat-pill">
                    <span className="dot" style={{ backgroundColor: color }} />
                    <span className="name">{name}:</span>
                    <strong className="val">{pct.toFixed(0)}%</strong>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="segment-card segment-card--full glass-panel">
            <h4 className="segment-card-title"><Layers size={14} /> Progression &amp; Recurrence Risks</h4>
            <div className="metrics-summary-row">
              <div className="sub-metric glass-panel">
                <span className="label">Early-stage Annual Recurrence Rate</span>
                <span className="value">{(forecastModel.segmentation.early_stage_recurrence_rate! * 100).toFixed(0)}%</span>
              </div>
              {Object.entries(forecastModel.segmentation.progression_rates || {}).map(([name, val]) => (
                <div key={name} className="sub-metric glass-panel">
                  <span className="label">{name}</span>
                  <span className="value">{(val * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    } else {
      const severity = forecastModel.segmentation.severity || {};
      const risk = forecastModel.segmentation.risk_stratification || {};
      const endpoints = forecastModel.segmentation.endpoints || {};

      return (
        <div className="segmentation-grid">
          <div className="segment-card glass-panel">
            <h4 className="segment-card-title"><Layers size={14} /> Disease Severity Distribution</h4>
            <div className="bar-list">
              {Object.entries(severity).map(([name, val], idx) => {
                const pct = val * 100;
                const colors = ['#10b981', '#f59e0b', '#ef4444'];
                return (
                  <div key={name} className="bar-item">
                    <div className="bar-header">
                      <span className="bar-name">{name} Severity</span>
                      <span className="bar-value">{pct.toFixed(1)}%</span>
                    </div>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${pct}%`, backgroundColor: colors[idx % 3] }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="segment-card glass-panel">
            <h4 className="segment-card-title"><Layers size={14} /> Risk Stratification</h4>
            <div className="bar-list">
              {Object.entries(risk).map(([name, val], idx) => {
                const pct = val * 100;
                const colors = ['#3b82f6', '#8b5cf6', '#ec4899'];
                return (
                  <div key={name} className="bar-item">
                    <div className="bar-header">
                      <span className="bar-name">{name}</span>
                      <span className="bar-value">{pct.toFixed(1)}%</span>
                    </div>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${pct}%`, backgroundColor: colors[idx % 3] }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="segment-card glass-panel">
            <h4 className="segment-card-title"><Layers size={14} /> Chronic Outcomes &amp; Indicators</h4>
            <div className="bar-list">
              {Object.entries(endpoints).map(([name, val]) => {
                const pct = val * 100;
                return (
                  <div key={name} className="bar-item">
                    <div className="bar-header">
                      <span className="bar-name">{name}</span>
                      <span className="bar-value">{pct.toFixed(1)}%</span>
                    </div>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${pct}%`, backgroundColor: '#6366f1' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    }
  };

  // 7. Treatment Landscape
  const renderTreatmentLandscape = () => {
    if (!forecastModel) return null;
    const isOnc = forecastModel.category === 'oncology';
    const land = forecastModel.treatment_landscape;

    return (
      <div className="treatment-panel-grid">
        <div className="treatment-segment-card glass-panel">
          <h4 className="segment-card-title"><GitBranch size={14} /> {isOnc ? 'Lines of Therapy Patient Distribution' : 'Chronic Treatment Steps'}</h4>
          <div className="bar-list">
            {Object.entries(isOnc ? land.lines_of_therapy || {} : land.treatment_steps || {}).map(([name, val]) => {
              const pct = val * 100;
              return (
                <div key={name} className="bar-item">
                  <div className="bar-header">
                    <span className="bar-name">{name}</span>
                    <span className="bar-value">{pct.toFixed(0)}%</span>
                  </div>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${pct}%`, backgroundColor: '#3b82f6' }} />
                  </div>
                </div>
              );
            })}
          </div>
          
          {!isOnc && (
            <div className="chronic-persistence-box glass-panel">
              <h5 className="sub-header">Persistence retention curve</h5>
              <div className="persistence-metrics">
                <div className="p-pill">
                  <span className="lbl">Mean Possession Ratio (MPR)</span>
                  <strong className="val">{(land.adherence_mpr! * 100).toFixed(0)}%</strong>
                </div>
                {Object.entries(land.persistence_curve || {}).map(([name, val]) => (
                  <div key={name} className="p-pill">
                    <span className="lbl">{name}</span>
                    <strong className="val">{(val * 100).toFixed(0)}%</strong>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="treatment-segment-card glass-panel">
          <h4 className="segment-card-title"><Pill size={14} /> Marketed Approved Therapies</h4>
          <table className="landscape-table">
            <thead>
              <tr>
                <th>Brand Name</th>
                <th>Manufacturer</th>
                <th>Year</th>
              </tr>
            </thead>
            <tbody>
              {land.approved_products.map(prod => (
                <tr key={prod.name}>
                  <td><strong>{prod.name}</strong></td>
                  <td>{prod.manufacturer}</td>
                  <td>{prod.approval_year}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h4 className="segment-card-title" style={{ marginTop: '1.5rem' }}><RefreshCw size={14} /> Pipeline Candidates (ClinicalTrials.gov)</h4>
          <table className="landscape-table">
            <thead>
              <tr>
                <th>Drug candidate</th>
                <th>Phase</th>
                <th>Mechanism / Sponsor</th>
              </tr>
            </thead>
            <tbody>
              {land.pipeline_products.map(p => (
                <tr key={p.name}>
                  <td><strong>{p.name}</strong></td>
                  <td><span className="phase-badge">{p.phase}</span></td>
                  <td>
                    <div className="mech-text">{p.mechanism}</div>
                    <div className="sponsor-text">Sponsor: {p.sponsor}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="pharma-forecast-container glass-theme">
      {/* Glow ambient spots behind glassmorphism elements */}
      <div className="glass-blob-container">
        <div className="glass-blob blob-blue"></div>
        <div className="glass-blob blob-purple"></div>
        <div className="glass-blob blob-cyan"></div>
      </div>

      {/* ── SEARCH & CONFIG PANEL (Only show if no model is loaded) ── */}
      {!forecastModel && (
        <div className="pharma-setup-view fade-in-up">
          <div className="pharma-hero">
            <span className="hero-badge">
              <TrendingUp size={13} /> Pharmaceutical Analytics &amp; Forecasting Engine
            </span>
            <h1 className="hero-title">10-Year Disease Market &amp; Revenue Forecasting</h1>
            <p className="hero-subtitle">
              Input any oncology or chronic condition. Our models fetch demographics, FDA approvals, 
              and clinical pipelines to project patient funnels and brand revenues (2026–2035).
            </p>
          </div>

          <div className="presets-row glass-panel">
            <span className="presets-label">Quick Start Presets:</span>
            <div className="preset-buttons">
              {PRESET_DISEASES.map(preset => (
                <button
                  key={preset.name}
                  className="preset-btn"
                  onClick={() => handlePresetSelect(preset)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="setup-centered-layout">
            <div className="setup-card glass-panel">
              <h2 className="setup-card-title"><Stethoscope size={16} /> Disease Model Configuration</h2>
              
              <div className="input-group">
                <label className="input-label" htmlFor="disease-input">Disease / Indication Name</label>
                <input
                  id="disease-input"
                  type="text"
                  placeholder="e.g. NSCLC, Diabetes, Breast Cancer, Asthma..."
                  value={diseaseInput}
                  onChange={(e) => setDiseaseInput(e.target.value)}
                  className="search-text-input"
                />
              </div>

              <div className="input-group">
                <label className="input-label">Disease Category Framework</label>
                <div className="toggle-group">
                  <button
                    className={`toggle-btn ${categoryInput === 'auto' ? 'active' : ''}`}
                    onClick={() => setCategoryInput('auto')}
                  >
                    Auto Detect
                  </button>
                  <button
                    className={`toggle-btn ${categoryInput === 'oncology' ? 'active' : ''}`}
                    onClick={() => setCategoryInput('oncology')}
                  >
                    Oncology
                  </button>
                  <button
                    className={`toggle-btn ${categoryInput === 'non_oncology' ? 'active' : ''}`}
                    onClick={() => setCategoryInput('non_oncology')}
                  >
                    Non-Oncology
                  </button>
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Target Geographies</label>
                <div className="countries-checklist">
                  {AVAILABLE_COUNTRIES.map(c => (
                    <label key={c.code} className="country-checkbox-label">
                      <input
                        type="checkbox"
                        checked={selectedCountries.includes(c.code)}
                        onChange={() => handleCountryCheckbox(c.code)}
                      />
                      <span>{c.name} ({c.code})</span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                className="btn-primary btn-generate"
                disabled={isLoading || !diseaseInput.trim()}
                onClick={() => handleGenerateForecast(diseaseInput)}
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="spinner" size={16} /> Compiling Demographics &amp; Models...
                  </>
                ) : (
                  <>
                    <TrendingUp size={16} /> Generate 10-Year Live Forecast
                  </>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="error-card" role="alert">
              <AlertTriangle size={18} />
              <div>
                <strong>Failed to generate model</strong>
                <p>{error}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ACTIVE LIVE FORECAST DASHBOARD ── */}
      {forecastModel && derivedData && (
        <div className="pharma-dashboard-view">
          {/* Top Info Bar */}
          <div className="dashboard-header-row">
            <div className="header-meta">
              <span className="category-badge">{forecastModel.category.replace('_', ' ').toUpperCase()}</span>
              <h1 className="disease-title">{forecastModel.disease} Market Forecast</h1>
              <p className="years-subtitle">Demographics &amp; Revenues Projected: 2026–2035</p>
            </div>
            
            <div className="header-actions">
              <button className="btn-secondary" onClick={handleExportCSV}>
                <Download size={14} /> Export CSV Data
              </button>
              <button className="btn-primary" onClick={() => setForecastModel(null)}>
                <RefreshCw size={14} /> New Model
              </button>
            </div>
          </div>

          {/* Master layout grid: Sidebar Controls + Tab Content */}
          <div className="dashboard-workspace">
            {/* Sidebar Controls (Interactive Sliders) */}
            <aside className="dashboard-sidebar glass-panel">
              <div className="sidebar-group">
                <label className="sidebar-label">Active Forecast Country</label>
                <div className="custom-select-wrapper">
                  <select
                    value={activeCountry}
                    onChange={(e) => setActiveCountry(e.target.value)}
                    className="sidebar-select"
                  >
                    {forecastModel.geography.map(cName => {
                      const countryObj = AVAILABLE_COUNTRIES.find(c => c.name === cName);
                      return (
                        <option key={cName} value={countryObj?.code || cName}>
                          {cName}
                        </option>
                      );
                    })}
                  </select>
                  <ChevronDown size={14} className="select-arrow" />
                </div>
              </div>

              <div className="sidebar-divider" />

              <h3 className="sidebar-section-title">Live Assumptions</h3>
              <p className="sidebar-section-desc">Drag sliders to instantly recalculate revenue &amp; patient pools in real time.</p>

              {/* Compliance Slider */}
              <div className="sidebar-slider-item">
                <div className="slider-header">
                  <span className="slider-name">Compliance / Adherence</span>
                  <span className="slider-value">{complianceOverride}%</span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="100"
                  value={complianceOverride}
                  onChange={(e) => setComplianceOverride(Number(e.target.value))}
                  className="slider-input"
                />
              </div>

              {/* Price Overrides per Brand */}
              <h4 className="slider-group-title">Annual Gross Prices</h4>
              <div className="sidebar-slider-list">
                {Object.keys(priceOverrides).map(prod => {
                  const val = priceOverrides[prod];
                  return (
                    <div key={prod} className="sidebar-slider-item">
                      <div className="slider-header">
                        <span className="slider-name">{prod}</span>
                        <span className="slider-value">${val.toLocaleString()}</span>
                      </div>
                      <input
                        type="range"
                        min={prod.includes('Generics') || prod.includes('Metformin') ? "50" : "2000"}
                        max={prod.includes('Generics') || prod.includes('Metformin') ? "15000" : "350000"}
                        step="250"
                        value={val}
                        onChange={(e) => setPriceOverrides({
                          ...priceOverrides,
                          [prod]: Number(e.target.value)
                        })}
                        className="slider-input"
                      />
                    </div>
                  );
                })}
              </div>

              {/* Discount rates overrides */}
              <h4 className="slider-group-title" style={{ marginTop: '1.25rem' }}>GTN Discounts</h4>
              <div className="sidebar-slider-list">
                {Object.keys(discountOverrides).map(prod => {
                  const val = discountOverrides[prod];
                  return (
                    <div key={prod} className="sidebar-slider-item">
                      <div className="slider-header">
                        <span className="slider-name">{prod}</span>
                        <span className="slider-value">{val}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="85"
                        value={val}
                        onChange={(e) => setDiscountOverrides({
                          ...discountOverrides,
                          [prod]: Number(e.target.value)
                        })}
                        className="slider-input"
                      />
                    </div>
                  );
                })}
              </div>
            </aside>

            {/* Dashboard Tabs & Content Area */}
            <main className="dashboard-content">
              {/* Tab Navigation */}
              <nav className="dashboard-tabs">
                <button
                  className={`dash-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                  onClick={() => setActiveTab('overview')}
                >
                  <Info size={14} /> Overview
                </button>
                <button
                  className={`dash-tab-btn ${activeTab === 'epidemiology' ? 'active' : ''}`}
                  onClick={() => setActiveTab('epidemiology')}
                >
                  <Users size={14} /> Funnel
                </button>
                <button
                  className={`dash-tab-btn ${activeTab === 'segmentation' ? 'active' : ''}`}
                  onClick={() => setActiveTab('segmentation')}
                >
                  <Layers size={14} /> Segmentation
                </button>
                <button
                  className={`dash-tab-btn ${activeTab === 'treatment' ? 'active' : ''}`}
                  onClick={() => setActiveTab('treatment')}
                >
                  <Pill size={14} /> Landscape
                </button>
                <button
                  className={`dash-tab-btn ${activeTab === 'market_share' ? 'active' : ''}`}
                  onClick={() => setActiveTab('market_share')}
                >
                  <TrendingUp size={14} /> Interactive Charts
                </button>
                <button
                  className={`dash-tab-btn ${activeTab === 'citations' ? 'active' : ''}`}
                  onClick={() => setActiveTab('citations')}
                >
                  <BookOpen size={14} /> Citations
                </button>
              </nav>

              {/* Tab Content Panels */}
              <div className="tab-panel-container">
                {/* 1. OVERVIEW PANEL */}
                {activeTab === 'overview' && (
                  <div className="tab-panel fade-in-up">
                    <div className="overview-kpi-grid">
                      <div className="kpi-card glass-panel animate-kpi">
                        <div className="kpi-icon-wrapper kpi--treated">
                          <Users size={20} />
                        </div>
                        <div className="kpi-data">
                          <span className="kpi-label">Treated Patients (2026)</span>
                          <span className="kpi-value">
                            {(derivedData.epidemiology.funnel[activeCountry]?.[2026]?.treated || 0).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div className="kpi-card glass-panel animate-kpi">
                        <div className="kpi-icon-wrapper kpi--adherent">
                          <Users size={20} />
                        </div>
                        <div className="kpi-data">
                          <span className="kpi-label">Adherent Pool (2035)</span>
                          <span className="kpi-value">
                            {(derivedData.epidemiology.funnel[activeCountry]?.[2035]?.adherent || 0).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div className="kpi-card glass-panel animate-kpi">
                        <div className="kpi-icon-wrapper kpi--revenue">
                          <DollarSign size={20} />
                        </div>
                        <div className="kpi-data">
                          <span className="kpi-label">Peak Market Size (2035)</span>
                          <span className="kpi-value">
                            {(() => {
                              const revs = derivedData.revenue[activeCountry]?.[2035] || {};
                              const total = Object.values(revs).reduce((a, b) => a + b, 0);
                              if (total >= 1e9) return `$${(total / 1e9).toFixed(2)}B`;
                              return `$${(total / 1e6).toFixed(1)}M`;
                            })()}
                          </span>
                        </div>
                      </div>

                      <div className="kpi-card glass-panel animate-kpi">
                        <div className="kpi-icon-wrapper kpi--pipeline">
                          <Award size={20} />
                        </div>
                        <div className="kpi-data">
                          <span className="kpi-label">Pipeline Candidates</span>
                          <span className="kpi-value">
                            {forecastModel.treatment_landscape.pipeline_products.length}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="overview-insights-card glass-panel">
                      <h3 className="section-title"><Info size={16} /> Market Research Insights</h3>
                      <p className="insights-text">
                        The market for <strong>{forecastModel.disease}</strong> in <strong>{AVAILABLE_COUNTRIES.find(c => c.code === activeCountry)?.name}</strong> is 
                        expected to grow substantially between 2026 and 2035, driven by diagnostic improvements and new therapeutic options. 
                        Treated patient counts are projected to reach <strong>{(derivedData.epidemiology.funnel[activeCountry]?.[2035]?.treated || 0).toLocaleString()}</strong> by 2035.
                      </p>
                      <p className="insights-text" style={{ marginTop: '0.85rem' }}>
                        Under current assumptions, a premium pipeline asset launched in 2028 is expected to capture significant share, eroding legacy therapies. 
                        Adjusting the compliance rate slider highlights that improving patient adherence to <strong>{complianceOverride}%</strong> could increase the 
                        effectively-controlled patient cohort by <strong>{((derivedData.epidemiology.funnel[activeCountry]?.[2035]?.adherent || 0) - (forecastModel.epidemiology.funnel[activeCountry]?.[2035]?.adherent || 0)).toLocaleString()}</strong> patients annually, 
                        improving clinical outcomes and generating incremental brand revenues.
                      </p>
                    </div>
                  </div>
                )}

                {/* 2. EPIDEMIOLOGY FUNNEL PANEL */}
                {activeTab === 'epidemiology' && (
                  <div className="tab-panel fade-in-up">
                    <h3 className="section-title">Epidemiology Funnel (2026 Projections)</h3>
                    <p className="section-desc">
                      Demographic conversion funnel from total geographic population to treated/adherent patient stocks.
                    </p>
                    <div className="glass-panel" style={{ padding: '1rem' }}>
                      {renderEpidemiologyFunnel()}
                    </div>
                  </div>
                )}

                {/* 3. SEGMENTATION PANEL */}
                {activeTab === 'segmentation' && (
                  <div className="tab-panel fade-in-up">
                    <h3 className="section-title">Indication Segmentation &amp; Subtypes</h3>
                    <p className="section-desc">
                      Details biomarker splits, stage breakdowns, and recurrence indicators that define target patient populations.
                    </p>
                    {renderSegmentationDetails()}
                  </div>
                )}

                {/* 4. TREATMENT LANDSCAPE */}
                {activeTab === 'treatment' && (
                  <div className="tab-panel fade-in-up">
                    <h3 className="section-title">Current Standard and Pipeline Landscape</h3>
                    <p className="section-desc">
                      Overview of lines of therapy (LOT), approved therapeutic brands, and clinical drug pipelines.
                    </p>
                    {renderTreatmentLandscape()}
                  </div>
                )}

                {/* 5. INTERACTIVE CHARTS PANEL (THE GLASSMORPHIC CHARTS WORKSPACE) */}
                {activeTab === 'market_share' && (
                  <div className="tab-panel fade-in-up">
                    <div className="chart-panel-row">
                      <div className="chart-wrapper-card glass-panel">
                        <div className="chart-header-actions-row">
                          <div>
                            <h3 className="section-title">Interactive Chart Analytics</h3>
                            <p className="section-desc">Recalculates instantly when adjusting compliance or pricing.</p>
                          </div>
                          
                          {/* Chart Type Selector Sub-Tab */}
                          <div className="chart-type-selector-tab">
                            <button
                              className={`chart-type-btn ${chartType === 'line' ? 'active' : ''}`}
                              onClick={() => setChartType('line')}
                            >
                              Line Graph
                            </button>
                            <button
                              className={`chart-type-btn ${chartType === 'stacked_bar' ? 'active' : ''}`}
                              onClick={() => setChartType('stacked_bar')}
                            >
                              Stacked Bar
                            </button>
                            <button
                              className={`chart-type-btn ${chartType === 'grouped_bar' ? 'active' : ''}`}
                              onClick={() => setChartType('grouped_bar')}
                            >
                              Grouped Bar
                            </button>
                            <button
                              className={`chart-type-btn ${chartType === 'donut' ? 'active' : ''}`}
                              onClick={() => setChartType('donut')}
                            >
                              Donut Chart
                            </button>
                          </div>
                        </div>

                        <div className="svg-container">
                          {renderInteractiveChart()}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 6. CITATIONS */}
                {activeTab === 'citations' && (
                  <div className="tab-panel fade-in-up">
                    <h3 className="section-title">Research Citations &amp; Data Sources</h3>
                    <p className="section-desc">Scientific references and API databases queried for this model.</p>
                    <ul className="citations-list">
                      {forecastModel.data_sources.map((src, i) => (
                        <li key={i} className="citation-item glass-panel">
                          <Check size={14} className="check-icon" />
                          <span>{src}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </main>
          </div>
        </div>
      )}
    </div>
  );
}
