// Fichier : app/components/ActivityCard.tsx
'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

// Import dynamique de la MiniMap
const MiniMap = dynamic(() => import('./ui/miniMap'), {
  ssr: false,
  loading: () => <div style={{ height: '100%', background: '#1a1a24', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', fontSize:'0.7rem' }}>Chargement...</div>,
});

// --- TYPES ---
export interface ActivityCardData { 
  id: number;
  name: string;
  distance_km: number | null;
  elevation_gain_m: number | null;
  start_time: string;
  avg_speed_kmh: number | null;
  avg_power_w: number | null;
  tss: number | null;
  polyline: { polyline: string } | null | string; 
  np_w?: number | null;
}

export interface Badge {
  label: string;
  color: string;
  icon?: string;
  category: 'distance' | 'elevation' | 'special';
}

// --- SOUS-COMPOSANT BADGE ---
function ActivityBadge({ label, color, icon }: Badge) {
  return (
    <div style={{ 
        background: color, color: '#000', // 🔥 Texte noir sur couleur vive pour lisibilité
        alignItems: 'center', padding: '3px 8px',
        borderRadius: '4px', fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase',
        letterSpacing: '0.5px', display: 'inline-flex', gap: '4px', 
        boxShadow: `0 0 10px ${color}60`, // Glow effet néon
        zIndex: 10
    }}>
      {icon && <span>{icon}</span>}
      {label}
    </div>
  );
}

// --- COMPOSANT PRINCIPAL ---
export default function ActivityCard({ activity, specialBadges = new Map() }: { activity: ActivityCardData; specialBadges?: Map<string, Badge> }) {
  const [isHovered, setIsHovered] = useState(false);
  
  const encodedPolyline = typeof activity.polyline === 'string' 
    ? activity.polyline 
    : activity.polyline?.polyline || "";

  const activityBadges = useMemo(() => {
    const badges: Badge[] = [];
    const dist = activity.distance_km || 0;
    const elev = activity.elevation_gain_m || 0;

    if (dist > 0) {
        if (dist < 50) badges.push({ label: 'Courte', color: '#00f3ff', category: 'distance' });
        else if (dist < 100) badges.push({ label: 'Moyenne', color: '#d04fd7', category: 'distance' });
        else badges.push({ label: 'Longue', color: '#f59e0b', category: 'distance' });
    }
    if (dist > 0 && elev > 0) {
        const ratio = elev / dist;
        if (ratio < 10) badges.push({ label: 'Plat', color: '#3b82f6', category: 'elevation' });
        else if (ratio < 20) badges.push({ label: 'Vallonné', color: '#facc15', category: 'elevation' });
        else badges.push({ label: 'Montagne', color: '#ef4444', category: 'elevation' });
    }
    return badges.slice(0, 3);
  }, [activity]);

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  return (
    <Link href={`/activities/${activity.id}`} style={{ textDecoration: 'none' }}>
      <div 
        style={{ 
          // 🔥 FOND PLUS CLAIR pour détacher du noir profond de la page
          background: 'rgba(30, 30, 40, 0.6)', 
          backdropFilter: 'blur(10px)',
          borderRadius: '16px', 
          border: '1px solid rgba(255, 255, 255, 0.08)',
          overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%', position: 'relative',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: isHovered ? 'translateY(-6px)' : 'translateY(0)',
          boxShadow: isHovered ? '0 15px 30px rgba(0,0,0,0.3), 0 0 0 1px #d04fd7' : '0 4px 10px rgba(0,0,0,0.2)',
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* MAP HEADER */}
        <div style={{ position: 'relative', height: '150px', background: '#121212', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            {encodedPolyline ? (
                <div style={{ width: '100%', height: '100%', opacity: 0.9 }}>
                    <MiniMap encodedPolyline={encodedPolyline} color="#d04fd7" />
                </div>
            ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#444', fontSize: '0.8rem' }}>Pas de tracé</div>
            )}
            
            {/* Badges Overlay */}
            <div style={{ position: 'absolute', bottom: '10px', left: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {activityBadges.map((b, i) => <ActivityBadge key={i} {...b} />)}
            </div>
        </div>

        {/* CONTENT */}
        <div style={{ padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.8rem', flex: 1 }}>
            <div>
                {/* 🔥 TITRE EN BLANC PUR */}
                <h4 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {activity.name}
                </h4>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#888', textTransform: 'capitalize' }}>{formatDate(activity.start_time)}</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <div>
                    <div style={{ fontSize: '0.65rem', color: '#666', fontWeight: 700, textTransform: 'uppercase' }}>DIST</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>{activity.distance_km?.toFixed(1)}<small style={{fontSize:'0.6em', color:'#888'}}>km</small></div>
                </div>
                <div>
                    <div style={{ fontSize: '0.65rem', color: '#666', fontWeight: 700, textTransform: 'uppercase' }}>D+</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f59e0b' }}>{activity.elevation_gain_m?.toFixed(0)}<small style={{fontSize:'0.6em', color:'#888'}}>m</small></div>
                </div>
                <div>
                    <div style={{ fontSize: '0.65rem', color: '#666', fontWeight: 700, textTransform: 'uppercase' }}>WATTS</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#d04fd7' }}>{activity.avg_power_w?.toFixed(0) || '-'}<small style={{fontSize:'0.6em', color:'#888'}}>w</small></div>
                </div>
            </div>
        </div>
      </div>
    </Link>
  );
}