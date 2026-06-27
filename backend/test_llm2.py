import requests
import json
from pdf_parser import extract_pdf_text_from_bytes, get_label_chunks
from llm_extractor import extract_drug_intelligence
from dotenv import load_dotenv
load_dotenv(".env")
pdf_url = "https://dailymed.nlm.nih.gov/dailymed/getFile.cfm?setid=097d166f-b73b-41d3-9b37-7653cd2a0c41&type=pdf"
resp = requests.get(pdf_url)
text = extract_pdf_text_from_bytes(resp.content)
chunks = get_label_chunks(text)
import llm_extractor
llm_extractor.extract_drug_intelligence(text, chunks)
