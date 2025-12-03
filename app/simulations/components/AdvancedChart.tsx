"use client"
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts"
import type { SimSegment } from "../../../lib/advanced-simulation-engine"

interface Props {
  segments: SimSegment[]
  maxWPrime: number
  focusedSegment: SimSegment | null
}

export default function AdvancedChart({ segments, maxWPrime, focusedSegment }: Props) {
  // Préparer les données (segment par segment ou filtrées)
  const data = (focusedSegment ? [focusedSegment] : segments).map((s) => ({
    id: s.id,
    distKm: s.endKm.toFixed(1),
    elevation: s.points?.[Math.floor(s.points.length / 2)]?.[2] || 0,
    gradient: s.avgGradient,
    power: Math.round(s.avgPower),
    speed: s.avgSpeed.toFixed(1),
    wPrimePercent: s.wPrimePercent,
    fatigue: s.fatigueLevel * 100,
  }))

  return (
    <div
      style={{
        width: "100%",
        height: "220px",
        background: "rgba(0,0,0,0.4)",
        borderRadius: "12px",
        padding: "1rem",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <defs>
            {/* Gradient Altitude */}
            <linearGradient id="gradAltitude" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#888" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#888" stopOpacity={0.05} />
            </linearGradient>

            {/* Gradient W' */}
            <linearGradient id="gradWPrime" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>

            {/* Gradient Fatigue */}
            <linearGradient id="gradFatigue" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#6366f1" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#ef4444" stopOpacity={0.6} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />

          <XAxis
            dataKey="distKm"
            tick={{ fontSize: 11, fill: "#888" }}
            stroke="#333"
            label={{ value: "Distance (km)", position: "insideBottom", offset: -5, fill: "#666", fontSize: 10 }}
          />

          {/* Axe gauche: Altitude */}
          <YAxis
            yAxisId="altitude"
            orientation="left"
            tick={{ fontSize: 10, fill: "#999" }}
            stroke="#666"
            width={40}
            domain={["auto", "auto"]}
          />

          {/* Axe droite: W' % */}
          <YAxis
            yAxisId="wprime"
            orientation="right"
            tick={{ fontSize: 10, fill: "#d04fd7" }}
            stroke="#d04fd7"
            width={40}
            domain={[0, 100]}
          />

          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(0,0,0,0.95)",
              border: "1px solid #444",
              borderRadius: "8px",
              fontSize: "0.8rem",
              padding: "8px 12px",
            }}
            formatter={(value: any, name: string) => {
              if (name === "wPrimePercent") return [`${Number(value).toFixed(1)}%`, "💪 W'"]
              if (name === "elevation") return [`${Math.round(value)}m`, "⛰️ Altitude"]
              if (name === "power") return [`${value}W`, "⚡ Puissance"]
              if (name === "speed") return [`${value} km/h`, "🚴 Vitesse"]
              if (name === "fatigue") return [`${Number(value).toFixed(1)}%`, "😰 Fatigue"]
              if (name === "gradient") return [`${Number(value).toFixed(1)}%`, "📐 Pente"]
              return [value, name]
            }}
            labelFormatter={(label) => `📍 ${label} km`}
          />

          {/* Altitude (Area) */}
          <Area
            yAxisId="altitude"
            type="monotone"
            dataKey="elevation"
            stroke="#888"
            fill="url(#gradAltitude)"
            strokeWidth={2}
            fillOpacity={1}
          />

          {/* W' Balance (Line épaisse) */}
          <Line
            yAxisId="wprime"
            type="monotone"
            dataKey="wPrimePercent"
            stroke="url(#gradWPrime)"
            strokeWidth={4}
            dot={{ fill: "#d04fd7", r: 3 }}
            activeDot={{ r: 6, fill: "#fff", stroke: "#d04fd7", strokeWidth: 2 }}
          />

          {/* Fatigue (Area subtile) */}
          <Area
            yAxisId="wprime"
            type="monotone"
            dataKey="fatigue"
            stroke="none"
            fill="url(#gradFatigue)"
            fillOpacity={0.3}
          />

          {/* Ligne de référence W' critique */}
          <ReferenceLine
            yAxisId="wprime"
            y={20}
            stroke="#ef4444"
            strokeDasharray="5 5"
            strokeWidth={1}
            label={{ value: "⚠️ Zone Critique", fill: "#ef4444", fontSize: 9, position: "insideTopRight" }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
