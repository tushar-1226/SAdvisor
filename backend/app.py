"""
app.py – FastAPI backend for SAdvisory.
Provides endpoints to search diseases, trials, articles, and drugs.
"""

import re
import os
import json
from fastapi import FastAPI, HTTPException, Query, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from concurrent.futures import ThreadPoolExecutor, as_completed
from pydantic import BaseModel
from typing import List, Optional, Dict

from services import (
    search_trials_by_condition,
    get_trial_by_nct_id,
    search_pubmed_articles,
    get_drug_details,
    search_chembl,
)
from forecast import generate_forecast_model
from cache import cache
from ontology import resolve_disease
from insights import generate_clinical_insights

app = FastAPI(title="SAdvisory API", version="1.0.0")
router = APIRouter()

# Allow the React dev server to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Orchestrated search – single disease query returns trials + articles + drugs
# ---------------------------------------------------------------------------

@router.get("/search")
def search_disease(
    q: str = Query(..., description="Disease or condition name"),
    max_trials: int = Query(10, ge=1, le=50),
    max_articles: int = Query(10, ge=1, le=50),
):
    """
    Master endpoint: searches ClinicalTrials.gov, PubMed, and PubChem
    in parallel and returns consolidated results. Matches synonyms and utilizes cache.
    """
    if not q.strip():
        raise HTTPException(status_code=400, detail="Query parameter 'q' is required.")

    # Caching check
    cache_key = f"search_{q.strip().lower()}_{max_trials}_{max_articles}"
    cached = cache.get(cache_key)
    if cached:
        return cached

    query_str = q.strip()
    # Check if query is an NCT ID (e.g. NCT01466647)
    is_nct = bool(re.match(r"^NCT\d{8}$", query_str, re.IGNORECASE))

    resolved_query = query_str
    if not is_nct:
        canonical_key, display_name = resolve_disease(query_str)
        resolved_query = display_name

    results: dict = {"query": resolved_query, "original_query": query_str, "trials": [], "articles": [], "drugs": []}

    if is_nct:
        # Direct lookup of the specific trial
        trial = get_trial_by_nct_id(query_str.upper())
        if trial:
            results["trials"] = [trial]
            
            # For PubMed, search for the NCT ID directly to find articles mentioning it
            try:
                results["articles"] = search_pubmed_articles(query_str.upper(), max_articles)
            except Exception as e:
                results["articles_error"] = str(e)
        else:
            results["trials"] = []
    else:
        # Run trials + articles searches in parallel
        with ThreadPoolExecutor(max_workers=3) as pool:
            future_trials = pool.submit(search_trials_by_condition, resolved_query, max_trials)
            future_articles = pool.submit(search_pubmed_articles, resolved_query, max_articles)

            for future in as_completed([future_trials, future_articles]):
                try:
                    future.result()  # raise any exception
                except Exception:
                    pass

            try:
                results["trials"] = future_trials.result()
            except Exception as e:
                results["trials_error"] = str(e)

            try:
                results["articles"] = future_articles.result()
            except Exception as e:
                results["articles_error"] = str(e)

    # Extract unique drug / intervention names from the trials
    drug_names: set[str] = set()
    for trial in results["trials"]:
        for iv in trial.get("interventions", []):
            name = iv.get("name", "").strip()
            if name and iv.get("type", "").upper() in ("DRUG", "BIOLOGICAL", "COMBINATION PRODUCT", ""):
                drug_names.add(name)

    # Fetch drug details in parallel (cap at 5 to avoid flooding PubChem)
    drug_names_list = list(drug_names)[:5]
    if drug_names_list:
        with ThreadPoolExecutor(max_workers=5) as pool:
            future_map = {pool.submit(get_drug_details, d): d for d in drug_names_list}
            for future in as_completed(future_map):
                try:
                    detail = future.result()
                    if detail:
                        results["drugs"].append(detail)
                except Exception:
                    pass

    # 1. Compute Data Confidence Score & Reasons
    score = 100
    reasons = []
    
    if is_nct:
        reasons.append("Retrieved specific registry ID details")
    else:
        reasons.append(f"Mapped search query to canonical term: {resolved_query}")

    trials_list = results.get("trials", [])
    if not trials_list:
        score -= 30
        reasons.append("No clinical trials found (-30)")
    else:
        reasons.append(f"Retrieved {len(trials_list)} clinical trials")
        no_phase = sum(1 for t in trials_list if not t.get("phases"))
        if no_phase > 0:
            penalty = min(20, no_phase * 5)
            score -= penalty
            reasons.append(f"{no_phase} trials lack phase assignments (-{penalty})")
        else:
            reasons.append("100% of trials have developmental phase detail")

    articles_list = results.get("articles", [])
    if not articles_list:
        score -= 20
        reasons.append("No PubMed research articles found (-20)")
    else:
        reasons.append(f"Retrieved {len(articles_list)} publications")

    drugs_list = results.get("drugs", [])
    if not drugs_list:
        score -= 15
        reasons.append("No active therapeutic drug details resolved (-15)")
    else:
        reasons.append(f"Extracted properties for {len(drugs_list)} compounds")

    results["confidence_score"] = max(10, min(100, score))
    results["confidence_reasons"] = reasons

    # 2. Compile AI / Heuristics insights summary
    results["insights"] = generate_clinical_insights(resolved_query, trials_list, articles_list, drugs_list)

    # Save to cache
    cache.set(cache_key, results)

    return results


# ---------------------------------------------------------------------------
# Individual endpoints
# ---------------------------------------------------------------------------

@router.get("/trials")
def api_search_trials(
    q: str = Query(..., description="Disease / condition"),
    max_results: int = Query(10, ge=1, le=50),
):
    """Search ClinicalTrials.gov for studies matching a condition."""
    try:
        return {"trials": search_trials_by_condition(q, max_results)}
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/trial/{nct_id}")
def api_get_trial(nct_id: str):
    """Get a single trial by NCT ID."""
    result = get_trial_by_nct_id(nct_id)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Trial {nct_id} not found.")
    return result


@router.get("/articles")
def api_search_articles(
    q: str = Query(..., description="Search query"),
    max_results: int = Query(10, ge=1, le=50),
):
    """Search PubMed for articles."""
    try:
        return {"articles": search_pubmed_articles(q, max_results)}
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/drug/{drug_name}")
def api_get_drug(drug_name: str):
    """Get drug details from PubChem."""
    result = get_drug_details(drug_name)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Drug '{drug_name}' not found.")
    return result


@router.get("/chembl/{query}")
def api_search_chembl(query: str):
    """Search ChEMBL for a molecule."""
    chembl_id = search_chembl(query)
    if chembl_id is None:
        raise HTTPException(status_code=404, detail=f"No ChEMBL result for '{query}'.")
    return {"chemblId": chembl_id}


# ---------------------------------------------------------------------------
# Pharmaceutical Forecasting Endpoints
# ---------------------------------------------------------------------------

class ForecastRequest(BaseModel):
    disease: str
    category: str  # "oncology" | "non_oncology" | "auto"
    geography: List[str]
    api_keys: Optional[Dict[str, str]] = None
    model_type: Optional[str] = "s_curve"

class ConfigUpdateRequest(BaseModel):
    seer_api_key: Optional[str] = None
    ncbi_api_key: Optional[str] = None
    openfda_api_key: Optional[str] = None

CONFIG_FILE = "api_keys_config.json"

def load_stored_keys() -> dict:
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r") as f:
                return json.load(f)
        except Exception:
            pass
    return {
        "seer_api_key": os.environ.get("SEER_API_KEY", ""),
        "ncbi_api_key": os.environ.get("NCBI_API_KEY", ""),
        "openfda_api_key": os.environ.get("OPENFDA_API_KEY", "")
    }

def save_stored_keys(keys: dict):
    try:
        with open(CONFIG_FILE, "w") as f:
            json.dump(keys, f)
    except Exception as e:
        print(f"Error saving config keys: {e}")


@router.post("/forecast")
def api_generate_forecast(req: ForecastRequest):
    """
    Generate a 10-year market forecast model for the given disease.
    Uses caching and calculates data confidence.
    """
    if not req.disease.strip():
        raise HTTPException(status_code=400, detail="Disease query is required.")

    # Caching check
    geo_key = "_".join(sorted(req.geography))
    cache_key = f"forecast_{req.disease.strip().lower()}_{req.category}_{geo_key}_{req.model_type or 's_curve'}"
    cached = cache.get(cache_key)
    if cached:
        return cached
        
    category = req.category
    if category == "auto":
        normalized = req.disease.lower()
        oncology_keywords = ["cancer", "carcinoma", "tumor", "melanoma", "nsclc", "sclc", "glioma", "sarcoma", "leukemia", "lymphoma", "breast", "prostate", "bladder", "pancreatic", "colon", "colorectal"]
        if any(kw in normalized for kw in oncology_keywords):
            category = "oncology"
        else:
            category = "non_oncology"

    # Merge client keys with stored server keys
    keys = req.api_keys or {}
    stored = load_stored_keys()
    for k, v in stored.items():
        api_name = k.replace("_api_key", "")
        if api_name not in keys or not keys[api_name]:
            keys[api_name] = v

    try:
        # Resolve synonyms to match disease baselines in forecast
        canonical_key, display_name = resolve_disease(req.disease)
        
        model = generate_forecast_model(
            disease=display_name,
            category=category,
            countries=req.geography,
            api_keys=keys,
            model_type=req.model_type or "s_curve"
        )
        
        # Generate insights for the forecast model
        mock_articles = []
        for src in model.get("data_sources", []):
            if "PubMed" in src.get("name", ""):
                mock_articles.append({"title": src.get("name"), "journal": "NCBI PubMed", "pubDate": "Recent"})
        
        model["insights"] = generate_clinical_insights(
            display_name,
            model.get("treatment_landscape", {}).get("pipeline_products", []),
            mock_articles if mock_articles else [{"title": "Clinical Literature Review", "journal": "PubMed", "pubDate": "Recent"}],
            model.get("treatment_landscape", {}).get("approved_products", [])
        )
        
        # Calculate Data Confidence
        score = 100
        reasons = []
        
        uses_wb = any("World Bank" in src.get("name", "") for src in model.get("data_sources", []))
        if not uses_wb:
            score -= 20
            reasons.append("World Bank API unavailable; fell back to calculated demographics (-20)")
        else:
            reasons.append("Demographics resolved via World Bank population indicators")
            
        pipeline_drugs = model.get("treatment_landscape", {}).get("pipeline_products", [])
        if not pipeline_drugs:
            score -= 20
            reasons.append("No active clinical pipeline compounds found (-20)")
        else:
            reasons.append(f"Identified {len(pipeline_drugs)} active pipeline clinical trials")
            
        approved_drugs = model.get("treatment_landscape", {}).get("approved_products", [])
        if not approved_drugs:
            score -= 15
            reasons.append("No FDA approved reference products resolved (-15)")
        else:
            reasons.append(f"Successfully loaded {len(approved_drugs)} approved reference therapies")
            
        model["confidence_score"] = max(10, min(100, score))
        model["confidence_reasons"] = reasons
        
        # Save to cache
        cache.set(cache_key, model)
        
        return model
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to generate forecast: {str(e)}")


@router.get("/config")
def api_get_config():
    """Retrieve currently stored API keys (masked for safety)."""
    keys = load_stored_keys()
    
    def mask(val: str) -> str:
        if not val:
            return ""
        if len(val) <= 6:
            return "******"
        return f"{val[:4]}...{val[-2:]}"
        
    return {
        "seer_api_key": mask(keys.get("seer_api_key", "")),
        "ncbi_api_key": mask(keys.get("ncbi_api_key", "")),
        "openfda_api_key": mask(keys.get("openfda_api_key", ""))
    }


@router.post("/config")
def api_update_config(req: ConfigUpdateRequest):
    """Update and persist API keys on the server."""
    keys = load_stored_keys()
    if req.seer_api_key is not None:
        keys["seer_api_key"] = req.seer_api_key
    if req.ncbi_api_key is not None:
        keys["ncbi_api_key"] = req.ncbi_api_key
    if req.openfda_api_key is not None:
        keys["openfda_api_key"] = req.openfda_api_key
    save_stored_keys(keys)
    return {"status": "success", "message": "API keys updated successfully."}



app.include_router(router)
app.include_router(router, prefix="/api")
