import type {
  AgentNansenData,
  AgentPortfolio,
  CommentaryOutput,
  NansenQuerySet,
  RoundSummary,
  TradeDecision,
} from "../lib/types";

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

    const data = await res.json() as { content?: Array<{ type: string; text: string }> };
    const text = (data.content ?? [])
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");
    return JSON.parse(text.replace(/```json\s*|\s*```/g, "").trim()) as CommentaryOutput;
  }

  async getAgentFilters(
    agent: { id: string; name: string; strategyPrompt: string; maxAllocPct: number },
    portfolio: AgentPortfolio,
    round: number,
  ): Promise<NansenQuerySet> {
    const mock: NansenQuerySet = {
      screener: { timeframe: "24h", limit: 15, min_smart_money_wallet_count: 3 },
      netflow: { limit: 20, filters: { include_smart_money_labels: ["Fund", "Smart Trader", "30D Smart Trader"] } },
      pnlLeaderboard: { tokenAddress: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN", limit: 15 },
    };

    if (!this.apiKey) return mock;

    const system = `You are the filter-selection engine for trading agent "${agent.name}".
Choose optimal query parameters for 3 Nansen API endpoints to gather data aligned with this strategy:
${agent.strategyPrompt}

Return ONLY valid JSON. No explanation. No markdown.`;

    const user = `Round: ${round}
Portfolio: cash=${portfolio.cashSol.toFixed(2)} SOL, positions=${portfolio.positions.map(p => p.tokenSymbol).join(",") || "none"}, return=${portfolio.returnPct.toFixed(1)}%

Return JSON matching exactly:
{
  "screener": {
    "timeframe": "24h",
    "limit": 15,
    "min_smart_money_wallet_count": 3,
    "sort_by": "volume"
  },
  "netflow": {
    "limit": 20,
    "filters": {
      "include_smart_money_labels": ["Fund", "Smart Trader", "30D Smart Trader"]
    }
  },
  "pnlLeaderboard": {
    "tokenAddress": "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
    "limit": 15
  }
}

Adapt the parameters to match your strategy. The tokenAddress must be a valid Solana address from your knowledge of top Solana tokens.`;

    const text = await this.callClaudeRaw(system, user, 400);
    return this.parseJsonSafe<NansenQuerySet>(text) ?? mock;
  }

  async getAgentTradeDecision(
    agent: { id: string; name: string; strategyPrompt: string; maxAllocPct: number },
    portfolio: AgentPortfolio,
    nansenData: AgentNansenData,
    round: number,
  ): Promise<TradeDecision> {
    const holdDecision: TradeDecision = {
      thinking: `[${agent.name}] No API key - holding position.`,
      trades: [],
      researchSummary: "Mock mode.",
      researchSignals: [],
    };

    if (!this.apiKey) return holdDecision;

    const system = `You are ${agent.name}, an AI crypto trading agent in a competition.
Strategy: ${agent.strategyPrompt}

Rules:
- Only trade tokens that appear in the Nansen data provided (use exact addresses from the data)
- Maximum allocation per position: ${(agent.maxAllocPct * 100).toFixed(0)}% of total portfolio
- Return ONLY valid JSON. No explanation. No markdown.
- Be decisive but risk-aware. Hold cash if no conviction.`;

    const user = `Round ${round}
Portfolio: ${JSON.stringify({ cashSol: portfolio.cashSol, totalValueSol: portfolio.totalValueSol, returnPct: portfolio.returnPct, positions: portfolio.positions.map(p => ({ symbol: p.tokenSymbol, address: p.tokenAddress, valueUsd: p.currentValueUsd })) })}

NANSEN DATA:
Token Screener (top tokens):
${JSON.stringify(nansenData.screener.slice(0, 8), null, 2)}

Smart Money Netflow:
${JSON.stringify(nansenData.netflow.slice(0, 10), null, 2)}

PnL Leaderboard (top traders):
${JSON.stringify(nansenData.pnlLeaderboard.slice(0, 5), null, 2)}

Return JSON:
{
  "thinking": "<your reasoning in 2-3 sentences>",
  "trades": [
    {
      "action": "BUY",
      "token_symbol": "<symbol from data>",
      "token_address": "<exact address from data>",
      "amount_sol": <number>,
      "confidence": <0.0-1.0>,
      "reasoning": "<why>"
    }
  ],
  "focusToken": "<primary token>",
  "researchSummary": "<1-2 sentence summary>",
  "researchSignals": [
    { "label": "<metric name>", "value": "<value>", "tone": "positive" }
  ]
}`;

    const text = await this.callClaudeRaw(system, user, 1000);
    return this.parseJsonSafe<TradeDecision>(text) ?? holdDecision;
  }

  private async callClaudeRaw(system: string, user: string, maxTokens: number): Promise<string> {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey!,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: maxTokens,
          system,
          messages: [{ role: "user", content: user }],
        }),
      });
      const data = await res.json() as { content?: Array<{ type: string; text: string }> };
      return (data.content ?? [])
        .filter(b => b.type === "text")
        .map(b => b.text)
        .join("");
    } catch {
      return "";
    }
  }

  private parseJsonSafe<T>(text: string): T | null {
    try {
      const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      return JSON.parse(cleaned) as T;
    } catch {
      // Try to find JSON in the text
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        try { return JSON.parse(match[0]) as T; } catch { return null; }
      }
      return null;
    }
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
