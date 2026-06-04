import requests
import json
import sys

def search_clinical_trial():
    # Allow passing NCT ID as a command-line argument or via user input
    if len(sys.argv) > 1:
        nct_id = sys.argv[1].strip()
    else:
        nct_id = input("Enter the NCT ID (e.g., NCT01473693): ").strip()

    if not nct_id:
        print("Error: NCT ID is required.")
        return

    url = f"https://clinicaltrials.gov/api/v2/studies/{nct_id}"
    
    print(f"\nFetching data for {nct_id} from {url}...\n")
    
    try:
        # Make the API request using the 'requests' library
        response = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'})
        response.raise_for_status() # Raise an exception for HTTP errors
        
        # Parse JSON data
        data = response.json()
        
        # Extract basic info for a clean summary output
        protocol = data.get('protocolSection', {})
        identification = protocol.get('identificationModule', {})
        status = protocol.get('statusModule', {})
        
        title = identification.get('briefTitle', 'No title available')
        overall_status = status.get('overallStatus', 'Unknown')
        
        print("="*60)
        print(f"Trial ID: {nct_id}")
        print(f"Title:    {title}")
        print(f"Status:   {overall_status}")
        print("="*60)
        
        # Prompt the user to save the full JSON data
        save = input("\nDo you want to save the full JSON response to a file? (y/n): ").strip().lower()
        if save == 'y':
            filename = f"{nct_id}_full_response.json"
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=4)
            print(f"Full response saved to {filename}")
        else:
            print("Done. To see the raw data, you can run the script again and choose 'y' to save.")

    except requests.exceptions.HTTPError as e:
        print(f"HTTP Error: {e.response.status_code}. Please check if the NCT ID '{nct_id}' is correct.")
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    search_clinical_trial()
