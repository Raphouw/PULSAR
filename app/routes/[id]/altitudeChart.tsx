// Fichier : app/routes/[id]/altitudeChart.tsx
'use client';

import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea
} from 'recharts';
import { Climb } from './routeDisplay';

interface AltitudeChartProps {
  streams: {
    distance: number[];
    altitude: number[];
    latlng: [number, number][];
  };
  climbs: Climb[];
  highlightedArea?: Climb | null;
  onClimbClick?: (climb: Climb) => void;
  onClimbHover?: (climb: Climb | null) => void;
}

// Couleurs de pente (Ligne)
const GRADE_COLORS = {
  flat: '#d04fd7',   
  c4: '#22c55e',     
  c3: '#eab308',     
  c2: '#f97316',     
  c1: '#ef4444',     
  hc: '#a855f7',     
};

const getGradeColor = (grade: number): string => {
  if (grade < 3) return GRADE_COLORS.flat; 
  if (grade < 5) return GRADE_COLORS.c4;
  if (grade < 7) return GRADE_COLORS.c3;
  if (grade < 10) return GRADE_COLORS.c2;
  if (grade < 15) return GRADE_COLORS.c1;
  return GRADE_COLORS.hc;
};

export default function AltitudeChart({
  streams,
  climbs,
  highlightedArea = null,
  onClimbClick,
  onClimbHover,
}: AltitudeChartProps) {

  // 1. Préparation des données avec Downsampling (Optimisation Mobile)
  const { chartData, gradientStops } = useMemo(() => {
    if (!streams || streams.distance.length === 0) return { chartData: [], gradientStops: null };

    const totalPoints = streams.distance.length;
    const TARGET_RESOLUTION = 350; 
    const step = Math.ceil(totalPoints / TARGET_RESOLUTION);

    const data: { dist: number; alt: number; rawAlt: number; grade: number; inClimb: boolean; }[] = [];
    
    for (let i = 0; i < totalPoints; i += step) {
        const index = Math.min(i, totalPoints - 1);
        
        const dist = streams.distance[index];
        const alt = streams.altitude[index];
        
        let grade = 0;
        
        if (data.length > 0) {
            const prevPoint = data[data.length - 1];
            const distDiff = dist - (prevPoint.dist * 1000); 
            const altDiff = alt - prevPoint.rawAlt;
            
            if (distDiff > 10) { 
                grade = (altDiff / distDiff) * 100;
            } else {
                grade = prevPoint.grade; 
            }
        }

        const distKm = dist / 1000;
        // On garde l'info "inClimb" pour colorer la ligne si besoin
        const inClimb = climbs.some(c => distKm >= c.startKm && distKm <= c.endKm);

        data.push({
            dist: parseFloat(distKm.toFixed(2)),
            alt: Math.round(alt),
            rawAlt: alt, 
            grade: Math.max(-20, Math.min(30, grade)),
            inClimb
        });

        if (index === totalPoints - 1) break;
    }

    // B. Gradient SVG
    const maxDist = data.length > 0 ? data[data.length - 1].dist : 1;
    
    const stops = data.map((point, index) => {
      const offset = (point.dist / maxDist) * 100;
      const color = point.inClimb ? getGradeColor(point.grade) : GRADE_COLORS.flat;
      
      return <stop key={index} offset={`${offset}%`} stopColor={color} />;
    });

    return { chartData: data, gradientStops: stops };
  }, [streams, climbs]);

  if (!chartData.length) return null;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={chartData}
        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        onMouseLeave={() => onClimbHover && onClimbHover(null)}
      >
        <defs>
          <linearGradient id="slopeGradient" x1="0" y1="0" x2="1" y2="0">
            {gradientStops}
          </linearGradient>
          
          <linearGradient id="slopeFill" x1="0" y1="0" x2="1" y2="0">
             {React.Children.map(gradientStops, (child: any) => 
                React.cloneElement(child, { stopOpacity: 0.15 }) 
             )}
          </linearGradient>
        </defs>

        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
        
        <XAxis 
          dataKey="dist" 
          type="number" 
          domain={['dataMin', 'dataMax']}
          tick={{ fill: '#666', fontSize: 10 }} 
          unit="km"
          interval="preserveStartEnd"
          minTickGap={30}
        />
        
        <YAxis 
          dataKey="alt" 
          domain={['auto', 'auto']} 
          tick={{ fill: '#666', fontSize: 10 }}
          width={35}
          unit="m"
        />

        <Tooltip
          contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '6px', fontSize: '12px' }}
          itemStyle={{ color: '#fff' }}
          labelStyle={{ color: '#888', marginBottom: '5px' }}
          formatter={(value: number) => [`${value} m`, 'Altitude']}
          labelFormatter={(label) => `Km ${label}`}
        />

        {/* 🔥 ZONES DE COLS (Rectangles Colorés) */}
        {climbs.map((climb) => {
            const isHighlighted = highlightedArea?.id === climb.id;
            // Couleur dynamique selon la catégorie (ou violet par défaut)
            const zoneColor = climb.category?.color || "#d04fd7";

            return (
                <ReferenceArea
                    key={climb.id}
                    x1={climb.startKm}
                    x2={climb.endKm}
                    // Pas de y1/y2 = prend toute la hauteur
                    fill={zoneColor}
                    fillOpacity={isHighlighted ? 0.3 : 0.1} // Visible à 10% par défaut
                    strokeOpacity={0}
                    onClick={() => onClimbClick && onClimbClick(climb)}
                    onMouseEnter={() => onClimbHover && onClimbHover(climb)}
                    onMouseLeave={() => onClimbHover && onClimbHover(null)}
                    style={{ cursor: 'pointer' }} 
                />
            );
        })}

        <Area
          type="monotone"
          dataKey="alt"
          stroke="url(#slopeGradient)"
          strokeWidth={2.5} 
          fill="url(#slopeFill)"
          animationDuration={1500}
          activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2, fill: '#d04fd7' }}
        />

      </AreaChart>
    </ResponsiveContainer>
  );
}