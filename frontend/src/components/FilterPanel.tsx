import { useState, useEffect } from 'react';
import { Search, RotateCcw, Filter } from 'lucide-react';
import './FilterPanel.css';

export interface FilterState {
  nctId: string;
  statuses: string[];
  phases: string[];
  sponsor: string;
}

interface FilterPanelProps {
  sponsors: string[];
  onFilterChange: (filters: FilterState) => void;
}

const AVAILABLE_STATUSES = [
  { label: 'Recruiting', value: 'RECRUITING' },
  { label: 'Terminated', value: 'TERMINATED' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Active', value: 'ACTIVE' }, // covers ACTIVE_NOT_RECRUITING
];

const AVAILABLE_PHASES = [
  { label: 'Phase 1', value: 'Phase 1' },
  { label: 'Phase 2', value: 'Phase 2' },
  { label: 'Phase 3', value: 'Phase 3' },
  { label: 'Phase 4', value: 'Phase 4' },
];

export default function FilterPanel({ sponsors, onFilterChange }: FilterPanelProps) {
  const [nctId, setNctId] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedPhases, setSelectedPhases] = useState<string[]>([]);
  const [selectedSponsor, setSelectedSponsor] = useState('');

  // Propagate filter state changes to parent component
  useEffect(() => {
    onFilterChange({
      nctId,
      statuses: selectedStatuses,
      phases: selectedPhases,
      sponsor: selectedSponsor,
    });
  }, [nctId, selectedStatuses, selectedPhases, selectedSponsor, onFilterChange]);

  const handleStatusToggle = (status: string) => {
    setSelectedStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  };

  const handlePhaseToggle = (phase: string) => {
    setSelectedPhases((prev) =>
      prev.includes(phase) ? prev.filter((p) => p !== phase) : [...prev, phase]
    );
  };

  const handleReset = () => {
    setNctId('');
    setSelectedStatuses([]);
    setSelectedPhases([]);
    setSelectedSponsor('');
  };

  return (
    <div className="filter-panel">
      <div className="filter-header">
        <span className="filter-title">
          <Filter size={16} /> Filters
        </span>
        <button className="reset-btn" onClick={handleReset} title="Reset all filters">
          <RotateCcw size={13} /> Reset
        </button>
      </div>

      {/* NCT ID Filter */}
      <div className="filter-section">
        <label htmlFor="filter-nct-input" className="filter-label">NCT ID</label>
        <div className="filter-input-wrapper">
          <Search size={14} className="filter-input-icon" />
          <input
            id="filter-nct-input"
            type="text"
            className="filter-input"
            placeholder="Filter by NCT ID (e.g. NCT014...)"
            value={nctId}
            onChange={(e) => setNctId(e.target.value)}
          />
        </div>
      </div>

      {/* Status Filter */}
      <div className="filter-section">
        <span className="filter-label">Trial Status</span>
        <div className="checkbox-group">
          {AVAILABLE_STATUSES.map((status) => {
            const isChecked = selectedStatuses.includes(status.value);
            return (
              <label key={status.value} className="checkbox-label">
                <input
                  type="checkbox"
                  className="checkbox-input"
                  checked={isChecked}
                  onChange={() => handleStatusToggle(status.value)}
                />
                <span className="checkbox-text">{status.label}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Phase Filter */}
      <div className="filter-section">
        <span className="filter-label">Trial Phase</span>
        <div className="checkbox-group">
          {AVAILABLE_PHASES.map((phase) => {
            const isChecked = selectedPhases.includes(phase.value);
            return (
              <label key={phase.value} className="checkbox-label">
                <input
                  type="checkbox"
                  className="checkbox-input"
                  checked={isChecked}
                  onChange={() => handlePhaseToggle(phase.value)}
                />
                <span className="checkbox-text">{phase.label}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Sponsor Filter */}
      <div className="filter-section">
        <label htmlFor="filter-sponsor-select" className="filter-label">Lead Sponsor</label>
        <select
          id="filter-sponsor-select"
          className="select-input"
          value={selectedSponsor}
          onChange={(e) => setSelectedSponsor(e.target.value)}
        >
          <option value="">All Sponsors</option>
          {sponsors.map((sponsor) => (
            <option key={sponsor} value={sponsor}>
              {sponsor}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
