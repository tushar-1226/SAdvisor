import { useEffect, useState, useCallback } from 'react';
import {
  X,
  FileText,
  Activity,
  Users,
  Building2,
  MapPin,
  ClipboardList,
  Loader2,
} from 'lucide-react';
import { fetchTrialDetails } from '../api';
import './TrialModal.css';

interface TrialModalProps {
  nctId: string;
  onClose: () => void;
}

function statusClass(status: string): string {
  const s = status.toLowerCase();
  if (s.includes('recruiting') && !s.includes('not')) return 'trial-modal-status--recruiting';
  if (s.includes('completed')) return 'trial-modal-status--completed';
  if (s.includes('active')) return 'trial-modal-status--active';
  if (s.includes('terminated') || s.includes('withdrawn') || s.includes('suspended'))
    return 'trial-modal-status--terminated';
  return 'trial-modal-status--other';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function safe(obj: any, ...keys: string[]): string | undefined {
  let cur = obj;
  for (const k of keys) {
    if (cur == null) return undefined;
    cur = cur[k];
  }
  return typeof cur === 'string' || typeof cur === 'number' ? String(cur) : undefined;
}

export default function TrialModal({ nctId, onClose }: TrialModalProps) {
  const [prevNctId, setPrevNctId] = useState(nctId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  if (nctId !== prevNctId) {
    setPrevNctId(nctId);
    setData(null);
    setLoading(true);
    setError(null);
  }

  const handleRetry = useCallback(() => {
    setLoading(true);
    setError(null);
    setData(null);
    fetchTrialDetails(nctId)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Unknown error'))
      .finally(() => setLoading(false));
  }, [nctId]);

  useEffect(() => {
    let ignore = false;
    fetchTrialDetails(nctId)
      .then((res) => {
        if (!ignore) {
          setData(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Unknown error');
          setLoading(false);
        }
      });
    return () => {
      ignore = true;
    };
  }, [nctId]);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Prevent body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  // Extract nested fields safely
  const protocol = data?.protocolSection;
  const identification = protocol?.identificationModule;
  const statusModule = protocol?.statusModule;
  const descModule = protocol?.descriptionModule;
  const designModule = protocol?.designModule;
  const eligModule = protocol?.eligibilityModule;
  const sponsorModule = protocol?.sponsorCollaboratorsModule;
  const contactsModule = protocol?.contactsLocationsModule;

  const briefTitle = safe(identification, 'briefTitle') ?? nctId;
  const officialTitle = safe(identification, 'officialTitle');
  const overallStatus = safe(statusModule, 'overallStatus') ?? 'Unknown';
  const briefSummary = safe(descModule, 'briefSummary');
  const detailedDesc = safe(descModule, 'detailedDescription');
  const studyType = safe(designModule, 'studyType');
  const phases = designModule?.phases?.join(', ');
  const enrollment = safe(designModule, 'enrollmentInfo', 'count');
  const enrollmentType = safe(designModule, 'enrollmentInfo', 'type');
  const allocation = safe(designModule, 'designInfo', 'allocation');
  const primaryPurpose = safe(designModule, 'designInfo', 'primaryPurpose');
  const startDate = safe(statusModule, 'startDateStruct', 'date');
  const completionDate = safe(statusModule, 'completionDateStruct', 'date');

  const minAge = safe(eligModule, 'minimumAge');
  const maxAge = safe(eligModule, 'maximumAge');
  const sex = safe(eligModule, 'sex');
  const healthyVolunteers = safe(eligModule, 'healthyVolunteers');
  const eligCriteria = safe(eligModule, 'eligibilityCriteria');

  const leadSponsor = safe(sponsorModule, 'leadSponsor', 'name');
  const leadSponsorClass = safe(sponsorModule, 'leadSponsor', 'class');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const collaborators: any[] = sponsorModule?.collaborators ?? [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const locations: any[] = contactsModule?.locations ?? [];

  return (
    <div className="trial-modal-backdrop" onClick={handleBackdropClick}>
      <div className="trial-modal" role="dialog" aria-modal="true" aria-label={`Details for ${nctId}`}>
        {/* ── Header ── */}
        <div className="trial-modal-header">
          <div className="trial-modal-header-info">
            <span className="trial-modal-nct">
              <ClipboardList size={14} />
              {nctId}
            </span>
            {!loading && !error && (
              <>
                <h2 className="trial-modal-title">{briefTitle}</h2>
                <span className={`trial-modal-status ${statusClass(overallStatus)}`}>
                  {overallStatus}
                </span>
              </>
            )}
          </div>
          <button className="trial-modal-close" onClick={onClose} aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="trial-modal-body">
          {/* Loading skeleton */}
          {loading && (
            <div className="trial-modal-loading">
              <Loader2 size={28} className="trial-modal-spinner" style={{ animation: 'spin 1s linear infinite' }} />
              <p>Fetching study details…</p>
              <div className="trial-modal-skeleton">
                <div className="trial-modal-skeleton-line" />
                <div className="trial-modal-skeleton-line" />
                <div className="trial-modal-skeleton-line" />
                <div className="trial-modal-skeleton-line" />
                <div className="trial-modal-skeleton-line" />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="trial-modal-error">
              <p>{error}</p>
              <button className="trial-modal-retry" onClick={handleRetry}>
                Retry
              </button>
            </div>
          )}

          {/* Data */}
          {data && !loading && (
            <>
              {/* Official Title */}
              {officialTitle && officialTitle !== briefTitle && (
                <div className="trial-modal-section">
                  <div className="trial-modal-section-title">
                    <FileText /> Official Title
                  </div>
                  <p className="trial-modal-text">{officialTitle}</p>
                </div>
              )}

              {/* Study Overview */}
              <div className="trial-modal-section">
                <div className="trial-modal-section-title">
                  <Activity /> Study Overview
                </div>
                <div className="trial-modal-kv-grid">
                  {studyType && (
                    <div className="trial-modal-kv">
                      <span className="trial-modal-kv-label">Study Type</span>
                      <span className="trial-modal-kv-value">{studyType}</span>
                    </div>
                  )}
                  {phases && (
                    <div className="trial-modal-kv">
                      <span className="trial-modal-kv-label">Phase</span>
                      <span className="trial-modal-kv-value">{phases}</span>
                    </div>
                  )}
                  {enrollment && (
                    <div className="trial-modal-kv">
                      <span className="trial-modal-kv-label">Enrollment</span>
                      <span className="trial-modal-kv-value">
                        {enrollment}{enrollmentType ? ` (${enrollmentType})` : ''}
                      </span>
                    </div>
                  )}
                  {allocation && (
                    <div className="trial-modal-kv">
                      <span className="trial-modal-kv-label">Allocation</span>
                      <span className="trial-modal-kv-value">{allocation}</span>
                    </div>
                  )}
                  {primaryPurpose && (
                    <div className="trial-modal-kv">
                      <span className="trial-modal-kv-label">Primary Purpose</span>
                      <span className="trial-modal-kv-value">{primaryPurpose}</span>
                    </div>
                  )}
                  {startDate && (
                    <div className="trial-modal-kv">
                      <span className="trial-modal-kv-label">Start Date</span>
                      <span className="trial-modal-kv-value">{startDate}</span>
                    </div>
                  )}
                  {completionDate && (
                    <div className="trial-modal-kv">
                      <span className="trial-modal-kv-label">Completion Date</span>
                      <span className="trial-modal-kv-value">{completionDate}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Brief Summary */}
              {briefSummary && (
                <div className="trial-modal-section">
                  <div className="trial-modal-section-title">
                    <FileText /> Brief Summary
                  </div>
                  <p className="trial-modal-text">{briefSummary}</p>
                </div>
              )}

              {/* Detailed Description */}
              {detailedDesc && (
                <div className="trial-modal-section">
                  <div className="trial-modal-section-title">
                    <FileText /> Detailed Description
                  </div>
                  <p className="trial-modal-text">{detailedDesc}</p>
                </div>
              )}

              {/* Eligibility */}
              {(minAge || maxAge || sex || healthyVolunteers || eligCriteria) && (
                <div className="trial-modal-section">
                  <div className="trial-modal-section-title">
                    <Users /> Eligibility
                  </div>
                  <div className="trial-modal-kv-grid" style={{ marginBottom: eligCriteria ? '0.75rem' : 0 }}>
                    {minAge && (
                      <div className="trial-modal-kv">
                        <span className="trial-modal-kv-label">Min Age</span>
                        <span className="trial-modal-kv-value">{minAge}</span>
                      </div>
                    )}
                    {maxAge && (
                      <div className="trial-modal-kv">
                        <span className="trial-modal-kv-label">Max Age</span>
                        <span className="trial-modal-kv-value">{maxAge}</span>
                      </div>
                    )}
                    {sex && (
                      <div className="trial-modal-kv">
                        <span className="trial-modal-kv-label">Sex</span>
                        <span className="trial-modal-kv-value">{sex}</span>
                      </div>
                    )}
                    {healthyVolunteers && (
                      <div className="trial-modal-kv">
                        <span className="trial-modal-kv-label">Healthy Volunteers</span>
                        <span className="trial-modal-kv-value">{healthyVolunteers}</span>
                      </div>
                    )}
                  </div>
                  {eligCriteria && (
                    <div className="trial-modal-eligibility">{eligCriteria}</div>
                  )}
                </div>
              )}

              {/* Sponsor */}
              {leadSponsor && (
                <div className="trial-modal-section">
                  <div className="trial-modal-section-title">
                    <Building2 /> Sponsor & Collaborators
                  </div>
                  <div className="trial-modal-kv-grid">
                    <div className="trial-modal-kv">
                      <span className="trial-modal-kv-label">Lead Sponsor</span>
                      <span className="trial-modal-kv-value">
                        {leadSponsor}{leadSponsorClass ? ` (${leadSponsorClass})` : ''}
                      </span>
                    </div>
                    {collaborators.map((c, i) => (
                      <div className="trial-modal-kv" key={i}>
                        <span className="trial-modal-kv-label">Collaborator</span>
                        <span className="trial-modal-kv-value">{c.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Locations */}
              {locations.length > 0 && (
                <div className="trial-modal-section">
                  <div className="trial-modal-section-title">
                    <MapPin /> Study Locations
                  </div>
                  <div className="trial-modal-kv-grid">
                    {locations.slice(0, 8).map((loc, i) => (
                      <div className="trial-modal-kv" key={i}>
                        <span className="trial-modal-kv-label">{loc.city}{loc.state ? `, ${loc.state}` : ''}{loc.country ? `, ${loc.country}` : ''}</span>
                        <span className="trial-modal-kv-value">{loc.facility ?? '—'}</span>
                      </div>
                    ))}
                    {locations.length > 8 && (
                      <div className="trial-modal-kv">
                        <span className="trial-modal-kv-value" style={{ color: '#64748b', fontStyle: 'italic' }}>
                          + {locations.length - 8} more locations
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* spinner keyframe (inline fallback) */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
