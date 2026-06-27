import os
import json
import re
from typing import Dict, Any
from insights import query_nvidia_summary

def extract_drug_intelligence(pdf_text: str, chunks: dict) -> Dict[str, Any]:
    """
    Uses the LLM to parse text into structured JSON.
    """
    api_key = os.environ.get("NVIDIA_API_KEY", "")
    api_url = os.environ.get("NVIDIA_API_URL", "")
    
    if not api_key or not api_url:
        raise ValueError("NVIDIA API key and URL are required in the environment.")
        
    # Construct prompt. We pass the chunked data if available to keep prompt concise.
    # If no chunks were matched, pass the first 8000 chars of the PDF.
    context_text = ""
    if chunks:
        for k, v in chunks.items():
            context_text += f"\n--- {k.upper()} ---\n{v[:8000]}\n" # Cap chunk sizes
    else:
        context_text = pdf_text[:30000]
        
    print(f"Context text length: {len(context_text)}")

    prompt = f"""
You are an expert Clinical Intelligence Agent. Your task is to extract highly accurate structured data from an FDA drug label document.
Read the provided document sections and extract the following fields into a STRICT, valid JSON object. 

Fields to extract:
- "drug_name": The brand or product name of the drug.
- "generic_name": The generic name.
- "sponsor": The company or manufacturer.
- "approval_date": Initial US approval date (e.g. "2020").
- "indications": A concise summary of approved indications.
- "dosage": Recommended dosage summary.
- "adverse_reactions": Most common adverse reactions.
- "efficacy_data": Key efficacy endpoints (e.g. ORR, PFS, OS).
- "moa": Mechanism of action.
- "biomarkers": Required or relevant biomarkers for use.
- "line_of_therapy": First-line, second-line, etc.
- "black_box_warnings": Any black box warnings. If none, say "None".

Document Context:
{context_text}

OUTPUT ONLY VALID JSON. DO NOT WRAP IN ```json ... ``` MARKDOWN. JUST THE RAW JSON OBJECT.
"""
    
    try:
        response_text = query_nvidia_summary(prompt, api_key, api_url)
        
        
        print(f"--- RAW LLM RESPONSE ---\n{response_text}\n------------------------")

        # Try to clean markdown formatting if the LLM adds it
        match = re.search(r'\{.*\}', response_text, re.DOTALL)
        if match:
            response_text = match.group(0)
            print(f"--- PARSED LLM STRING ---\n{response_text}\n-------------------------")
        
        data = json.loads(response_text)
        print(f"--- FINAL JSON DATA ---\n{json.dumps(data, indent=2)}\n-----------------------")
        return data
    except json.decoder.JSONDecodeError as e:
        print(f"Failed to parse LLM JSON: {e}")
        return {
            "drug_name": "Unknown",
            "error": "The AI model failed to format the response correctly. The document might be too complex or too large."
        }
    except Exception as e:
        print(f"LLM Extraction Error: {e}")
        return {
            "drug_name": "Unknown",
            "error": str(e)
        }
