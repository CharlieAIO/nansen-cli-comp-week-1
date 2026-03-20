import type { TradingAgent } from "@/lib/types";

import { ContrarianAgent } from "@/services/agents/contrarian";
import { MomentumAgent } from "@/services/agents/momentum";
import { QuantAgent } from "@/services/agents/quant";
import { ShadowAgent } from "@/services/agents/shadow";

export function getAgents(): TradingAgent[] {
  return [new MomentumAgent(), new ShadowAgent(), new ContrarianAgent(), new QuantAgent()];
}
