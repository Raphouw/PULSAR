// Fichier : app/components/LargeActivityCard.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Calendar, Clock, Zap, Mountain, MapPin, Activity, Gauge } from 'lucide-react';
// 🔥 IMPORT MANQUANT AJOUTÉ :
import LikeButton from './ui/LikeButton'; 

// Import dynamique de la MiniMap
const MiniMap = dynamic(() => import('./ui/miniMap'), {
  ssr: false,
  loading: () => <div style={{ height: '100%', background: '#1a1a24', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', fontSize:'0.8rem' }}>Chargement satellite...</div>,
});

// --- TYPES (Réutilisation possible) ---
export interface ActivityCardData { 
  id: number;
  name: string;
  distance_km: number | null;
  elevation_gain_m: number | null;
  duration_s: number;
  avg_speed_kmh: number | null;
  avg_power_w: number | null;
  max_speed_kmh: number | null;
  avg_heartrate: number | null;
  start_time: string;
  polyline: { polyline: string } | null | string; 
  np_w?: number | null;
  likes_count?: number;
  is_liked?: boolean;
}

// --- COMPOSANT PRINCIPAL ---
export default function LargeActivityCard({ activity }: { activity: ActivityCardData }) {
  const [isHovered, setIsHovered] = useState(false);
  
  const encodedPolyline = typeof activity.polyline === 'string' 
    ? activity.polyline 
    : activity.polyline?.polyline || "";

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  // Styles
  const containerStyle: React.CSSProperties = {
    background: 'linear-gradient(145deg, rgba(30, 30, 40, 0.4) 0%, rgba(15, 15, 20, 0.6) 100%)',
    borderRadius: '24px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    marginBottom: '2rem',
    transition: 'all 0.3s ease',
    transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
    boxShadow: isHovered 
        ? '0 20px 40px rgba(0,0,0,0.4), 0 0 0 1px #d04fd7' 
        : '0 10px 30px rgba(0,0,0,0.2)',
  };

  const statBoxStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '12px',
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid rgba(255,255,255,0.05)',
  };

  return (
    <Link href={`/activities/${activity.id}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div 
        style={containerStyle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* 1. HEADER : Titre & Date */}
        <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
                <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>{activity.name}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#888', marginTop: '4px', fontSize: '0.9rem' }}>
                    <Calendar size={14} /> {formatDate(activity.start_time)}
                </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {/* 🔥 LE BOUTON LIKE GIGA STYLÉ */}
                {/* On empêche le clic sur le lien parent avec un div z-index ou en gérant l'event dans le bouton */}
                <div style={{ pointerEvents: 'auto', position: 'relative', zIndex: 20 }}>
                    <LikeButton 
                        activityId={activity.id} 
                        initialLiked={activity.is_liked || false} 
                        initialCount={activity.likes_count || 0} 
                    />
                </div>

                {/* Petit badge Pulsar ou Type */}
                <div style={{ background: 'rgba(208, 79, 215, 0.1)', color: '#d04fd7', padding: '6px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, border: '1px solid rgba(208, 79, 215, 0.3)' }}>
                    SORTIE
                </div>
            </div>
        </div>

        {/* 2. MAP (Grande et Claire) */}
        <div style={{ height: '350px', position: 'relative', background: '#0E0E12' }}>
            {encodedPolyline ? (
                <MiniMap 
                    encodedPolyline={encodedPolyline} 
                    color={isHovered ? '#00f3ff' : '#d04fd7'} // Changement de couleur au survol !
                    mapHeight="350px"
                />
            ) : (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444' }}>
                    <MapPin size={32} style={{ opacity: 0.2 }} />
                </div>
            )}
        </div>

        {/* 3. STATS GRID (Détails) */}
        <div style={{ padding: '1.5rem 2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1rem' }}>
            
            <div style={statBoxStyle}>
                <div style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px', display:'flex', alignItems:'center', gap:'4px' }}>
                    <Activity size={12} /> Distance
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>
                    {activity.distance_km?.toFixed(1)}<small style={{fontSize:'0.6em', color:'#666'}}>km</small>
                </div>
            </div>

            <div style={statBoxStyle}>
                <div style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px', display:'flex', alignItems:'center', gap:'4px' }}>
                    <Mountain size={12} /> Dénivelé
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f59e0b' }}>
                    {activity.elevation_gain_m?.toFixed(0)}<small style={{fontSize:'0.6em', color:'#666'}}>m</small>
                </div>
            </div>

            <div style={statBoxStyle}>
                <div style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px', display:'flex', alignItems:'center', gap:'4px' }}>
                    <Clock size={12} /> Durée
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>
                    {formatDuration(activity.duration_s)}
                </div>
            </div>

            <div style={statBoxStyle}>
                <div style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px', display:'flex', alignItems:'center', gap:'4px' }}>
                    <Zap size={12} /> Puissance
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#d04fd7' }}>
                    {activity.avg_power_w || '-'}<small style={{fontSize:'0.6em', color:'#666'}}>w</small>
                </div>
            </div>

            <div style={statBoxStyle}>
                <div style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px', display:'flex', alignItems:'center', gap:'4px' }}>
                    <Gauge size={12} /> Vitesse
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#00f3ff' }}>
                    {activity.avg_speed_kmh?.toFixed(1)}<small style={{fontSize:'0.6em', color:'#666'}}>km/h</small>
                </div>
            </div>

        </div>
      </div>
    </Link>
  );
}