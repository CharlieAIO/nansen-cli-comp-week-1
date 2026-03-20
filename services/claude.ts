import type { AgentId, AgentPortfolio, CommentaryOutput, RoundSummary, TradeDecision, TradeInstruction } from "@/lib/types";

interface MockDecisionContext {
  agentId: AgentId;
  marketData: Record<string, unknown>;
  portfolio: AgentPortfolio;
}

export class ClaudeService {
  private readonly apiKey = process.env.ANTHROPIC_API_KEY;

  async getTradeDecision(system: string, user: string, context?: MockDecisionContext): Promise<TradeDecision> {
    if (!this.apiKey) {
      return this.getMockTradeDecision(context);
    }

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 800,
          system,
          messages: [{ role: "user", content: user }],
        }),
      });

      const data = await res.json();
      const text = (data.content ?? [])
        .filter((block: { type: string }) => block.type === "text")
        .map((block: { text: string }) => block.text)
        .join("");
      return JSON.parse(text.replace(/```json\s*|\s*```/g, "").trim()) as TradeDecision;
    } catch {
      return this.getMockTradeDecision(context);
    }
  }

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

  private getMockTradeDecision(context?: MockDecisionContext): TradeDecision {
    if (!context) {
      return { thinking: "No structured context is available, so I hold.", trades: [] };
    }

    switch (context.agentId) {
      case "momentum":
        return this.singleTargetDecision(
          context,
          this.asRecords(context.marketData.topSmartMoneyInflows)[0],
          0.42,
          "Momentum keeps following the strongest smart-money inflow.",
        );
      case "shadow": {
        const balances = this.asRecords(context.marketData.walletBalances);
        const transactions = this.asRecords(context.marketData.walletTransactions);
        const balanceTarget = [...balances].sort((a, b) => Number(b.value_usd ?? 0) - Number(a.value_usd ?? 0))[0];
        const transactionTarget = [...transactions]
          .filter((item) => String(item.side ?? "") === "BUY")
          .sort((a, b) => Number(b.value_usd ?? 0) - Number(a.value_usd ?? 0))[0];
        return this.singleTargetDecision(
          context,
          balanceTarget ?? transactionTarget,
          0.28,
          "Shadow mirrors the highest-conviction wallet exposure instead of crowding into the same lead token.",
        );
      }
      case "contrarian": {
        const tokens = this.asRecords(context.marketData.trendingTokens);
        const target = [...tokens].sort((a, b) => Number(a.retail_score ?? Number.MAX_SAFE_INTEGER) - Number(b.retail_score ?? Number.MAX_SAFE_INTEGER))[0];
        return this.singleTargetDecision(
          context,
          target,
          0.2,
          "Contrarian fades the hottest retail name and rotates toward the least crowded trending token.",
        );
      }
      case "quant":
        return this.quantDecision(context);
      default:
        return { thinking: "Signals are mixed, so I stay patient.", trades: [] };
    }
  }

  private quantDecision(context: MockDecisionContext): TradeDecision {
    const targets = this.asRecords(context.marketData.topTokens).slice(0, 3);
    const targetAddresses = new Set(targets.map((token) => String(token.token_address ?? "")).filter(Boolean));
    const trades: TradeInstruction[] = context.portfolio.positions
      .filter((position) => !targetAddresses.has(position.tokenAddress))
      .map((position) => ({
        action: "SELL",
        token_symbol: position.tokenSymbol,
        token_address: position.tokenAddress,
        amount_sol: 0,
        confidence: 0.62,
        reasoning: "Quant exits names that fell out of the top-ranked basket.",
      }));

    const existing = new Set(context.portfolio.positions.map((position) => position.tokenAddress));
    const allocationSol = Math.max(0.6, Number((context.portfolio.totalValueSol * 0.12).toFixed(2)));

    for (const target of targets) {
      const tokenAddress = String(target.token_address ?? "");
      const tokenSymbol = String(target.token_symbol ?? "");
      if (!tokenAddress || !tokenSymbol || existing.has(tokenAddress)) {
        continue;
      }
      trades.push({
        action: "BUY",
        token_symbol: tokenSymbol,
        token_address: tokenAddress,
        amount_sol: allocationSol,
        confidence: 0.64,
        reasoning: "Quant spreads risk across a ranked basket instead of concentrating in a single token.",
      });
    }

    return {
      thinking: trades.length
        ? "Quant is rebalancing into a broader basket so its behavior matches the strategy definition."
        : "Quant already holds the preferred basket, so it holds.",
      trades,
    };
  }

  private singleTargetDecision(
    context: MockDecisionContext,
    target: Record<string, unknown> | undefined,
    allocationPct: number,
    reasoning: string,
  ): TradeDecision {
    if (!target) {
      return { thinking: "No clean target emerged from the current data, so the agent holds.", trades: [] };
    }

    const tokenAddress = String(target.token_address ?? "");
    const tokenSymbol = String(target.token_symbol ?? "");
    if (!tokenAddress || !tokenSymbol) {
      return { thinking: "Target data is incomplete, so the agent holds.", trades: [] };
    }

    const trades: TradeInstruction[] = context.portfolio.positions
      .filter((position) => position.tokenAddress !== tokenAddress)
      .map((position) => ({
        action: "SELL",
        token_symbol: position.tokenSymbol,
        token_address: position.tokenAddress,
        amount_sol: 0,
        confidence: 0.58,
        reasoning: `Rotate out of ${position.tokenSymbol} into the current preferred setup.`,
      }));

    const alreadyHolding = context.portfolio.positions.some((position) => position.tokenAddress === tokenAddress);
    if (!alreadyHolding) {
      trades.push({
        action: "BUY",
        token_symbol: tokenSymbol,
        token_address: tokenAddress,
        amount_sol: Math.max(0.75, Number((context.portfolio.totalValueSol * allocationPct).toFixed(2))),
        confidence: 0.66,
        reasoning,
      });
    }

    return {
      thinking: trades.length ? reasoning : `${reasoning} Current holdings already match that view.`,
      trades,
    };
  }

  private asRecords(input: unknown): Array<Record<string, unknown>> {
    if (!Array.isArray(input)) {
      return [];
    }

    return input.filter((item): item is Record<string, unknown> => !!item && typeof item === "object");
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
