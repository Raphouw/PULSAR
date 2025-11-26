// Fichier : app/activities/[id]/climbProfileChart.tsx
'use client';

import React, { useMemo, useRef } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
  ChartData,
  ScriptableLineSegmentContext, // Le bon type pour 'segment'
} from 'chart.js';
import { ActivityStreams } from '../../../types/next-auth.d';

// Enregistrement des composants Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// --- Types ---
type ClimbSegmentData = {
  distance: number;
  altitude: number;
  gradient: number;
  segmentStart: number;
  segmentEnd: number;
};

interface ClimbProfileChartProps {
  climbData: { name: string; streams: ActivityStreams };
  segmentLengthMeters?: number;
  onClose: () => void;
}

// --- Helpers ---
const smoothAltitude = (alt: number[], window = 25): number[] => {
  const res: number[] = [];

  for (let i = 0; i < alt.length; i++) {
    let start = Math.max(0, i - window);
    let end = Math.min(alt.length - 1, i + window);
    let sum = 0;
    let count = 0;

    for (let j = start; j <= end; j++) {
      sum += alt[j];
      count++;
    }

    res.push(sum / count);
  }

  return res;
};

// Couleurs (plus "claquantes")
const getGradientColor = (g: number) => {
  if (g < 4) return '#9be29b'; // Vert
  if (g < 7) return '#ffb347'; // Orange
  if (g < 10) return '#ff7043'; // Rouge
  if (g >= 10) return '#d04fd7'; // Violet
  return '#a9adc0'; // Descente
};

// --- Composant ---
export default function ClimbProfileChart({
  climbData,
  segmentLengthMeters = 100,
  onClose,
}: ClimbProfileChartProps) {
  const chartRef = useRef<ChartJS<'line'>>(null);
  const { streams, name } = climbData;

  // 1. Traitement des données (ne change pas)
  const processedData = useMemo(() => {
    if (!streams?.distance || !streams?.altitude) return [];
    const dist = streams.distance.filter((n): n is number => n !== null);
    const alt = streams.altitude.filter((n): n is number => n !== null);
    if (dist.length === 0 || alt.length === 0) return [];
    const altSmoothed = smoothAltitude(alt, 20);
    const data: ClimbSegmentData[] = [];
    let start = 0;
    let startAlt = altSmoothed[0];
    for (let i = 1; i < dist.length; i++) {
      const d = dist[i] - dist[start];
      if (d >= segmentLengthMeters || i === dist.length - 1) {
        const endAlt = altSmoothed[i];
        const segDist = dist[i] - dist[start];
        const segGain = endAlt - startAlt;
        const gradient = segDist > 0 ? (segGain / segDist) * 100 : 0;
        data.push({
          distance: parseFloat((dist[start] / 1000).toFixed(2)),
          altitude: Math.round(startAlt),
          gradient: parseFloat(gradient.toFixed(1)),
          segmentStart: dist[start],
          segmentEnd: dist[i],
        });
        start = i;
        startAlt = altSmoothed[i];
      }
    }
    return data;
  }, [streams, segmentLengthMeters]);

  // 2. Formatage pour Chart.js (Corrigé)
  const { chartData, chartOptions } = useMemo(() => {
    const labels = processedData.map((d) => d.distance.toFixed(2));
    const altitudeData = processedData.map((d) => d.altitude);

    const data: ChartData<'line'> = {
      labels,
      datasets: [
        {
          label: 'Altitude (m)',
          data: altitudeData,
          fill: true,
          borderWidth: 3,
          tension: 0.1,
          pointRadius: 0,
          segment: {
            borderColor: (ctx: ScriptableLineSegmentContext) => {
              const data = processedData[ctx.p0DataIndex]; 
              if (!data) return '#a9adc0';
              return getGradientColor(data.gradient);
            },
            backgroundColor: (ctx: ScriptableLineSegmentContext) => {
              const data = processedData[ctx.p0DataIndex];
              if (!data) return '#a9adc033';
              // --- COULEUR PLUS "CLAQUANTE" ---
              return `${getGradientColor(data.gradient)}80`; // 50% opacité
            },
          },
        },
      ],
    };

    const options: ChartOptions<'line'> = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          mode: 'index',
          intersect: false,
          backgroundColor: 'var(--surface)',
          borderColor: 'var(--secondary)',
          borderWidth: 1,
          titleColor: '#ffffffff', // Texte lisible
          bodyColor: '#ffffffff', // Texte lisible
          footerColor: '#ffffffff',
          padding: 12,
          callbacks: {
            title: (tooltipItems: any) => `Km ${tooltipItems[0].label}`, 
            label: (context: any) => {
              const data = processedData[context.dataIndex];
              if (!data) return '';
              return `Altitude: ${data.altitude.toFixed(0)} m`;
            },
            afterLabel: (context: any) => {
              const data = processedData[context.dataIndex];
              if (!data) return '';
              return `Pente: ${data.gradient.toFixed(1)}%`;
            },
          },
        },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'Distance (km)',
            color: '#ffffffff', // Texte lisible
          },
          ticks: { color: '#ffffffff' }, // Texte lisible
          grid: { display: false }, // --- PAS DE QUADRILLAGE ---
          border: { color: 'var(--text-secondary)' }, // Ligne d'axe
        },
        y: {
          beginAtZero: false,
          title: {
            display: true,
            text: 'Altitude (m)',
            color: '#ffffffff', // Texte lisible
          },
          ticks: { color: '#ffffffff' }, // Texte lisible
        
          grid: { display: false }, // --- PAS DE QUADRILLAGE ---

          border: { color: 'var(--text-secondary)' }, // Ligne d'axe
        },
      },
    };

    return { chartData: data, chartOptions: options };
  }, [processedData]);

  if (!chartData) return <p>Aucune donnée disponible.</p>;

  // --- Styles (Corrigés pour le thème sombre) ---
  const modalStyle: React.CSSProperties = {
    position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
    width: '100%', maxWidth: '1200px', height: '600px', maxHeight: '120vh',
    background: 'var(--surface)', color: '#ffffffff',
    borderRadius: 12, padding: '1.5rem', border: '1px solid var(--secondary)',
    boxShadow: '0 10px 30px rgba(28, 27, 27, 0.5)', zIndex: 1000,
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
  };
  const closeButtonStyle: React.CSSProperties = {
    position: 'absolute', top: '1rem', right: '1.5rem', background: 'transparent',
    border: 'none', color: 'var(--text-secondary)', fontSize: '1.5rem',
    cursor: 'pointer', lineHeight: 1,
  };
  const legendStyle: React.CSSProperties = {
    display: 'flex', justifyContent: 'center', gap: '1rem',
    marginTop: '1rem', flexWrap: 'wrap',
  };
  const LegendItem = ({ color, range }: { color: string; range: string }) => (
    // --- LÉGENDE LISIBLE ---
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: '#ffffffff' }}>
      <div style={{ width: 12, height: 12, backgroundColor: color, borderRadius: 2 }} />
      <span>{range}</span>
    </div>
  );

  return (
    <div style={modalStyle}>
      <button style={closeButtonStyle} onClick={onClose} title="Fermer">
        &times;
      </button>

      <h3 style={{ color: '#d04fd7', marginBottom: '1rem', fontWeight: 600, fontSize: '1.2rem' }}>
        Profil de la montée : {name}
      </h3>

      <div style={{ flex: 1, minHeight: '300px' }}>
        <Line ref={chartRef} data={chartData} options={chartOptions} />
      </div>

      <div style={legendStyle}>
        <LegendItem color={getGradientColor(2)} range="< 4%" />
        <LegendItem color={getGradientColor(5)} range="4-7%" />
        <LegendItem color={getGradientColor(8)} range="7-10%" />
        <LegendItem color={getGradientColor(11)} range="> 10%" />
      </div>
    </div>
  );
}