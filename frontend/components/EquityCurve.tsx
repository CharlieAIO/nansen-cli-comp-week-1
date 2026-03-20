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
      <div className="sectionHead">
        <h3>Equity Analysis</h3>
        <span className="pill">Round {state.round}</span>
      </div>
      <div className="chartWrap">
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis 
              dataKey="round" 
              stroke="var(--muted)" 
              tick={{ fill: 'var(--muted)', fontSize: 9, fontFamily: 'var(--font-mono)' }} 
              tickLine={false} 
              axisLine={false} 
            />
            <YAxis 
              stroke="var(--muted)" 
              tick={{ fill: 'var(--muted)', fontSize: 9, fontFamily: 'var(--font-mono)' }} 
              tickLine={false} 
              axisLine={false} 
              domain={['auto', 'auto']} 
            />
            <Tooltip 
              contentStyle={{ 
                background: "var(--panel-strong)", 
                border: "1px solid var(--border-bright)",
                borderRadius: "0px",
                fontFamily: 'var(--font-mono)',
                fontSize: '10px'
              }} 
              itemStyle={{ textTransform: 'uppercase', padding: '2px 0' }}
            />
            <Line dataKey="momentum" stroke="var(--momentum)" dot={false} strokeWidth={2} animationDuration={300} />
            <Line dataKey="shadow" stroke="var(--shadow)" dot={false} strokeWidth={2} animationDuration={300} />
            <Line dataKey="contrarian" stroke="var(--contrarian)" dot={false} strokeWidth={2} animationDuration={300} />
            <Line dataKey="quant" stroke="var(--quant)" dot={false} strokeWidth={2} animationDuration={300} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

