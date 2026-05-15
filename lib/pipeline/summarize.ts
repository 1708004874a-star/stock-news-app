import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

interface SummaryResult {
  summary: string;
  keyPoints: string[];
}

export async function summarizeArticles(
  stockNameCn: string,
  symbol: string,
  titles: string[]
): Promise<SummaryResult | null> {
  if (!process.env.ANTHROPIC_API_KEY || titles.length === 0) return null;

  const titleList = titles.map((t, i) => `${i + 1}. ${t}`).join("\n");

  const prompt = `You are a financial news editor. Summarize the following news headlines about ${stockNameCn} (${symbol}).
Return ONLY a JSON object with:
- summary: 1-2 sentence Chinese summary of the key information
- keyPoints: up to 3 bullet points of the most important facts (in Chinese)

Headlines:
${titleList}`;

  try {
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    });

    const text = (msg.content[0] as { text: string }).text.trim();
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
