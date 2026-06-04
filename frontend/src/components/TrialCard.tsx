import type { Trial } from '../types';
import './TrialCard.css';

interface TrialCardProps {
  trial: Trial;
  onSelect?: (nctId: string) => void;
}

function statusClass(status: string): string {
  const s = status.toLowerCase();
  if (s.includes('recruiting') && !s.includes('not')) return 'trial-status--recruiting';
  if (s.includes('completed')) return 'trial-status--completed';
  if (s.includes('active')) return 'trial-status--active';
  if (s.includes('terminated')) return 'trial-status--terminated';
  if (s.includes('withdrawn')) return 'trial-status--withdrawn';
  if (s.includes('suspended')) return 'trial-status--suspended';
  return 'trial-status--other';
}

export default function TrialCard({ trial, onSelect }: TrialCardProps) {
  const handleNctClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onSelect?.(trial.nctId);
  };

  return (
    <div className="trial-card">
      <div className="trial-card-header">
        <div className="trial-card-header-left">
          <a
            className="trial-nct-id"
            href="#"
            onClick={handleNctClick}
            title="View full study details"
          >
            {trial.nctId}
          </a>
          {trial.phases && trial.phases.length > 0 && (
            <span className="trial-phase-badge">
              {trial.phases.join(', ')}
            </span>
          )}
        </div>
        <span className={`trial-status ${statusClass(trial.overallStatus)}`}>
          {trial.overallStatus}
        </span>
      </div>

      <h3 className="trial-title">{trial.briefTitle}</h3>

      {trial.briefSummary && (
        <p className="trial-summary">{trial.briefSummary}</p>
      )}

      <div className="trial-meta">
        {trial.sponsor && (
          <span className="trial-meta-item">
            <strong>Sponsor:</strong> {trial.sponsor}
          </span>
        )}
        {trial.studyType && (
          <span className="trial-meta-item">
            <strong>Type:</strong> {trial.studyType}
          </span>
        )}
        {trial.enrollmentCount && (
          <span className="trial-meta-item">
            <strong>Enrolled:</strong> {trial.enrollmentCount}
          </span>
        )}
        {trial.startDate && (
          <span className="trial-meta-item">
            <strong>Started:</strong> {trial.startDate}
          </span>
        )}
      </div>

      {trial.interventions.length > 0 && (
        <div className="trial-interventions">
          {trial.interventions.map((iv, i) => (
            <span key={i} className="trial-intervention-tag">
              {iv.type ? `${iv.type}: ` : ''}{iv.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
