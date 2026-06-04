// types.ts – Shared type definitions for SAdvisory

export interface Intervention {
  name: string;
  type: string;
  description: string;
}

export interface Trial {
  nctId: string;
  briefTitle: string;
  officialTitle: string;
  overallStatus: string;
  startDate: string;
  completionDate: string;
  conditions: string[];
  studyType: string;
  enrollmentCount: number | string;
  sponsor: string;
  interventions: Intervention[];
  briefSummary: string;
  phases?: string[];
}

export interface Article {
  pmid: string;
  title: string;
  journal: string;
  pubDate: string;
  authors: string;
}

export interface Drug {
  name: string;
  cid: number | string;
  molecularFormula: string;
  molecularWeight: number | string;
  iupacName: string;
  smiles: string;
  inchiKey: string;
  synonyms: string[];
}

export interface SearchResults {
  query: string;
  trials: Trial[];
  articles: Article[];
  drugs: Drug[];
  trials_error?: string;
  articles_error?: string;
}
