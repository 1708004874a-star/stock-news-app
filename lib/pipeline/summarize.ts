interface SummaryResult {
  summary: string;
  keyPoints: string[];
}

export async function summarizeArticles(
  stockNameCn: string,
  symbol: string,
  titles: string[]
): Promise<SummaryResult | null> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey || titles.length === 0) return null;

  const titleList = titles.map((t, i) => `${i + 1}. ${t}`).join("\n");

  const prompt = `You are a financial news editor. Summarize the following news headlines about ${stockNameCn} (${symbol}).
Return ONLY a JSON object with:
- summary: 1-2 sentence Chinese summary of the key information
- keyPoints: up to 3 bullet points of the most important facts (in Chinese)

Headlines:
${titleList}`;

  try {
    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 500,
        temperature: 0.3,
      }),
    });

    if (!res.ok) return null;

    const data = (await res.json()) as DeepSeekResponse;
    const text = data.choices?.[0]?.message?.content?.trim();
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

interface DeepSeekResponse {
  choices?: { message?: { content?: string } }[];
}
