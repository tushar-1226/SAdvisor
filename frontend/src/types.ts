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
  original_query?: string;
  trials: Trial[];
  articles: Article[];
  drugs: Drug[];
  trials_error?: string;
  articles_error?: string;
  confidence_score?: number;
  confidence_reasons?: string[];
  insights?: string;
}

export interface FunnelYearData {
  population: number;
  disease_pool: number;
  diagnosed: number;
  treated: number;
  adherent: number;
}

export interface ApprovedProduct {
  name: string;
  manufacturer: string;
  approval_year: number;
  status: string;
}

export interface PipelineProduct {
  name: string;
  phase: string;
  mechanism: string;
  sponsor: string;
}

export interface DataSource {
  name: string;
  url: string;
}

export interface ForecastModel {
  disease: string;
  category: 'oncology' | 'non_oncology';
  geography: string[];
  base_year: number;
  forecast_years: number[];
  epidemiology: {
    incidence_rate?: Record<string, number>;
    prevalence_rate?: Record<string, number>;
    target_proportion: number;
    funnel: Record<string, Record<number, FunnelYearData>>;
  };
  segmentation: {
    // Oncology specific
    biomarkers?: Record<string, number>;
    biomarkers_china_override?: Record<string, number>;
    stages?: Record<string, number>;
    resectable_vs_unresectable?: Record<string, number>;
    early_stage_recurrence_rate?: number;
    progression_rates?: Record<string, number>;
    
    // Non-oncology specific
    severity?: Record<string, number>;
    risk_stratification?: Record<string, number>;
    endpoints?: Record<string, number>;
  };
  treatment_landscape: {
    lines_of_therapy?: Record<string, number>;
    treatment_steps?: Record<string, number>;
    transition_rates?: Record<string, number>;
    switch_triggers?: Array<{ trigger: string; rate: number }>;
    adherence_mpr?: number;
    persistence_curve?: Record<string, number>;
    approved_products: ApprovedProduct[];
    pipeline_products: PipelineProduct[];
  };
  market_share: Record<string, Record<number, Record<string, number>>>;
  revenue: Record<string, Record<number, Record<string, number>>>;
  assumptions: {
    pricing: Record<string, number>;
    discount_rate: Record<string, number>;
    compliance_rate: number;
  };
  data_sources: DataSource[];
  confidence_score?: number;
  confidence_reasons?: string[];
  model_type?: string;
  insights?: string;
}

export interface ApiKeysConfig {
  seer_api_key: string;
  ncbi_api_key: string;
  openfda_api_key: string;
}

