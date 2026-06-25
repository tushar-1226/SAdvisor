import fitz  # PyMuPDF
import re

def extract_pdf_text_from_bytes(file_bytes: bytes) -> str:
    """Extract all text from PDF bytes."""
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    text = ""
    for page in doc:
        text += page.get_text()
    return text

def extract_section(text: str, start_marker: str, end_marker: str) -> str:
    """Attempt to extract a section using regex."""
    pattern = rf"{start_marker}(.*?){end_marker}"
    match = re.search(pattern, text, re.S | re.I)
    if match:
        return match.group(1).strip()
    return ""

def get_label_chunks(full_text: str) -> dict:
    """
    Attempt to break the label into logical chunks.
    If regex fails, we return the first chunk of text to give the LLM some context.
    """
    chunks = {}
    
    # Try basic regex extraction
    indications = extract_section(full_text, r"INDICATIONS AND USAGE", r"DOSAGE AND ADMINISTRATION")
    dosage = extract_section(full_text, r"DOSAGE AND ADMINISTRATION", r"DOSAGE FORMS AND STRENGTHS")
    warnings = extract_section(full_text, r"WARNINGS AND PRECAUTIONS", r"ADVERSE REACTIONS")
    adverse = extract_section(full_text, r"ADVERSE REACTIONS", r"DRUG INTERACTIONS")
    clinical = extract_section(full_text, r"CLINICAL STUDIES", r"HOW SUPPLIED")
    moa = extract_section(full_text, r"CLINICAL PHARMACOLOGY", r"NONCLINICAL TOXICOLOGY")
    
    if indications: chunks["Indications"] = indications
    if dosage: chunks["Dosage"] = dosage
    if warnings: chunks["Warnings"] = warnings
    if adverse: chunks["Adverse"] = adverse
    if clinical: chunks["Clinical"] = clinical
    if moa: chunks["MoA"] = moa
    
    return chunks
