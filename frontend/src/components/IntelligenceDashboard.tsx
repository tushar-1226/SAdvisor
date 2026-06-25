/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect } from 'react';
import { UploadCloud, Database, Info, Activity, AlertCircle } from 'lucide-react';

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
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="intelligence-dashboard fade-in-up" style={{ padding: '2rem' }}>
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0, fontSize: '1.5rem', color: 'var(--text-primary)' }}>
            <Database size={24} style={{ color: '#4f6ef7' }}/> Drug Intelligence Database
          </h2>
          <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-secondary)' }}>
            Extract and analyze FDA drug labels using AI to build a searchable knowledge base.
          </p>
        </div>

        <div style={{ position: 'relative' }}>
          <label style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.25rem',
            background: 'var(--color-primary, #4f6ef7)',
            color: 'white',
            borderRadius: '8px',
            cursor: uploading ? 'wait' : 'pointer',
            fontWeight: 500,
            transition: 'opacity 0.2s'
          }}>
            <UploadCloud size={18} />
            {uploading ? 'Processing PDF...' : 'Upload FDA Label (PDF)'}
            <input 
              type="file" 
              accept=".pdf" 
              onChange={handleFileUpload}
              disabled={uploading}
              style={{ display: 'none' }}
            />
          </label>
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
                <button
                  key={label.id}
                  onClick={() => setSelectedLabel(label)}
                  style={{
                    textAlign: 'left',
                    padding: '1rem',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: selectedLabel?.id === label.id ? '#4f6ef7' : 'var(--color-border)',
                    background: selectedLabel?.id === label.id ? 'rgba(79, 110, 247, 0.05)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    color: 'var(--text-primary)'
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.25rem' }}>{label.drug_name}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{label.generic_name || 'Generic N/A'}</div>
                  <div style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: '#10b981' }}>{label.sponsor}</div>
                </button>
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
