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
  ChevronDown,
  Sparkles,
  Shield
} from 'lucide-react';
import { generateForecast } from '../api';
import type { ForecastModel } from '../types';
import ForestPlot from './ForestPlot';
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
type ForecastTab = 'overview' | 'epidemiology' | 'segmentation' | 'treatment' | 'market_share' | 'citations' | 'insights';
type ChartType = 'line' | 'stacked_bar' | 'grouped_bar' | 'donut';

function renderCleanInsights(text: string) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  
  let listItems: string[] = [];
  let swotCells: string[] = [];
  
  const flushList = (key: string) => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={key} className="insights-list">
          {listItems.map((item, idx) => (
            <li key={idx} className="insights-list-item">{item}</li>
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    if (line.includes('|') && line.includes(':-')) {
      continue;
    }
    
    if (line.startsWith('|') && line.endsWith('|')) {
      flushList(`list-pre-table-${i}`);
      const parts = line.split('|').map(p => p.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
      parts.forEach(part => {
        if (part) {
          const cleanPart = part.replace(/\*\*/g, '').replace(/#/g, '').trim();
          if (cleanPart) {
            swotCells.push(cleanPart);
          }
        }
      });
      continue;
    }
    
    if (swotCells.length > 0) {
      elements.push(
        <div key={`swot-grid-${i}`} className="swot-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.25rem',
          margin: '1.5rem 0'
        }}>
          <div className="swot-card swot-card--strengths" style={{
            padding: '1.25rem',
            borderRadius: '8px',
            background: 'rgba(79, 110, 247, 0.05)',
            borderLeft: '4px solid #4f6ef7'
          }}>
            <h5 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', fontWeight: 700, color: '#4f6ef7' }}>Strengths</h5>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary, var(--color-text-secondary, #334155))' }}>
              {(swotCells[2] || '').split('<br>').map((b, bIdx) => (
                <li key={bIdx} style={{ marginBottom: '0.35rem' }}>{b.replace(/^[•\s*-]+/, '').replace(/\*\*/g, '').trim()}</li>
              ))}
            </ul>
          </div>

          <div className="swot-card swot-card--weaknesses" style={{
            padding: '1.25rem',
            borderRadius: '8px',
            background: 'rgba(239, 68, 68, 0.05)',
            borderLeft: '4px solid #ef4444'
          }}>
            <h5 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', fontWeight: 700, color: '#ef4444' }}>Weaknesses</h5>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary, var(--color-text-secondary, #334155))' }}>
              {(swotCells[3] || '').split('<br>').map((b, bIdx) => (
                <li key={bIdx} style={{ marginBottom: '0.35rem' }}>{b.replace(/^[•\s*-]+/, '').replace(/\*\*/g, '').trim()}</li>
              ))}
            </ul>
          </div>

          <div className="swot-card swot-card--opportunities" style={{
            padding: '1.25rem',
            borderRadius: '8px',
            background: 'rgba(16, 185, 129, 0.05)',
            borderLeft: '4px solid #10b981'
          }}>
            <h5 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', fontWeight: 700, color: '#10b981' }}>Opportunities</h5>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary, var(--color-text-secondary, #334155))' }}>
              {(swotCells[6] || '').split('<br>').map((b, bIdx) => (
                <li key={bIdx} style={{ marginBottom: '0.35rem' }}>{b.replace(/^[•\s*-]+/, '').replace(/\*\*/g, '').trim()}</li>
              ))}
            </ul>
          </div>

          <div className="swot-card swot-card--threats" style={{
            padding: '1.25rem',
            borderRadius: '8px',
            background: 'rgba(245, 158, 11, 0.05)',
            borderLeft: '4px solid #f59e0b'
          }}>
            <h5 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', fontWeight: 700, color: '#f59e0b' }}>Threats</h5>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary, var(--color-text-secondary, #334155))' }}>
              {(swotCells[7] || '').split('<br>').map((b, bIdx) => (
                <li key={bIdx} style={{ marginBottom: '0.35rem' }}>{b.replace(/^[•\s*-]+/, '').replace(/\*\*/g, '').trim()}</li>
              ))}
            </ul>
          </div>
        </div>
      );
      swotCells = [];
    }
    
    if (line.startsWith('#')) {
      flushList(`list-pre-h-${i}`);
      const cleanHeader = line.replace(/^#+\s*/, '').replace(/\*\*/g, '').replace(/#/g, '').trim();
      elements.push(
        <h4 key={`header-${i}`} className="insights-h4">
          {cleanHeader}
        </h4>
      );
      continue;
    }
    
    if (line.startsWith('*') || line.startsWith('-') || line.startsWith('•')) {
      const cleanItem = line.replace(/^[\*\-•]\s*/, '').replace(/\*\*/g, '').trim();
      listItems.push(cleanItem);
      continue;
    }
    
    flushList(`list-pre-p-${i}`);
    
    const cleanPara = line.replace(/\*\*/g, '').replace(/#/g, '').trim();
    if (cleanPara) {
      elements.push(
        <p key={`para-${i}`} className="insights-p">
          {cleanPara}
        </p>
      );
    }
  }
  
  flushList('list-final');
  return elements;
}

interface PharmaceuticalForecastProps {
  onPinForecast?: (model: any) => void;
  pinnedCount?: number;
  onViewComparison?: () => void;
}

export default function PharmaceuticalForecast({
  onPinForecast,
  pinnedCount = 0,
  onViewComparison
}: PharmaceuticalForecastProps) {
  // Input Form States
  const [diseaseInput, setDiseaseInput] = useState('');
  const [categoryInput, setCategoryInput] = useState<'oncology' | 'non_oncology' | 'auto'>('auto');
  const [selectedCountries, setSelectedCountries] = useState<string[]>(['US', 'CN', 'DE', 'JP', 'IT']);
  
  const [placeholder, setPlaceholder] = useState('');
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  const placeholders = useMemo(() => [
    'e.g. Breast Cancer...',
    'e.g. Type 2 Diabetes...',
    'e.g. Asthma...',
    'e.g. COPD...',
    'e.g. NSCLC...',
    'e.g. SCLC...',
    'e.g. Prostate Cancer...',
    'e.g. Colorectal Cancer...',
    'e.g. Cardiovascular Disease...'
  ], []);

  useEffect(() => {
    let timer: any;
    const currentPhrase = placeholders[phraseIdx];
    
    if (isDeleting) {
      timer = setTimeout(() => {
        setPlaceholder(currentPhrase.substring(0, charIdx - 1));
        setCharIdx(charIdx - 1);
      }, 25);
    } else {
      timer = setTimeout(() => {
        setPlaceholder(currentPhrase.substring(0, charIdx + 1));
        setCharIdx(charIdx + 1);
      }, 60);
    }

    if (!isDeleting && charIdx === currentPhrase.length) {
      timer = setTimeout(() => setIsDeleting(true), 1600);
    } else if (isDeleting && charIdx === 0) {
      setIsDeleting(false);
      setPhraseIdx((prev) => (prev + 1) % placeholders.length);
    }

    return () => clearTimeout(timer);
  }, [charIdx, isDeleting, phraseIdx, placeholders]);
  
  // Forecast results states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forecastModel, setForecastModel] = useState<ForecastModel | null>(null);
  const [activeTab, setActiveTab] = useState<ForecastTab>('overview');
  const [selectedModel, setSelectedModel] = useState<string>('s_curve');

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
      setSelectedModel(forecastModel.model_type || 's_curve');
      
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
  const handleGenerateForecast = async (diseaseStr: string, catOverride?: 'oncology' | 'non_oncology' | 'auto', modelTypeOverride?: string) => {
    const diseaseName = diseaseStr.trim();
    if (!diseaseName) return;

    setIsLoading(true);
    setError(null);
    setForecastModel(null);

    const cat = catOverride || categoryInput;
    const modelType = modelTypeOverride || selectedModel;
    const body = {
      disease: diseaseName,
      category: cat,
      geography: selectedCountries,
      model_type: modelType
    };

    try {
      const data = await generateForecast(body);
      setForecastModel(data);
      setSelectedModel(data.model_type || modelType);
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

  const splitTextIntoLines = (text: string, maxCharPerLine: number = 85): string[] => {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    
    words.forEach(word => {
      if ((currentLine + ' ' + word).trim().length <= maxCharPerLine) {
        currentLine = (currentLine + ' ' + word).trim();
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    });
    if (currentLine) {
      lines.push(currentLine);
    }
    return lines;
  };

  const getSwotQuadrants = (insightsText: string) => {
    const lines = insightsText.split('\n');
    let swotCells: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('|') && line.endsWith('|') && !line.includes(':-')) {
        const parts = line.split('|').map(p => p.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
        parts.forEach(part => {
          if (part) {
            const cleanPart = part.replace(/\*\*/g, '').replace(/#/g, '').trim();
            if (cleanPart) swotCells.push(cleanPart);
          }
        });
      }
    }
    
    const cleanList = (cellText: string) => {
      if (!cellText) return '';
      return cellText.split('<br>').map(b => b.replace(/^[•\s*-]+/, '').trim()).filter(b => b).map(b => '• ' + b).join('\n');
    };
    
    return {
      strengths: swotCells[2] ? cleanList(swotCells[2]) : '• Strong representation of developmental phases.\n• Parallel research backed by active publication outputs.\n• Multidisciplinary combination regimens.',
      weaknesses: swotCells[3] ? cleanList(swotCells[3]) : '• Critical data fields missing in registered trials.\n• High dependency on standard cytotoxic backbones.\n• Limited long-term safety profile records.',
      opportunities: swotCells[6] ? cleanList(swotCells[6]) : '• Emerging biomarkers indicate opportunities for personalized therapies.\n• High phase 1/2 density suggests novel molecular entries.\n• Accelerated FDA approval potential.',
      threats: swotCells[7] ? cleanList(swotCells[7]) : '• Patient recruitment delays for rare cohorts.\n• Competing trials matching similar inclusion criteria.\n• Regulatory policy adjustments.'
    };
  };

  const handleDownloadSVG = () => {
    if (!forecastModel || !derivedData) return;

    const cCode = activeCountry;
    const cName = AVAILABLE_COUNTRIES.find(c => c.code === cCode)?.name || cCode;
    const years = forecastModel.forecast_years;
    const products = Object.keys(priceOverrides);

    // Compute total revenue by year
    const totalRevenueByYear = years.map(yr => 
      products.reduce((acc, p) => acc + (derivedData.revenue[cCode]?.[yr]?.[p] || 0), 0)
    );
    const peakRevenue = Math.max(...totalRevenueByYear, 1);
    const rFirst = totalRevenueByYear[0] || 1;
    const rLast = totalRevenueByYear[totalRevenueByYear.length - 1] || 1;
    const cagrVal = ((rLast / rFirst) ** (1 / (years.length - 1)) - 1) * 100;
    const maxPatients = Math.max(...years.map(yr => derivedData.epidemiology.funnel[cCode]?.[yr]?.disease_pool || 0));

    let svgString = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 1620" width="900" height="1620" style="background:#ffffff; font-family:system-ui, -apple-system, sans-serif;">';
    svgString += '\n  <style>';
    svgString += '\n    .title { font-size: 26px; fill: #0f172a; font-weight: 800; }';
    svgString += '\n    .subtitle { font-size: 13px; fill: #64748b; font-weight: 500; }';
    svgString += '\n    .section-title { font-size: 16px; fill: #0f172a; font-weight: 700; }';
    svgString += '\n    .card-title { font-size: 11px; fill: #64748b; font-weight: 600; text-transform: uppercase; }';
    svgString += '\n    .card-value { font-size: 22px; fill: #4f6ef7; font-weight: 700; }';
    svgString += '\n    .axis-label { font-size: 10px; fill: #64748b; }';
    svgString += '\n    .chart-label { font-size: 11px; fill: #334155; }';
    svgString += '\n    .forest-text { font-size: 12px; fill: #334155; }';
    svgString += '\n    .forest-title { font-size: 12px; fill: #0f172a; font-weight: 600; }';
    svgString += '\n    .swot-header { font-size: 13px; font-weight: 700; }';
    svgString += '\n    .swot-text { font-size: 11px; fill: #475569; }';
    svgString += '\n    .insights-title { font-size: 14px; fill: #0f172a; font-weight: 700; }';
    svgString += '\n    .insights-text { font-size: 12px; fill: #334155; }';
    svgString += '\n  </style>';
    
    svgString += '\n  <rect x="0" y="0" width="900" height="1620" fill="#f8fafc" />';
    svgString += '\n  <rect x="15" y="15" width="870" height="1590" rx="16" fill="#ffffff" stroke="#e2e8f0" stroke-width="1.5" />';
    
    svgString += '\n  <path d="M 15 15 L 885 15 L 885 140 L 15 100 Z" fill="rgba(79, 110, 247, 0.04)" />';
    
    svgString += '\n  <text x="40" y="60" class="title">' + forecastModel.disease + ' Market Forecast Report</text>';
    svgString += '\n  <text x="40" y="85" class="subtitle">Geography: ' + cName + ' | Projection Model: ' + selectedModel + ' | Generated: ' + new Date().toLocaleDateString() + '</text>';
    
    svgString += '\n  <rect x="700" y="45" width="145" height="36" rx="18" fill="rgba(79, 110, 247, 0.08)" stroke="rgba(79, 110, 247, 0.2)" stroke-width="1" />';
    svgString += '\n  <text x="772" y="67" text-anchor="middle" font-size="12" font-weight="700" fill="#4f6ef7">' + forecastModel.confidence_score + '% Confidence</text>';
    
    svgString += '\n  <text x="40" y="130" class="section-title">Key Forecast Insights</text>';
    
    svgString += '\n  <rect x="40" y="145" width="190" height="75" rx="8" fill="#ffffff" stroke="#e2e8f0" stroke-width="1" />';
    svgString += '\n  <text x="55" y="170" class="card-title">Peak Market Size</text>';
    svgString += '\n  <text x="55" y="200" class="card-value">$' + (peakRevenue / 1e6).toFixed(1) + 'M</text>';
    
    svgString += '\n  <rect x="250" y="145" width="190" height="75" rx="8" fill="#ffffff" stroke="#e2e8f0" stroke-width="1" />';
    svgString += '\n  <text x="265" y="170" class="card-title">Forecast CAGR</text>';
    svgString += '\n  <text x="265" y="200" class="card-value">' + cagrVal.toFixed(1) + '%</text>';
    
    svgString += '\n  <rect x="460" y="145" width="190" height="75" rx="8" fill="#ffffff" stroke="#e2e8f0" stroke-width="1" />';
    svgString += '\n  <text x="475" y="170" class="card-title">Max Patient Pool</text>';
    svgString += '\n  <text x="475" y="200" class="card-value">' + maxPatients.toLocaleString() + '</text>';
    
    svgString += '\n  <rect x="670" y="145" width="175" height="75" rx="8" fill="#ffffff" stroke="#e2e8f0" stroke-width="1" />';
    svgString += '\n  <text x="685" y="170" class="card-title">Forecast Horizon</text>';
    svgString += '\n  <text x="685" y="200" class="card-value">10 Years</text>';

    svgString += '\n  <text x="40" y="260" class="section-title">10-Year Net Revenue Forecast ($ Millions)</text>';
    svgString += '\n  <rect x="40" y="275" width="805" height="280" rx="12" fill="#ffffff" stroke="#e2e8f0" stroke-width="1" />';

    const chartWidth = 660;
    const chartHeight = 175;
    const chartX = 120;
    const chartY = 310;

    const tickCount = 4;
    for (let i = 0; i <= tickCount; i++) {
      const yVal = chartY + chartHeight - (i / tickCount) * chartHeight;
      const labelVal = ((i / tickCount) * (peakRevenue / 1e6)).toFixed(1);
      svgString += '\n  <line x1="' + chartX + '" y1="' + yVal + '" x2="' + (chartX + chartWidth) + '" y2="' + yVal + '" stroke="#f1f5f9" stroke-width="1" />';
      svgString += '\n  <text x="' + (chartX - 10) + '" y="' + (yVal + 3) + '" text-anchor="end" class="axis-label">$' + labelVal + 'M</text>';
    }

    years.forEach((yr, idx) => {
      const xVal = chartX + (idx / (years.length - 1)) * chartWidth;
      svgString += '\n  <line x1="' + xVal + '" y1="' + chartY + '" x2="' + xVal + '" y2="' + (chartY + chartHeight) + '" stroke="#f8fafc" stroke-width="1" />';
      svgString += '\n  <text x="' + xVal + '" y="' + (chartY + chartHeight + 16) + '" text-anchor="middle" class="axis-label">' + yr + '</text>';
    });

    products.forEach((p, pIdx) => {
      const color = CHART_COLORS[pIdx % CHART_COLORS.length];
      let pathD = '';
      
      years.forEach((yr, idx) => {
        const xVal = chartX + (idx / (years.length - 1)) * chartWidth;
        const revVal = derivedData.revenue[cCode]?.[yr]?.[p] || 0;
        const yVal = chartY + chartHeight - (revVal / peakRevenue) * chartHeight;
        pathD += (idx === 0 ? 'M' : 'L') + ' ' + xVal.toFixed(1) + ' ' + yVal.toFixed(1);
      });
      
      svgString += '\n  <path d="' + pathD + '" fill="none" stroke="' + color + '" stroke-width="3" stroke-linecap="round" />';
      
      years.forEach((yr, idx) => {
        const xVal = chartX + (idx / (years.length - 1)) * chartWidth;
        const revVal = derivedData.revenue[cCode]?.[yr]?.[p] || 0;
        const yVal = chartY + chartHeight - (revVal / peakRevenue) * chartHeight;
        svgString += '\n  <circle cx="' + xVal.toFixed(1) + '" cy="' + yVal.toFixed(1) + '" r="4" fill="#ffffff" stroke="' + color + '" stroke-width="2.5" />';
      });
      
      const legendX = 120 + (pIdx % 3) * 220;
      const legendY = 515 + Math.floor(pIdx / 3) * 16;
      svgString += '\n  <rect x="' + legendX + '" y="' + (legendY - 8) + '" width="12" height="12" rx="3" fill="' + color + '" />';
      svgString += '\n  <text x="' + (legendX + 18) + '" y="' + (legendY + 2) + '" class="axis-label" font-weight="600">' + (p.length > 28 ? p.substring(0, 25) + '...' : p) + '</text>';
    });

    svgString += '\n  <text x="40" y="590" class="section-title">Efficacy &amp; Safety Landscape (Forest Plot)</text>';
    svgString += '\n  <rect x="40" y="605" width="805" height="300" rx="12" fill="#ffffff" stroke="#e2e8f0" stroke-width="1" />';
    
    svgString += '\n  <text x="60" y="635" class="axis-label" font-weight="700">TREATMENT AGENT</text>';
    svgString += '\n  <text x="250" y="635" class="axis-label" font-weight="700">N</text>';
    svgString += '\n  <text x="310" y="635" class="axis-label" font-weight="700">HR (95% CI)</text>';
    svgString += '\n  <text x="560" y="635" class="axis-label" font-weight="700" text-anchor="middle">HAZARD RATIO SCALE</text>';
    svgString += '\n  <text x="750" y="635" class="axis-label" font-weight="700">GRADE 3+ AE</text>';
    
    svgString += '\n  <line x1="60" y1="645" x2="825" y2="645" stroke="#e2e8f0" stroke-width="1.5" />';

    const fData: any[] = (forecastModel as any).efficacy_safety || [
      { agent: 'Targeted Therapy A (Pipeline)', n: 320, hazardRatio: 0.58, ciLower: 0.44, ciUpper: 0.76, toxicityRate: 14.5 },
      { agent: 'First-line Competitor B', n: 450, hazardRatio: 0.72, ciLower: 0.59, ciUpper: 0.88, toxicityRate: 22.1 },
      { agent: 'Standard Immunotherapy C', n: 510, hazardRatio: 0.85, ciLower: 0.71, ciUpper: 1.02, toxicityRate: 29.8 },
      { agent: 'Standard Chemotherapy Control', n: 380, hazardRatio: 1.00, ciLower: 0.88, ciUpper: 1.14, toxicityRate: 46.2 }
    ];

    const plotX = 430;
    const plotW = 260;
    const getPlotX = (val: number) => plotX + ((val - 0.2) / 1.3) * plotW;

    fData.forEach((item, idx) => {
      const rowY = 675 + idx * 45;
      const hrX = getPlotX(item.hazardRatio);
      const lowX = getPlotX(item.ciLower);
      const upX = getPlotX(item.ciUpper);
      
      svgString += '\n  <text x="60" y="' + (rowY + 12) + '" class="forest-title">' + item.agent + '</text>';
      svgString += '\n  <text x="250" y="' + (rowY + 12) + '" class="forest-text font-mono">' + item.n + '</text>';
      svgString += '\n  <text x="310" y="' + (rowY + 12) + '" class="forest-text font-mono">' + item.hazardRatio.toFixed(2) + ' [' + item.ciLower.toFixed(2) + ', ' + item.ciUpper.toFixed(2) + ']</text>';
      
      svgString += '\n  <line x1="' + plotX + '" y1="' + (rowY + 8) + '" x2="' + (plotX + plotW) + '" y2="' + (rowY + 8) + '" stroke="#f1f5f9" stroke-width="1" />';
      svgString += '\n  <line x1="' + lowX + '" y1="' + (rowY + 8) + '" x2="' + upX + '" y2="' + (rowY + 8) + '" stroke="' + (item.hazardRatio < 1.0 ? '#4f6ef7' : '#64748b') + '" stroke-width="2" stroke-linecap="round" />';
      svgString += '\n  <line x1="' + lowX + '" y1="' + (rowY + 4) + '" x2="' + lowX + '" y2="' + (rowY + 12) + '" stroke="' + (item.hazardRatio < 1.0 ? '#4f6ef7' : '#64748b') + '" stroke-width="2" />';
      svgString += '\n  <line x1="' + upX + '" y1="' + (rowY + 4) + '" x2="' + upX + '" y2="' + (rowY + 12) + '" stroke="' + (item.hazardRatio < 1.0 ? '#4f6ef7' : '#64748b') + '" stroke-width="2" />';
      svgString += '\n  <rect x="' + (hrX - 5) + '" y="' + (rowY + 3) + '" width="10" height="10" rx="1" fill="' + (item.hazardRatio < 1.0 ? '#4f6ef7' : '#64748b') + '" />';
      
      svgString += '\n  <text x="750" y="' + (rowY + 3) + '" class="axis-label" font-weight="600">' + item.toxicityRate + '%</text>';
      svgString += '\n  <rect x="750" y="' + (rowY + 8) + '" width="65" height="4" rx="2" fill="#f1f5f9" />';
      svgString += '\n  <rect x="750" y="' + (rowY + 8) + '" width="' + ((item.toxicityRate / 100) * 65) + '" height="4" rx="2" fill="' + (item.toxicityRate > 30 ? '#ef4444' : '#10b981') + '" />';
      
      svgString += '\n  <line x1="60" y1="' + (rowY + 28) + '" x2="825" y2="' + (rowY + 28) + '" stroke="#f8fafc" stroke-width="1" />';
    });

    const lineOfNoEffectX = getPlotX(1.0);
    svgString += '\n  <line x1="' + lineOfNoEffectX + '" y1="645" x2="' + lineOfNoEffectX + '" y2="840" stroke="rgba(239, 68, 68, 0.45)" stroke-width="1.5" stroke-dasharray="3,3" />';
    svgString += '\n  <line x1="' + plotX + '" y1="848" x2="' + (plotX + plotW) + '" y2="848" stroke="#cbd5e1" stroke-width="1" />';
    
    [0.2, 0.6, 1.0, 1.4].forEach(tick => {
      svgString += '\n  <line x1="' + getPlotX(tick) + '" y1="848" x2="' + getPlotX(tick) + '" y2="852" stroke="#cbd5e1" stroke-width="1" />';
      svgString += '\n  <text x="' + getPlotX(tick) + '" y="862" text-anchor="middle" font-size="8" fill="#64748b">' + tick.toFixed(1) + '</text>';
    });
    
    svgString += '\n  <text x="' + (plotX + plotW / 2) + '" y="874" text-anchor="middle" font-size="9" font-weight="600" fill="#64748b">← Favors Treatment | Favors Control →</text>';

    svgString += '\n  <text x="40" y="930" class="section-title">Clinical Outlook &amp; SWOT Analysis</text>';
    svgString += '\n  <rect x="40" y="945" width="805" height="630" rx="12" fill="#ffffff" stroke="#e2e8f0" stroke-width="1" />';

    const executiveParagraph = forecastModel.insights?.split('\n\n')
      .find(p => p.includes('Analysis of the therapeutic') || p.includes('Executive Overview'))
      ?.replace(/#### Executive Overview\n?/, '') || 
      ('Analysis of the therapeutic landscape for ' + forecastModel.disease + ' indicates a highly active research profile backed by clinical trials and scientific publications. The pipeline shows actively recruiting and active phase studies.');

    const cleanedExecutiveText = executiveParagraph.replace(/\*\*/g, '').replace(/#/g, '').trim();
    const linesOfExecutive = splitTextIntoLines(cleanedExecutiveText, 115);

    svgString += '\n  <text x="60" y="975" class="insights-title">Executive Summary Outlook</text>';
    linesOfExecutive.forEach((line, idx) => {
      svgString += '\n  <text x="60" y="' + (1000 + idx * 19) + '" class="insights-text">' + line + '</text>';
    });

    const swot = getSwotQuadrants(forecastModel.insights || '');

    svgString += '\n  <text x="60" y="1135" class="insights-title">SWOT Analysis Matrix</text>';
    
    svgString += '\n  <!-- Strengths Box (Blue) -->';
    svgString += '\n  <rect x="60" y="1155" width="380" height="180" rx="8" fill="rgba(79, 110, 247, 0.03)" stroke="rgba(79, 110, 247, 0.2)" stroke-width="1.2" />';
    svgString += '\n  <rect x="60" y="1155" width="380" height="30" rx="8" fill="rgba(79, 110, 247, 0.08)" />';
    svgString += '\n  <text x="75" y="1175" class="swot-header" fill="#4f6ef7">STRENGTHS</text>';
    
    svgString += '\n  <!-- Weaknesses Box (Red) -->';
    svgString += '\n  <rect x="450" y="1155" width="380" height="180" rx="8" fill="rgba(239, 68, 68, 0.03)" stroke="rgba(239, 68, 68, 0.2)" stroke-width="1.2" />';
    svgString += '\n  <rect x="450" y="1155" width="380" height="30" rx="8" fill="rgba(239, 68, 68, 0.08)" />';
    svgString += '\n  <text x="465" y="1175" class="swot-header" fill="#ef4444">WEAKNESSES</text>';
    
    svgString += '\n  <!-- Opportunities Box (Green) -->';
    svgString += '\n  <rect x="60" y="1355" width="380" height="180" rx="8" fill="rgba(16, 185, 129, 0.03)" stroke="rgba(16, 185, 129, 0.2)" stroke-width="1.2" />';
    svgString += '\n  <rect x="60" y="1355" width="380" height="30" rx="8" fill="rgba(16, 185, 129, 0.08)" />';
    svgString += '\n  <text x="75" y="1375" class="swot-header" fill="#10b981">OPPORTUNITIES</text>';
    
    svgString += '\n  <!-- Threats Box (Amber) -->';
    svgString += '\n  <rect x="450" y="1355" width="380" height="180" rx="8" fill="rgba(245, 158, 11, 0.03)" stroke="rgba(245, 158, 11, 0.2)" stroke-width="1.2" />';
    svgString += '\n  <rect x="450" y="1355" width="380" height="30" rx="8" fill="rgba(245, 158, 11, 0.08)" />';
    svgString += '\n  <text x="465" y="1375" class="swot-header" fill="#f59e0b">THREATS</text>';

    const drawSwotText = (text: string, x: number, startY: number) => {
      const bulletLines = text.split('\n');
      let currentY = startY;
      bulletLines.forEach(line => {
        const wrapped = splitTextIntoLines(line, 55);
        wrapped.forEach((wl, wIdx) => {
          svgString += '\n  <text x="' + (x + (wIdx === 0 ? 0 : 10)) + '" y="' + currentY + '" class="swot-text">' + (wIdx === 0 ? '• ' : '') + wl.replace(/^[•\s*-]+/, '') + '</text>';
          currentY += 15;
        });
        currentY += 5;
      });
    };

    drawSwotText(swot.strengths, 75, 1205);
    drawSwotText(swot.weaknesses, 465, 1205);
    drawSwotText(swot.opportunities, 75, 1405);
    drawSwotText(swot.threats, 465, 1405);

    svgString += '\n</svg>';

    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'SAdvisory_' + forecastModel.disease + '_Forecast_Report.svg';
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
              <line x1={padL} x2={W - padR} y1={y} y2={y} stroke="var(--chart-grid-color)" strokeWidth={1} />
              <text x={padL - 8} y={y + 4} textAnchor="end" className="chart-label-text" fill="var(--chart-label-color)">
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
              <line x1={x} x2={x} y1={padT} y2={H - padB} stroke="var(--chart-grid-light)" />
              <text x={x} y={H - padB + 18} textAnchor="middle" className="chart-label-text" fill="var(--chart-label-color)">
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
                  stroke="var(--dashboard-bg)"
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
            stroke="var(--chart-active-color)"
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
                fill={isSelected ? 'var(--chart-legend-active-color)' : 'var(--chart-label-color)'}
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
              <text x={padL - 8} y={y + 4} textAnchor="end" className="chart-label-text" fill="var(--chart-label-color)">
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
              <text x={x} y={H - padB + 18} textAnchor="middle" className="chart-label-text" fill="var(--chart-label-color)">
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
              <text x={20} y={10} className="chart-legend-text" fill="var(--chart-label-color)">
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
              <text x={padL - 8} y={y + 4} textAnchor="end" className="chart-label-text" fill="var(--chart-label-color)">
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
              <text x={x} y={H - padB + 18} textAnchor="middle" className="chart-label-text" fill="var(--chart-label-color)">
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
              <text x={20} y={10} className="chart-legend-text" fill="var(--chart-label-color)">
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
        <circle cx={cx} cy={cy} r={r - strokeW/2 - 2} fill="var(--donut-center-bg)" opacity={0.6} />
        <text x={cx} y={cy} textAnchor="middle" fill="var(--chart-legend-active-color)" fontWeight={700} fontSize={12}>
          {hoveredDonutProduct
            ? (hoveredDonutProduct.length > 15 ? `${hoveredDonutProduct.slice(0, 13)}...` : hoveredDonutProduct)
            : "Market Share"
          }
        </text>
        <text x={cx} y={cy + 18} textAnchor="middle" fill="var(--chart-donut-value-color)" fontWeight={800} fontSize={16}>
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
                fill={isHovered ? 'var(--chart-legend-active-color)' : 'var(--chart-label-color)'}
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
                  placeholder={placeholder}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <h1 className="disease-title" style={{ margin: 0 }}>{forecastModel.disease} Market Forecast</h1>
                {forecastModel.confidence_score !== undefined && (
                  <div className="confidence-badge-wrapper">
                    <span className={`confidence-badge confidence-badge--${forecastModel.confidence_score >= 80 ? 'high' : forecastModel.confidence_score >= 60 ? 'medium' : 'low'}`}>
                      <Shield size={13} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {forecastModel.confidence_score}% Confidence
                    </span>
                    <div className="confidence-tooltip">
                      <h4 className="confidence-tooltip-title">Data Completeness Checklist</h4>
                      <ul className="confidence-tooltip-list">
                        {forecastModel.confidence_reasons?.map((reason, idx) => (
                          <li key={idx} className="confidence-tooltip-item">✓ {reason}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
              <p className="years-subtitle">Demographics &amp; Revenues Projected: 2026–2035</p>
            </div>
            
            <div className="header-actions">
              {onPinForecast && (
                <button
                  className="btn-secondary"
                  onClick={() => onPinForecast(derivedData)}
                  style={{ background: 'rgba(99, 102, 241, 0.08)', color: 'var(--color-accent)', border: '1px solid rgba(99, 102, 241, 0.2)' }}
                >
                  Pin Forecast
                </button>
              )}
              {pinnedCount > 0 && onViewComparison && (
                <button
                  className="btn-secondary"
                  onClick={onViewComparison}
                  style={{ border: '1.5px solid #10b981', color: '#10b981', fontWeight: 600 }}
                >
                  Compare ({pinnedCount})
                </button>
              )}
              <button className="btn-secondary" onClick={handleExportCSV}>
                <Download size={14} /> Export CSV Data
              </button>
              <button className="btn-secondary" onClick={handleDownloadSVG}>
                <Download size={14} /> Download SVG Report
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
                <label className="sidebar-label">Forecasting Projection Model</label>
                <div className="custom-select-wrapper">
                  <select
                    value={selectedModel}
                    onChange={(e) => {
                      setSelectedModel(e.target.value);
                      handleGenerateForecast(forecastModel.disease, forecastModel.category, e.target.value);
                    }}
                    className="sidebar-select"
                  >
                    <option value="s_curve">S-Curve Market Diffusion</option>
                    <option value="linear">Linear Patient Uptake</option>
                    <option value="exponential">Exponential Market Spread</option>
                    <option value="smoothing">Double Exponential Smoothing</option>
                  </select>
                  <ChevronDown size={14} className="select-arrow" />
                </div>
              </div>

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
                  className={`dash-tab-btn ${activeTab === 'insights' ? 'active' : ''}`}
                  onClick={() => setActiveTab('insights')}
                >
                  <Sparkles size={14} /> AI Insights
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
                    <div style={{ marginTop: '2.5rem' }}>
                      <ForestPlot disease={forecastModel.disease} />
                    </div>
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

                {/* 6. AI INSIGHTS PANEL */}
                {activeTab === 'insights' && (
                  <div className="tab-panel fade-in-up">
                    <h3 className="section-title">
                      <Sparkles size={16} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '0.5rem', color: '#f59e0b' }} />
                      AI Clinical Insights &amp; Market Summary
                    </h3>
                    <p className="section-desc">LLM-synthesized summary of clinical pipelines, regulatory approvals, and standard of care.</p>
                    <div className="glass-panel" style={{ padding: '2rem', minHeight: '200px' }}>
                      {forecastModel.insights ? (
                        <div className="insights-markdown">
                          {renderCleanInsights(forecastModel.insights)}
                        </div>
                      ) : (
                        <p className="text-muted">No insights generated for this model yet.</p>
                      )}
                    </div>
                  </div>
                )}

                {/* 7. CITATIONS */}
                {activeTab === 'citations' && (
                  <div className="tab-panel fade-in-up">
                    <h3 className="section-title">Research Citations &amp; Data Sources</h3>
                    <p className="section-desc">Scientific references and API databases queried for this model.</p>
                    <ul className="citations-list">
                      {forecastModel.data_sources.map((src, i) => (
                        <li key={i} className="citation-item glass-panel">
                          <Check size={14} className="check-icon" />
                          {src.url ? (
                            <a href={src.url} target="_blank" rel="noopener noreferrer" className="citation-link font-medium">
                              {src.name}
                            </a>
                          ) : (
                            <span>{src.name}</span>
                          )}
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
