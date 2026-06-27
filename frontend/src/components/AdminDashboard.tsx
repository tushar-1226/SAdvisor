import React, { useState } from 'react';
import { Search, Building2, Users, User, Mail, Globe, Briefcase, ChevronRight, Activity, ArrowRight } from 'lucide-react';
import { searchApolloCompany } from '../api';
import './AdminDashboard.css';

interface Person {
  id: string;
  name: string;
  title: string;
  email: string;
  linkedin_url?: string;
}

interface CompanyInfo {
  name: string;
  website: string;
  primary_domain?: string;
  industry: string;
  short_description: string;
  employee_count: number;
  founded_year?: number;
  primary_phone?: string;
  linkedin_url?: string;
  twitter_url?: string;
  facebook_url?: string;
  keywords?: string[];
  technologies?: string[];
  annual_revenue?: string;
  total_funding?: string;
  location?: string;
  details?: string; // fallback if not found
}

interface ApolloResponse {
  company: CompanyInfo;
  directors: Person[];
  employees: Person[];
}

const AdminDashboard: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<ApolloResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setError(null);
    setResults(null);

    try {
      const data = await searchApolloCompany(searchQuery);
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search Apollo API.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="admin-dashboard fade-in-up">
      <div className="admin-header">
        <div className="admin-title">
          <Activity className="text-emerald-500" size={28} />
          <h2>Apollo Email Finder</h2>
        </div>
        <p>Search for any company to extract intelligence, directors, and employee emails directly from Apollo.io.</p>
      </div>

      <div className="admin-search-container glass-panel">
        <form onSubmit={handleSearch} className="admin-search-form">
          <div className="search-input-wrapper">
            <Search className="search-icon" size={20} />
            <input
              type="text"
              placeholder="Enter company name (e.g., Apple, Google, Stripe)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="admin-search-input"
              disabled={isLoading}
            />
          </div>
          <button type="submit" className="admin-search-btn" disabled={isLoading || !searchQuery.trim()}>
            {isLoading ? 'Searching...' : 'Extract Intelligence'}
            {!isLoading && <ArrowRight size={16} />}
          </button>
        </form>
      </div>

      {error && (
        <div className="admin-error glass-panel">
          <p>{error}</p>
        </div>
      )}

      {results && (
        <div className="admin-results fade-in-up stagger-children">
          {/* Company Summary */}
          <div className="company-summary-card glass-panel">
            <div className="card-header">
              <Building2 size={20} className="text-blue-500" />
              <h3>Company Intelligence</h3>
            </div>
            {results.company.details ? (
              <p className="not-found-text">{results.company.details}</p>
            ) : (
              <div className="company-details-grid">
                <div className="detail-item">
                  <span className="label">Company Name</span>
                  <span className="value">{results.company.name}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Website</span>
                  <a href={results.company.website?.startsWith('http') ? results.company.website : `https://${results.company.website}`} target="_blank" rel="noreferrer" className="value link">
                    <Globe size={14} /> {results.company.website || results.company.primary_domain || 'N/A'}
                  </a>
                </div>
                <div className="detail-item">
                  <span className="label">Industry</span>
                  <span className="value"><Briefcase size={14}/> {results.company.industry || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Est. Employees</span>
                  <span className="value"><Users size={14}/> {results.company.employee_count?.toLocaleString() || 'N/A'}</span>
                </div>
                
                {results.company.founded_year && (
                  <div className="detail-item">
                    <span className="label">Founded</span>
                    <span className="value">{results.company.founded_year}</span>
                  </div>
                )}
                {results.company.location && (
                  <div className="detail-item">
                    <span className="label">Location</span>
                    <span className="value">{results.company.location}</span>
                  </div>
                )}
                {results.company.annual_revenue && (
                  <div className="detail-item">
                    <span className="label">Revenue</span>
                    <span className="value">{results.company.annual_revenue}</span>
                  </div>
                )}
                {results.company.total_funding && (
                  <div className="detail-item">
                    <span className="label">Total Funding</span>
                    <span className="value">{results.company.total_funding}</span>
                  </div>
                )}
                {results.company.primary_phone && (
                  <div className="detail-item">
                    <span className="label">Phone</span>
                    <span className="value">{results.company.primary_phone}</span>
                  </div>
                )}
                {(results.company.linkedin_url || results.company.twitter_url || results.company.facebook_url) && (
                  <div className="detail-item">
                    <span className="label">Social</span>
                    <div className="value" style={{ display: 'flex', gap: '8px' }}>
                      {results.company.linkedin_url && <a href={results.company.linkedin_url} target="_blank" rel="noreferrer" className="link">LinkedIn</a>}
                      {results.company.twitter_url && <a href={results.company.twitter_url} target="_blank" rel="noreferrer" className="link">Twitter</a>}
                      {results.company.facebook_url && <a href={results.company.facebook_url} target="_blank" rel="noreferrer" className="link">Facebook</a>}
                    </div>
                  </div>
                )}
                
                <div className="detail-item full-width">
                  <span className="label">Description</span>
                  <p className="value description">{results.company.short_description || 'No description available.'}</p>
                </div>
                
                {results.company.keywords && results.company.keywords.length > 0 && (
                  <div className="detail-item full-width">
                    <span className="label">Keywords</span>
                    <div className="value" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {results.company.keywords.map(kw => (
                        <span key={kw} style={{ background: 'var(--color-background)', border: '1px solid var(--color-border)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.85rem' }}>{kw}</span>
                      ))}
                    </div>
                  </div>
                )}

                {results.company.technologies && results.company.technologies.length > 0 && (
                  <div className="detail-item full-width">
                    <span className="label">Tech Stack</span>
                    <div className="value" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {results.company.technologies.map(tech => (
                        <span key={tech} style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.85rem' }}>{tech}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="people-grid">
            {/* Directors List */}
            <div className="people-list-card glass-panel">
              <div className="card-header">
                <User size={20} className="text-amber-500" />
                <div>
                  <h3>Leadership & Directors ({results.directors.length})</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', margin: 0 }}>From your saved Apollo contacts</p>
                </div>
              </div>
              <div className="people-list">
                {results.directors.length > 0 ? (
                  results.directors.map((person) => (
                    <div key={person.id} className="person-card">
                      <div className="person-info">
                        <div className="person-name">{person.name}</div>
                        <div className="person-title">{person.title}</div>
                      </div>
                      <div className="person-contact">
                        <Mail size={14} />
                        <span>{person.email}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="empty-text">No leadership profiles found.</p>
                )}
              </div>
            </div>

            {/* Other Employees List */}
            <div className="people-list-card glass-panel">
              <div className="card-header">
                <Users size={20} className="text-emerald-500" />
                <div>
                  <h3>Other Employees ({results.employees.length})</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', margin: 0 }}>From your saved Apollo contacts</p>
                </div>
              </div>
              <div className="people-list">
                {results.employees.length > 0 ? (
                  results.employees.map((person) => (
                    <div key={person.id} className="person-card">
                      <div className="person-info">
                        <div className="person-name">{person.name}</div>
                        <div className="person-title">{person.title}</div>
                      </div>
                      <div className="person-contact">
                        <Mail size={14} />
                        <span>{person.email}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="empty-text">No other employee profiles found.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
