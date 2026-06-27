"""
app.py – FastAPI backend for SAdvisory.
Provides endpoints to search diseases, trials, articles, and drugs.
"""

import re
import os
import json
import requests
from fastapi import FastAPI, HTTPException, Query, APIRouter, UploadFile, File, Depends
from fastapi.middleware.cors import CORSMiddleware
from concurrent.futures import ThreadPoolExecutor, as_completed
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

# Define models for admin login
class AdminLoginRequest(BaseModel):
    admin_id: str
    admin_pass: str

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
from database import get_db, DrugLabel
from sqlalchemy.orm import Session
from pdf_parser import extract_pdf_text_from_bytes, get_label_chunks
from llm_extractor import extract_drug_intelligence

app = FastAPI(title="SAdvisory API", version="1.0.0")

# Load .env file programmatically if it exists
if os.path.exists(".env"):
    print("[Env] Loading .env file...")
    with open(".env", "r") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, val = line.split("=", 1)
                os.environ[key.strip()] = val.strip()
                print(f"[Env] Loaded {key.strip()} from .env")
else:
    print("[Env] .env file not found at", os.path.abspath(".env"))

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




class ExcelAnalysisRequest(BaseModel):
    sheet_name: str
    row_count: int
    column_count: int
    columns: List[Dict[str, Any]]
    sample_rows: List[Dict[str, Any]]


@router.post("/analyze-excel")
def api_analyze_excel(req: ExcelAnalysisRequest):
    """
    Generate an AI executive summary for an uploaded Excel sheet.
    """
    try:
        from insights import generate_excel_insights
        insights = generate_excel_insights(
            sheet_name=req.sheet_name,
            row_count=req.row_count,
            column_count=req.column_count,
            columns=req.columns,
            sample_rows=req.sample_rows
        )
        return {"insights": insights}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to generate Excel insights: {str(e)}")


# ---------------------------------------------------------------------------
# Drug Label Intelligence Endpoints
# ---------------------------------------------------------------------------

class DrugSearchRequest(BaseModel):
    drug_name: str

@router.post("/labels/search")
def api_search_and_extract_drug_label(req: DrugSearchRequest, db: Session = Depends(get_db)):
    """Search DailyMed for a drug, download its PDF label, and extract intelligence."""
    try:
        drug_name = req.drug_name.strip()
        if not drug_name:
            raise HTTPException(status_code=400, detail="Drug name is required")
            
        # 1. Search DailyMed for the drug
        search_url = f"https://dailymed.nlm.nih.gov/dailymed/services/v2/spls.json?drug_name={drug_name}"
        resp = requests.get(search_url)
        if resp.status_code != 200:
            raise HTTPException(status_code=500, detail="Failed to contact DailyMed API")
            
        data = resp.json()
        results = data.get("data", [])
        if not results:
            raise HTTPException(status_code=404, detail=f"No FDA labels found for '{drug_name}'")
            
        # Get the setid of the most established label (highest spl_version)
        results = sorted(results, key=lambda x: x.get("spl_version", 0), reverse=True)
        setid = results[0].get("setid")
        if not setid:
            raise HTTPException(status_code=404, detail="SPL ID not found in DailyMed response")
            
        # 2. Download PDF
        pdf_url = f"https://dailymed.nlm.nih.gov/dailymed/getFile.cfm?setid={setid}&type=pdf"
        pdf_resp = requests.get(pdf_url)
        if pdf_resp.status_code != 200 or not pdf_resp.content:
            raise HTTPException(status_code=404, detail="Failed to download PDF from DailyMed")
            
        pdf_bytes = pdf_resp.content
        
        # 3. Parse text and extract intelligence
        pdf_text = extract_pdf_text_from_bytes(pdf_bytes)
        chunks = get_label_chunks(pdf_text)
        extracted_data = extract_drug_intelligence(pdf_text, chunks)
        
        if "error" in extracted_data and len(extracted_data) == 2:
            raise HTTPException(status_code=500, detail=f"LLM Extraction failed: {extracted_data['error']}")
            
        # 4. Save to database
        db_label = DrugLabel(
            drug_name=extracted_data.get("drug_name", drug_name.title()),
            generic_name=extracted_data.get("generic_name"),
            sponsor=extracted_data.get("sponsor"),
            approval_date=extracted_data.get("approval_date"),
            indications=extracted_data.get("indications"),
            dosage=extracted_data.get("dosage"),
            adverse_reactions=extracted_data.get("adverse_reactions"),
            efficacy_data=extracted_data.get("efficacy_data"),
            moa=extracted_data.get("moa"),
            biomarkers=extracted_data.get("biomarkers"),
            line_of_therapy=extracted_data.get("line_of_therapy"),
            black_box_warnings=extracted_data.get("black_box_warnings"),
            source_file=f"DailyMed_{setid}.pdf"
        )
        db.add(db_label)
        db.commit()
        db.refresh(db_label)
        
        return {"status": "success", "data": db_label}
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/labels/upload")
async def api_upload_drug_label(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Upload a PDF drug label, parse, extract intelligence, and save to DB."""
    try:
        content = await file.read()
        # 1. Parse text
        pdf_text = extract_pdf_text_from_bytes(content)
        chunks = get_label_chunks(pdf_text)
        
        # 2. Extract intelligence via LLM
        data = extract_drug_intelligence(pdf_text, chunks)
        
        if "error" in data and len(data) == 2:
            raise HTTPException(status_code=500, detail=f"LLM Extraction failed: {data['error']}")
            
        # 3. Save to database
        db_label = DrugLabel(
            drug_name=data.get("drug_name", "Unknown"),
            generic_name=data.get("generic_name"),
            sponsor=data.get("sponsor"),
            approval_date=data.get("approval_date"),
            indications=data.get("indications"),
            dosage=data.get("dosage"),
            adverse_reactions=data.get("adverse_reactions"),
            efficacy_data=data.get("efficacy_data"),
            moa=data.get("moa"),
            biomarkers=data.get("biomarkers"),
            line_of_therapy=data.get("line_of_therapy"),
            black_box_warnings=data.get("black_box_warnings"),
            source_file=file.filename
        )
        db.add(db_label)
        db.commit()
        db.refresh(db_label)
        
        return {"status": "success", "data": db_label}
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/labels")
def api_get_drug_labels(db: Session = Depends(get_db)):
    """Retrieve all extracted drug labels."""
    labels = db.query(DrugLabel).all()
    return {"labels": labels}

@router.get("/labels/{label_id}")
def api_get_drug_label(label_id: int, db: Session = Depends(get_db)):
    """Retrieve a single drug label by ID."""
    label = db.query(DrugLabel).filter(DrugLabel.id == label_id).first()
    if not label:
        raise HTTPException(status_code=404, detail="Label not found")
    return label

@router.delete("/labels/{label_id}")
def api_delete_drug_label(label_id: int, db: Session = Depends(get_db)):
    """Delete a single drug label by ID."""
    label = db.query(DrugLabel).filter(DrugLabel.id == label_id).first()
    if not label:
        raise HTTPException(status_code=404, detail="Label not found")
    db.delete(label)
    db.commit()
    return {"status": "success", "message": "Label deleted"}



app.include_router(router)
app.include_router(router, prefix="/api")

# ---------------------------------------------------------------------------
# Admin Endpoints
# ---------------------------------------------------------------------------

@app.post("/api/admin/login")
def admin_login(req: AdminLoginRequest):
    """Authenticate admin user against hardcoded credentials in .env."""
    expected_id = os.environ.get("ADMIN_ID", "admin123")
    expected_pass = os.environ.get("ADMIN_PASS", "admin123")
    
    if req.admin_id == expected_id and req.admin_pass == expected_pass:
        return {"status": "success", "token": "admin-mock-token-123"}
    else:
        raise HTTPException(status_code=401, detail="Invalid admin credentials")

class ApolloSearchRequest(BaseModel):
    company_name: str

@app.post("/api/admin/apollo/search")
def admin_apollo_search(req: ApolloSearchRequest):
    """
    Search Apollo API for company and director/employee details.
    Uses APOLLO_API_KEY from .env. Returns mock data if key is missing.
    """
    api_key = os.environ.get("APOLLO_API_KEY")
    
    # -------------------------------------------------------------
    # MOCK DATA FALLBACK (If no API key is provided)
    # -------------------------------------------------------------
    if not api_key or api_key.strip() == "":
        return {
            "company": {
                "name": req.company_name.title(),
                "website": f"www.{req.company_name.lower().replace(' ', '')}.com",
                "industry": "Technology / Healthcare (Mocked)",
                "short_description": "This is a mock description because the Apollo API Key is missing from the .env file. Add your real API key to see live data.",
                "employee_count": 5000
            },
            "directors": [
                {
                    "id": "m1",
                    "name": "Jane Doe",
                    "title": "Chief Executive Officer",
                    "email": "jane.doe@mockcompany.com",
                    "linkedin_url": "https://linkedin.com/in/mock"
                },
                {
                    "id": "m2",
                    "name": "John Smith",
                    "title": "Director of Operations",
                    "email": "john.smith@mockcompany.com",
                    "linkedin_url": "https://linkedin.com/in/mock"
                }
            ],
            "employees": [
                {
                    "id": "m3",
                    "name": "Alice Johnson",
                    "title": "Senior Engineer",
                    "email": "alice.j@mockcompany.com",
                    "linkedin_url": "https://linkedin.com/in/mock"
                },
                {
                    "id": "m4",
                    "name": "Bob Williams",
                    "title": "Marketing Manager",
                    "email": "bob.w@mockcompany.com",
                    "linkedin_url": "https://linkedin.com/in/mock"
                }
            ]
        }

    # User explicitly requested to use these endpoints:
    # 1. https://api.apollo.io/api/v1/emailer_messages/search
    # 2. https://api.apollo.io/api/v1/emailer_messages/{id}/activities
    
    headers = {
        "Cache-Control": "no-cache",
        "Content-Type": "application/json",
        "x-api-key": api_key
    }
    
    try:
        # 1. Search for the organization first to get its exact domain and details
        org_resp = requests.post(
            "https://api.apollo.io/v1/organizations/search",
            headers=headers,
            json={"q_organization_name": req.company_name, "page": 1}
        )
            
        org_data = org_resp.json()
        orgs = org_data.get("organizations", [])
        
        if not orgs:
            return {
                "company": {"name": req.company_name, "details": "Company not found in Apollo database."},
                "directors": [],
                "employees": []
            }
            
        target_org = orgs[0]
        
        # 1.5 Enrich the organization for deeper intelligence (Technologies)
        tech_names = []
        if target_org.get("primary_domain"):
            try:
                enrich_resp = requests.get(
                    f"https://api.apollo.io/v1/organizations/enrich?domain={target_org.get('primary_domain')}",
                    headers=headers
                )
                if enrich_resp.status_code == 200:
                    enrich_data = enrich_resp.json().get("organization", {})
                    techs = enrich_data.get("current_technologies") or enrich_data.get("technologies") or []
                    tech_names = list(set([t.get("name") for t in techs if t.get("name")]))
            except Exception:
                pass
        
        # Extract rich company intelligence
        company_info = {
            "name": target_org.get("name"),
            "website": target_org.get("website_url"),
            "primary_domain": target_org.get("primary_domain"),
            "industry": target_org.get("industry"),
            "short_description": target_org.get("short_description") or target_org.get("seo_description"),
            "employee_count": target_org.get("estimated_num_employees"),
            "founded_year": target_org.get("founded_year"),
            "primary_phone": target_org.get("primary_phone") and target_org.get("primary_phone").get("number"),
            "linkedin_url": target_org.get("linkedin_url"),
            "twitter_url": target_org.get("twitter_url"),
            "facebook_url": target_org.get("facebook_url"),
            "keywords": target_org.get("keywords") or [],
            "technologies": tech_names[:20], # Top 20 technologies
            "annual_revenue": target_org.get("annual_revenue_printed"),
            "total_funding": target_org.get("total_funding_printed"),
            "location": target_org.get("primary_location") and f"{target_org['primary_location'].get('city', '')}, {target_org['primary_location'].get('state', '')}, {target_org['primary_location'].get('country', '')}".strip(', ')
        }
        
        # 2. Search for saved contacts in that organization (Free Tier Compatible)
        # Using contacts/search instead of mixed_people/search since the latter is blocked on free tier.
        people_resp = requests.post(
            "https://api.apollo.io/v1/contacts/search",
            headers=headers,
            json={
                "q_organization_domains": target_org.get("primary_domain"),
                "page": 1,
                "per_page": 50
            }
        )
        
        people_data = people_resp.json()
        people = people_data.get("contacts", [])
        
        directors = []
        employees = []
        
        for person in people:
            title = (person.get("title") or "").lower()
            p_info = {
                "id": person.get("id"),
                "name": person.get("name"),
                "title": person.get("title", "Unknown Post/Title"),
                "email": person.get("email") or "Email not unlocked",
                "linkedin_url": person.get("linkedin_url")
            }
            # Sort into directors vs employees based on their post/title
            if "director" in title or "ceo" in title or "founder" in title or "vp" in title or "chief" in title or "head" in title:
                directors.append(p_info)
            else:
                employees.append(p_info)
                
        return {
            "company": company_info,
            "directors": directors,
            "employees": employees
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


