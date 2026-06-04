// api.ts – API service layer for SAdvisory

import type { SearchResults } from './types';

const API_BASE = import.meta.env.VITE_API_BASE || '';

export async function searchDisease(query: string): Promise<SearchResults> {
  const url = `${API_BASE}/api/search?q=${encodeURIComponent(query)}&max_trials=40&max_articles=10`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchTrialDetails(nctId: string): Promise<any> {
  const url = `https://clinicaltrials.gov/api/v2/studies/${nctId}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch trial details: ${response.status} ${response.statusText}`);
  }

  return response.json();
}
