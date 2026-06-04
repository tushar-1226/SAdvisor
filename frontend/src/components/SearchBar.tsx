import { useState, type FormEvent } from 'react';
import { Search } from 'lucide-react';
import './SearchBar.css';

interface SearchBarProps {
  onSearch: (query: string) => void;
  isLoading: boolean;
}

const SUGGESTIONS = [
  'Lung Cancer',
  'Diabetes',
  'Alzheimer\'s Disease',
  'Breast Cancer',
  'COVID-19',
  'Hypertension',
  'Asthma',
  'Rheumatoid Arthritis',
  'Parkinson\'s Disease',
  'Multiple Sclerosis',
  'Crohn\'s Disease',
  'Leukemia',
  'Melanoma',
  'Schizophrenia',
  'Tuberculosis',
  'Osteoarthritis',
  'Influenza',
  'Psoriasis',
  'Epilepsy',
  'Malaria',
  'Hepatitis C',
  'Migraine',
  'HIV/AIDS',
  'Obesity',
  'Atrial Fibrillation',
];

export default function SearchBar({ onSearch, isLoading }: SearchBarProps) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim() && !isLoading) {
      onSearch(query.trim());
    }
  };

  const handleSuggestion = (suggestion: string) => {
    setQuery(suggestion);
    onSearch(suggestion);
  };

  return (
    <div className="search-container">
      <form className="search-bar" onSubmit={handleSubmit}>
        <span className="search-icon"><Search size={18} /></span>
        <input
          id="search-input"
          className="search-input"
          type="text"
          placeholder="Search a disease or condition…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        <button
          id="search-button"
          className="search-btn"
          type="submit"
          disabled={!query.trim() || isLoading}
        >
          {isLoading ? <span className="spinner" /> : 'Search'}
        </button>
      </form>

      <div className="search-suggestions">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            className="suggestion-chip"
            type="button"
            onClick={() => handleSuggestion(s)}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
