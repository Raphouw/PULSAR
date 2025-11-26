// Fichier : app/activities/[id]/altitudeChart.tsx
'use client';

import React, { useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceArea,
} from 'recharts';
import { ActivityStreams } from '../../../types/next-auth.d';

type HighlightArea = { startKm: number; endKm: number } | null;
type ClimbSegment = { startKm: number; endKm: number; avgPower?: number | null; };
type ChartData = { distance: number; altitude: number; };
type AltitudeChartProps = {
  streams: ActivityStreams;
  highlightedArea: HighlightArea;
  climbs?: ClimbSegment[];
  onSegmentClick?: (startKm: number, endKm: number) => void;
  themeColor?: string;
};

const AltitudeChart = React.memo(function AltitudeChart({
  streams,
  highlightedArea,
  climbs = [],
  onSegmentClick,
  themeColor = '#d047fd',
}: AltitudeChartProps) {

  const chartData = useMemo((): ChartData[] => {
    if (!streams?.distance || !streams?.altitude || streams.distance.length !== streams.altitude.length) return [];
    return streams.distance.map((d, i) => ({
      distance: +((d ?? 0) / 1000).toFixed(2),
      altitude: Math.round(streams.altitude![i] ?? 0),
    }));
  }, [streams]);

  if (chartData.length === 0) {
    return (
      <div style={{ height: 220, textAlign: 'center', color: 'var(--text-secondary)' }}>
        Profil altimétrique non disponible
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      <h3 style={{ color: themeColor, marginBottom: '0.5rem', marginTop: '1rem' }}>
        Profil Altimétrique
      </h3>
      {/* 🔥 AJOUT : Conteneur avec position relative pour éviter les bugs de hauteur */}
      <div style={{ width: '100%', height: 260, position: 'relative' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 6, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorAlt" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={themeColor} stopOpacity={0.9} />
                <stop offset="95%" stopColor={themeColor} stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <XAxis dataKey="distance" unit="km" tick={{ fontSize: 12 }} stroke="var(--text-secondary)" />
            <YAxis tick={{ fontSize: 12 }} stroke="var(--text-secondary)" domain={['dataMin - 10', 'dataMax + 10']} />
            <Tooltip 
              formatter={(value: number) => [value + ' m', 'Altitude']}
              labelFormatter={(label: number) => `Km ${label}`}
              contentStyle={{ backgroundColor: 'var(--surface)', border: '1px solid var(--secondary)', borderRadius: '5px' }}
              labelStyle={{ color: 'var(--text)', fontWeight: 'bold' }}
              itemStyle={{ color: 'var(--text)' }}
            />
            <Area type="monotone" dataKey="altitude" stroke={themeColor} fill="url(#colorAlt)" strokeWidth={2} dot={false} />
            {climbs.map((c, idx) => (
              <ReferenceArea
                key={idx}
                x1={c.startKm}
                x2={c.endKm}
                stroke="transparent"
                fill={themeColor}
                fillOpacity={0.14}
                onClick={() => onSegmentClick?.(c.startKm, c.endKm)}
              />
            ))}
            {highlightedArea && (
              <ReferenceArea
                x1={highlightedArea.startKm}
                x2={highlightedArea.endKm}
                stroke="transparent"
                fill="var(--accent)"
                fillOpacity={0.4}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

export default AltitudeChart;