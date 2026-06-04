import type { Article } from '../types';
import './ArticleCard.css';

interface ArticleCardProps {
  article: Article;
}

export default function ArticleCard({ article }: ArticleCardProps) {
  const pubmedUrl = `https://pubmed.ncbi.nlm.nih.gov/${article.pmid}/`;

  return (
    <div className="article-card">
      <a
        className="article-pmid"
        href={pubmedUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        PMID: {article.pmid}
      </a>
      <h3 className="article-title">{article.title}</h3>
      <p className="article-journal">
        {article.journal} · {article.pubDate}
      </p>
      <p className="article-authors">{article.authors}</p>
    </div>
  );
}
