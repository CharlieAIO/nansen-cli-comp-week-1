import type { AgentPortfolio, ExecutedTrade, Position, TradeInstruction } from "../lib/types";

export class SimulationEngine {
  buildPriceMap(netflowData: unknown, screenerData: unknown) {
    const prices = new Map<string, number>();
    const netflows = this.asRecords(netflowData);
    const screener = this.asRecords(screenerData);

    for (const item of [...netflows, ...screener]) {
      const address = String(item.token_address ?? "");
      const price = Number(item.price_usd ?? 0);
      if (address && Number.isFinite(price) && price > 0) {
        prices.set(address, price);
      }
      if (String(item.token_symbol ?? "") === "SOL") {
        prices.set("SOL", Number(item.price_usd ?? 142));
      }
    }

    if (!prices.has("SOL")) {
      prices.set("SOL", 142);
    }

    return prices;
  }

  private asRecords(input: unknown): Array<Record<string, unknown>> {
    if (Array.isArray(input)) {
      return input.filter((item): item is Record<string, unknown> => !!item && typeof item === "object");
    }

    if (!input || typeof input !== "object") {
      return [];
    }

    const candidate = input as Record<string, unknown>;
    const nestedKeys = ["data", "items", "results", "tokens", "rows"];

    for (const key of nestedKeys) {
      if (Array.isArray(candidate[key])) {
        return candidate[key].filter((item): item is Record<string, unknown> => !!item && typeof item === "object");
      }
    }

    return [];
  }

  markToMarket(portfolio: AgentPortfolio, currentPrices: Map<string, number>) {
    const solPrice = currentPrices.get("SOL") ?? 142;
    const positions = portfolio.positions.map((position) => {
      const price = currentPrices.get(position.tokenAddress) ?? position.entryPriceUsd;
      return {
        ...position,
        currentValueUsd: position.tokenAmount * price,
      };
    });
    const totalValueUsd = positions.reduce((sum, position) => sum + position.currentValueUsd, portfolio.cashSol * solPrice);
    const totalValueSol = totalValueUsd / solPrice;

    return {
      ...portfolio,
      positions,
      totalValueUsd,
      totalValueSol,
      returnPct: ((totalValueSol - 10) / 10) * 100,
    };
  }

  executeTrades(portfolio: AgentPortfolio, trades: TradeInstruction[], currentPrices: Map<string, number>) {
    const solPrice = currentPrices.get("SOL") ?? 142;
    let cashSol = portfolio.cashSol;
    let positions: Position[] = structuredClone(portfolio.positions);
    const executedTrades: ExecutedTrade[] = [];

    for (const rawTrade of trades) {
      const trade = { ...rawTrade };
      if (trade.action === "BUY") {
        if (trade.amount_sol > cashSol) {
          trade.amount_sol = Number((cashSol * 0.95).toFixed(4));
        }
        if (trade.amount_sol <= 0) {
          continue;
        }
        const priceUsd = currentPrices.get(trade.token_address) ?? 0;
        if (!priceUsd) {
          continue;
        }
        const usdSpent = trade.amount_sol * solPrice;
        const tokenAmount = usdSpent / priceUsd;
        const existing = positions.find((position) => position.tokenAddress === trade.token_address);
        if (existing) {
          existing.tokenAmount += tokenAmount;
          existing.entryValueUsd += usdSpent;
          existing.currentValueUsd = existing.tokenAmount * priceUsd;
        } else {
          positions.push({
            tokenSymbol: trade.token_symbol,
            tokenAddress: trade.token_address,
            tokenAmount,
            entryValueUsd: usdSpent,
            entryPriceUsd: priceUsd,
            currentValueUsd: usdSpent,
            entryRound: portfolio.currentRound,
          });
        }
        cashSol -= trade.amount_sol;
        executedTrades.push({
          ...trade,
          executedPriceUsd: priceUsd,
          usdValue: usdSpent,
          status: "FILLED",
        });
      }

      if (trade.action === "SELL") {
        const existing = positions.find((position) => position.tokenSymbol === trade.token_symbol || position.tokenAddress === trade.token_address);
        if (!existing) {
          continue;
        }
        const priceUsd = currentPrices.get(existing.tokenAddress) ?? existing.entryPriceUsd;
        const exitValueUsd = existing.tokenAmount * priceUsd;
        const solReceived = exitValueUsd / solPrice;
        const realizedPnlPct = ((exitValueUsd - existing.entryValueUsd) / existing.entryValueUsd) * 100;
        cashSol += solReceived;
        positions = positions.filter((position) => position.tokenAddress !== existing.tokenAddress);
        executedTrades.push({
          ...trade,
          token_symbol: existing.tokenSymbol,
          token_address: existing.tokenAddress,
          executedPriceUsd: priceUsd,
          usdValue: exitValueUsd,
          realizedPnlPct,
          status: "FILLED",
        });
      }
    }

    const marked = this.markToMarket(
      {
        ...portfolio,
        cashSol,
        positions,
        currentRound: portfolio.currentRound + 1,
      },
      currentPrices,
    );

    return { portfolio: marked, executedTrades };
  }
}
