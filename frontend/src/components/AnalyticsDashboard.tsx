import { useMemo } from 'react';
import type { Trial } from '../types';
import { BarChart3, Users2, Activity, Play, Ban } from 'lucide-react';
import './AnalyticsDashboard.css';

interface AnalyticsDashboardProps {
  trials: Trial[];
}

export default function AnalyticsDashboard({ trials }: AnalyticsDashboardProps) {
  const stats = useMemo(() => {
    const total = trials.length;
    let recruiting = 0;
    let terminated = 0;
    let totalEnrollment = 0;
    let enrollmentCountWithData = 0;

    const phaseCounts: Record<string, number> = {
      'Phase 1': 0,
      'Phase 2': 0,
      'Phase 3': 0,
      'Phase 4': 0,
    };

    const sponsorCounts: Record<string, number> = {};

    trials.forEach((trial) => {
      // 1. Status
      const status = (trial.overallStatus || '').toUpperCase();
      if (status === 'RECRUITING') {
        recruiting++;
      } else if (
        status === 'TERMINATED' ||
        status === 'WITHDRAWN' ||
        status === 'SUSPENDED'
      ) {
        terminated++;
      }

      // 2. Enrollment
      const ec = Number(trial.enrollmentCount);
      if (!isNaN(ec) && ec > 0) {
        totalEnrollment += ec;
        enrollmentCountWithData++;
      }

      // 3. Phases
      if (trial.phases && Array.isArray(trial.phases)) {
        trial.phases.forEach((phase) => {
          if (phaseCounts[phase] !== undefined) {
            phaseCounts[phase]++;
          }
        });
      }

      // 4. Sponsors
      const sponsor = trial.sponsor || 'Unknown Sponsor';
      sponsorCounts[sponsor] = (sponsorCounts[sponsor] || 0) + 1;
    });

    const averageEnrollment = enrollmentCountWithData
      ? Math.round(totalEnrollment / enrollmentCountWithData)
      : 0;

    // Sort sponsors
    const topSponsors = Object.entries(sponsorCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);

    return {
      total,
      recruiting,
      terminated,
      averageEnrollment,
      phaseCounts,
      topSponsors,
    };
  }, [trials]);

  const { total, recruiting, terminated, averageEnrollment, phaseCounts, topSponsors } = stats;

  if (total === 0) {
    return (
      <div className="analytics-empty-state">
        <p>No trials match the active filters to generate metrics.</p>
      </div>
    );
  }

  return (
    <div className="analytics-dashboard">
      {/* Metrics Grid */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon-wrapper metric-icon--total">
            <BarChart3 size={18} />
          </div>
          <div className="metric-content">
            <span className="metric-label">Total Trials</span>
            <span className="metric-value">{total}</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrapper metric-icon--recruiting">
            <Play size={18} />
          </div>
          <div className="metric-content">
            <span className="metric-label">Recruiting</span>
            <span className="metric-value">{recruiting}</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrapper metric-icon--terminated">
            <Ban size={18} />
          </div>
          <div className="metric-content">
            <span className="metric-label">Terminated</span>
            <span className="metric-value">{terminated}</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrapper metric-icon--enrollment">
            <Users2 size={18} />
          </div>
          <div className="metric-content">
            <span className="metric-label">Avg Enrollment</span>
            <span className="metric-value">
              {averageEnrollment > 0 ? averageEnrollment.toLocaleString() : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Visual Distributions */}
      <div className="dashboard-charts">
        {/* Phase Breakdown */}
        <div className="chart-panel">
          <h3 className="chart-title"><Activity size={14} /> Phase Distribution</h3>
          <div className="phase-bars">
            {Object.entries(phaseCounts).map(([phase, count]) => {
              const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={phase} className="phase-bar-item">
                  <div className="phase-bar-header">
                    <span className="phase-bar-name">{phase}</span>
                    <span className="phase-bar-stats">{count} ({percentage}%)</span>
                  </div>
                  <div className="phase-bar-track">
                    <div
                      className="phase-bar-fill"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Sponsors / Competition */}
        <div className="chart-panel">
          <h3 className="chart-title"><Users2 size={14} /> Top Sponsors</h3>
          <div className="sponsor-list">
            {topSponsors.length > 0 ? (
              topSponsors.map((s, idx) => {
                const percentage = total > 0 ? Math.round((s.count / total) * 100) : 0;
                return (
                  <div key={s.name} className="sponsor-item">
                    <div className="sponsor-info">
                      <span className="sponsor-rank">#{idx + 1}</span>
                      <span className="sponsor-name" title={s.name}>{s.name}</span>
                      <span className="sponsor-count">{s.count} studies</span>
                    </div>
                    <div className="sponsor-track">
                      <div
                        className="sponsor-fill"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="no-data-text">No sponsor information available.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
