"""
services.py – Reusable service functions extracted from the original CLI scripts.
Each function makes external API calls and returns structured Python dicts/lists.
"""

import requests
from typing import Optional

HEADERS = {"User-Agent": "SAdvisory/1.0"}


# ---------------------------------------------------------------------------
# 1. ClinicalTrials.gov  –  search by disease / condition
# ---------------------------------------------------------------------------

def format_phase(phase: str) -> str:
    p = phase.upper()
    if p == "EARLY_PHASE1":
        return "Early Phase 1"
    if p == "PHASE1":
        return "Phase 1"
    if p == "PHASE2":
        return "Phase 2"
    if p == "PHASE3":
        return "Phase 3"
    if p == "PHASE4":
        return "Phase 4"
    if p == "NA":
        return "N/A"
    return phase.title()


# ---------------------------------------------------------------------------
# 1. ClinicalTrials.gov  –  search by disease / condition
# ---------------------------------------------------------------------------

def search_trials_by_condition(condition: str, max_results: int = 10) -> list[dict]:
    """
    Search ClinicalTrials.gov API v2 for studies matching a condition.
    Returns a list of trial summary dicts.
    """
    url = "https://clinicaltrials.gov/api/v2/studies"
    params = {
        "query.cond": condition,
        "pageSize": max_results,
    }

    resp = requests.get(url, params=params, headers=HEADERS, timeout=15)
    resp.raise_for_status()
    data = resp.json()

    studies = data.get("studies", [])
    results = []
    for study in studies:
        protocol = study.get("protocolSection", {})
        ident = protocol.get("identificationModule", {})
        status_mod = protocol.get("statusModule", {})
        conditions_mod = protocol.get("conditionsModule", {})
        design_mod = protocol.get("designModule", {})
        sponsor_mod = protocol.get("sponsorCollaboratorsModule", {})
        arms_mod = protocol.get("armsInterventionsModule", {})
        desc_mod = protocol.get("descriptionModule", {})

        # Extract interventions / drug names from the trial
        interventions_raw = arms_mod.get("interventions", [])
        interventions = [
            {
                "name": iv.get("name", ""),
                "type": iv.get("type", ""),
                "description": iv.get("description", ""),
            }
            for iv in interventions_raw
        ]

        # Extract phases
        phases_raw = design_mod.get("phases", [])
        phases = [format_phase(p) for p in phases_raw]

        results.append(
            {
                "nctId": ident.get("nctId", ""),
                "briefTitle": ident.get("briefTitle", ""),
                "officialTitle": ident.get("officialTitle", ""),
                "overallStatus": status_mod.get("overallStatus", ""),
                "startDate": status_mod.get("startDateStruct", {}).get("date", ""),
                "completionDate": status_mod.get("completionDateStruct", {}).get("date", ""),
                "conditions": conditions_mod.get("conditions", []),
                "studyType": design_mod.get("studyType", ""),
                "enrollmentCount": design_mod.get("enrollmentInfo", {}).get("count", ""),
                "sponsor": sponsor_mod.get("leadSponsor", {}).get("name", ""),
                "interventions": interventions,
                "briefSummary": desc_mod.get("briefSummary", ""),
                "phases": phases,
            }
        )

    return results


# ---------------------------------------------------------------------------
# 2. ClinicalTrials.gov  –  fetch a single trial by NCT ID
# ---------------------------------------------------------------------------

def get_trial_by_nct_id(nct_id: str) -> Optional[dict]:
    """
    Fetch a single study from ClinicalTrials.gov by its NCT ID.
    """
    url = f"https://clinicaltrials.gov/api/v2/studies/{nct_id}"
    resp = requests.get(url, headers=HEADERS, timeout=15)
    if resp.status_code == 404:
        return None
    resp.raise_for_status()
    data = resp.json()

    protocol = data.get("protocolSection", {})
    ident = protocol.get("identificationModule", {})
    status_mod = protocol.get("statusModule", {})
    conditions_mod = protocol.get("conditionsModule", {})
    design_mod = protocol.get("designModule", {})
    sponsor_mod = protocol.get("sponsorCollaboratorsModule", {})
    arms_mod = protocol.get("armsInterventionsModule", {})
    desc_mod = protocol.get("descriptionModule", {})

    interventions_raw = arms_mod.get("interventions", [])
    interventions = [
        {
            "name": iv.get("name", ""),
            "type": iv.get("type", ""),
            "description": iv.get("description", ""),
        }
        for iv in interventions_raw
    ]

    # Extract phases
    phases_raw = design_mod.get("phases", [])
    phases = [format_phase(p) for p in phases_raw]

    return {
        "nctId": ident.get("nctId", ""),
        "briefTitle": ident.get("briefTitle", ""),
        "officialTitle": ident.get("officialTitle", ""),
        "overallStatus": status_mod.get("overallStatus", ""),
        "startDate": status_mod.get("startDateStruct", {}).get("date", ""),
        "completionDate": status_mod.get("completionDateStruct", {}).get("date", ""),
        "conditions": conditions_mod.get("conditions", []),
        "studyType": design_mod.get("studyType", ""),
        "enrollmentCount": design_mod.get("enrollmentInfo", {}).get("count", ""),
        "sponsor": sponsor_mod.get("leadSponsor", {}).get("name", ""),
        "interventions": interventions,
        "briefSummary": desc_mod.get("briefSummary", ""),
        "phases": phases,
    }



# ---------------------------------------------------------------------------
# 3. PubMed  –  search articles
# ---------------------------------------------------------------------------

def search_pubmed_articles(query: str, max_results: int = 10) -> list[dict]:
    """
    Search PubMed for articles matching a query.
    Returns a list of article summary dicts.
    """
    # Step 1 – search for PMIDs
    search_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
    search_params = {
        "db": "pubmed",
        "term": query,
        "retmode": "json",
        "retmax": max_results,
    }
    search_resp = requests.get(search_url, params=search_params, headers=HEADERS, timeout=15)
    search_resp.raise_for_status()
    id_list = search_resp.json().get("esearchresult", {}).get("idlist", [])

    if not id_list:
        return []

    # Step 2 – fetch summaries
    summary_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi"
    summary_params = {
        "db": "pubmed",
        "id": ",".join(id_list),
        "retmode": "json",
    }
    summary_resp = requests.get(summary_url, params=summary_params, headers=HEADERS, timeout=15)
    summary_resp.raise_for_status()
    result_data = summary_resp.json().get("result", {})

    articles = []
    for pmid in id_list:
        article = result_data.get(pmid, {})
        authors_list = article.get("authors", [])
        authors = ", ".join([a.get("name", "") for a in authors_list]) if authors_list else "Unknown"
        articles.append(
            {
                "pmid": pmid,
                "title": article.get("title", "No title"),
                "journal": article.get("source", "Unknown journal"),
                "pubDate": article.get("pubdate", "Unknown date"),
                "authors": authors,
            }
        )

    return articles


# ---------------------------------------------------------------------------
# 4. PubChem  –  drug / compound details
# ---------------------------------------------------------------------------

def get_drug_details(drug_name: str) -> Optional[dict]:
    """
    Fetch drug / compound details from PubChem PUG REST API.
    """
    encoded = requests.utils.quote(drug_name)
    base_url = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/{encoded}"

    props = "Title,MolecularFormula,MolecularWeight,IUPACName,CanonicalSMILES,InChIKey"
    property_url = f"{base_url}/property/{props}/JSON"
    synonyms_url = f"{base_url}/synonyms/JSON"

    # 1. Properties
    prop_resp = requests.get(property_url, headers=HEADERS, timeout=15)
    if prop_resp.status_code == 404:
        return None
    prop_resp.raise_for_status()
    prop_data = prop_resp.json()
    properties = prop_data.get("PropertyTable", {}).get("Properties", [{}])[0]

    # 2. Synonyms (best-effort)
    synonyms: list[str] = []
    try:
        syn_resp = requests.get(synonyms_url, headers=HEADERS, timeout=10)
        if syn_resp.status_code == 200:
            syn_data = syn_resp.json()
            synonyms = (
                syn_data.get("InformationList", {})
                .get("Information", [{}])[0]
                .get("Synonym", [])[:10]
            )
    except Exception:
        pass

    return {
        "name": properties.get("Title", drug_name),
        "cid": properties.get("CID", ""),
        "molecularFormula": properties.get("MolecularFormula", ""),
        "molecularWeight": properties.get("MolecularWeight", ""),
        "iupacName": properties.get("IUPACName", ""),
        "smiles": properties.get("CanonicalSMILES", ""),
        "inchiKey": properties.get("InChIKey", ""),
        "synonyms": synonyms,
    }


# ---------------------------------------------------------------------------
# 5. ChEMBL  –  molecule lookup
# ---------------------------------------------------------------------------

def search_chembl(query: str) -> Optional[str]:
    """
    Search ChEMBL for a molecule matching the query.
    Returns the ChEMBL ID of the first hit, or None.
    """
    url = "https://www.ebi.ac.uk/chembl/api/data/molecule/search"
    params = {"q": query, "format": "json"}
    resp = requests.get(url, params=params, timeout=15)
    if resp.status_code != 200:
        return None
    data = resp.json()
    molecules = data.get("molecules", [])
    if molecules:
        return molecules[0].get("molecule_chembl_id")
    return None
