import { ContrarianAgent } from "./contrarian";
import { MomentumAgent } from "./momentum";
import { QuantAgent } from "./quant";
import { ShadowAgent } from "./shadow";
import type { TradingAgent } from "../lib/types";

export function getAgents(): TradingAgent[] {
  return [
    new MomentumAgent(),
    new ShadowAgent(),
    new ContrarianAgent(),
    new QuantAgent(),
  ];
}
