import { RawArticle } from "../sources/types";

export interface ArticleGroup {
  canonicalTitle: string;
  articles: RawArticle[];
  sourceTypes: Set<string>;
}

export function groupSimilarArticles(allArticles: RawArticle[]): ArticleGroup[] {
  const groups: ArticleGroup[] = [];
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;

  for (const article of allArticles) {
    if (now - article.publishedAt.getTime() > oneDayMs) continue;

    let matched = false;

    for (const group of groups) {
      for (const existing of group.articles) {
        const similarity = titleSimilarity(article.title, existing.title);
        if (similarity > 0.7) {
          group.articles.push(article);
          group.sourceTypes.add(article.source);
          matched = true;
          break;
        }
      }
      if (matched) break;
    }

    if (!matched) {
      groups.push({
        canonicalTitle: article.title,
        articles: [article],
        sourceTypes: new Set([article.source]),
      });
    }
  }

  return groups.filter((g) => g.canonicalTitle.length >= 10);
}

function titleSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/).filter((w) => w.length > 2));
  const wordsB = new Set(b.toLowerCase().split(/\s+/).filter((w) => w.length > 2));

  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  const intersection = new Set([...wordsA].filter((w) => wordsB.has(w)));
  const union = new Set([...wordsA, ...wordsB]);

  return intersection.size / union.size;
}
