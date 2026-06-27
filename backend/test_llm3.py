import requests
import json
from pdf_parser import extract_pdf_text_from_bytes, get_label_chunks
from llm_extractor import extract_drug_intelligence
from dotenv import load_dotenv
load_dotenv(".env")

pdf_url = "https://dailymed.nlm.nih.gov/dailymed/getFile.cfm?setid=097d166f-b73b-41d3-9b37-7653cd2a0c41&type=pdf"
print("Downloading PDF...")
resp = requests.get(pdf_url)
print("Parsing PDF...")
text = extract_pdf_text_from_bytes(resp.content)
chunks = get_label_chunks(text)

import insights
print("Calling API directly...")
prompt = f"""
You are an expert Clinical Intelligence Agent. Your task is to extract highly accurate structured data from an FDA drug label document.
Read the provided document sections and extract the following fields into a STRICT, valid JSON object. 

Fields to extract:
- "drug_name": The brand or product name of the drug.
- "generic_name": The generic name.

Document Context:
{text[:8000]}

OUTPUT ONLY VALID JSON. DO NOT WRAP IN ```json ... ``` MARKDOWN. JUST THE RAW JSON OBJECT.
"""
import os
try:
    res = insights.query_nvidia_summary(prompt, os.environ.get("NVIDIA_API_KEY"), os.environ.get("NVIDIA_API_URL"))
    print(f"RESULT: '{res}'")
except Exception as e:
    print(f"EXCEPTION: {e}")
