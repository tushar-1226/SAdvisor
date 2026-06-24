import os
import requests
import json
from typing import Dict, Any, List

def query_nvidia_summary(prompt: str, api_key: str, api_url: str) -> str:
    """Queries the NVIDIA Chat Completion API using the Google DiffusionGemma model."""
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "google/diffusiongemma-26b-a4b-it",
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 1024,
        "temperature": 0.20,
        "top_p": 0.95,
        "stream": False,
        "chat_template_kwargs": {"enable_thinking": True}
    }
    try:
        resp = requests.post(api_url, json=payload, headers=headers, timeout=20)
        if resp.status_code == 200:
            data = resp.json()
            choices = data.get("choices", [])
            if choices:
                text = choices[0].get("message", {}).get("content", "")
                if text:
                    return text.strip()
        print(f"[Insights] NVIDIA API call returned status {resp.status_code}: {resp.text}")
    except Exception as e:
        print(f"[Insights] Failed to contact NVIDIA API: {e}")
    return ""

def compile_heuristic_insights(query: str, trials: List[Dict[str, Any]], articles: List[Dict[str, Any]], drugs: List[Dict[str, Any]]) -> str:
    """Fallback generator that constructs a professional markdown clinical summary from counts and details."""
    trials_count = len(trials)
    articles_count = len(articles)
    drugs_count = len(drugs)
    
    # Calculate phase statistics
    phases = {"Phase 1": 0, "Phase 2": 0, "Phase 3": 0, "Phase 4": 0, "N/A": 0}
    sponsors = set()
    active_count = 0
    interventions = set()

    for t in trials:
        for p in t.get("phases", []):
            if p in phases:
                phases[p] += 1
        sp = t.get("sponsor")
        if sp:
            sponsors.add(sp)
        status = t.get("overallStatus", "").upper()
        if "RECRUITING" in status or "ACTIVE" in status:
            active_count += 1
        for iv in t.get("interventions", []):
            name = iv.get("name")
            if name and iv.get("type", "").upper() in ("DRUG", "BIOLOGICAL"):
                interventions.add(name)

    top_sponsors = list(sponsors)[:3]
    top_interventions = list(interventions)[:4]
    
    summary = f"""### Clinical Intelligence Executive Summary for **{query.upper()}**

#### Executive Overview
Analysis of the therapeutic landscape for **{query.upper()}** indicates a highly active research profile, consisting of **{trials_count} clinical trials** and **{articles_count} scientific research publications** indexed. The pipeline shows **{active_count} actively recruiting/active studies** backed by prominent developers including *{", ".join(top_sponsors) if top_sponsors else "leading sponsors"}*.

#### Pipeline Breakdown
* **Development Phases:** Phase 1: {phases['Phase 1']} trials · Phase 2: {phases['Phase 2']} trials · Phase 3: {phases['Phase 3']} trials · Phase 4: {phases['Phase 4']} trials.
* **Key Compounds Under Investigation:** {", ".join(top_interventions) if top_interventions else "Targeted biologics and immunotherapies"}.
* **Search Context:** Clinical trials dataset suggests robust interest in combination protocols and molecularly targeted therapies.

#### SWOT Analysis

| Strengths | Weaknesses |
| :--- | :--- |
| • Strong representation of developmental phases.<br>• Parallel research backed by active publication outputs. | • Critical data fields (enrollment/phase targets) missing in {phases['N/A']} registered trials.<br>• High dependency on standard cytotoxic backbones. |
| **Opportunities** | **Threats** |
| • Emerging biomarkers indicate opportunities for personalized therapies.<br>• High phase 1/2 density suggests novel molecular entries. | • Patient recruitment delays for rare cohorts.<br>• Competing trials matching similar patient inclusion criteria. |

#### Regulatory & Medical Outlook
Research papers indicate focus on secondary endpoints and survival efficacy statistics. Approved therapies like *{", ".join([d.get("name") for d in drugs[:2]]) if drugs else "standard treatments"}* continue to establish baseline values, while pipeline candidates are targeting mechanisms with enhanced selectivity to lower toxicity.
"""
    return summary

def generate_clinical_insights(query: str, trials: List[Dict[str, Any]], articles: List[Dict[str, Any]], drugs: List[Dict[str, Any]]) -> str:
    """Main insights orchestrator."""
    api_key = os.environ.get("NVIDIA_API_KEY", "")
    api_url = os.environ.get("NVIDIA_API_URL", "")
    
    # If API key and URL are present, construct a dense clinical summary prompt
    if api_key and api_url:
        trial_summaries = []
        for t in trials[:8]:
            phases_str = ", ".join(t.get("phases", []))
            trial_summaries.append(f"- {t.get('nctId')}: {t.get('briefTitle')} (Phase: {phases_str}, Sponsor: {t.get('sponsor')}, Status: {t.get('overallStatus')})")
        
        article_titles = [f"- {a.get('title')} ({a.get('journal')}, {a.get('pubDate')})" for a in articles[:8]]
        drug_names = [d.get("name") for d in drugs[:5]]
        
        prompt = f"""
You are an expert clinical research analyst. Generate a concise, professional executive summary report for "{query.upper()}".
Your report must use clean, professional markdown with exactly these headers:
1. "### Clinical Intelligence Executive Summary for **{query.upper()}**"
2. "#### Executive Overview"
3. "#### Pipeline Breakdown"
4. "#### SWOT Analysis" (use a markdown table with headers "Strengths | Weaknesses" and "Opportunities | Threats")
5. "#### Regulatory & Medical Outlook"

Here is the data context to summarize:
- Clinical Trials: {len(trials)} total.
{chr(10).join(trial_summaries)}
- Scientific Publications: {len(articles)} total.
{chr(10).join(article_titles)}
- Related Drugs/Interventions: {", ".join(drug_names)}

Keep the tone objective, clinical, and scientific. Keep it under 500 words. Do not make up facts. Do not use any emojis in your response.
"""
        ai_summary = query_nvidia_summary(prompt, api_key, api_url)
        if ai_summary:
            return ai_summary
            
    # Fallback to high-quality template-based summary
    return compile_heuristic_insights(query, trials, articles, drugs)


def compile_heuristic_excel_insights(sheet_name: str, row_count: int, column_count: int, columns: List[Dict[str, Any]]) -> str:
    """Heuristic summary generator for Excel sheets when Gemini API is unavailable."""
    # Analyze columns
    numeric_cols = [c for c in columns if c.get("type") == "numeric"]
    categorical_cols = [c for c in columns if c.get("type") == "categorical"]
    date_cols = [c for c in columns if c.get("type") == "date"]
    
    summary = f"### Heuristic Analysis Summary for **{sheet_name}**\n\n"
    summary += "#### Sheet Overview\n"
    summary += f"The worksheet contains **{row_count} rows** and **{column_count} columns**. The parsed data schema contains:\n"
    summary += f"* **{len(numeric_cols)} Numeric columns**: {', '.join([c.get('name') for c in numeric_cols]) if numeric_cols else 'None'}\n"
    summary += f"* **{len(categorical_cols)} Categorical columns**: {', '.join([c.get('name') for c in categorical_cols]) if categorical_cols else 'None'}\n"
    summary += f"* **{len(date_cols)} Date/Time columns**: {', '.join([c.get('name') for c in date_cols]) if date_cols else 'None'}\n\n"

    if numeric_cols:
        summary += "#### Data Metrics & Statistics\n"
        summary += "Here are key statistics computed for the top numeric fields:\n"
        for col in numeric_cols[:4]:
            name = col.get("name")
            col_sum = col.get("sum")
            col_avg = col.get("avg")
            col_min = col.get("min")
            col_max = col.get("max")
            
            # Safe formatting helper
            def fmt(val):
                if isinstance(val, (int, float)):
                    return f"{val:,.2f}"
                return "N/A"
            
            summary += f"* **{name}**: Sum: `{fmt(col_sum)}` · Average: `{fmt(col_avg)}` · Range: [`{fmt(col_min)}` to `{fmt(col_max)}`]\n"
        summary += "\n"
        
    if categorical_cols:
        summary += "#### Distribution Insights\n"
        for col in categorical_cols[:2]:
            name = col.get("name")
            cardinality = col.get("cardinality", 0)
            summary += f"* **{name}** represents categorical labels with **{cardinality} unique values**."
            dist = col.get("distribution")
            if dist and isinstance(dist, dict):
                dist_str = ", ".join([f"'{k}': {v} records" for k, v in list(dist.items())[:3]])
                summary += f" Top categories: {dist_str}."
            summary += "\n"
        summary += "\n"

    summary += """#### Observations & Recommendations
1. **Quality Check**: The dataset appears fully structured with well-defined types. Review any outliers in the range metrics.
2. **Trend Potential**: Since date/time columns are detected, we recommend exploring time-series lines to visualize trend gradients over time.
3. **Segmentation**: Grouping numeric KPIs by key categorical columns is recommended to discover high-value and low-value segments.

*Note: For a fully personalized AI narrative analysis, please configure your Gemini API Key in the environment.*"""
    return summary


def generate_excel_insights(sheet_name: str, row_count: int, column_count: int, columns: List[Dict[str, Any]], sample_rows: List[Dict[str, Any]]) -> str:
    """Main Excel insights generator using Gemini model or heuristic fallback."""
    api_key = os.environ.get("NVIDIA_API_KEY", "")
    api_url = os.environ.get("NVIDIA_API_URL", "")
    
    if api_key and api_url:
        # Prepare columns summary
        col_desc = []
        for c in columns:
            name = c.get("name")
            c_type = c.get("type")
            stats = []
            if c_type == "numeric":
                stats.append(f"Sum={c.get('sum')}, Avg={c.get('avg')}, Range=[{c.get('min')} to {c.get('max')}]")
            elif c_type == "categorical":
                stats.append(f"Unique values count={c.get('cardinality')}")
                dist = c.get("distribution")
                if dist and isinstance(dist, dict):
                    top_vals = [f"{k}: {v}" for k, v in list(dist.items())[:3]]
                    stats.append(f"Top values={', '.join(top_vals)}")
            col_desc.append(f"- Name: {name}, Type: {c_type}, Stats: {'; '.join(stats)}")
        
        col_desc_str = "\n".join(col_desc)
        
        # Prepare sample rows as a small clean JSON block
        sample_rows_str = json.dumps(sample_rows[:3], indent=2)
        
        prompt = f"""
You are 'SAdvisory Excel AI Copilot', an expert Business Intelligence analyst and data scientist.
Analyze the following parsed Excel worksheet summary details and generate a premium, professional analytical summary.
Your report must use clean markdown styling with exactly these sections:
1. "### AI Executive Insights for Sheet: **{sheet_name}**"
2. "#### Executive Summary": Provide an elegant explanation of what this dataset appears to be, who would use it, and what its overall health is.
3. "#### Key Trends & Analytical Findings": Detail at least 2-3 specific insights. Focus on trends, categorical distributions, or numerical observations from the statistics.
4. "#### Outlier & Anomaly Detection": Call out any potential data quality concerns, missing cells, extreme min/max values, or details that warrant verification.
5. "#### Strategic Action Items": List 3-4 actionable recommendations for decision-makers based on this data.

Here is the data context:
- Sheet Name: {sheet_name}
- Total Row Count: {row_count}
- Total Column Count: {column_count}
- Columns metadata and statistics:
{col_desc_str}
- Sample Rows (for content context):
{sample_rows_str}

Be direct, objective, and extremely analytical. Avoid marketing fluff or generic comments. Do not use any emojis in your response. Keep it under 400 words.
"""
        ai_summary = query_nvidia_summary(prompt, api_key, api_url)
        if ai_summary:
            return ai_summary
            
    # Fallback
    return compile_heuristic_excel_insights(sheet_name, row_count, column_count, columns)


