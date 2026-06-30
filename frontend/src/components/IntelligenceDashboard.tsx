/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect, useMemo } from 'react';
import { UploadCloud, Database, Info, Activity, AlertCircle, Search, Trash2, Filter, BarChart2, CheckSquare, Zap, Target } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import './IntelligenceDashboard.css';

interface DrugLabel {
  id: number;
  drug_name: string;
  generic_name?: string;
  sponsor?: string;
  approval_date?: string;
  indications?: string;
  dosage?: string;
  adverse_reactions?: string;
  efficacy_data?: string;
  moa?: string;
  biomarkers?: string;
  line_of_therapy?: string;
  black_box_warnings?: string;
  source_file?: string;
}

export default function IntelligenceDashboard() {
  const [labels, setLabels] = useState<DrugLabel[]>([]);
  const [selectedLabel, setSelectedLabel] = useState<DrugLabel | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Advanced features state
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState<'name' | 'date'>('name');
  const [filterSponsor, setFilterSponsor] = useState<string>('All');
  const [filterWarnings, setFilterWarnings] = useState(false);
  const [verifyMode, setVerifyMode] = useState(false);
  
  // Comparison Mode
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [compareList, setCompareList] = useState<number[]>([]);

  // Notification & Modal state
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error' | 'delete' | 'info'} | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{isOpen: boolean, idToDelete: number | null}>({isOpen: false, idToDelete: null});

  const showToast = (message: string, type: 'success' | 'error' | 'delete' | 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchLabels = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/labels');
      if (!res.ok) throw new Error('Failed to fetch labels');
      const data = await res.json();
      setLabels(data.labels || []);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : String(e), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLabels();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('http://localhost:8000/api/labels/upload', {
        method: 'POST',
        body: formData,
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.detail || 'Upload failed');
      
      fetchLabels();
      showToast('PDF uploaded and extracted successfully!', 'success');
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : String(e), 'error');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    setIsSearching(true);
    try {
      const res = await fetch('http://localhost:8000/api/labels/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drug_name: query }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.detail || 'Search failed');
      
      await fetchLabels();
      if (result.data) {
        setSelectedLabel(result.data);
        setIsCompareMode(false);
      }
      setSearchQuery('');
      showToast('Search and extraction completed successfully!', 'success');
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : String(e), 'error');
    } finally {
      setIsSearching(false);
    }
  };

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setConfirmDialog({ isOpen: true, idToDelete: id });
  };

  const confirmDelete = async () => {
    const id = confirmDialog.idToDelete;
    if (id === null) return;
    
    try {
      const res = await fetch(`http://localhost:8000/api/labels/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Failed to delete record');
      }
      
      if (selectedLabel?.id === id) setSelectedLabel(null);
      setCompareList(prev => prev.filter(compId => compId !== id));
      
      fetchLabels();
      showToast('Record deleted successfully.', 'delete');
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : String(e), 'error');
    } finally {
      setConfirmDialog({ isOpen: false, idToDelete: null });
    }
  };

  const toggleCompare = (id: number) => {
    setCompareList(prev => {
      if (prev.includes(id)) return prev.filter(c => c !== id);
      if (prev.length >= 3) {
        showToast('You can only compare up to 3 drugs at once', 'info');
        return prev;
      }
      return [...prev, id];
    });
  };

  // --- Derived Data for Advanced Features ---

  const sponsors = useMemo(() => {
    const s = new Set<string>();
    labels.forEach(l => l.sponsor && s.add(l.sponsor));
    return Array.from(s).sort();
  }, [labels]);

  const topSponsor = useMemo(() => {
    if (labels.length === 0) return 'N/A';
    const counts: Record<string, number> = {};
    labels.forEach(l => {
      if (l.sponsor) counts[l.sponsor] = (counts[l.sponsor] || 0) + 1;
    });
    return Object.keys(counts).sort((a,b) => counts[b] - counts[a])[0] || 'N/A';
  }, [labels]);

  const warningPercentage = useMemo(() => {
    if (labels.length === 0) return 0;
    const withWarnings = labels.filter(l => l.black_box_warnings && l.black_box_warnings.trim().length > 5).length;
    return Math.round((withWarnings / labels.length) * 100);
  }, [labels]);

  const filteredAndSortedLabels = useMemo(() => {
    let result = [...labels];
    
    if (filterSponsor !== 'All') {
      result = result.filter(l => l.sponsor === filterSponsor);
    }
    if (filterWarnings) {
      result = result.filter(l => l.black_box_warnings && l.black_box_warnings.trim().length > 5);
    }
    
    result.sort((a, b) => {
      if (sortOrder === 'name') {
        return a.drug_name.localeCompare(b.drug_name);
      } else {
        // Fallback for dates
        const dateA = a.approval_date || '1900-01-01';
        const dateB = b.approval_date || '1900-01-01';
        return dateB.localeCompare(dateA);
      }
    });
    
    return result;
  }, [labels, filterSponsor, filterWarnings, sortOrder]);

  const drugsToCompare = useMemo(() => {
    return labels.filter(l => compareList.includes(l.id));
  }, [labels, compareList]);

  // --- Render Helpers ---

  const renderPills = (csvString?: string, type: 'biomarker' | 'lot' = 'biomarker') => {
    if (!csvString || csvString.trim().toLowerCase() === 'n/a' || csvString.trim().toLowerCase() === 'none') {
      return <span style={{ color: 'var(--text-muted)' }}>None</span>;
    }
    const items = csvString.split(',').map(s => s.trim()).filter(s => s);
    return (
      <div>
        {items.map((item, idx) => (
          <span key={idx} className={`pill-badge ${type === 'lot' ? 'lot' : ''}`}>
            {type === 'biomarker' ? <Target size={12} style={{marginRight: 4}}/> : <CheckSquare size={12} style={{marginRight: 4}}/>}
            {item}
          </span>
        ))}
      </div>
    );
  };

  const renderVerifiedText = (text?: string) => {
    if (!text) return <span style={{ color: 'var(--text-muted)' }}>Not extracted</span>;
    
    if (!verifyMode) {
      return <div className="markdown-content"><ReactMarkdown>{text}</ReactMarkdown></div>;
    }
    
    // Simple heuristic to highlight common medical terms as "verified"
    const keywords = ["inhibitor", "receptor", "mg", "ml", "cancer", "kinase", "antibody", "FDA", "tumor", "dose", "patient", "clinical trial"];
    const regex = new RegExp(`\\b(${keywords.join('|')})\\b`, 'gi');
    
    const parts = text.split(regex);
    return (
      <div className="markdown-content verify-mode-text" style={{ whiteSpace: 'pre-wrap' }}>
        {parts.map((part, i) => 
          keywords.some(k => k.toLowerCase() === part.toLowerCase()) ? 
            <span key={i} className="source-highlight">{part}</span> : 
            <span key={i}>{part}</span>
        )}
      </div>
    );
  };

  return (
    <div className="intelligence-dashboard fade-in-up" style={{ padding: '2rem', position: 'relative' }}>
      
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px', background: 'white', color: 'var(--text-primary)',
          padding: '1rem 1.5rem', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          display: 'flex', alignItems: 'center', gap: '0.75rem', zIndex: 1000,
          borderLeft: `4px solid ${toast.type === 'success' ? '#10b981' : toast.type === 'delete' || toast.type === 'error' ? '#ef4444' : '#3b82f6'}`,
          animation: 'slideInRight 0.3s ease-out'
        }}>
          {toast.type === 'success' && <div style={{ color: '#10b981' }}><Activity size={18} /></div>}
          {(toast.type === 'delete' || toast.type === 'error') && <div style={{ color: '#ef4444' }}><AlertCircle size={18} /></div>}
          {toast.type === 'info' && <div style={{ color: '#3b82f6' }}><Info size={18} /></div>}
          <span style={{ fontWeight: 500 }}>{toast.message}</span>
        </div>
      )}

      {/* Confirm Dialog */}
      {confirmDialog.isOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            width: '90%', maxWidth: '400px', animation: 'slideUp 0.2s ease-out'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
              <AlertCircle size={20} color="#ef4444" /> Delete Record
            </h3>
            <p style={{ margin: '0 0 2rem 0', color: 'var(--text-secondary)' }}>Are you sure you want to permanently delete this intelligence record?</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button onClick={() => setConfirmDialog({ isOpen: false, idToDelete: null })} style={{ padding: '0.5rem 1rem', background: 'transparent', border: '1px solid var(--color-border)', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={confirmDelete} style={{ padding: '0.5rem 1rem', background: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer', color: 'white', fontWeight: 500 }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      <header style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0, fontSize: '1.5rem', color: 'var(--text-primary)' }}>
            <Database size={24} style={{ color: '#4f6ef7' }}/> Drug Intelligence Database
          </h2>
          <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-secondary)' }}>
            Extract and analyze FDA drug labels using AI to build a searchable knowledge base.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '0.25rem' }}>
            <input 
              type="text" placeholder="Search FDA drug label..." 
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              disabled={isSearching || uploading}
              style={{ border: 'none', background: 'transparent', padding: '0.5rem 0.75rem', color: 'var(--text-primary)', outline: 'none', width: '220px' }}
            />
            <button type="submit" disabled={isSearching || uploading || !searchQuery.trim()}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem',
                background: 'var(--color-primary, #4f6ef7)', color: 'white', border: 'none',
                borderRadius: '6px', cursor: (isSearching || uploading || !searchQuery.trim()) ? 'not-allowed' : 'pointer',
                opacity: (isSearching || uploading || !searchQuery.trim()) ? 0.7 : 1, transition: 'opacity 0.2s'
              }}
              title="Search and Extract"
            >
              {isSearching ? <div className="loading-spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }} /> : <Search size={18} />}
            </button>
          </form>

          <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>or</span>

          <label style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem',
            background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--text-primary)',
            borderRadius: '8px', cursor: uploading || isSearching ? 'wait' : 'pointer', fontWeight: 500, transition: 'background 0.2s'
          }}>
            <UploadCloud size={18} />
            {uploading ? 'Processing...' : 'Upload PDF'}
            <input type="file" accept=".pdf" onChange={handleFileUpload} disabled={uploading || isSearching} style={{ display: 'none' }} />
          </label>
        </div>
      </header>

      {/* High-Level Analytics Dashboard */}
      {!isLoading && labels.length > 0 && (
        <div className="analytics-bar">
          <div className="analytics-card">
            <div className="analytics-icon blue"><Database size={24} /></div>
            <div className="analytics-content">
              <h4>Total Extracted Drugs</h4>
              <p>{labels.length}</p>
            </div>
          </div>
          <div className="analytics-card">
            <div className="analytics-icon green"><Activity size={24} /></div>
            <div className="analytics-content">
              <h4>Top Sponsor</h4>
              <p style={{fontSize: '1.25rem'}}>{topSponsor}</p>
            </div>
          </div>
          <div className="analytics-card">
            <div className="analytics-icon red"><AlertCircle size={24} /></div>
            <div className="analytics-content">
              <h4>With Boxed Warnings</h4>
              <p>{warningPercentage}%</p>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '2rem', minHeight: '600px' }}>
        
        {/* Sidebar / List */}
        <div className="glass-panel" style={{ width: '32%', padding: '1.5rem', borderRadius: '12px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>Extracted Drugs</h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                style={{ border: '1px solid var(--color-border)', padding: '0.4rem', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-primary)', background: isFilterOpen ? 'var(--color-primary-light)' : 'transparent' }}
                title="Filter & Sort"
              >
                <Filter size={16} />
              </button>
              <button 
                onClick={() => setIsCompareMode(!isCompareMode)}
                style={{ background: isCompareMode ? '#4f6ef7' : 'transparent', color: isCompareMode ? 'white' : 'var(--text-primary)', border: '1px solid', borderColor: isCompareMode ? '#4f6ef7' : 'var(--color-border)', padding: '0.4rem 0.75rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <BarChart2 size={16} /> Compare
              </button>
            </div>
          </div>

          {/* Advanced Filter Panel */}
          {isFilterOpen && (
            <div className="filter-panel fade-in-up">
              <div className="filter-group">
                <label>Sort By</label>
                <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value as 'name' | 'date')}>
                  <option value="name">Drug Name (A-Z)</option>
                  <option value="date">Approval Date (Newest)</option>
                </select>
              </div>
              <div className="filter-group">
                <label>Sponsor</label>
                <select value={filterSponsor} onChange={(e) => setFilterSponsor(e.target.value)}>
                  <option value="All">All Sponsors</option>
                  {sponsors.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <label className="filter-toggle" style={{ gridColumn: '1 / -1' }}>
                <input type="checkbox" checked={filterWarnings} onChange={(e) => setFilterWarnings(e.target.checked)} />
                Has Boxed Warning
              </label>
            </div>
          )}
          
          <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem' }}>
            {isLoading ? (
              <p className="text-muted">Loading database...</p>
            ) : filteredAndSortedLabels.length === 0 ? (
              <p className="text-muted">No drugs match your criteria.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {filteredAndSortedLabels.map(label => (
                  <div
                    key={label.id}
                    className="drug-list-item"
                    onClick={() => !isCompareMode && setSelectedLabel(label)}
                    style={{
                      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                      padding: '1rem', borderRadius: '8px', border: '1px solid',
                      borderColor: selectedLabel?.id === label.id && !isCompareMode ? '#4f6ef7' : 'var(--color-border)',
                      background: selectedLabel?.id === label.id && !isCompareMode ? 'rgba(79, 110, 247, 0.05)' : 'transparent',
                      cursor: isCompareMode ? 'default' : 'pointer', transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ flex: 1, paddingRight: isCompareMode ? '2rem' : '0' }}>
                      <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.25rem', color: 'var(--text-primary)' }}>
                        {label.drug_name}
                        {label.black_box_warnings && label.black_box_warnings.length > 5 && (
                          <span title="Has Boxed Warning"><AlertCircle size={14} color="#ef4444" style={{ marginLeft: '6px', verticalAlign: 'middle' }} /></span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{label.generic_name || 'Generic N/A'}</div>
                      <div style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: '#10b981', fontWeight: 500 }}>{label.sponsor}</div>
                    </div>
                    
                    {isCompareMode ? (
                      <input 
                        type="checkbox" 
                        className="compare-checkbox" 
                        checked={compareList.includes(label.id)}
                        onChange={() => toggleCompare(label.id)}
                      />
                    ) : (
                      <button
                        onClick={(e) => handleDelete(e, label.id)}
                        style={{
                          background: 'none', border: 'none', color: 'var(--text-muted)',
                          cursor: 'pointer', padding: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color 0.2s'
                        }}
                        title="Delete Record"
                        onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Detail / Comparison View */}
        <div className="glass-panel" style={{ flex: 1, padding: '2rem', borderRadius: '12px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', overflowY: 'auto' }}>
          
          {isCompareMode ? (
            <div className="fade-in">
              <h2 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BarChart2 size={24} color="#4f6ef7"/> Compare Drugs {compareList.length > 0 && `(${compareList.length}/3)`}
              </h2>
              
              {drugsToCompare.length === 0 ? (
                <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                  <p>Select up to 3 drugs from the list to compare them side-by-side.</p>
                </div>
              ) : (
                <div className="comparison-grid">
                  {drugsToCompare.map(drug => (
                    <div key={drug.id} className="comparison-card">
                      <div className="compare-header">
                        <h3>{drug.drug_name}</h3>
                        <p>{drug.generic_name || 'N/A'} • {drug.sponsor || 'N/A'}</p>
                      </div>
                      
                      {drug.black_box_warnings && drug.black_box_warnings.length > 5 && (
                        <div style={{ padding: '1rem', background: 'var(--color-warning-bg)', color: 'var(--color-warning-text)', fontSize: '0.85rem', borderBottom: '1px solid var(--color-border)', display: 'flex', gap: '0.5rem' }}>
                          <AlertCircle size={16} style={{ flexShrink: 0 }} /> 
                          <span style={{ fontWeight: 500 }}>Boxed Warning</span>
                        </div>
                      )}

                      <div className="compare-section">
                        <h4><Info size={14}/> Indications</h4>
                        <p>{drug.indications || 'N/A'}</p>
                      </div>
                      <div className="compare-section">
                        <h4><Activity size={14}/> Efficacy</h4>
                        <p>{drug.efficacy_data || 'N/A'}</p>
                      </div>
                      <div className="compare-section">
                        <h4><Target size={14}/> Biomarkers</h4>
                        {renderPills(drug.biomarkers, 'biomarker')}
                      </div>
                      <div className="compare-section" style={{ borderBottom: 'none' }}>
                        <h4><CheckSquare size={14}/> Line of Therapy</h4>
                        {renderPills(drug.line_of_therapy, 'lot')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : selectedLabel ? (
            <div className="fade-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--color-border)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
                <div>
                  <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '2rem', color: 'var(--text-primary)' }}>{selectedLabel.drug_name}</h1>
                  <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    <span><strong>Generic:</strong> {selectedLabel.generic_name || 'N/A'}</span>
                    <span><strong>Sponsor:</strong> {selectedLabel.sponsor || 'N/A'}</span>
                    <span><strong>Approval:</strong> {selectedLabel.approval_date || 'N/A'}</span>
                  </div>
                </div>
                
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', color: verifyMode ? '#4f6ef7' : 'var(--text-secondary)', background: verifyMode ? 'rgba(79, 110, 247, 0.1)' : 'transparent', padding: '0.5rem 1rem', borderRadius: '20px', border: '1px solid', borderColor: verifyMode ? '#4f6ef7' : 'var(--color-border)', transition: 'all 0.2s' }}>
                  <input type="checkbox" checked={verifyMode} onChange={(e) => setVerifyMode(e.target.checked)} style={{ display: 'none' }} />
                  <Zap size={16} /> Source Verification
                </label>
              </div>

              {/* Automated Executive Summary */}
              <div className="exec-summary">
                <h3><Info size={18}/> Executive Summary</h3>
                <p>
                  <strong>{selectedLabel.drug_name}</strong> is indicated for {selectedLabel.indications?.split('.')[0] || 'various conditions'}. 
                  {selectedLabel.moa && ` It functions primarily by ${selectedLabel.moa.split('.')[0].toLowerCase()}.`}
                  {selectedLabel.black_box_warnings && selectedLabel.black_box_warnings.length > 5 && ` Note: This drug carries severe boxed warnings regarding ${selectedLabel.black_box_warnings.split('.')[0].toLowerCase()}.`}
                </p>
              </div>

              {selectedLabel.black_box_warnings && selectedLabel.black_box_warnings.length > 5 && (
                <div className="warning-banner" style={{ marginBottom: '2rem' }}>
                  <AlertCircle size={24} style={{ marginTop: '2px' }} />
                  <div>
                    <h4>Boxed Warnings</h4>
                    {renderVerifiedText(selectedLabel.black_box_warnings)}
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <div>
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f59e0b', margin: '0 0 0.75rem 0' }}><Info size={16}/> Indication Summary & Details</h4>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6' }}>
                    {renderVerifiedText(selectedLabel.indications)}
                  </div>
                  
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981', margin: '1.5rem 0 0.75rem 0' }}><Activity size={16}/> Efficacy Data</h4>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6' }}>
                    {renderVerifiedText(selectedLabel.efficacy_data)}
                  </div>
                </div>
                
                <div>
                  <h4 style={{ margin: '0 0 0.75rem 0', color: 'var(--text-primary)' }}>Mechanism of Action</h4>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6' }}>
                    {renderVerifiedText(selectedLabel.moa)}
                  </div>

                  <div style={{ marginTop: '1.5rem' }}>
                    <h4 style={{ margin: '0 0 0.75rem 0', color: 'var(--text-primary)' }}>Biomarkers</h4>
                    {renderPills(selectedLabel.biomarkers, 'biomarker')}
                  </div>
                  
                  <div style={{ marginTop: '1.5rem' }}>
                    <h4 style={{ margin: '0 0 0.75rem 0', color: 'var(--text-primary)' }}>Line of Therapy</h4>
                    {renderPills(selectedLabel.line_of_therapy, 'lot')}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--color-border)' }}>
                <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-primary)' }}>Dosage & Administration</h4>
                <div style={{ padding: '1rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    {renderVerifiedText(selectedLabel.dosage)}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)' }}>
              <Database size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
              <p>Select a drug from the list to view intelligence insights.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
