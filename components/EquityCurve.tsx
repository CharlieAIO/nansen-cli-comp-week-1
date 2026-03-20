"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { ArenaState } from "@/lib/types";

export function EquityCurve({ state }: { state: ArenaState }) {
  const chartData = Array.from({ length: Math.max(state.round, 1) }, (_, index) => ({
    round: index + 1,
    momentum: 10 + ((state.portfolios.momentum.totalValueSol - 10) / Math.max(state.round, 1)) * (index + 1),
    shadow: 10 + ((state.portfolios.shadow.totalValueSol - 10) / Math.max(state.round, 1)) * (index + 1),
    contrarian: 10 + ((state.portfolios.contrarian.totalValueSol - 10) / Math.max(state.round, 1)) * (index + 1),
    quant: 10 + ((state.portfolios.quant.totalValueSol - 10) / Math.max(state.round, 1)) * (index + 1),
  }));

  return (
    <section className="panel sidePanel chartPanel">
      <div className="sectionHead">
        <h3>Equity Curves</h3>
        <span className="pill">{state.totalRounds} rounds</span>
      </div>
      <div className="chartWrap">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData}>
            <XAxis dataKey="round" stroke="#7f95ad" tickLine={false} axisLine={false} />
            <YAxis stroke="#7f95ad" tickLine={false} axisLine={false} domain={[9, 12.5]} />
            <Tooltip contentStyle={{ background: "#091523", border: "1px solid rgba(140,186,255,0.18)" }} />
            <Line dataKey="momentum" stroke="#47d9ff" dot={false} strokeWidth={2} />
            <Line dataKey="shadow" stroke="#7af0b2" dot={false} strokeWidth={2} />
            <Line dataKey="contrarian" stroke="#ff8d63" dot={false} strokeWidth={2} />
            <Line dataKey="quant" stroke="#b9a5ff" dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
