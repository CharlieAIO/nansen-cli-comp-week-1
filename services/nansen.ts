import { execFile } from "node:child_process";
import { promisify } from "node:util";

import type { NansenCall } from "@/lib/types";
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
} from "@/services/mock-data";

const execFileAsync = promisify(execFile);

export class NansenApiError extends Error {
  constructor(endpoint: string, status: number, details: unknown) {
    super(`Nansen request failed for ${endpoint} (${status})`);
    this.details = details;
  }

  details: unknown;
}

export class NansenService {
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

  async cliSchema() {
    return this.execCli(["schema", "--pretty"], "nansen schema", getMockSchema());
  }

  async cliSmartMoneyNetflow(chain: string, limit: number) {
    nextTick();
    return this.execCli(
      ["smart-money", "netflow", "--chain", chain, "--limit", String(limit)],
      "smart-money/netflow",
      { data: getMockNetflows().slice(0, limit) },
    );
  }

  async cliTokenScreener(chain: string, timeframe: string) {
    return this.execCli(
      ["token", "screener", "--chain", chain, "--timeframe", timeframe],
      "token-screener",
      { data: getMockScreener() },
    );
  }

  async cliProfilerBalance(address: string, chain: string) {
    return this.execCli(
      ["profiler", "balance", "--address", address, "--chain", chain],
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

  private async post(endpoint: string, body: unknown, fallback: unknown) {
    const start = Date.now();
    if (!this.apiKey) {
      this.logCall(endpoint, body, 200, Date.now() - start, this.estimateCredits(endpoint), "mock");
      return fallback;
    }

    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apiKey: this.apiKey,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const elapsed = Date.now() - start;
    const json = await res.json();
    this.logCall(endpoint, body, res.status, elapsed, this.estimateCredits(endpoint), "rest");

    if (!res.ok) {
      throw new NansenApiError(endpoint, res.status, json);
    }

    return json.data ?? json;
  }

  private async execCli(args: string[], endpoint: string, fallback: unknown) {
    const start = Date.now();
    try {
      const { stdout } = await execFileAsync("nansen", args, { env: process.env });
      const elapsed = Date.now() - start;
      const parsed = this.tryParse(stdout);
      this.source = this.apiKey ? "live" : this.source;
      this.logCall(endpoint, args, 200, elapsed, this.estimateCredits(endpoint), "cli");
      return parsed;
    } catch {
      const elapsed = Date.now() - start;
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
