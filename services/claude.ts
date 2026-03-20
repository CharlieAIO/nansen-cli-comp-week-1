import type { CommentaryOutput, RoundSummary } from "@/lib/types";

export class ClaudeService {
  private readonly apiKey = process.env.ANTHROPIC_API_KEY;

  async getCommentary(roundData: RoundSummary): Promise<CommentaryOutput> {
    if (!this.apiKey) {
      return this.getMockCommentary(roundData);
    }

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 500,
        system:
          "You are the commentator for an AI trading arena. Four AI agents are competing with Nansen data. Return punchy JSON only.",
        messages: [{ role: "user", content: JSON.stringify(roundData) }],
      }),
    });

    const data = await res.json();
    const text = (data.content ?? [])
      .filter((block: { type: string }) => block.type === "text")
      .map((block: { text: string }) => block.text)
      .join("");
    return JSON.parse(text.replace(/```json\s*|\s*```/g, "").trim()) as CommentaryOutput;
  }

  private getMockCommentary(roundData: RoundSummary): CommentaryOutput {
    const leader = [...roundData.agents].sort((a, b) => b.return_pct - a.return_pct)[0];
    const laggard = [...roundData.agents].sort((a, b) => a.return_pct - b.return_pct)[0];
    return {
      round_commentary: `${leader.name} controls the tape after another decisive round, while ${laggard.name} still needs a clean reversal to get back into the fight.`,
      tension_narrative: `The arena is still live because the pack is trading off the same Solana flow set, but conviction sizing is separating the board.`,
      mvp_this_round: leader.name,
      most_interesting_trade: roundData.agents.find((agent) => agent.this_round_trades.length)?.this_round_trades[0]?.reasoning ?? "No standout trade this round.",
      prediction: `${leader.name} has momentum, but one bad rotation into ${roundData.market_context.biggest_retail_fomo_token} could flip the standings fast.`,
    };
  }
}
