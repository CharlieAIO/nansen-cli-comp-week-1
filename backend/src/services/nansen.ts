import { execFile } from "node:child_process";
import { promisify } from "node:util";

import type { NansenCall, NetflowFilters, PnlLeaderboardFilters, TokenScreenerFilters } from "../lib/types";
import {
  getMockBalances,
  getMockDexTrades,
  getMockFlowIntelligence,
  getMockFlows,
  getMockHolders,
  getMockNetflows,
  getMockOhlcv,
  getMockPnlLeaderboard,
  getMockPnlSummary,
  getMockQuantScores,
  getMockSchema,
  getMockScreener,
  getMockTopScores,
  getMockTransactions,
  getMockWhoBoughtSold,
  nextTick,
} from "./mock-data";

const execFileAsync = promisify(execFile);
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class NansenApiError extends Error {
  constructor(endpoint: string, status: number, details: unknown) {
    super(`Nansen request failed for ${endpoint} (${status})`);
    this.details = details;
  }

  details: unknown;
}

export class NansenService {
  private static requestTimestamps: number[] = [];
  private readonly apiKey = process.env.NANSEN_API_KEY;
  private readonly baseUrl = "https://api.nansen.ai/api/v1";
  private readonly callLog: NansenCall[] = [];
  private source: "live" | "mock" = this.apiKey ? "live" : "mock";

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
    this.logCall(toolName, args, 200, 0, creditCost, "mcp");
  }

  async cliSchema() {
    return this.execCli(["schema", "--pretty"], "nansen schema", getMockSchema());
  }

  async cliSmartMoneyNetflow(chain: string, limit: number) {
    nextTick();
    return this.execCli(
      ["research", "smart-money", "netflow", "--chain", chain, "--limit", String(limit)],
      "smart-money/netflow",
      { data: getMockNetflows().slice(0, limit) },
    );
  }

  async cliTokenScreener(chain: string, timeframe: string) {
    return this.execCli(
      ["research", "token", "screener", "--chain", chain, "--timeframe", timeframe],
      "token-screener",
      { data: getMockScreener() },
    );
  }

  async cliProfilerBalance(address: string, chain: string) {
    return this.execCli(
      ["research", "profiler", "balance", "--address", address, "--chain", chain],
      "profiler/balance",
      { data: getMockBalances(address) },
    );
  }

  async getSmartMoneyNetflow(params: Record<string, unknown>) {
    return this.post("/smart-money/netflow", params, getMockNetflows());
  }

  async getTokenScreener(params: Record<string, unknown>) {
    return this.post("/token-screener", params, getMockScreener());
  }

  async getTokenFlows(params: { chain: string; tokenAddress: string; timeframe?: string }) {
    return this.post("/tgm/flows", params, getMockFlows(params.tokenAddress));
  }

  async getTokenDexTrades(params: { chain: string; tokenAddress: string; limit?: number }) {
    return this.post("/tgm/dex-trades", params, getMockDexTrades(params.tokenAddress));
  }

  async getPnlLeaderboard(params: { chain: string; tokenAddress: string }) {
    return this.post("/tgm/pnl-leaderboard", params, getMockPnlLeaderboard(params.tokenAddress));
  }

  async getWalletTransactions(params: { chain: string; addresses: string[]; limit?: number }) {
    return this.post("/profiler/address/transactions", params, getMockTransactions(params.addresses));
  }

  async getWalletPnlSummary(params: { chain: string; address: string }) {
    return this.post("/profiler/wallet-pnl-summary", params, getMockPnlSummary(params.address));
  }

  async getWhoBoughtSold(params: { chain: string; tokenAddress: string; buyOrSell: "BUY" | "SELL" }) {
    return this.post("/tgm/who-bought-sold", params, getMockWhoBoughtSold(params.tokenAddress, params.buyOrSell));
  }

  async getTokenFlowIntelligence(params: { chain: string; tokenAddress: string; timeframe?: string }) {
    return this.post("/tgm/flow-intelligence", params, getMockFlowIntelligence(params.tokenAddress));
  }

  async getNansenScoreTopTokens() {
    return this.post("/nansen-score/top-tokens", {}, getMockTopScores());
  }

  async getTokenQuantScores(params: { chain: string; tokenAddress: string }) {
    return this.post("/tgm/quant-scores", params, getMockQuantScores(params.tokenAddress));
  }

  async getTokenOhlcv(params: { chain: string; tokenAddress: string }) {
    return this.post("/tgm/ohlcv", params, getMockOhlcv(params.tokenAddress));
  }

  async getTokenHolders(params: { chain: string; tokenAddress: string; limit?: number }) {
    return this.post("/tgm/holders", params, getMockHolders(params.tokenAddress));
  }

  async postTokenScreener(filters: TokenScreenerFilters): Promise<unknown[]> {
    const body = {
      chains: ["solana"],
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
      order_by: [{ field: filters.sort_by ?? "volume", direction: "DESC" }],
    };
    const result = await this.postEndpoint("/token-screener", body);
    if (!result || !Array.isArray(result)) return [];
    return result as unknown[];
  }

  async postSmartMoneyNetflow(filters: NetflowFilters): Promise<unknown[]> {
    const body = {
      chains: ["solana"],
      filters: {
        include_smart_money_labels: filters.filters?.include_smart_money_labels ?? ["Fund", "Smart Trader", "30D Smart Trader"],
        market_cap_usd: { min: 1000000 },
        trader_count: { min: 5 },
        ...(filters.filters?.min_net_flow_usd ? { net_flow_usd: { min: filters.filters.min_net_flow_usd } } : {}),
      },
      pagination: { page: 1, per_page: filters.limit ?? 20 },
      order_by: [{ field: "net_flow_7d_usd", direction: "DESC" }],
    };
    const result = await this.postEndpoint("/smart-money/netflow", body);
    if (!result || !Array.isArray(result)) return [];
    return result as unknown[];
  }

  async postPnlLeaderboard(filters: PnlLeaderboardFilters): Promise<unknown[]> {
    if (!filters.tokenAddress) return [];
    const body = {
      chain: "solana",
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
    if (!result || !Array.isArray(result)) return [];
    return result as unknown[];
  }

  private async postEndpoint(path: string, body: unknown): Promise<unknown> {
    const apiKey = process.env.NANSEN_API_KEY;
    if (!apiKey) return null;
    try {
      const res = await fetch(`https://api.nansen.ai/api/v1${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apiKey": apiKey,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return (data as { data?: unknown })?.data ?? data ?? null;
    } catch {
      return null;
    }
  }

  private async post(endpoint: string, body: unknown, fallback: unknown) {
    const start = Date.now();
    if (!this.apiKey) {
      this.logCall(endpoint, body, 200, Date.now() - start, this.estimateCredits(endpoint), "mock");
      return fallback;
    }

    await this.acquireRateLimitSlot();

    try {
      const res = await fetch(`${this.baseUrl}${endpoint}`, {
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
        this.source = "mock";
        return fallback;
      }

      this.source = "live";
      return (json as { data?: unknown }).data ?? json;
    } catch {
      this.logCall(endpoint, body, 200, Date.now() - start, this.estimateCredits(endpoint), "mock");
      this.source = "mock";
      return fallback;
    }
  }

  private async execCli(args: string[], endpoint: string, fallback: unknown) {
    const start = Date.now();
    try {
      await this.acquireRateLimitSlot();
      const { stdout } = await execFileAsync("nansen", args, { env: process.env });
      const elapsed = Date.now() - start;
      const parsed = this.tryParse(stdout);
      this.source = "live";
      this.logCall(endpoint, args, 200, elapsed, this.estimateCredits(endpoint), "cli");
      return parsed;
    } catch {
      const elapsed = Date.now() - start;
      this.source = "mock";
      this.logCall(endpoint, args, 200, elapsed, this.estimateCredits(endpoint), "mock");
      return fallback;
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
      "smart-money/netflow": 1,
      "token-screener": 1,
      "/tgm/flows": 1,
      "/tgm/dex-trades": 1,
      "/tgm/pnl-leaderboard": 5,
      "/profiler/address/transactions": 1,
      "/profiler/wallet-pnl-summary": 1,
      "/tgm/who-bought-sold": 1,
      "/tgm/flow-intelligence": 1,
      "/nansen-score/top-tokens": 1,
      "/tgm/quant-scores": 2,
      "/tgm/ohlcv": 1,
      "/tgm/holders": 5,
      "profiler/balance": 0,
      "nansen schema": 0,
    };
    return costs[endpoint] ?? 1;
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
