import json
import csv
import sys

def convert_json_to_csv(json_file, csv_file):
    try:
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        protocol = data.get('protocolSection', {})
        identification = protocol.get('identificationModule', {})
        status = protocol.get('statusModule', {})
        sponsor = protocol.get('sponsorCollaboratorsModule', {})
        conditions = protocol.get('conditionsModule', {})
        design = protocol.get('designModule', {})

        # Extracting the most relevant fields into a flat dictionary
        row = {
            'NCT ID': identification.get('nctId', ''),
            'Title': identification.get('briefTitle', ''),
            'Overall Status': status.get('overallStatus', ''),
            'Start Date': status.get('startDateStruct', {}).get('date', ''),
            'Completion Date': status.get('completionDateStruct', {}).get('date', ''),
            'Sponsor': sponsor.get('leadSponsor', {}).get('name', ''),
            'Conditions': ", ".join(conditions.get('conditions', [])),
            'Study Type': design.get('studyType', ''),
            'Enrollment Count': design.get('enrollmentInfo', {}).get('count', '')
        }

        with open(csv_file, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=row.keys())
            writer.writeheader()
            writer.writerow(row)
            
        print(f"Successfully created {csv_file} from {json_file}")
        
    except Exception as e:
        print(f"Error converting file: {e}")

if __name__ == "__main__":
    convert_json_to_csv('NCT01473693_data.json', 'NCT01473693_data.csv')
