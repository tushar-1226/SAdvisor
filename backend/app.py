"""
app.py – FastAPI backend for SAdvisory.
Provides endpoints to search diseases, trials, articles, and drugs.
"""

import re
from fastapi import FastAPI, HTTPException, Query, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from concurrent.futures import ThreadPoolExecutor, as_completed

from services import (
    search_trials_by_condition,
    get_trial_by_nct_id,
    search_pubmed_articles,
    get_drug_details,
    search_chembl,
)

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
    in parallel and returns consolidated results.
    """
    if not q.strip():
        raise HTTPException(status_code=400, detail="Query parameter 'q' is required.")

    results: dict = {"query": q, "trials": [], "articles": [], "drugs": []}

    query_str = q.strip()
    # Check if query is an NCT ID (e.g. NCT01466647)
    is_nct = bool(re.match(r"^NCT\d{8}$", query_str, re.IGNORECASE))

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
            future_trials = pool.submit(search_trials_by_condition, query_str, max_trials)
            future_articles = pool.submit(search_pubmed_articles, query_str, max_articles)

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


app.include_router(router)
app.include_router(router, prefix="/api")
