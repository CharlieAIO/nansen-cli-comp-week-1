import type {
  AgentNansenData,
  AgentPortfolio,
  CommentaryOutput,
  NansenQuerySet,
  RoundSummary,
  TradeDecision,
} from "../lib/types";
import type { NansenMCPClient } from "./mcp-client";

const MODEL = "gpt-5.4-nano";

export class AIService {
  private readonly apiKey = process.env.OPENAI_API_KEY;

  async getCommentary(roundData: RoundSummary): Promise<CommentaryOutput> {
    if (!this.apiKey) {
      return this.getMockCommentary(roundData);
    }

    const text = await this.call(
      "You are the commentator for an AI trading arena. Four AI agents are competing with Nansen data. Return punchy JSON only.",
      JSON.stringify(roundData),
      500,
    );

    try {
      return JSON.parse(text.replace(/```json\s*|\s*```/g, "").trim()) as CommentaryOutput;
    } catch {
      return this.getMockCommentary(roundData);
    }
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

    const text = await this.call(system, user, 400);
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

    const text = await this.call(system, user, 1000);
    return this.parseJsonSafe<TradeDecision>(text) ?? holdDecision;
  }

  async runAgentWithMCP(
    agent: { id: string; name: string; strategyPrompt: string; maxAllocPct: number },
    portfolio: AgentPortfolio,
    round: number,
    mcp: NansenMCPClient,
    onToolCall?: (name: string, args: unknown) => void,
  ): Promise<TradeDecision> {
    const holdDecision: TradeDecision = {
      thinking: `[${agent.name}] MCP research complete - holding.`,
      trades: [],
      researchSummary: "No clear signals.",
      researchSignals: [],
    };

    if (!this.apiKey) return holdDecision;

    const tools = mcp.tools.map((t) => ({
      type: "function" as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.inputSchema,
      },
    }));

    const system = `You are ${agent.name}, an AI crypto trading agent competing in a live arena on Solana.
Strategy: ${agent.strategyPrompt}

Use the Nansen tools to research the market, then output a JSON trading decision.
Rules:
- Call 2-4 Nansen tools that align with your strategy
- Only trade tokens present in the data you gather (use exact addresses)
- Maximum allocation: ${(agent.maxAllocPct * 100).toFixed(0)}% of portfolio per position
- After research, respond ONLY with valid JSON (no markdown, no explanation)`;

    type OAIMessage = {
      role: string;
      content: string | null;
      tool_calls?: Array<{ id: string; type: string; function: { name: string; arguments: string } }>;
      tool_call_id?: string;
      name?: string;
    };

    const messages: OAIMessage[] = [
      { role: "system", content: system },
      {
        role: "user",
        content: `Round ${round}
Portfolio: ${JSON.stringify({
  cashSol: portfolio.cashSol,
  totalValueSol: portfolio.totalValueSol,
  returnPct: portfolio.returnPct,
  positions: portfolio.positions.map((p) => ({ symbol: p.tokenSymbol, address: p.tokenAddress, valueUsd: p.currentValueUsd })),
})}

Research the market using the Nansen tools, then respond with a JSON trading decision:
{
  "thinking": "<2-3 sentence reasoning>",
  "trades": [{ "action": "BUY"|"SELL", "token_symbol": "<symbol>", "token_address": "<address>", "amount_sol": <number>, "confidence": <0-1>, "reasoning": "<why>" }],
  "focusToken": "<primary token>",
  "researchSummary": "<1-2 sentences>",
  "researchSignals": [{ "label": "<metric>", "value": "<value>", "tone": "positive"|"negative"|"neutral" }]
}`,
      },
    ];

    for (let iter = 0; iter < 8; iter++) {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 2000,
          messages,
          tools: tools.length > 0 ? tools : undefined,
        }),
      });

      type OAIResponse = {
        choices?: Array<{
          message: OAIMessage;
          finish_reason: string;
        }>;
      };
      const data = await res.json() as OAIResponse;
      const choice = data.choices?.[0];
      if (!choice) break;

      const msg = choice.message;
      messages.push({ role: msg.role, content: msg.content, tool_calls: msg.tool_calls });

      if (choice.finish_reason === "stop" || !msg.tool_calls?.length) {
        return this.parseJsonSafe<TradeDecision>(msg.content ?? "") ?? holdDecision;
      }

      for (const toolCall of msg.tool_calls ?? []) {
        let result: string;
        try {
          const args = JSON.parse(toolCall.function.arguments) as Record<string, unknown>;
          onToolCall?.(toolCall.function.name, args);
          result = await mcp.callTool(toolCall.function.name, args);
        } catch (err) {
          result = `Error: ${err instanceof Error ? err.message : String(err)}`;
        }
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          name: toolCall.function.name,
          content: result,
        });
      }
    }

    return holdDecision;
  }

  private async call(system: string, user: string, maxTokens: number): Promise<string> {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: maxTokens,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        }),
      });
      const data = await res.json() as { choices?: Array<{ message: { content: string } }> };
      return data.choices?.[0]?.message?.content ?? "";
    } catch {
      return "";
    }
  }

  private parseJsonSafe<T>(text: string): T | null {
    try {
      const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      return JSON.parse(cleaned) as T;
    } catch {
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
