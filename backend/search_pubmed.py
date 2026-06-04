import requests
import json
import sys

def search_pubmed():
    # Allow passing search term as a command-line argument or via user input
    if len(sys.argv) > 1:
        query = " ".join(sys.argv[1:]).strip()
    else:
        query = input("Enter the search term for PubMed (e.g., 'lung cancer'): ").strip()

    if not query:
        print("Error: Search term is required.")
        return

    # Step 1: Search for the term to get PMIDs
    search_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
    search_params = {
        "db": "pubmed",
        "term": query,
        "retmode": "json",
        "retmax": 5  # Fetch top 5 results
    }

    print(f"\nSearching PubMed for '{query}'...\n")
    
    try:
        search_resp = requests.get(search_url, params=search_params, headers={'User-Agent': 'Mozilla/5.0'})
        search_resp.raise_for_status()
        search_data = search_resp.json()
        
        id_list = search_data.get("esearchresult", {}).get("idlist", [])
        
        if not id_list:
            print("No articles found for the given search term.")
            return
            
        print(f"Found {len(id_list)} top articles. Fetching details...\n")
        
        # Step 2: Fetch summary details for the retrieved PMIDs
        summary_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi"
        summary_params = {
            "db": "pubmed",
            "id": ",".join(id_list),
            "retmode": "json"
        }
        
        summary_resp = requests.get(summary_url, params=summary_params, headers={'User-Agent': 'Mozilla/5.0'})
        summary_resp.raise_for_status()
        summary_data = summary_resp.json()
        
        result_data = summary_data.get("result", {})
        
        # Print results in a clean format
        print("="*80)
        for pmid in id_list:
            article = result_data.get(pmid, {})
            title = article.get("title", "No title")
            pubdate = article.get("pubdate", "Unknown date")
            source = article.get("source", "Unknown journal")
            
            # Safely extract authors
            authors_list = article.get("authors", [])
            authors = ", ".join([a.get("name", "") for a in authors_list]) if authors_list else "Unknown authors"
            
            print(f"PMID:    {pmid}")
            print(f"Title:   {title}")
            print(f"Journal: {source} ({pubdate})")
            print(f"Authors: {authors}")
            print("-" * 80)
            
        # Prompt the user to save the full JSON data
        save = input("\nDo you want to save the full JSON results to a file? (y/n): ").strip().lower()
        if save == 'y':
            # Create a safe filename by replacing spaces with underscores
            safe_query = query.replace(' ', '_').replace('/', '_')
            filename = f"pubmed_{safe_query}_results.json"
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(summary_data, f, indent=4)
            print(f"Full response saved to {filename}")
        else:
            print("Done. To see the raw data, you can run the script again and choose 'y' to save.")

    except requests.exceptions.HTTPError as e:
        print(f"HTTP Error: {e.response.status_code}.")
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    search_pubmed()
