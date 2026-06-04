import requests
import json
import sys

def search_drug_details():
    # Allow passing drug name as a command-line argument or via user input
    if len(sys.argv) > 1:
        drug_name = " ".join(sys.argv[1:]).strip()
    else:
        drug_name = input("Enter the medical drug name (e.g., 'Aspirin', 'Ibuprofen'): ").strip()

    if not drug_name:
        print("Error: Drug name is required.")
        return

    print(f"\nSearching NIH PubChem for drug details on: '{drug_name}'...\n")
    
    # PubChem PUG REST API endpoint for compound properties
    base_url = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/{requests.utils.quote(drug_name)}"
    properties = "Title,MolecularFormula,MolecularWeight,IUPACName,CanonicalSMILES,InChIKey"
    property_url = f"{base_url}/property/{properties}/JSON"
    
    # Endpoint to get synonyms (brand names, alternative names)
    synonyms_url = f"{base_url}/synonyms/JSON"

    try:
        # 1. Fetch properties
        prop_resp = requests.get(property_url, headers={'User-Agent': 'Mozilla/5.0'})
        
        if prop_resp.status_code == 404:
            print(f"No drug found matching '{drug_name}'. Please check the spelling.")
            return
            
        prop_resp.raise_for_status()
        prop_data = prop_resp.json()
        
        properties = prop_data.get("PropertyTable", {}).get("Properties", [])[0]
        
        # 2. Fetch synonyms (for brand names and medical alternative names)
        syn_resp = requests.get(synonyms_url, headers={'User-Agent': 'Mozilla/5.0'})
        synonyms = []
        synonyms_list = []
        if syn_resp.status_code == 200:
            syn_data = syn_resp.json()
            synonyms_list = syn_data.get("InformationList", {}).get("Information", [])[0].get("Synonym", [])
            # Keep top 10 synonyms to avoid flooding the terminal
            synonyms = synonyms_list[:10]

        # Display the details in a clean layout
        title = properties.get("Title", drug_name)
        cid = properties.get("CID", "Unknown")
        
        print("="*80)
        print(f"Drug Name:          {title}")
        print(f"PubChem CID:        {cid}")
        print(f"Molecular Formula:  {properties.get('MolecularFormula', 'N/A')}")
        print(f"Molecular Weight:   {properties.get('MolecularWeight', 'N/A')} g/mol")
        print(f"IUPAC Name:         {properties.get('IUPACName', 'N/A')}")
        print(f"SMILES Structure:   {properties.get('CanonicalSMILES', 'N/A')}")
        print("="*80)
        
        if synonyms:
            print("Common Synonyms & Brand Names:")
            print(", ".join(synonyms))
            print("="*80)

        # Prompt the user to save the full JSON data
        save = input("\nDo you want to save the full details to a JSON file? (y/n): ").strip().lower()
        if save == 'y':
            # Create a safe filename by replacing spaces with underscores
            safe_name = drug_name.replace(' ', '_').replace('/', '_')
            filename = f"drug_{safe_name}_details.json"
            
            # Combine both properties and all synonyms into one file
            full_data = {
                "Properties": properties,
                "Synonyms": synonyms_list
            }
            
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(full_data, f, indent=4)
            print(f"Full drug details saved to {filename}")
        else:
            print("Done. To see all data, run the script again and choose 'y' to save.")

    except requests.exceptions.HTTPError as e:
        print(f"HTTP Error: {e.response.status_code}.")
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    search_drug_details()
