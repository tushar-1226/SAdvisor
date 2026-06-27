/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect } from 'react';
import { UploadCloud, Database, Info, Activity, AlertCircle, Search, Trash2 } from 'lucide-react';

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
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

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
      setError(e instanceof Error ? e.message : String(e));
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
    setError(null);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('http://localhost:8000/api/labels/upload', {
        method: 'POST',
        body: formData,
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.detail || 'Upload failed');
      
      // Refresh list
      fetchLabels();
      showToast('PDF uploaded and extracted successfully!', 'success');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      showToast('Upload failed.', 'error');
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
    setError(null);

    try {
      const res = await fetch('http://localhost:8000/api/labels/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drug_name: query }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.detail || 'Search failed');
      
      // Refresh list and select the new label
      await fetchLabels();
      if (result.data) {
        setSelectedLabel(result.data);
      }
      setSearchQuery('');
      showToast('Search and extraction completed successfully!', 'success');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      showToast('Search failed.', 'error');
    } finally {
      setIsSearching(false);
    }
  };

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.stopPropagation(); // Prevent selecting the label when clicking delete
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
      
      // If the deleted label is currently selected, clear the selection
      if (selectedLabel?.id === id) {
        setSelectedLabel(null);
      }
      
      fetchLabels();
      showToast('Record deleted successfully.', 'delete');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      showToast('Failed to delete record.', 'error');
    } finally {
      setConfirmDialog({ isOpen: false, idToDelete: null });
    }
  };

  return (
    <div className="intelligence-dashboard fade-in-up" style={{ padding: '2rem', position: 'relative' }}>
      
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: 'white',
          color: 'var(--text-primary)',
          padding: '1rem 1.5rem',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          zIndex: 1000,
          borderLeft: `4px solid ${
            toast.type === 'success' ? '#10b981' : 
            toast.type === 'delete' || toast.type === 'error' ? '#ef4444' : '#3b82f6'
          }`,
          animation: 'slideInRight 0.3s ease-out'
        }}>
          {toast.type === 'success' && <div style={{ color: '#10b981' }}><Activity size={18} /></div>}
          {(toast.type === 'delete' || toast.type === 'error') && <div style={{ color: '#ef4444' }}><AlertCircle size={18} /></div>}
          {toast.type === 'info' && <div style={{ color: '#3b82f6' }}><Info size={18} /></div>}
          <span style={{ fontWeight: 500 }}>{toast.message}</span>
        </div>
      )}

      {/* Confirm Dialog Overlay */}
      {confirmDialog.isOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            background: 'white',
            padding: '2rem',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            width: '90%',
            maxWidth: '400px',
            animation: 'slideUp 0.2s ease-out'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
              <AlertCircle size={20} color="#ef4444" /> Delete Record
            </h3>
            <p style={{ margin: '0 0 2rem 0', color: 'var(--text-secondary)' }}>Are you sure you want to permanently delete this intelligence record?</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button 
                onClick={() => setConfirmDialog({ isOpen: false, idToDelete: null })}
                style={{ padding: '0.5rem 1rem', background: 'transparent', border: '1px solid var(--color-border)', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-primary)' }}
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                style={{ padding: '0.5rem 1rem', background: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer', color: 'white', fontWeight: 500 }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
              type="text" 
              placeholder="Search FDA drug label..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={isSearching || uploading}
              style={{
                border: 'none',
                background: 'transparent',
                padding: '0.5rem 0.75rem',
                color: 'var(--text-primary)',
                outline: 'none',
                width: '220px'
              }}
            />
            <button 
              type="submit"
              disabled={isSearching || uploading || !searchQuery.trim()}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.5rem',
                background: 'var(--color-primary, #4f6ef7)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: (isSearching || uploading || !searchQuery.trim()) ? 'not-allowed' : 'pointer',
                opacity: (isSearching || uploading || !searchQuery.trim()) ? 0.7 : 1,
                transition: 'opacity 0.2s'
              }}
              title="Search and Extract"
            >
              {isSearching ? <div className="loading-spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }} /> : <Search size={18} />}
            </button>
          </form>

          <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>or</span>

          <div style={{ position: 'relative' }}>
            <label style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.25rem',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              color: 'var(--text-primary)',
              borderRadius: '8px',
              cursor: uploading || isSearching ? 'wait' : 'pointer',
              fontWeight: 500,
              transition: 'background 0.2s'
            }}>
              <UploadCloud size={18} />
              {uploading ? 'Processing...' : 'Upload PDF'}
              <input 
                type="file" 
                accept=".pdf" 
                onChange={handleFileUpload}
                disabled={uploading || isSearching}
                style={{ display: 'none' }}
              />
            </label>
          </div>
        </div>
      </header>

      {error && (
        <div className="error-banner" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '1rem', borderRadius: '8px' }}>
          <AlertCircle size={18} /> {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '2rem', minHeight: '500px' }}>
        {/* Sidebar / List */}
        <div className="glass-panel" style={{ width: '30%', padding: '1.5rem', borderRadius: '12px', background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: 'var(--text-primary)' }}>Extracted Drugs ({labels.length})</h3>
          
          {isLoading ? (
            <p className="text-muted">Loading database...</p>
          ) : labels.length === 0 ? (
            <p className="text-muted">No drugs in database. Upload a PDF to begin.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {labels.map(label => (
                <div
                  key={label.id}
                  onClick={() => setSelectedLabel(label)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    padding: '1rem',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: selectedLabel?.id === label.id ? '#4f6ef7' : 'var(--color-border)',
                    background: selectedLabel?.id === label.id ? 'rgba(79, 110, 247, 0.05)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.25rem', color: 'var(--text-primary)' }}>{label.drug_name}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{label.generic_name || 'Generic N/A'}</div>
                    <div style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: '#10b981' }}>{label.sponsor}</div>
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, label.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '0.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'color 0.2s'
                    }}
                    title="Delete Record"
                    onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail View */}
        <div className="glass-panel" style={{ flex: 1, padding: '2rem', borderRadius: '12px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', overflowY: 'auto' }}>
          {selectedLabel ? (
            <div>
              <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
                <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '2rem', color: 'var(--text-primary)' }}>{selectedLabel.drug_name}</h1>
                <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  <span><strong>Generic:</strong> {selectedLabel.generic_name || 'N/A'}</span>
                  <span><strong>Sponsor:</strong> {selectedLabel.sponsor || 'N/A'}</span>
                  <span><strong>Approval:</strong> {selectedLabel.approval_date || 'N/A'}</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <div>
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f59e0b', margin: '0 0 0.75rem 0' }}><Info size={16}/> Indications & Usage</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6' }}>{selectedLabel.indications || 'Not extracted'}</p>
                  
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981', margin: '1.5rem 0 0.75rem 0' }}><Activity size={16}/> Efficacy Data</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6' }}>{selectedLabel.efficacy_data || 'Not extracted'}</p>
                </div>
                
                <div>
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444', margin: '0 0 0.75rem 0' }}><AlertCircle size={16}/> Boxed Warnings</h4>
                  <div style={{ background: 'rgba(239, 68, 68, 0.05)', borderLeft: '3px solid #ef4444', padding: '1rem', color: '#ef4444', fontSize: '0.85rem' }}>
                    {selectedLabel.black_box_warnings || 'None detected'}
                  </div>

                  <h4 style={{ margin: '1.5rem 0 0.75rem 0', color: 'var(--text-primary)' }}>Mechanism of Action</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6' }}>{selectedLabel.moa || 'Not extracted'}</p>
                </div>
              </div>

              <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--color-border)' }}>
                <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-primary)' }}>Additional Intelligence</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                  <div style={{ padding: '1rem', background: 'rgba(79, 110, 247, 0.05)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', textTransform: 'uppercase' }}>Dosage</div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{selectedLabel.dosage || 'N/A'}</div>
                  </div>
                  <div style={{ padding: '1rem', background: 'rgba(79, 110, 247, 0.05)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', textTransform: 'uppercase' }}>Biomarkers</div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{selectedLabel.biomarkers || 'N/A'}</div>
                  </div>
                  <div style={{ padding: '1rem', background: 'rgba(79, 110, 247, 0.05)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', textTransform: 'uppercase' }}>Line of Therapy</div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{selectedLabel.line_of_therapy || 'N/A'}</div>
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
