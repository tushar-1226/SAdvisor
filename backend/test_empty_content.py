import requests
import json
import os
from pdf_parser import extract_pdf_text_from_bytes, get_label_chunks
from dotenv import load_dotenv
load_dotenv(".env")
api_url = os.environ.get("NVIDIA_API_URL")
api_key = os.environ.get("NVIDIA_API_KEY")

pdf_url = "https://dailymed.nlm.nih.gov/dailymed/getFile.cfm?setid=097d166f-b73b-41d3-9b37-7653cd2a0c41&type=pdf"
resp = requests.get(pdf_url)
text = extract_pdf_text_from_bytes(resp.content)
chunks = get_label_chunks(text)

context_text = ""
if chunks:
    for k, v in chunks.items():
        context_text += f"\n--- {k.upper()} ---\n{v[:2000]}\n"
else:
    context_text = text[:8000]

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
payload = {
    "model": "google/diffusiongemma-26b-a4b-it",
    "messages": [{"role": "user", "content": prompt}],
    "max_tokens": 1024,
    "temperature": 0.20,
    "top_p": 0.95,
    "stream": False,
    "chat_template_kwargs": {"enable_thinking": True}
}
resp = requests.post(api_url, json=payload, headers={"Authorization": f"Bearer {api_key}"})
print(resp.status_code)
print(resp.text[:1000]) # Print first 1000 chars of response
