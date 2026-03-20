import { execFile } from "node:child_process";
import { promisify } from "node:util";

import type { NansenCall, NetflowFilters, PnlLeaderboardFilters, TokenScreenerFilters } from "../lib/types";

const execFileAsync = promisify(execFile);
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const VALID_TOKEN_SCREENER_SORT_FIELDS = new Set([
  "chain",
  "token_address",
  "token_symbol",
  "market_cap_usd",
  "volume",
  "liquidity",
  "nof_traders",
  "nof_buyers",
  "nof_sellers",
  "nof_buys",
  "nof_sells",
  "price_change",
  "price_usd",
  "netflow",
  "buy_volume",
  "sell_volume",
]);
const SOL_NATIVE_TOKEN_ADDRESS = "So11111111111111111111111111111111111111112";

export class NansenApiError extends Error {
  constructor(endpoint: string, status: number, details: unknown) {
    const detailMessage =
      typeof details === "object" && details !== null && "message" in details && typeof (details as { message?: unknown }).message === "string"
        ? (details as { message: string }).message
        : typeof details === "object" && details !== null && "error" in details && typeof (details as { error?: unknown }).error === "string"
          ? (details as { error: string }).error
          : "";
    super(`Nansen request failed for ${endpoint} (${status})${detailMessage ? `: ${detailMessage}` : ""}`);
    this.details = details;
  }

  details: unknown;
}

export class NansenService {
  private static requestTimestamps: number[] = [];
  private readonly apiKey = process.env.NANSEN_API_KEY;
  private readonly baseUrl = "https://api.nansen.ai/api/v1";
  private readonly callLog: NansenCall[] = [];
  private source: "live" | "error" = this.apiKey ? "live" : "error";

  getSource() {
    return this.source;
  }

  getCallLog() {
    return [...this.callLog];
  }

  getTotalCredits() {
    return this.callLog.reduce((sum, call) => sum + call.creditCost, 0);
  }

  getTotalCalls() {
    return this.callLog.length;
  }

  logMcpCall(toolName: string, args: unknown, creditCost = 1) {
    this.source = "live";
    this.logCall(toolName, args, 200, 0, creditCost, "mcp");
  }

  async cliSchema() {
    return this.execCli(["schema", "--pretty"], "nansen schema");
  }

  async cliSmartMoneyNetflow(chain: string, limit: number) {
    return this.execCli(
      ["research", "smart-money", "netflow", "--chain", chain, "--limit", String(limit)],
      "smart-money/netflow",
    );
  }

  async cliTokenScreener(chain: string, timeframe: string) {
    return this.execCli(
      ["research", "token", "screener", "--chain", chain, "--timeframe", timeframe],
      "token-screener",
    );
  }

  async cliProfilerBalance(address: string, chain: string) {
    return this.execCli(
      ["research", "profiler", "balance", "--address", address, "--chain", chain],
      "profiler/balance",
    );
  }

  async getSmartMoneyNetflow(params: Record<string, unknown>) {
    const limit = typeof params.limit === "number" ? params.limit : 20;
    const chain = typeof params.chain === "string" ? params.chain : undefined;
    const chains = Array.isArray(params.chains)
      ? params.chains.filter((value): value is string => typeof value === "string")
      : chain
        ? [chain]
        : ["solana"];

    return this.postSmartMoneyNetflow({
      limit,
      filters: {
        ...(typeof params.min_net_flow_usd === "number" ? { min_net_flow_usd: params.min_net_flow_usd } : {}),
      },
      chains,
    } as NetflowFilters & { chains: string[] });
  }

  async getTokenScreener(params: Record<string, unknown>) {
    const limit = typeof params.limit === "number" ? params.limit : 20;
    const timeframe = typeof params.timeframe === "string" ? params.timeframe : "24h";
    const chain = typeof params.chain === "string" ? params.chain : undefined;
    const chains = Array.isArray(params.chains)
      ? params.chains.filter((value): value is string => typeof value === "string")
      : chain
        ? [chain]
        : ["solana"];

    return this.postTokenScreener({
      timeframe: timeframe as TokenScreenerFilters["timeframe"],
      limit,
      chains,
      min_volume_usd: typeof params.min_volume_usd === "number" ? params.min_volume_usd : undefined,
      min_smart_money_wallet_count: typeof params.min_smart_money_wallet_count === "number"
        ? params.min_smart_money_wallet_count
        : undefined,
      sort_by: typeof params.sort_by === "string" ? params.sort_by : undefined,
    } as TokenScreenerFilters & { chains: string[] });
  }

  async getTokenFlows(params: { chain: string; tokenAddress: string; timeframe?: string }) {
    return this.post("/tgm/flows", params);
  }

  async getTokenDexTrades(params: { chain: string; tokenAddress: string; limit?: number }) {
    return this.post("/tgm/dex-trades", params);
  }

  async getPnlLeaderboard(params: { chain: string; tokenAddress: string }) {
    return this.postPnlLeaderboard({
      tokenAddress: params.tokenAddress,
      chain: params.chain,
    });
  }

  async getWalletTransactions(params: { chain: string; addresses: string[]; limit?: number }) {
    return this.post("/profiler/address/transactions", params);
  }

  async getWalletPnlSummary(params: { chain: string; address: string }) {
    return this.post("/profiler/wallet-pnl-summary", params);
  }

  async getWhoBoughtSold(params: { chain: string; tokenAddress: string; buyOrSell: "BUY" | "SELL" }) {
    return this.post("/tgm/who-bought-sold", params);
  }

  async getTokenFlowIntelligence(params: { chain: string; tokenAddress: string; timeframe?: string }) {
    return this.post("/tgm/flow-intelligence", params);
  }

  async getNansenScoreTopTokens() {
    return this.post("/nansen-score/top-tokens", {});
  }

  async getTokenQuantScores(params: { chain: string; tokenAddress: string }) {
    return this.post("/tgm/quant-scores", params);
  }

  async getTokenOhlcv(params: { chain: string; tokenAddress: string }) {
    return this.post("/tgm/ohlcv", params);
  }

  async getTokenHolders(params: { chain: string; tokenAddress: string; limit?: number }) {
    return this.post("/tgm/holders", params);
  }

  async postTokenScreener(filters: TokenScreenerFilters): Promise<unknown[]> {
    const chains = Array.isArray(filters.chains)
      ? filters.chains.filter((value): value is string => typeof value === "string")
      : ["solana"];

    const sortField = typeof filters.sort_by === "string" && VALID_TOKEN_SCREENER_SORT_FIELDS.has(filters.sort_by)
      ? filters.sort_by
      : "volume";

    const body = {
      chains,
      date: {
        from: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        to: new Date().toISOString(),
      },
      pagination: { page: 1, per_page: filters.limit ?? 20 },
      filters: {
        ...(filters.min_volume_usd ? { volume: { min: filters.min_volume_usd } } : {}),
        ...(filters.min_smart_money_wallet_count ? { nof_traders: { min: filters.min_smart_money_wallet_count } } : {}),
        only_smart_money: true,
      },
      order_by: [{ field: sortField, direction: "DESC" }],
    };
    const result = await this.postEndpoint("/token-screener", body);
    if (!Array.isArray(result)) throw new NansenApiError("/token-screener", 500, { error: "Unexpected response shape" });
    return result as unknown[];
  }

  async postSmartMoneyNetflow(filters: NetflowFilters): Promise<unknown[]> {
    const chains = Array.isArray(filters.chains)
      ? filters.chains.filter((value): value is string => typeof value === "string")
      : ["solana"];

    const body = {
      chains,
      filters: {
        include_smart_money_labels: filters.filters?.include_smart_money_labels ?? ["Fund", "90D Smart Trader", "30D Smart Trader"],
        market_cap_usd: { min: 1000000 },
        trader_count: { min: 5 },
      },
      pagination: { page: 1, per_page: filters.limit ?? 20 },
      order_by: [{ field: "net_flow_7d_usd", direction: "DESC" }],
    };
    const result = await this.postEndpoint("/smart-money/netflow", body);
    if (!Array.isArray(result)) throw new NansenApiError("/smart-money/netflow", 500, { error: "Unexpected response shape" });
    return result as unknown[];
  }

  async postPnlLeaderboard(filters: PnlLeaderboardFilters): Promise<unknown[]> {
    if (!filters.tokenAddress) throw new Error("PnL leaderboard requires tokenAddress");
    if (filters.tokenAddress === SOL_NATIVE_TOKEN_ADDRESS) {
      throw new Error("PnL leaderboard does not support the native SOL token address");
    }
    const body = {
      chain: typeof filters.chain === "string" ? filters.chain : "solana",
      token_address: filters.tokenAddress,
      date: {
        from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        to: new Date().toISOString().split("T")[0],
      },
      pagination: { page: 1, per_page: filters.limit ?? 20 },
      filters: {
        holding_usd: { min: 100 },
        pnl_usd_realised: { min: 100 },
      },
    };
    const result = await this.postEndpoint("/tgm/pnl-leaderboard", body);
    if (!Array.isArray(result)) throw new NansenApiError("/tgm/pnl-leaderboard", 500, { error: "Unexpected response shape" });
    return result as unknown[];
  }

  private async postEndpoint(path: string, body: unknown): Promise<unknown> {
    if (!this.apiKey) {
      this.source = "error";
      throw new Error("NANSEN_API_KEY is not configured");
    }
    const start = Date.now();
    await this.acquireRateLimitSlot();
    try {
      const res = await fetch(`https://api.nansen.ai/api/v1${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apiKey: this.apiKey,
        },
        body: JSON.stringify(body),
      });
      const elapsed = Date.now() - start;
      const data = await res.json();
      this.logCall(path, body, res.status, elapsed, this.estimateCredits(path), "rest");
      if (!res.ok) {
        this.source = "error";
        throw new NansenApiError(path, res.status, data);
      }
      this.source = "live";
      return (data as { data?: unknown })?.data ?? data ?? null;
    } catch (error) {
      if (error instanceof NansenApiError) {
        throw error;
      }
      this.source = "error";
      throw new Error(`Nansen REST request failed for ${path}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async post(endpoint: string, body: unknown) {
    const start = Date.now();
    if (!this.apiKey) {
      this.source = "error";
      throw new Error("NANSEN_API_KEY is not configured");
    }

    await this.acquireRateLimitSlot();

    try {
      const res = await fetch(`https://api.nansen.ai/api/v1${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apiKey: this.apiKey,
        },
        body: JSON.stringify(body),
      });
      const elapsed = Date.now() - start;
      const json = await res.json();
      this.logCall(endpoint, body, res.status, elapsed, this.estimateCredits(endpoint), "rest");

      if (!res.ok) {
        this.source = "error";
        throw new NansenApiError(endpoint, res.status, json);
      }

      this.source = "live";
      return (json as { data?: unknown }).data ?? json;
    } catch (error) {
      if (error instanceof NansenApiError) {
        throw error;
      }
      this.source = "error";
      throw new Error(`Nansen request failed for ${endpoint}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async execCli(args: string[], endpoint: string) {
    const start = Date.now();
    if (!this.apiKey) {
      this.source = "error";
      throw new Error("NANSEN_API_KEY is not configured");
    }
    try {
      await this.acquireRateLimitSlot();
      const { stdout } = await execFileAsync("nansen", args, { env: process.env });
      const elapsed = Date.now() - start;
      const parsed = this.tryParse(stdout);
      this.source = "live";
      this.logCall(endpoint, args, 200, elapsed, this.estimateCredits(endpoint), "cli");
      return parsed;
    } catch (error) {
      this.source = "error";
      throw new Error(`Nansen CLI request failed for ${endpoint}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private tryParse(stdout: string) {
    try {
      return JSON.parse(stdout);
    } catch {
      return stdout;
    }
  }

  private estimateCredits(endpoint: string) {
    const costs: Record<string, number> = {
      "/smart-money/netflow": 50,
      "smart-money/netflow": 50,
      "/token-screener": 10,
      "token-screener": 10,
      "/tgm/pnl-leaderboard": 50,
      "/tgm/flows": 10,
      "/tgm/dex-trades": 10,
      "/profiler/address/transactions": 10,
      "/profiler/wallet-pnl-summary": 10,
      "/tgm/who-bought-sold": 10,
      "/tgm/flow-intelligence": 10,
      "/nansen-score/top-tokens": 10,
      "/tgm/quant-scores": 10,
      "/tgm/ohlcv": 10,
      "/tgm/holders": 50,
      "profiler/balance": 0,
      "nansen schema": 0,
    };
    return costs[endpoint] ?? 10;
  }

  private async acquireRateLimitSlot() {
    while (true) {
      const now = Date.now();
      NansenService.requestTimestamps = NansenService.requestTimestamps.filter((timestamp) => now - timestamp < 60000);
      const lastSecond = NansenService.requestTimestamps.filter((timestamp) => now - timestamp < 1000).length;
      const lastMinute = NansenService.requestTimestamps.length;

      if (lastSecond < 20 && lastMinute < 300) {
        NansenService.requestTimestamps.push(now);
        return;
      }

      const oldestSecond = NansenService.requestTimestamps.find((timestamp) => now - timestamp < 1000) ?? now;
      const oldestMinute = NansenService.requestTimestamps[0] ?? now;
      const waitForSecond = Math.max(0, 1000 - (now - oldestSecond));
      const waitForMinute = Math.max(0, 60000 - (now - oldestMinute));
      await sleep(Math.max(100, Math.min(waitForSecond || waitForMinute, waitForMinute || waitForSecond)));
    }
  }

  private logCall(endpoint: string, params: unknown, status: number, latencyMs: number, creditCost: number, via: NansenCall["via"]) {
    this.callLog.push({
      endpoint,
      params,
      status,
      latencyMs,
      timestamp: new Date().toISOString(),
      creditCost,
      via,
    });
  }
}
