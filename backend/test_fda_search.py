import requests
from bs4 import BeautifulSoup

def search_fda(drug_name):
    url = "https://www.accessdata.fda.gov/scripts/cder/daf/index.cfm?event=BasicSearch.process"
    data = {"searchterm": drug_name}
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    response = requests.post(url, data=data, headers=headers)
    print(f"Status: {response.status_code}")
    print(f"URL: {response.url}")
    
    soup = BeautifulSoup(response.text, 'html.parser')
    # Look for drug links
    links = soup.find_all('a', href=True)
    for link in links:
        if 'event=overview.process' in link['href']:
            print(f"Found drug link: {link['href']} - {link.text.strip()}")
            # Follow link to get NDA
            drug_url = "https://www.accessdata.fda.gov/scripts/cder/daf/" + link['href']
            resp2 = requests.get(drug_url, headers=headers)
            soup2 = BeautifulSoup(resp2.text, 'html.parser')
            # Look for labels
            lbl_links = soup2.find_all('a', href=True)
            for l in lbl_links:
                if 'drugsatfda_docs/label' in l['href'].lower() and l['href'].endswith('.pdf'):
                    print(f"Found PDF label: {l['href']}")
                    return l['href']
    return None

if __name__ == "__main__":
    search_fda("keytruda")
