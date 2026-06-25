/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, type FormEvent } from 'react';
import { Search } from 'lucide-react';
import './SearchBar.css';

interface SearchBarProps {
  onSearch: (query: string) => void;
  isLoading: boolean;
}

const SUGGESTIONS = [
  'Breast Cancer',
  'Type 2 Diabetes',
  'Asthma',
  'COPD',
  'NSCLC',
  'SCLC',
  'Prostate Cancer',
  'Colorectal Cancer',
  'Cardiovascular Disease'
];

const PLACEHOLDERS = [
  'Search Breast Cancer...',
  'Search Type 2 Diabetes...',
  'Search Asthma...',
  'Search COPD...',
  'Search NSCLC (Non-Small Cell Lung Cancer)...',
  'Search SCLC (Small Cell Lung Cancer)...',
  'Search Prostate Cancer...',
  'Search Colorectal Cancer...',
  'Search Cardiovascular Disease (CVD)...'
];

export default function SearchBar({ onSearch, isLoading }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [placeholder, setPlaceholder] = useState('');
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let timer: any;
    const currentPhrase = PLACEHOLDERS[phraseIdx];
    
    if (isDeleting) {
      timer = setTimeout(() => {
        setPlaceholder(currentPhrase.substring(0, charIdx - 1));
        setCharIdx(charIdx - 1);
      }, 25);
    } else {
      timer = setTimeout(() => {
        setPlaceholder(currentPhrase.substring(0, charIdx + 1));
        setCharIdx(charIdx + 1);
      }, 60);
    }

    if (!isDeleting && charIdx === currentPhrase.length) {
      timer = setTimeout(() => setIsDeleting(true), 1600);
    } else if (isDeleting && charIdx === 0) {
      setIsDeleting(false);
      setPhraseIdx((prev) => (prev + 1) % PLACEHOLDERS.length);
    }

    return () => clearTimeout(timer);
  }, [charIdx, isDeleting, phraseIdx]);

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
          placeholder={placeholder}
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
