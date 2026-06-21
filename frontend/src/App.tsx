import { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  Stethoscope,
  AlertTriangle,
  FlaskConical,
  FileText,
  Pill,
  Microscope,
  Download,
  FileSpreadsheet,
  TrendingUp,
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
import ExcelAnalyzer from './components/ExcelAnalyzer';
import PharmaceuticalForecast from './components/PharmaceuticalForecast';
import { searchDisease } from './api';
import type { SearchResults } from './types';

type AppMode = 'search' | 'excel' | 'pharmaceutical';


type Tab = 'trials' | 'articles' | 'drugs';

function App() {
  const [appMode, setAppMode] = useState<AppMode>('search');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('trials');
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
            id="mode-btn-excel"
            className={`mode-toggle-btn ${appMode === 'excel' ? 'mode-toggle-btn--active' : ''}`}
            onClick={() => setAppMode('excel')}
          >
            <FileSpreadsheet size={14} /> Excel Analyzer
          </button>
          <button
            id="mode-btn-pharma"
            className={`mode-toggle-btn ${appMode === 'pharmaceutical' ? 'mode-toggle-btn--active' : ''}`}
            onClick={() => setAppMode('pharmaceutical')}
          >
            <TrendingUp size={14} /> Pharmaceutical
          </button>
        </div>

        <span className="app-header-meta">Clinical Intelligence Dashboard</span>
      </header>



      {/* ── Excel Mode ── */}
      {appMode === 'excel' && (
        <main className="app-main">
          <ExcelAnalyzer />
        </main>
      )}

      {/* ── Pharmaceutical Mode ── */}
      {appMode === 'pharmaceutical' && (
        <main className="app-main">
          <PharmaceuticalForecast />
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
