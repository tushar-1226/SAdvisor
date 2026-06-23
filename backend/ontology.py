import re

# Mapping of synonyms to canonical baseline terms used in forecast.py
SYNONYM_MAP = {
    # NSCLC
    "nsclc": "nsclc",
    "non-small cell lung cancer": "nsclc",
    "non small cell lung cancer": "nsclc",
    "non-small cell lung carcinoma": "nsclc",
    "non small cell lung carcinoma": "nsclc",
    "lung cancer": "nsclc",
    "lung carcinoma": "nsclc",
    
    # SCLC
    "sclc": "sclc",
    "small cell lung cancer": "sclc",
    "small cell lung carcinoma": "sclc",
    
    # Breast Cancer
    "breast": "breast",
    "breast cancer": "breast",
    "breast carcinoma": "breast",
    "breast tumor": "breast",
    
    # Prostate Cancer
    "prostate": "prostate",
    "prostate cancer": "prostate",
    "prostate carcinoma": "prostate",
    
    # Colorectal Cancer
    "colorectal": "colorectal",
    "colorectal cancer": "colorectal",
    "colon cancer": "colorectal",
    "colorectal carcinoma": "colorectal",
    "bowel cancer": "colorectal",
    
    # Diabetes
    "diabetes": "diabetes",
    "type 2 diabetes": "diabetes",
    "type ii diabetes": "diabetes",
    "diabetes mellitus": "diabetes",
    "t2d": "diabetes",
    
    # Asthma
    "asthma": "asthma",
    "bronchial asthma": "asthma",
    
    # COPD
    "copd": "copd",
    "chronic obstructive pulmonary disease": "copd",
    "emphysema": "copd",
    "chronic bronchitis": "copd",
    
    # CVD
    "cvd": "cvd",
    "cardiovascular disease": "cvd",
    "heart disease": "cvd",
    "coronary artery disease": "cvd"
}

def clean_query(query: str) -> str:
    """Normalize input string: lowercase, strip punctuation, trim whitespace."""
    if not query:
        return ""
    q = query.lower().strip()
    # Remove common symbols but keep alphanumeric characters and spaces
    q = re.sub(r"[^\w\s-]", "", q)
    # Replace multiple spaces with a single space
    q = re.sub(r"\s+", " ", q).strip()
    return q

def resolve_disease(query: str) -> tuple[str, str]:
    """
    Resolves a search query to a (canonical_key, display_name) pair.
    If no match is found, returns the cleaned query as both.
    """
    cleaned = clean_query(query)
    
    # Try exact match in mapping first
    if cleaned in SYNONYM_MAP:
        key = SYNONYM_MAP[cleaned]
        return key, key.upper()
        
    # Try keyword substring matching
    for synonym, key in SYNONYM_MAP.items():
        if len(synonym) > 3 and (synonym in cleaned or cleaned in synonym):
            return key, key.upper()
            
    # Default fallback
    return cleaned, query.strip()
