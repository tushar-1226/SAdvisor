# SAdvisor (Clinical Intelligence Tool)

SAdvisor is a comprehensive Clinical Intelligence Tool designed to provide orchestrated searches across multiple medical and pharmaceutical databases. It empowers users with advanced clinical trial data, medical literature, drug details, and pharmaceutical market forecasting. Additionally, it features an interactive Excel Data Analytics Dashboard.

## Features

- **Orchestrated Search**: A single query for a disease or condition returns consolidated results from ClinicalTrials.gov, PubMed, and PubChem.
- **Pharmaceutical Forecasting**: Generate 10-year market forecast models for specific diseases (oncology or non-oncology), utilizing API integrations to resolve demographics and active pipeline clinical trials.
- **Excel Analytics Dashboard**: A client-side data exploration tool allowing users to upload Excel files, parse data via the `xlsx` library, and visualize it through interactive SVG charts and data tables.
- **Clinical Insights Engine**: Generates AI/heuristics-driven insights and confidence scores based on retrieved clinical trials, research articles, and drug properties.

## Tech Stack

### Frontend

- **Framework**: React 19 + TypeScript + Vite
- **Styling/Icons**: `lucide-react`
- **Data Parsing**: `xlsx` for client-side Excel file processing

### Backend

- **Framework**: FastAPI (Python)
- **Data Sources / Integrations**:
  - ClinicalTrials.gov
  - PubMed (NCBI)
  - PubChem
  - ChEMBL
  - OpenFDA & SEER (via config)
- **Concurrency**: `ThreadPoolExecutor` for parallel API requests to minimize response times.

## Getting Started

### Prerequisites

- Node.js
- Python 3.x

### Running the Backend

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Set up a virtual environment and install dependencies:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows use `venv\Scripts\activate`
   pip install -r requirements.txt
   ```
3. Run the FastAPI development server:
   ```bash
   uvicorn app:app --host 127.0.0.1 --port 8000 --reload
   ```

### Running the Frontend

1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```

## Configuration

The backend supports configurable API keys for advanced forecasting capabilities (SEER, NCBI, OpenFDA). You can configure these keys by creating a `.env` file in the `backend` directory or using the built-in configuration endpoints.
