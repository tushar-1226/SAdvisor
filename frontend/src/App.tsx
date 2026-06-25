import { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  Stethoscope,
  AlertTriangle,
  FlaskConical,
  FileText,
  Pill,
  Microscope,
  Download,
  TrendingUp,
  Sparkles,
  Shield,
  Sun,
  Moon,
  Database,
} from 'lucide-react';
import './App.css';
import SearchBar from './components/SearchBar';
import TrialCard from './components/TrialCard';
import ArticleCard from './components/ArticleCard';
import DrugCard from './components/DrugCard';
import TrialModal from './components/TrialModal';
import FilterPanel from './components/FilterPanel';
import type { FilterState } from './components/FilterPanel';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import PharmaceuticalForecast from './components/PharmaceuticalForecast';
import ErrorBoundary from './components/ErrorBoundary';

import ComparisonDashboard from './components/ComparisonDashboard';
import TrialVisualizer from './components/TrialVisualizer';
import ExcelDashboard from './components/ExcelDashboard';
import IntelligenceDashboard from './components/IntelligenceDashboard';
import { searchDisease } from './api';
import type { SearchResults } from './types';

type AppMode = 'search' | 'pharmaceutical' | 'excel' | 'intelligence';


type Tab = 'trials' | 'articles' | 'drugs' | 'insights' | 'visualizer';

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
      const cleanItem = line.replace(/^[*\-•]\s*/, '').replace(/\*\*/g, '').trim();
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

function App() {
  const [appMode, setAppMode] = useState<AppMode>('search');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('trials');

  // Theme State (Premium Dark theme by default)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return 'dark';
  });

  // Apply theme to document element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);


  // Pinned Forecasts State
  const [pinnedForecasts, setPinnedForecasts] = useState<{ disease?: string; [key: string]: unknown }[]>([]);
  const [isComparing, setIsComparing] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedNctId, setSelectedNctId] = useState<string | null>(null);

  // Filter State
  const [filters, setFilters] = useState<FilterState>({
    nctId: '',
    statuses: [],
    phases: [],
    sponsor: '',
  });

  const handleSearch = async (query: string) => {
    setIsLoading(true);
    setError(null);
    setResults(null);
    setHasSearched(true);
    setActiveTab('trials');
    
    // Reset filters on a new search
    setFilters({
      nctId: '',
      statuses: [],
      phases: [],
      sponsor: '',
    });

    try {
      const data = await searchDisease(query);
      setResults(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Get all unique sponsors from active search results
  const allSponsors = useMemo(() => {
    if (!results || !results.trials) return [];
    const set = new Set<string>();
    results.trials.forEach((t) => {
      if (t.sponsor) set.add(t.sponsor);
    });
    return Array.from(set).sort();
  }, [results]);

  // Apply filters to search results
  const filteredTrials = useMemo(() => {
    if (!results || !results.trials) return [];
    return results.trials.filter((trial) => {
      // 1. NCT ID Filter
      if (filters.nctId.trim()) {
        const term = filters.nctId.trim().toLowerCase();
        if (!trial.nctId.toLowerCase().includes(term)) {
          return false;
        }
      }

      // 2. Status Filter
      if (filters.statuses.length > 0) {
        const trialStatus = (trial.overallStatus || '').toUpperCase();
        const isMatch = filters.statuses.some((status) => {
          if (status === 'ACTIVE') {
            return trialStatus.includes('ACTIVE'); // matches ACTIVE_NOT_RECRUITING etc.
          }
          if (status === 'TERMINATED') {
            return (
              trialStatus === 'TERMINATED' ||
              trialStatus === 'WITHDRAWN' ||
              trialStatus === 'SUSPENDED'
            );
          }
          return trialStatus === status;
        });
        if (!isMatch) return false;
      }

      // 3. Phase Filter
      if (filters.phases.length > 0) {
        if (!trial.phases || trial.phases.length === 0) {
          return false;
        }
        const isMatch = trial.phases.some((phase) =>
          filters.phases.includes(phase)
        );
        if (!isMatch) return false;
      }

      // 4. Sponsor Filter
      if (filters.sponsor) {
        if (trial.sponsor !== filters.sponsor) {
          return false;
        }
      }

      return true;
    });
  }, [results, filters]);

  // Export Filtered Trials to CSV
  const handleExportCSV = () => {
    if (filteredTrials.length === 0) return;

    const headers = [
      'NCT ID',
      'Brief Title',
      'Overall Status',
      'Phase',
      'Start Date',
      'Completion Date',
      'Sponsor',
      'Study Type',
      'Enrollment',
      'Interventions',
      'Brief Summary',
    ];

    const csvRows = [headers.join(',')];

    filteredTrials.forEach((t) => {
      const row = [
        t.nctId || '',
        t.briefTitle || '',
        t.overallStatus || '',
        (t.phases || []).join(', '),
        t.startDate || '',
        t.completionDate || '',
        t.sponsor || '',
        t.studyType || '',
        t.enrollmentCount || '',
        (t.interventions || []).map((iv) => `${iv.type}: ${iv.name}`).join('; '),
        t.briefSummary || '',
      ];

      const escaped = row.map((val) => {
        const s = String(val).replace(/"/g, '""');
        return `"${s}"`;
      });
      csvRows.push(escaped.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const diseaseSafe = results?.query.replace(/\s+/g, '_') || 'Export';
    a.download = `SAdvisory_Trials_${diseaseSafe}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };



  // Export Filtered Trials to Excel (real .xlsx format)
  const handleExportExcel = () => {
    if (filteredTrials.length === 0) return;

    const data = filteredTrials.map((t) => ({
      'NCT ID': t.nctId || '',
      'Brief Title': t.briefTitle || '',
      'Overall Status': t.overallStatus || '',
      'Phase': (t.phases || []).join(', '),
      'Start Date': t.startDate || '',
      'Completion Date': t.completionDate || '',
      'Sponsor': t.sponsor || '',
      'Study Type': t.studyType || '',
      'Enrollment': typeof t.enrollmentCount === 'number' ? t.enrollmentCount : (t.enrollmentCount || ''),
      'Interventions': (t.interventions || []).map((iv) => `${iv.type}: ${iv.name}`).join('; '),
      'Brief Summary': t.briefSummary || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Trials Analysis');

    // Auto-fit column widths
    if (data.length > 0) {
      const maxLens = Object.keys(data[0]).map((key) => {
        let maxLen = key.length;
        data.forEach((row) => {
          const val = String(row[key as keyof typeof row] || '');
          if (val.length > maxLen) {
            maxLen = val.length;
          }
        });
        // Cap column width to 50 for readability, but give at least 10 width
        return { wch: Math.max(10, Math.min(maxLen + 2, 50)) };
      });
      worksheet['!cols'] = maxLens;
    }

    const diseaseSafe = results?.query.replace(/\s+/g, '_') || 'Export';
    XLSX.writeFile(workbook, `SAdvisory_Trials_${diseaseSafe}.xlsx`);
  };

  const trialsCount = results?.trials.length ?? 0;
  const articlesCount = results?.articles.length ?? 0;
  const drugsCount = results?.drugs.length ?? 0;

  return (
    <>
      {/* ── Header ── */}
      <header className="app-header">
        <div className="app-logo">
          <div className="app-logo-icon">S</div>
          <div className="app-logo-text">
            <span>S</span>Advisory
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="mode-toggle" role="group" aria-label="App mode">
          <button
            id="mode-btn-search"
            className={`mode-toggle-btn ${appMode === 'search' ? 'mode-toggle-btn--active' : ''}`}
            onClick={() => setAppMode('search')}
          >
            <Stethoscope size={14} /> Clinical Search
          </button>
          <button
            id="mode-btn-pharma"
            className={`mode-toggle-btn ${appMode === 'pharmaceutical' ? 'mode-toggle-btn--active' : ''}`}
            onClick={() => setAppMode('pharmaceutical')}
          >
            <TrendingUp size={14} /> Pharmaceutical
          </button>
          <button
            id="mode-btn-excel"
            className={`mode-toggle-btn ${appMode === 'excel' ? 'mode-toggle-btn--active' : ''}`}
            onClick={() => setAppMode('excel')}
          >
            <FileText size={14} /> Excel Analyzer
          </button>
          <button
            id="mode-btn-intel"
            className={`mode-toggle-btn ${appMode === 'intelligence' ? 'mode-toggle-btn--active' : ''}`}
            onClick={() => setAppMode('intelligence')}
          >
            <Database size={14} /> Drug Intelligence
          </button>
        </div>

        <div className="app-header-actions" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>

          {/* Theme Toggle Button */}
          <button
            className="header-action-btn"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            title="Toggle Theme"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-full)',
              transition: 'background var(--duration-fast)',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-surface-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          
          <span className="app-header-meta">Clinical Intelligence Dashboard</span>
        </div>
      </header>



      {/* ── Pharmaceutical Mode ── */}
      {appMode === 'pharmaceutical' && (
        <main className="app-main">
          <ErrorBoundary>
            {isComparing ? (
              <ComparisonDashboard
                comparisonList={pinnedForecasts}
                onBack={() => setIsComparing(false)}
                onRemove={(idx) => {
                  const updated = [...pinnedForecasts];
                  updated.splice(idx, 1);
                  setPinnedForecasts(updated);
                  if (updated.length === 0) {
                    setIsComparing(false);
                  }
                }}
              />
            ) : (
              <PharmaceuticalForecast
                onPinForecast={(model) => {
                  if (pinnedForecasts.some(f => f.disease === model.disease)) {
                    alert('This forecast is already pinned for comparison!');
                    return;
                  }
                  setPinnedForecasts([...pinnedForecasts, model]);
                }}
                pinnedCount={pinnedForecasts.length}
                onViewComparison={() => setIsComparing(true)}
              />
            )}
          </ErrorBoundary>
        </main>
      )}


      {/* ── Excel Analyzer Mode ── */}
      {appMode === 'excel' && (
        <main className="app-main">
          <ErrorBoundary>
            <ExcelDashboard />
          </ErrorBoundary>
        </main>
      )}

      {/* ── Drug Intelligence Mode ── */}
      {appMode === 'intelligence' && (
        <main className="app-main">
          <ErrorBoundary>
            <IntelligenceDashboard />
          </ErrorBoundary>
        </main>
      )}


      {/* ── Search Mode ── */}
      {appMode === 'search' && (
      <>
      {/* ── Hero / Search ── */}
      <section className="hero-section">
        <span className="hero-badge">
          <Stethoscope size={14} /> Powered by ClinicalTrials.gov &amp; PubMed
        </span>
        <h1 className="hero-title">Search clinical trials, articles &amp; drugs</h1>
        <p className="hero-subtitle">
          Enter any disease or condition to instantly discover related NCT
          clinical trials, PubMed research articles, and drug compound data.
        </p>
        <SearchBar onSearch={handleSearch} isLoading={isLoading} />
      </section>
      {/* ── Main Content ── */}
      <main className="app-main">
        {/* Error */}
        {error && (
          <div className="error-banner" role="alert">
            <AlertTriangle size={16} /> {error}
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="loading-container">
            <div className="loading-spinner" />
            <p className="loading-text">
              Searching across ClinicalTrials.gov, PubMed &amp; PubChem…
            </p>
          </div>
        )}

        {/* Results */}
        {results && !isLoading && (
          <div className="results-section fade-in-up">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)' }}>
                Search Results for "{results.query}"
              </h2>
              {results.confidence_score !== undefined && (
                <div className="confidence-badge-wrapper">
                  <span className={`confidence-badge confidence-badge--${results.confidence_score >= 80 ? 'high' : results.confidence_score >= 60 ? 'medium' : 'low'}`}>
                    <Shield size={13} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {results.confidence_score}% Confidence
                  </span>
                  <div className="confidence-tooltip">
                    <h4 className="confidence-tooltip-title">Data Completeness Checklist</h4>
                    <ul className="confidence-tooltip-list">
                      {results.confidence_reasons?.map((reason, idx) => (
                        <li key={idx} className="confidence-tooltip-item">✓ {reason}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className="tabs">
              <button
                id="tab-trials"
                className={`tab-btn ${
                  activeTab === 'trials' ? 'tab-btn--active' : ''
                }`}
                onClick={() => setActiveTab('trials')}
              >
                <FlaskConical size={15} /> Trials{' '}
                <span className="tab-count">{trialsCount}</span>
              </button>
              <button
                id="tab-articles"
                className={`tab-btn ${
                  activeTab === 'articles' ? 'tab-btn--active' : ''
                }`}
                onClick={() => setActiveTab('articles')}
              >
                <FileText size={15} /> Articles{' '}
                <span className="tab-count">{articlesCount}</span>
              </button>
              <button
                id="tab-drugs"
                className={`tab-btn ${
                  activeTab === 'drugs' ? 'tab-btn--active' : ''
                }`}
                onClick={() => setActiveTab('drugs')}
              >
                <Pill size={15} /> Drugs{' '}
                <span className="tab-count">{drugsCount}</span>
              </button>
              <button
                id="tab-insights"
                className={`tab-btn ${
                  activeTab === 'insights' ? 'tab-btn--active' : ''
                }`}
                onClick={() => setActiveTab('insights')}
              >
                <Sparkles size={15} /> AI Insights
              </button>
              <button
                id="tab-visualizer"
                className={`tab-btn ${
                  activeTab === 'visualizer' ? 'tab-btn--active' : ''
                }`}
                onClick={() => setActiveTab('visualizer')}
              >
                <TrendingUp size={15} /> Visual Analysis
              </button>
            </div>

            {/* ── Trials Tab ── */}
            {activeTab === 'trials' && (
              <>
                {trialsCount > 0 ? (
                  <div className="trials-workspace">
                    <div className="trials-sidebar">
                      <FilterPanel
                        sponsors={allSponsors}
                        onFilterChange={setFilters}
                      />
                    </div>

                    <div className="trials-content-area">
                      <AnalyticsDashboard trials={filteredTrials} />

                      <div className="trials-header-row">
                        <span className="trials-showing-text">
                          Showing <strong>{filteredTrials.length}</strong> of{' '}
                          <strong>{trialsCount}</strong> clinical trials
                        </span>
                        <div className="export-btn-group">
                          <button
                            className="export-action-btn"
                            onClick={handleExportCSV}
                            title="Download filtered trials as CSV"
                          >
                            <Download size={13} /> CSV
                          </button>
                          <button
                            className="export-action-btn"
                            onClick={handleExportExcel}
                            title="Download filtered trials for Excel"
                          >
                            <Download size={13} /> Excel
                          </button>
                        </div>
                      </div>

                      {filteredTrials.length > 0 ? (
                        <div className="cards-grid cards-grid--trials stagger-children">
                          {filteredTrials.map((trial) => (
                            <TrialCard
                              key={trial.nctId}
                              trial={trial}
                              onSelect={(id) => setSelectedNctId(id)}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="empty-state">
                          <span className="icon">
                            <FlaskConical size={28} />
                          </span>
                          <p>No trials match the active filters.</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="empty-state">
                    <span className="icon">
                      <FlaskConical size={28} />
                    </span>
                    <p>No clinical trials found for "{results.query}".</p>
                  </div>
                )}
              </>
            )}

            {/* ── Articles Tab ── */}
            {activeTab === 'articles' && (
              <>
                {articlesCount > 0 ? (
                  <div className="cards-grid cards-grid--articles stagger-children">
                    {results.articles.map((article) => (
                      <ArticleCard key={article.pmid} article={article} />
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <span className="icon">
                      <FileText size={28} />
                    </span>
                    <p>No articles found for "{results.query}".</p>
                  </div>
                )}
              </>
            )}

            {/* ── Drugs Tab ── */}
            {activeTab === 'drugs' && (
              <>
                {drugsCount > 0 ? (
                  <div className="cards-grid cards-grid--drugs stagger-children">
                    {results.drugs.map((drug) => (
                      <DrugCard key={drug.cid} drug={drug} />
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <span className="icon">
                      <Pill size={28} />
                    </span>
                    <p>No drug data extracted for "{results.query}".</p>
                  </div>
                )}
              </>
            )}

            {/* ── AI Insights Tab ── */}
            {activeTab === 'insights' && (
              <div className="tab-panel fade-in-up" style={{ width: '100%' }}>
                <div className="glass-panel" style={{ padding: '2rem', minHeight: '200px', width: '100%', boxSizing: 'border-box' }}>
                  <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                    <Sparkles size={18} style={{ color: '#f59e0b' }} /> AI Clinical Analysis &amp; SWOT Synthesis
                  </h3>
                  {results.insights ? (
                    <div className="insights-markdown">
                      {renderCleanInsights(results.insights)}
                    </div>
                  ) : (
                    <p className="text-muted">No insights available for this search query.</p>
                  )}
                </div>
              </div>
            )}

            {/* ── Visual Analysis Tab ── */}
            {activeTab === 'visualizer' && (
              <TrialVisualizer trials={results.trials} />
            )}
          </div>
        )}

        {/* Initial state – no search yet */}
        {!hasSearched && !isLoading && (
          <div className="empty-state fade-in-up" style={{ marginTop: '1rem' }}>
            <span className="icon">
              <Microscope size={28} />
            </span>
            <p>Start by searching for a disease or condition above.</p>
          </div>
        )}
      </main>
      </>
      )}

      {/* ── Trial Details Modal ── */}
      {selectedNctId && (
        <TrialModal
          nctId={selectedNctId}
          onClose={() => setSelectedNctId(null)}
        />
      )}

    </>
  );
}

export default App;
