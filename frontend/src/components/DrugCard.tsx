import type { Drug } from '../types';
import './DrugCard.css';

interface DrugCardProps {
  drug: Drug;
}

export default function DrugCard({ drug }: DrugCardProps) {
  const pubchemUrl = drug.cid
    ? `https://pubchem.ncbi.nlm.nih.gov/compound/${drug.cid}`
    : undefined;

  return (
    <div className="drug-card">
      <div className="drug-card-header">
        <span className="drug-name">{drug.name}</span>
        {pubchemUrl && (
          <a
            className="drug-cid"
            href={pubchemUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            CID {drug.cid}
          </a>
        )}
      </div>

      <div className="drug-info-grid">
        {drug.molecularFormula && (
          <>
            <span className="drug-info-label">Formula</span>
            <span className="drug-info-value">{drug.molecularFormula}</span>
          </>
        )}
        {drug.molecularWeight && (
          <>
            <span className="drug-info-label">Weight</span>
            <span className="drug-info-value">{drug.molecularWeight} g/mol</span>
          </>
        )}
        {drug.iupacName && (
          <>
            <span className="drug-info-label">IUPAC</span>
            <span className="drug-info-value">{drug.iupacName}</span>
          </>
        )}
        {drug.smiles && (
          <>
            <span className="drug-info-label">SMILES</span>
            <span className="drug-info-value">{drug.smiles}</span>
          </>
        )}
      </div>

      {drug.synonyms.length > 0 && (
        <div className="drug-synonyms">
          <p className="drug-synonyms-label">Synonyms & Brand Names</p>
          <div className="drug-synonym-tags">
            {drug.synonyms.map((syn, i) => (
              <span key={i} className="drug-synonym-tag">{syn}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
