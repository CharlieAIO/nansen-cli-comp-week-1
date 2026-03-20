"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";

import type { ArenaState } from "@/lib/types";

export function EquityCurve({ state }: { state: ArenaState }) {
  const roundSet = new Set<number>();
  Object.values(state.equityHistory).forEach((series) => {
    series.forEach((point) => roundSet.add(point.round));
  });

  const chartData = [...roundSet]
    .sort((a, b) => a - b)
    .map((round) => ({
      round,
      momentum: state.equityHistory.momentum.find((point) => point.round === round)?.valueSol ?? 10,
      shadow: state.equityHistory.shadow.find((point) => point.round === round)?.valueSol ?? 10,
      contrarian: state.equityHistory.contrarian.find((point) => point.round === round)?.valueSol ?? 10,
      quant: state.equityHistory.quant.find((point) => point.round === round)?.valueSol ?? 10,
    }));

  return (
    <section className="panel sidePanel chartPanel">
      <div className="agentCardDecoration">
        <div className="corner-tl" style={{ background: "var(--accent)" }}></div>
      </div>
      <div className="sectionHead">
        <h3>Equity curves</h3>
        <span className="pill">Round {state.round}</span>
      </div>
      <div className="chartWrap">
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
            <XAxis 
              dataKey="round" 
              stroke="#444" 
              tick={{ fill: '#888', fontSize: 10, fontFamily: 'var(--font-mono)' }} 
              tickLine={false} 
              axisLine={false} 
            />
            <YAxis 
              stroke="#444" 
              tick={{ fill: '#888', fontSize: 10, fontFamily: 'var(--font-mono)' }} 
              tickLine={false} 
              axisLine={false} 
              domain={['auto', 'auto']} 
            />
            <Tooltip 
              contentStyle={{ 
                background: "#000", 
                border: "1px solid var(--accent)",
                borderRadius: "0px",
                fontFamily: 'var(--font-mono)',
                fontSize: '11px'
              }} 
              itemStyle={{ textTransform: 'uppercase' }}
            />
            <Line dataKey="momentum" stroke="var(--momentum)" dot={false} strokeWidth={2} />
            <Line dataKey="shadow" stroke="var(--shadow)" dot={false} strokeWidth={2} />
            <Line dataKey="contrarian" stroke="var(--contrarian)" dot={false} strokeWidth={2} />
            <Line dataKey="quant" stroke="var(--quant)" dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
