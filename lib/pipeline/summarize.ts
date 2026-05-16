const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";

interface SummaryResult {
  summary: string;
  keyPoints: string[];
}

// ---- Relevance filter ----

export async function filterRelevantArticles(
  stockNameCn: string,
  symbol: string,
  articles: { title: string; snippet: string }[]
): Promise<number[]> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey || articles.length === 0) return articles.map((_, i) => i);

  const articleList = articles
    .map((a, i) => `${i}. ${a.title} — ${(a.snippet || "").slice(0, 200)}`)
    .join("\n");

  const prompt = `You are filtering financial news. For the list below, identify which articles are ACTUALLY about ${stockNameCn} (${symbol}).
Exclude articles that are:
- About a completely different company or industry
- Generic market commentary that only mentions ${symbol} in passing
- Unrelated financial news matched by keyword error

Return ONLY a JSON array of indices (0-based) that are relevant and should be kept.
Example: [0, 3, 7]

Articles:
${articleList}`;

  try {
    const text = await callDeepSeek(prompt, 300);
    if (!text) return [];
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return [];
    const indices: number[] = JSON.parse(match[0]);
    return indices.filter((i) => i >= 0 && i < articles.length);
  } catch {
    // On failure, keep all articles
    return articles.map((_, i) => i);
  }
}

// ---- AI Summarization ----

export async function summarizeArticles(
  stockNameCn: string,
  symbol: string,
  titles: string[]
): Promise<SummaryResult | null> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey || titles.length === 0) return null;

  const titleList = titles.map((t, i) => `${i + 1}. ${t}`).join("\n");

  const prompt = `You are a senior financial news analyst. Analyze these headlines about ${stockNameCn} (${symbol}).

Your task:
1. Identify the 1-2 most important and factually reliable headlines
2. Distill the key facts (ignore speculation, hype, or generic commentary)
3. If the headlines are contradictory or unreliable, say so honestly
4. Focus on: earnings, product launches, regulatory actions, M&A, market-moving events

Return ONLY a JSON object (no markdown, no extra text):
{
  "summary": "1-2 sentence Chinese summary of the key factual information",
  "keyPoints": ["bullet 1 in Chinese", "bullet 2 in Chinese"]
}

Headlines:
${titleList}`;

  try {
    const text = await callDeepSeek(prompt, 600);
    if (!text) return null;

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      summary: parsed.summary || "",
      keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints.slice(0, 3) : [],
    };
  } catch {
    return null;
  }
}

// ---- Shared helper ----

async function callDeepSeek(prompt: string, maxTokens: number): Promise<string | null> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(DEEPSEEK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{ role: "user", content: prompt }],
        max_tokens: maxTokens,
        temperature: 0.2,
      }),
    });

    if (!res.ok) return null;

    const data: DeepSeekResponse = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  }
}

interface DeepSeekResponse {
  choices?: { message?: { content?: string } }[];
}
