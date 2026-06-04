import requests
import sys

def search_chembl(query):
    # The EBI ChEMBL REST API endpoint
    url = "https://www.ebi.ac.uk/chembl/api/data/molecule/search"
    params = {
        "q": query,
        "format": "json"
    }
    
    try:
        # Make the request to ebi.ac.uk
        response = requests.get(url, params=params)
        response.raise_for_status()
        
        data = response.json()
        molecules = data.get('molecules', [])
        
        if molecules:
            # Get the ChEMBL ID of the first match
            chembl_id = molecules[0].get('molecule_chembl_id')
            print(chembl_id)
        else:
            print(f"No results found for '{query}'")
            
    except requests.exceptions.RequestException as e:
        print(f"HTTP Error occurred: {e}")
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    # You can also use sys.argv to pass arguments via command line
    query = sys.argv[1] if len(sys.argv) > 1 else 'pembrolizumab'
    search_chembl(query)