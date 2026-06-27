import requests
from pdf_parser import extract_pdf_text_from_bytes, get_label_chunks
from llm_extractor import extract_drug_intelligence
from dotenv import load_dotenv
load_dotenv()

pdf_url = "https://dailymed.nlm.nih.gov/dailymed/getFile.cfm?setid=097d166f-b73b-41d3-9b37-7653cd2a0c41&type=pdf"
print("Downloading PDF...")
resp = requests.get(pdf_url)
print(f"PDF Size: {len(resp.content)}")

print("Extracting text...")
text = extract_pdf_text_from_bytes(resp.content)
print(f"Extracted {len(text)} characters.")

print("Chunking...")
chunks = get_label_chunks(text)
print(f"Found {len(chunks)} chunks.")

print("Calling LLM...")
data = extract_drug_intelligence(text, chunks)
print(data)
