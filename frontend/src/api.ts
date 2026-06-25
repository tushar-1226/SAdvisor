/* eslint-disable @typescript-eslint/no-explicit-any */
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

export async function fetchTrialDetails(nctId: string): Promise<any> {
  const url = `https://clinicaltrials.gov/api/v2/studies/${nctId}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch trial details: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function generateForecast(params: {
  disease: string;
  category: 'oncology' | 'non_oncology' | 'auto';
  geography: string[];
  api_keys?: Record<string, string>;
  model_type?: string;
}): Promise<any> {
  const url = `${API_BASE}/api/forecast`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Forecast API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function fetchKeysConfig(): Promise<any> {
  const url = `${API_BASE}/api/config`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Config API error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

export async function updateKeysConfig(keys: {
  seer_api_key?: string;
  ncbi_api_key?: string;
  openfda_api_key?: string;
}): Promise<any> {
  const url = `${API_BASE}/api/config`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(keys),
  });
  if (!response.ok) {
    throw new Error(`Config API error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

export async function sendChatQuery(
  message: string,
  context: any,
  history: { role: 'user' | 'model'; content: string }[]
): Promise<{ response: string }> {
  const url = `${API_BASE}/api/chat`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, context, history }),
  });

  if (!response.ok) {
    throw new Error(`Chat API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}


