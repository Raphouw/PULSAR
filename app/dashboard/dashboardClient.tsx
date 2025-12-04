// Fichier : app/dashboard/dashboardClient.tsx
'use client';

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DashboardData } from './page';
import { useSession, signIn, signOut } from 'next-auth/react';
import { Session } from 'next-auth';
import { TrainingLoadChart } from './TrainingLoadChart'; // <-- NOUVEAU
import { CpCurveChart } from './CpCurveChart';           // <-- NOUVEAU
import dynamic from 'next/dynamic'; // Assurez-vous que dynamic est importé
import { FitnessChart } from './FitnessChart';
import { PowerModelChart } from './PowerModelChart';
import DeepAnalysisButton from './DeepAnalysisButton';
import { useAnalysis } from '../context/AnalysisContext'; // 🔥 IMPORT DU CONTEXTE
import NewRecordModal from './NewRecordModal';
import { useBackfill } from '../context/BackfillContext';

// --- Constantes et Helpers ---
const MANUAL_CHECK_COOLDOWN_MS = 5 * 60 * 1000;
const AUTO_CHECK_INTERVAL_MS = 60 * 60 * 1000;
const ARROW_UP = '↗';
const ARROW_DOWN = '↘';
const ARROW_SAME = '→';
const MiniMap = dynamic(() => import('../../components/ui/miniMap'), {
  ssr: false,
  loading: () => <div style={{ height: '150px', background: 'var(--secondary)', borderRadius: '10px 10px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>Chargement...</div>,
});

interface Badge {
  label: string;
  color: string;
  icon?: string;
  category: 'distance' | 'elevation' | 'special';
}

export interface ActivityCardData { 
  id: number;
  name: string;
  distance_km: number | null;
  elevation_gain_m: number | null;
  start_time: string;
  avg_speed_kmh: number | null;
  avg_power_w: number | null;
  tss: number | null;
  polyline: { polyline: string } | null;
  np_w: number | null; // Ajouté pour la cohérence avec le backend
}


const HeaderSection = ({ 
  userName, 
  stats, 
  hasStrava, 
  checkMessage, 
  checking, 
  isGlobalAnalyzing,
  onRefresh,
  onDeepSync,
  isBackfilling,
  backfillStatus
}: any) => {
  
  const fmt = (n: number) => Math.floor(n).toLocaleString('fr-FR');

  return (
    <div style={{
      background: 'linear-gradient(145deg, #1e1e2e 0%, #16161e 100%)',
      borderRadius: '16px',
      padding: '2rem',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
      marginBottom: '2.5rem',
      display: 'flex',
      flexWrap: 'wrap',
      gap: '2rem',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      
      {/* BLOC GAUCHE : IDENTITÉ & STATS */}
      <div style={{ flex: '1 1 400px' }}>
        <h1 style={{ 
          margin: '0 0 0.5rem 0', 
          fontSize: '2rem', 
          fontWeight: 800,
          background: 'linear-gradient(90deg, #fff, #a0a0a0)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          Bonjour, {userName} !
        </h1>
        
        <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
          <div style={miniStatStyle}>
            <span style={miniStatLabelStyle}>Activités</span>
            <span style={miniStatValueStyle}>{stats.count}</span>
          </div>
          <div style={miniStatDividerStyle} />
          <div style={miniStatStyle}>
            <span style={miniStatLabelStyle}>Distance</span>
            <span style={{...miniStatValueStyle, color: '#10b981'}}>{fmt(stats.distance)} <span style={{fontSize:'0.8rem'}}>km</span></span>
          </div>
          <div style={miniStatDividerStyle} />
          <div style={miniStatStyle}>
            <span style={miniStatLabelStyle}>Dénivelé</span>
            <span style={{...miniStatValueStyle, color: '#f59e0b'}}>{fmt(stats.elevation)} <span style={{fontSize:'0.8rem'}}>m</span></span>
          </div>
          <div style={miniStatDividerStyle} />
          <div style={miniStatStyle}>
            <span style={miniStatLabelStyle}>Temps</span>
            <span style={{...miniStatValueStyle, color: '#d04fd7'}}>{fmt(stats.time / 3600)} <span style={{fontSize:'0.8rem'}}>h</span></span>
          </div>
        </div>
      </div>

      {/* BLOC DROITE : COMMANDES */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'flex-end', 
        gap: '1rem',
        flex: '1 1 300px'
      }}>
        {/* Statut */}
        <div style={{ 
          display: 'flex', alignItems: 'center', gap: '0.5rem', 
          background: hasStrava ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          padding: '0.4rem 0.8rem', borderRadius: '20px',
          border: hasStrava ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
          fontSize: '0.85rem', fontWeight: 600,
          color: hasStrava ? '#10b981' : '#ef4444'
        }}>
          {hasStrava ? (
            <><span style={{ fontSize: '1rem' }}>✓</span> Compte Strava actif</>
          ) : (
            <><span style={{ fontSize: '1rem' }}>✕</span> Strava non connecté</>
          )}
        </div>



        {/* Boutons */}
        <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center' }}>
        {checkMessage && (
          <div style={{
            background: 'rgba(208, 79, 215, 0.1)', // Fond violet très léger
            color: '#d04fd7', // Texte violet néon
            padding: '0.4rem 0.8rem',
            borderRadius: '8px',
            border: '1px solid rgba(208, 79, 215, 0.3)',
            fontSize: '0.8rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            whiteSpace: 'nowrap', // Empêche le texte de passer à la ligne
            animation: 'fadeIn 0.3s ease' // Animation douce d'apparition
        }}>
          {checkMessage}
        </div>
          )}
          
          {hasStrava && <DeepAnalysisButton />}

          {!hasStrava && (
            <button onClick={() => signIn('strava')} style={connectStravaButtonStyle}>
              Lier mon compte Strava
            </button>
        )}
        
            {hasStrava && backfillStatus !== 'completed' && (
             <button 
             onClick={onDeepSync} 
             disabled={isBackfilling}
             style={{
                 ...actionButtonStyle, 
                 background: isBackfilling ? 'rgba(208, 79, 215, 0.1)' : 'rgba(208, 79, 215, 0.15)',
                 borderColor: 'rgba(208, 79, 215, 0.4)',
                 color: '#d04fd7',
                 opacity: isBackfilling ? 0.7 : 1
             }}
             title="Récupérer les données manquantes (Streams)"
           >
             {isBackfilling ? (
                // Icône Spinner
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                </svg>
             ) : (
                // Icône Base de données / Analyse
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                  <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
                  <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
                </svg>
             )}
             <span>{isBackfilling ? 'Analyse en cours...' : 'Analyser Historique'}</span>
           </button>
          )}
        <button 
            onClick={onRefresh} 
            disabled={isGlobalAnalyzing} // Désactivé si une analyse tourne déjà
            style={{...actionButtonStyle, opacity: isGlobalAnalyzing ? 0.5 : 1}}
            title="Synchroniser Strava"
            onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.borderColor = 'var(--text)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            }}
          >
            {isGlobalAnalyzing ? (
               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                 <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
               </svg>
            ) : (
               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                 <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                 <path d="M3 3v5h5"></path>
               </svg>
            )}
            <span>Rafraîchir</span>
          </button>
          
          {/* 4. Bouton DÉCONNEXION (Nouveau Design) */}
          <button 
            onClick={() => signOut({ callbackUrl: '/auth/signin' })} 
            style={logoutButtonStyle}
            title="Se déconnecter"
            onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                e.currentTarget.style.borderColor = '#ef4444';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)';
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};





const calcPercentDiff = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  if (current === 0) return -100;
  const diff = ((current - previous) / previous) * 100;
  return diff;
};
const formatPercent = (val: number): string => {
  const v = Math.round(val);
  if (v === 0) return `(${ARROW_SAME})`;
  if (v > 0) return `(${ARROW_UP} +${v}%)`;
  return `(${ARROW_DOWN} ${v}%)`;
};
const getConsistencyInterpretation = (score: number): string => {
  if (score >= 1.1) return "En progression 🔥"; // > 110%
  if (score >= 0.95) return "Très stable ✅";   // 95% - 110%
  if (score >= 0.8) return "Stable 🆗";         // 80% - 95%
  if (score >= 0.5) return "En baisse 📉";      // 50% - 80%
  return "Irrégulier ⚠️";                       // < 50%
};

const getConsistencyColor = (score: number): string => {
  if (score >= 1.1) return '#22c55e'; // Couleur "Pulsar" pour la progression
  if (score >= 0.95) return '#10b981'; // Vert
  if (score >= 0.8) return '#3b82f6';  // Bleu
  if (score >= 0.5) return '#f97316';  // Orange
  return '#ef4444';                    // Rouge
};

const StatCard = ({
   title,
   value,
  unit,
   comparison,
   onClick,
   isExpanded,
   cardRef, // <-- Le type est maintenant corrigé ci-dessous
}: {
   title: string;
   value: string | number;
   unit: string;
   comparison: string;
   onClick?: () => void;
   isExpanded?: boolean;
   cardRef?: React.RefObject<HTMLDivElement | null>; // <-- SOLUTION
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const getBorderColor = () => {
    // Updated border color logic to include "Régulier"
    if (comparison.includes(ARROW_UP) || comparison.includes('Très régulier') || comparison.includes('Régulier')) {
      return 'rgba(34, 197, 94, 0.5)';
    } else if (comparison.includes('Moyen')) {
      return 'rgba(249, 115, 22, 0.5)';
    } else if (comparison.includes(ARROW_DOWN) || comparison.includes('Chaotique')) {
      return 'rgba(239, 68, 68, 0.5)';
    } else {
      return 'rgba(208, 79, 215, 0.3)';
    }
  };

  const getTextColor = () => {
    // Updated text color logic to include "Régulier"
    if (comparison.includes(ARROW_UP) || comparison.includes('Très régulier') || comparison.includes('Régulier')) {
      return '#22c55e';
    } else if (comparison.includes('Moyen')) {
      return '#f97316';
    } else if (comparison.includes(ARROW_DOWN) || comparison.includes('Chaotique')) {
      return '#ef4444';
    } else {
      return '#d04fd7';
    }
  };

  return (
    <div
      ref={cardRef}
      style={{
        padding: '1.5rem',
        borderRadius: '12px',
        background: 'var(--surface)',
        border: `2px solid ${getBorderColor()}`,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        minHeight: '110px',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: isHovered ? 'translateY(-4px) scale(1.02)' : 'translateY(0) scale(1)',
        boxShadow: isHovered
          ? `0 12px 32px rgba(0,0,0,0.4), 0 0 0 3px ${getBorderColor()}`
          : '0 4px 12px rgba(0,0,0,0.2)',
        cursor: onClick ? 'pointer' : 'default',
        opacity: isExpanded ? 0.7 : 1,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      <div style={{
        fontSize: '0.75rem',
        fontWeight: 600,
        color: 'var(--text-secondary)',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
      }}>
        {title}
      </div>

      <div style={{
        fontSize: '2.2rem',
        fontWeight: 800,
        color: 'var(--text)',
        lineHeight: 1,
        display: 'flex',
        alignItems: 'baseline',
        gap: '0.5rem'
      }}>
        {value}
        <span style={{
          fontSize: '1rem',
          fontWeight: 500,
          color: 'var(--text-secondary)',
        }}>
          {unit}
        </span>
      </div>

      <div style={{
        fontSize: '0.85rem',
        fontWeight: 600,
        color: getTextColor(),
        marginTop: 'auto'
      }}>
        {comparison}
      </div>
    </div>
  );
};




function ActivityBadge({ label, color, icon }: Badge) {
  return (
    <div 
      style={{ 
        background: color, 
        color: '#ffffffff', // ← Changé en blanc pour meilleur contraste
        alignItems: 'center',
        padding: '0.4rem 0.95rem',
        borderRadius: '20px',
        fontSize: '0.75rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        display: 'inline-flex',
        gap: '0.3rem',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)', // ← Ombre plus prononcée
        whiteSpace: 'nowrap',
        textShadow: '0 1px 2px rgba(0,0,0,0.5)', // ← Ombre sur le texte
        
      }}
      title={label}
    >
      {icon && <span style={{ marginRight: '0.25rem', fontSize: '0.7rem' }}>{icon}</span>}
      {label}
    </div>
  );
}

function ActivityCard({ activity, specialBadges }: { activity: ActivityCardData; specialBadges: Map<string, Badge> }) {
  const [isHovered, setIsHovered] = useState(false);
  
  const getDistanceBadge = (distanceKm: number): Badge => {
    if (distanceKm < 50) {
      return { label: 'Courte', color: '#10b981', category: 'distance' };
    } else if (distanceKm < 100) {
      return { label: 'Moyenne', color: '#ff6b9d', category: 'distance' };
    } else if (distanceKm < 250) {
      return { label: 'Longue', color: '#f4079dff', category: 'distance' };
    }
    return { label: 'Ultra', color: '#ef4444', category: 'distance' };
  };

  const getTerrainBadge = (dist: number, elev: number): Badge => {
    const elevPerKm = elev / (dist || 1);
    if (elevPerKm < 10) {
      return { label: 'Plat', color: '#3b82f6', category: 'elevation' };
    } else if (elevPerKm < 20) {
      return { label: 'Accidentée', color: '#f59e0b', category: 'elevation' };
    }
    return { label: 'Montagne', color: '#ef4444', category: 'elevation' };
  };

  const activityBadges = useMemo(() => {
    const badges: Badge[] = [];
    if (activity.distance_km !== null) {
      badges.push(getDistanceBadge(activity.distance_km));
    }
    if (activity.distance_km !== null && activity.elevation_gain_m !== null) {
      badges.push(getTerrainBadge(activity.distance_km, activity.elevation_gain_m));
    }
    
    const recordBadges = Array.from(specialBadges.entries())
        .filter(([key, badge]) => {
           
            return false;
        })
        .map(([_, badge]) => ({...badge, icon: ''})); 

    return [...badges, ...recordBadges].slice(0, 3);
  }, [activity, specialBadges]);

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('fr-FR', {
        

        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  // NOUVEAUX STYLES AMÉLIORÉS
 const cardStyle: React.CSSProperties = {
  background: 'var(--surface)',
  borderRadius: '12px',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  border: '1px solid var(--secondary)',
  // 🔥 IMPORTANT: overflow hidden sur la carte principale
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  position: 'relative',
  transform: isHovered ? 'translateY(-8px)' : 'translateY(0)',
        boxShadow: isHovered 
          ? '0 20px 40px rgba(79, 215, 127, 0.3), 0 0 0 2px rgba(208, 79, 215, 0.2)' 
          : '0 4px 15px rgba(0, 0, 0, 0.2)',
  
};


const mapContainerStyle: React.CSSProperties = {
  position: 'relative',
  height: '140px',
  flexShrink: 0,
  // 🔥 SUPPRIMER overflow hidden ici
  // overflow: 'hidden', ← RETIRÉ
  borderRadius: '12px 12px 0 0',
};



  const contentStyle: React.CSSProperties = {
    padding: '1rem',
  paddingLeft: '1.5rem', // Augmenter le padding à gauche pour décaler vers la droite
  paddingTop: '0.5rem', // Optionnel : si vous voulez encore plus d'espace en haut
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  
  };

  const statsGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '0.5rem',
    marginTop: 'auto', // Pousse les stats vers le bas
    paddingTop: '0.75rem',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    
  };

  const statItemStyle: React.CSSProperties = {
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',

  };

  const titleStyle: React.CSSProperties = {
    margin: '2rem 0 0.25rem 1rem', // Changé de '0 0 0.25rem 0' à '1rem 0 0.25rem 0'   
    color: 'var(--text)',
    fontSize: '1.2rem',
    fontWeight: 600,
    lineHeight: '1.3',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  };

  const dateStyle: React.CSSProperties = {
    margin: '0rem 0 0.25rem 1rem', // Changé de '0 0 0.25rem 0' à '1rem 0 0.25rem 0'   
    fontSize: '1rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.2',
  };

   return (
    <Link 
      href={`/activities/${activity.id}`} 
      style={{ textDecoration: 'none' }}
    >
      <div 
        style={{ 
          ...cardStyle,
          transform: isHovered ? 'translateY(-4px) scale(1.02)' : 'translateY(0) scale(1)',
          boxShadow: isHovered 
            ? '0 12px 32px rgba(0, 0, 0, 0.2), 0 0 0 1px var(--accent)' 
            : '0 4px 12px rgba(0, 0, 0, 0.1)',
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Section Carte avec badges - STRUCTURE CORRIGÉE */}
        <div style={{ 
          position: 'relative',
          borderRadius: '12px 12px 0 0',

          overflow: 'hidden' // ← ICI on met le overflow hidden sur le conteneur parent
        }}>
          {/* Container de la map SANS overflow hidden */}
          <div style={mapContainerStyle}>
            {activity.polyline?.polyline ? (
              <MiniMap encodedPolyline={activity.polyline.polyline} />
            ) : (
              <div style={{
                height: '100%',
                background: 'var(--secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-secondary)',
                fontSize: '0.8rem'
              }}>
                Pas de tracé GPS
              </div>
            )}

            <h4 style={titleStyle}>
            {activity.name}
          </h4>
          <p style={dateStyle}>
            {formatDate(activity.start_time)}
          </p>
          </div>

          {/* BADGES - Positionnés ABSOLUMENT par rapport au conteneur parent */}
          <div style={{
             padding: '1.5rem 0.95rem',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: 'white',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginTop: '130px'

              
          }}>

            
            {activityBadges.map((badge, index) => (
              // Ajout de pointerEvents: 'auto' pour que le badge soit cliquable
              <div key={index} style={{ pointerEvents: 'auto' }}>
                <ActivityBadge {...badge} />
              </div>
            ))}
          </div>




          {/* Overlay sombre pour améliorer la lisibilité */}
          <div style={{
             padding: '0.4rem 0.95rem',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: 'white',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
          }} />
        </div>

        {/* Le reste du contenu reste inchangé */}
        <div style={contentStyle}>
          

          <div style={statsGridStyle}>
            <div style={statItemStyle}>
              <div style={{fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.2rem'}}>Distance</div>
              <div style={{fontSize: '1.0rem', fontWeight: 700, color: '#10b981', lineHeight: '1'}}>
                {activity.distance_km?.toFixed(1) ?? '-'} km
              </div>
            </div>
            <div style={statItemStyle}>
              <div style={{fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.2rem'}}>Dénivelé</div>
              <div style={{fontSize: '1.0rem', fontWeight: 700, color: '#f97316', lineHeight: '1'}}>
                {activity.elevation_gain_m?.toFixed(0) ?? '-'} m
              </div>
            </div>
            <div style={statItemStyle}>
              <div style={{fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.2rem'}}>Puissance</div>
              <div style={{fontSize: '1.0rem', fontWeight: 700, color: '#8b5cf6', lineHeight: '1'}}>
                {activity.avg_power_w?.toFixed(0) ?? '-'} W
              </div>
            </div>
            <div style={statItemStyle}>
              <div style={{fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.2rem'}}>TSS</div>
              <div style={{fontSize: '1.0rem', fontWeight: 700, color: '#d04fd7', lineHeight: '1'}}>
                {activity.tss?.toFixed(0) ?? '-'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

// --- Logique de création des Special Badges (copiée de activityClient.tsx) ---
const specialBadgesMap: Map<string, Badge> = new Map([
    ['power', { label: 'Watt Max', color: '#FF3C00', icon: '⚡', category: 'special' }],
    ['speed', { label: 'Fusée', color: '#00FF87', icon: '🚀', category: 'special' }],
    ['distance', { label: 'ULTRAA', color: '#00B4D8', icon: '🏆', category: 'special' }],
    ['elevation', { label: 'Grimpette', color: '#F77F00', icon: '⛰️', category: 'special' }],
    ['tss', { label: 'Tu stresses ?', color: '#7c3aed', icon: '💪', category: 'special' }],
]);





type TabType = 'overview' | 'stats';




const TabButton = ({
  active,
  onClick,
  children
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        padding: '0.75rem 1.5rem',
        background: active ? 'var(--accent)' : 'transparent',
        color: active ? 'white' : 'var(--text-secondary)',
        border: active ? 'none' : '1px solid var(--secondary)',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: 600,
        fontSize: '0.9rem',
        transition: 'all 0.2s ease',
        transform: isHovered && !active ? 'translateY(-2px)' : 'translateY(0)',
      }}
    >
      {children}
    </button>
  );
};

// --- COMPOSANT PRINCIPAL DashboardClient ---
type DashboardClientProps = {
  data: DashboardData;
  session?: Session | null;
  hasStrava?: boolean;
  userName?: string; // 🔥 Nouveau prop
};

export default function DashboardClient({ data, session: serverSession, hasStrava = false, userName = "Athlète" }: DashboardClientProps) {
  const [showScoreInfo, setShowScoreInfo] = useState(false); // 🔥 NOUVEAU
  const { stats, recentActivities, cpCurve, consistency, dailyTSS } = data;
  const router = useRouter();
  const { runDeepAnalysis, isAnalyzing, progress, status: analysisStatus } = useAnalysis();
  const { data: clientSession, status } = useSession();
  const [newRecords, setNewRecords] = useState<any[]>([]);
console.log("[Dashboard] Session client:", clientSession);
  
  const session = serverSession ?? clientSession ?? null;

  const [checking, setChecking] = useState(false);
  const [checkMessage, setCheckMessage] = useState('');
  const [lastCheckTime, setLastCheckTime] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null);
  const { startBackfill, isBackfilling, status: backfillStatus } = useBackfill();
      useEffect(() => {
          // Si on a Strava, qu'on ne fait rien, et que le statut est 'idle' (jamais lancé)
          // On peut lancer une petite vérification
          if (hasStrava && backfillStatus === 'idle' && !isBackfilling) {
              // Optionnel : attendre 5 secondes après le chargement de la page pour ne pas ralentir le LCP
              const t = setTimeout(() => {
                  console.log("Auto-start backfill check...");
                  startBackfill(); 
              }, 5000);
              return () => clearTimeout(t);
          }
      }, [hasStrava, backfillStatus, isBackfilling]);
  
  const cardRefs = {
    tss: useRef<HTMLDivElement | null>(null),
    distance: useRef<HTMLDivElement | null>(null),
    elevation: useRef<HTMLDivElement | null>(null),
    time: useRef<HTMLDivElement | null>(null),
    count: useRef<HTMLDivElement | null>(null),
    power: useRef<HTMLDivElement | null>(null),
  };


  

  useEffect(() => {
    const storedTime = localStorage.getItem('lastStravaCheck');
    setLastCheckTime(storedTime ? parseInt(storedTime, 10) : 0);
  }, []);

  const runCheck = useCallback(async (isAuto: boolean) => {

  if (!hasStrava) {
    console.log('Aucun compte Strava lié - arrêt des vérifications automatiques');
    return;}
  
    
    if (checking) return;
    setChecking(true);
    setCheckMessage(isAuto ? 'Vérification...' : 'Recherche...');
    try {
      const res = await fetch('/api/strava/check-latest');
      if (!res.ok) {
        let errorMsg = `Erreur ${res.status}`;
        try { const errorData = await res.json(); errorMsg = errorData.error || errorMsg; } catch (e) {}
        throw new Error(errorMsg);
      }
      const result = await res.json();
      const now = Date.now();
      localStorage.setItem('lastStravaCheck', now.toString());
      setLastCheckTime(now);
      if (result.imported > 0) {
        setCheckMessage(`Import réussi : +${result.imported} activité(s)`);
      if (result.brokenRecords && result.brokenRecords.length > 0) {
            console.log("🏆 Records battus reçus :", result.brokenRecords);
            setNewRecords(result.brokenRecords);
        }

        router.refresh();
      } 
      else {
        setCheckMessage('Aucune nouvelle activité.');
      }
    } catch (err: any) {
      setCheckMessage(`Erreur: ${err.message}`);
    } finally {
      setTimeout(() => { setCheckMessage(''); setChecking(false); }, 2500);
    }
  }, [checking, router]);

  useEffect(() => {
    if (lastCheckTime === 0) return;
    const now = Date.now();
    const timeSinceLastCheck = now - lastCheckTime;
    if (timeSinceLastCheck > AUTO_CHECK_INTERVAL_MS) {
      console.log("Pulsar: Auto-check, 1h+ écoulée.");
      runCheck(true);
    } else {
      const remainingMs = AUTO_CHECK_INTERVAL_MS - timeSinceLastCheck;
      const remainingMins = (remainingMs / 1000 / 60).toFixed(0);
      console.log(`Pulsar: Auto-check ignoré. Prochain dans ~${remainingMins} min.`);
    }
  }, [lastCheckTime, runCheck]);

  const runFullSync = useCallback(async (isInitial = false) => {
    // Si déjà en cours (sync ou analyse), on ne fait rien
    if (!hasStrava || checking || isAnalyzing) return;
    
    setChecking(true);
    setCheckMessage(isInitial ? '🚀 Démarrage du premier import Strava...' : 'Sync Strava...');
    
    try {
      // ÉTAPE 1: Import Strava
      const res = await fetch('/api/strava/check-latest');
      
      if (!res.ok) {
        throw new Error("Erreur de l'API Strava.");
      }
      
      const result = await res.json();
      
      let activitiesToAnalyze = result.to_analyze || 0;
      
      if (result.imported > 0) {
        setCheckMessage(`+${result.imported} activité(s) importée(s).`);
        activitiesToAnalyze = result.imported + (result.to_analyze || 0);
      } else if (activitiesToAnalyze === 0) {
        setCheckMessage('✅ Tout est à jour.');
        // Si tout est à jour, on sort
        setTimeout(() => setCheckMessage(''), 2000);
        return;
      } else {
         setCheckMessage(`Déjà ${activitiesToAnalyze} activité(s) en attente d'analyse.`);
      }

      // ÉTAPE 2: Analyse Profonde (Lente, utilise la barre de progression)
      // On recharge la page pour que runDeepAnalysis puisse cibler les nouvelles activités
      router.refresh(); 
      
      // On passe la main au contexte d'analyse. La barre flottante apparaît
      // L'état 'isAnalyzing' passe à true et bloque le bouton Rafraîchir
      await runDeepAnalysis(); 
      
      setCheckMessage('Analyse terminée !');
      router.refresh(); // Rafraîchir une dernière fois pour les nouvelles stats

    } catch (err: any) { 
        setCheckMessage(`Erreur Sync: ${err.message}`); 
    } finally { 
        setChecking(false);
        // On n'efface pas le message si l'analyse profonde prend le relais
        if (!isAnalyzing) {
             setTimeout(() => setCheckMessage(''), 2000);
        }
    }
  }, [hasStrava, checking, isAnalyzing, router, runDeepAnalysis]);

  const handleManualRefresh = () => runFullSync(false);

  const handleMetricClick = (metricName: string) => {
    if (expandedMetric === metricName) {
      setExpandedMetric(null);
    } else {
      setExpandedMetric(metricName);
    }
  };


  const handleSmartRefresh = useCallback(async () => {
    if (!hasStrava || isAnalyzing) return;
    
    setCheckMessage('Sync Strava...');
    try {
      const res = await fetch('/api/strava/check-latest');
      const result = await res.json();
      
      if (result.imported > 0) {
        setCheckMessage(`+${result.imported} acti. Analyse...`);
        // 🔥 C'est ici la magie : on déclenche le "Cerveau" global
        // Il va scanner les activités sans streams (dont les nouvelles) et afficher la barre flottante
        await runDeepAnalysis(); 
      } else {
        setCheckMessage('Tout est à jour');
      }
      router.refresh();
    } catch (err) { 
        setCheckMessage('Erreur Sync'); 
    } finally { 
        // On efface le message après 2s si l'analyse ne prend pas le relais
        setTimeout(() => { 
            if (!isAnalyzing) setCheckMessage(''); 
        }, 2000); 
    }
  }, [hasStrava, isAnalyzing, router, runDeepAnalysis]);

  // --- Calcul des comparatifs ---
  const { last7, prev7, month, prevMonth, last30, prev30, last90, prev90 } = stats;

  const tss_7d_diff = formatPercent(calcPercentDiff(last7.tss, prev7.tss));
  const dist_7d_diff = formatPercent(calcPercentDiff(last7.distance, prev7.distance));
  const elev_7d_diff = formatPercent(calcPercentDiff(last7.elevation, prev7.elevation));
  const time_7d_diff = formatPercent(calcPercentDiff(last7.time, prev7.time));
  const count_7d_diff = formatPercent(calcPercentDiff(last7.count, prev7.count));
  const power_7d_diff = formatPercent(calcPercentDiff(last7.avg_power, prev7.avg_power));
  const tss_month_diff = formatPercent(calcPercentDiff(month.tss, prevMonth.tss));
  const dist_month_diff = formatPercent(calcPercentDiff(month.distance, prevMonth.distance));
  const elev_month_diff = formatPercent(calcPercentDiff(month.elevation, prevMonth.elevation));
  const time_month_diff = formatPercent(calcPercentDiff(month.time, prevMonth.time));
  const count_month_diff = formatPercent(calcPercentDiff(month.count, prevMonth.count));
  const power_month_diff = formatPercent(calcPercentDiff(month.avg_power, prevMonth.avg_power));
  const tss_30d_diff = formatPercent(calcPercentDiff(last30.tss, prev30.tss));
  const dist_30d_diff = formatPercent(calcPercentDiff(last30.distance, prev30.distance));
  const elev_30d_diff = formatPercent(calcPercentDiff(last30.elevation, prev30.elevation));
  const time_30d_diff = formatPercent(calcPercentDiff(last30.time, prev30.time));
  const count_30d_diff = formatPercent(calcPercentDiff(last30.count, prev30.count));
  const power_30d_diff = formatPercent(calcPercentDiff(last30.avg_power, prev30.avg_power));
  const tss_90d_diff = formatPercent(calcPercentDiff(last90.tss, prev90.tss));
  const dist_90d_diff = formatPercent(calcPercentDiff(last90.distance, prev90.distance));
  const elev_90d_diff = formatPercent(calcPercentDiff(last90.elevation, prev90.elevation));
  const time_90d_diff = formatPercent(calcPercentDiff(last90.time, prev90.time));
  const count_90d_diff = formatPercent(calcPercentDiff(last90.count, prev90.count));
  const power_90d_diff = formatPercent(calcPercentDiff(last90.avg_power, prev90.avg_power));
  const score7j_val = (consistency.score7j * 100).toFixed(0);
  const score7j_comp = getConsistencyInterpretation(consistency.score7j);
  const scoreMonth_val = (consistency.scoreMonth * 100).toFixed(0);
  const scoreMonth_comp = getConsistencyInterpretation(consistency.scoreMonth);
  const score30j_val = (consistency.score30j * 100).toFixed(0);
  const score30j_comp = getConsistencyInterpretation(consistency.score30j);
  const score90j_val = (consistency.score90j * 100).toFixed(0);
  const score90j_comp = getConsistencyInterpretation(consistency.score90j);
  const global_val = (consistency.global * 100).toFixed(0);
  const global_comp = getConsistencyInterpretation(consistency.global);

  return (
  <div>
    {/* 1. HEADER UNIFIÉ */}
    <HeaderSection 
      userName={userName}
      stats={data.allTimeStats}
      hasStrava={hasStrava}
      // 🔥 CORRECTION PRINCIPALE : On affiche checkMessage UNIQUEMENT si l'ANALYSE n'est PAS active.
      // Si l'analyse est active, le message est null, et seul le composant flottant s'affiche.
      checkMessage={isAnalyzing ? null : checkMessage}
      checking={checking || isAnalyzing}
      onRefresh={handleManualRefresh}
      onDeepSync={startBackfill}
      isBackfilling={isBackfilling}
      backfillStatus={backfillStatus}
    />

    {/* 2. TABS NAVIGATION */}
    <div style={tabContainerStyle}>
      <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')}>
        Vue d'ensemble
      </TabButton>
      <TabButton active={activeTab === 'stats'} onClick={() => setActiveTab('stats')}>
        Statistiques complètes
      </TabButton>
    </div>

    {/* 3. CONTENU PRINCIPAL */}
    <div style={{ padding: '0 1.5rem' }}>
      
      {/* SCORE DE RÉGULARITÉ GLOBAL */}
      <div style={{ 
        textAlign: 'center', 
        marginBottom: '2rem',
        padding: '1.5rem 0',
        borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
        {/* LABEL + BOUTON INFO */}
        <div style={{ 
          fontSize: '0.85rem', 
          color: 'var(--text-secondary)', 
          textTransform: 'uppercase', 
          fontWeight: 600, 
          letterSpacing: '0.5px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          position: 'relative'
        }}>
          SCORE GLOBAL RÉGULARITÉ
          
          <button 
            onClick={() => setShowScoreInfo(!showScoreInfo)}
            style={{
              background: showScoreInfo ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
              color: showScoreInfo ? '#fff' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: '50%',
              width: '18px',
              height: '18px',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              cursor: 'pointer', 
              fontSize: '10px', 
              fontWeight: 'bold',
              transition: 'all 0.2s'
            }}
          >
            ?
          </button>

          {/* POPUP EXPLICATIVE */}
          {showScoreInfo && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '280px',
              background: 'rgba(30, 30, 46, 0.95)',
              border: '1px solid var(--accent)',
              borderRadius: '12px',
              padding: '1.2rem',
              zIndex: 100,
              boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
              textAlign: 'left',
              backdropFilter: 'blur(5px)',
              color: 'var(--text)',
              marginTop: '0.5rem'
            }}>
              <h4 style={{ margin: '0 0 0.8rem 0', color: 'var(--accent)', fontSize: '0.9rem' }}>Comment ça marche ?</h4>
              <p style={{ fontSize: '0.8rem', lineHeight: '1.4', marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                Ce score compare ton activité actuelle à tes habitudes passées (sur 7, 30 et 90 jours).
              </p>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: '0.8rem' }}>
                <li style={{ marginBottom: '6px' }}>
                  🔥 <strong style={{ color: '#d04fd7' }}>&gt; 100% :</strong> Tu progresses ! (Tu en fais plus que d'habitude).
                </li>
                <li style={{ marginBottom: '6px' }}>
                  ✅ <strong style={{ color: '#10b981' }}>100% :</strong> Tu es stable. (Tu maintiens ton rythme).
                </li>
                <li>
                  📉 <strong style={{ color: '#f97316' }}>&lt; 100% :</strong> Tu ralentis. (Moins de volume qu'avant).
                </li>
              </ul>
            </div>
          )}
        </div>

        {/* VALEUR DU SCORE */}
        <div style={{ 
          fontSize: '1.75rem', 
          fontWeight: 800, 
          color: getConsistencyColor(consistency.global), 
          marginTop: '0.2rem' 
        }}>
          {global_val}%
          <span style={{ 
            fontSize: '1rem', 
            fontWeight: 600, 
            marginLeft: '0.5rem', 
            color: 'var(--text-secondary)' 
          }}>
            ({global_comp})
          </span>
        </div>
      </div>

      {/* TAB OVERVIEW */}
      {activeTab === 'overview' && (
        <div>
        <h2 style={{...sectionTitleStyle, marginTop: '2rem'}}>7 Jours</h2>
          {/* GRID DES STATS 7J */}
          <div style={gridStyle}>
            <StatCard
              title="Training Load (7j)"
              value={last7.tss.toFixed(0)}
              unit="TSS"
              comparison={tss_7d_diff}
              onClick={() => handleMetricClick('tss')}
              isExpanded={expandedMetric === 'tss'}
              cardRef={cardRefs.tss}
            />
            <StatCard
              title="Distance (7j)"
              value={last7.distance.toFixed(0)}
              unit="km"
              comparison={dist_7d_diff}
              onClick={() => handleMetricClick('distance')}
              isExpanded={expandedMetric === 'distance'}
              cardRef={cardRefs.distance}
            />
            <StatCard
              title="Dénivelé (7j)"
              value={last7.elevation.toFixed(0)}
              unit="m D+"
              comparison={elev_7d_diff}
              onClick={() => handleMetricClick('elevation')}
              isExpanded={expandedMetric === 'elevation'}
              cardRef={cardRefs.elevation}
            />
            <StatCard
              title="Temps (7j)"
              value={(last7.time / 3600).toFixed(1)}
              unit="h"
              comparison={time_7d_diff}
              onClick={() => handleMetricClick('time')}
              isExpanded={expandedMetric === 'time'}
              cardRef={cardRefs.time}
            />
            <StatCard
              title="Activités (7j)"
              value={last7.count}
              unit="sorties"
              comparison={count_7d_diff}
              onClick={() => handleMetricClick('count')}
              isExpanded={expandedMetric === 'count'}
              cardRef={cardRefs.count}
            />
            <StatCard
              title="Puissance Moy. (7j)"
              value={last7.avg_power.toFixed(0)}
              unit="W"
              comparison={power_7d_diff}
              onClick={() => handleMetricClick('power')}
              isExpanded={expandedMetric === 'power'}
              cardRef={cardRefs.power}
            />
          </div>

          {/* SECTION EXPANDED METRIC */}
          {expandedMetric && (
            <div style={{
              marginTop: '2rem',
              animation: 'expandFromBehind 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}>
              <h3 style={subsectionTitleStyle}>
                {expandedMetric === 'tss' && 'Training Load - Toutes les périodes'}
                {expandedMetric === 'distance' && 'Distance - Toutes les périodes'}
                {expandedMetric === 'elevation' && 'Dénivelé - Toutes les périodes'}
                {expandedMetric === 'time' && 'Temps - Toutes les périodes'}
                {expandedMetric === 'count' && 'Activités - Toutes les périodes'}
                {expandedMetric === 'power' && 'Puissance Moyenne - Toutes les périodes'}
              </h3>
              <div style={gridStyle}>
                {expandedMetric === 'tss' && (
                  <>
                    <StatCard title="TSS (7j)" value={last7.tss.toFixed(0)} unit="TSS" comparison={tss_7d_diff} />
                    <StatCard title="TSS (Mois)" value={month.tss.toFixed(0)} unit="TSS" comparison={tss_month_diff} />
                    <StatCard title="TSS (30j)" value={last30.tss.toFixed(0)} unit="TSS" comparison={tss_30d_diff} />
                    <StatCard title="TSS (90j)" value={last90.tss.toFixed(0)} unit="TSS" comparison={tss_90d_diff} />
                  </>
                )}
                {expandedMetric === 'distance' && (
                  <>
                    <StatCard title="Distance (7j)" value={last7.distance.toFixed(0)} unit="km" comparison={dist_7d_diff} />
                    <StatCard title="Distance (Mois)" value={month.distance.toFixed(0)} unit="km" comparison={dist_month_diff} />
                    <StatCard title="Distance (30j)" value={last30.distance.toFixed(0)} unit="km" comparison={dist_30d_diff} />
                    <StatCard title="Distance (90j)" value={last90.distance.toFixed(0)} unit="km" comparison={dist_90d_diff} />
                  </>
                )}
                {expandedMetric === 'elevation' && (
                  <>
                    <StatCard title="Dénivelé (7j)" value={last7.elevation.toFixed(0)} unit="m D+" comparison={elev_7d_diff} />
                    <StatCard title="Dénivelé (Mois)" value={month.elevation.toFixed(0)} unit="m D+" comparison={elev_month_diff} />
                    <StatCard title="Dénivelé (30j)" value={last30.elevation.toFixed(0)} unit="m D+" comparison={elev_30d_diff} />
                    <StatCard title="Dénivelé (90j)" value={last90.elevation.toFixed(0)} unit="m D+" comparison={elev_90d_diff} />
                  </>
                )}
                {expandedMetric === 'time' && (
                  <>
                    <StatCard title="Temps (7j)" value={(last7.time / 3600).toFixed(1)} unit="h" comparison={time_7d_diff} />
                    <StatCard title="Temps (Mois)" value={(month.time / 3600).toFixed(1)} unit="h" comparison={time_month_diff} />
                    <StatCard title="Temps (30j)" value={(last30.time / 3600).toFixed(1)} unit="h" comparison={time_30d_diff} />
                    <StatCard title="Temps (90j)" value={(last90.time / 3600).toFixed(1)} unit="h" comparison={time_90d_diff} />
                  </>
                )}
                {expandedMetric === 'count' && (
                  <>
                    <StatCard title="Activités (7j)" value={last7.count} unit="sorties" comparison={count_7d_diff} />
                    <StatCard title="Activités (Mois)" value={month.count} unit="sorties" comparison={count_month_diff} />
                    <StatCard title="Activités (30j)" value={last30.count} unit="sorties" comparison={count_30d_diff} />
                    <StatCard title="Activités (90j)" value={last90.count} unit="sorties" comparison={count_90d_diff} />
                  </>
                )}
                {expandedMetric === 'power' && (
                  <>
                    <StatCard title="Puissance (7j)" value={last7.avg_power.toFixed(0)} unit="W" comparison={power_7d_diff} />
                    <StatCard title="Puissance (Mois)" value={month.avg_power.toFixed(0)} unit="W" comparison={power_month_diff} />
                    <StatCard title="Puissance (30j)" value={last30.avg_power.toFixed(0)} unit="W" comparison={power_30d_diff} />
                    <StatCard title="Puissance (90j)" value={last90.avg_power.toFixed(0)} unit="W" comparison={power_90d_diff} />
                  </>
                )}
              </div>
            </div>
          )}

          {/* GRAPHIQUES PRINCIPAUX */}
          <div style={{ marginTop: '3rem' }}>
            <div style={graphGridStyle}>
              <div style={chartWrapperStyle}>
                <TrainingLoadChart dailyTSS={dailyTSS} />
              </div>
              <div style={chartWrapperStyle}>
                <FitnessChart data={data.fitnessData} />
              </div>
            </div>
          </div>

          {/* GRAPHIQUES SECONDAIRES */}
          <div style={{...graphGridStyle, marginTop: '2rem'}}>
            <div style={chartWrapperStyle}>
              <PowerModelChart 
                data={data.powerModel.curve} 
                metrics={data.powerModel.metrics} 
              />
            </div>
            <div style={chartWrapperStyle}>
              <CpCurveChart cpCurve={cpCurve} />
            </div>
          </div>
        </div>
      )}

      {/* TAB STATS */}
      {activeTab === 'stats' && (
        <div>
          {/* EN-TÊTE STATS */}
          

          {/* SECTIONS STATS */}
          <h2 style={{...sectionTitleStyle, marginTop: '2rem'}}>7 Jours</h2>
          <div style={gridStyle}>
            <StatCard title="Training Load" value={last7.tss.toFixed(0)} unit="TSS" comparison={tss_7d_diff} />
            <StatCard title="Distance" value={last7.distance.toFixed(0)} unit="km" comparison={dist_7d_diff} />
            <StatCard title="Dénivelé" value={last7.elevation.toFixed(0)} unit="m D+" comparison={elev_7d_diff} />
            <StatCard title="Temps" value={(last7.time / 3600).toFixed(1)} unit="h" comparison={time_7d_diff} />
            <StatCard title="Activités" value={last7.count} unit="sorties" comparison={count_7d_diff} />
            <StatCard title="Puissance Moy." value={last7.avg_power.toFixed(0)} unit="W" comparison={power_7d_diff} />
          </div>

          <h2 style={{ ...sectionTitleStyle, marginTop: '3rem' }}>Mois en cours</h2>
          <div style={gridStyle}>
            <StatCard title="Training Load" value={month.tss.toFixed(0)} unit="TSS" comparison={tss_month_diff} />
            <StatCard title="Distance" value={month.distance.toFixed(0)} unit="km" comparison={dist_month_diff} />
            <StatCard title="Dénivelé" value={month.elevation.toFixed(0)} unit="m D+" comparison={elev_month_diff} />
            <StatCard title="Temps" value={(month.time / 3600).toFixed(1)} unit="h" comparison={time_month_diff} />
            <StatCard title="Activités" value={month.count} unit="sorties" comparison={count_month_diff} />
            <StatCard title="Puissance Moy." value={month.avg_power.toFixed(0)} unit="W" comparison={power_month_diff} />
          </div>

          <h2 style={{ ...sectionTitleStyle, marginTop: '3rem' }}>30 Jours</h2>
          <div style={gridStyle}>
            <StatCard title="Training Load" value={last30.tss.toFixed(0)} unit="TSS" comparison={tss_30d_diff} />
            <StatCard title="Distance" value={last30.distance.toFixed(0)} unit="km" comparison={dist_30d_diff} />
            <StatCard title="Dénivelé" value={last30.elevation.toFixed(0)} unit="m D+" comparison={elev_30d_diff} />
            <StatCard title="Temps" value={(last30.time / 3600).toFixed(1)} unit="h" comparison={time_30d_diff} />
            <StatCard title="Activités" value={last30.count} unit="sorties" comparison={count_30d_diff} />
            <StatCard title="Puissance Moy." value={last30.avg_power.toFixed(0)} unit="W" comparison={power_30d_diff} />
          </div>

          <h2 style={{ ...sectionTitleStyle, marginTop: '3rem' }}>90 Jours</h2>
          <div style={gridStyle}>
            <StatCard title="Training Load" value={last90.tss.toFixed(0)} unit="TSS" comparison={tss_90d_diff} />
            <StatCard title="Distance" value={last90.distance.toFixed(0)} unit="km" comparison={dist_90d_diff} />
            <StatCard title="Dénivelé" value={last90.elevation.toFixed(0)} unit="m D+" comparison={elev_90d_diff} />
            <StatCard title="Temps" value={(last90.time / 3600).toFixed(1)} unit="h" comparison={time_90d_diff} />
            <StatCard title="Activités" value={last90.count} unit="sorties" comparison={count_90d_diff} />
            <StatCard title="Puissance Moy." value={last90.avg_power.toFixed(0)} unit="W" comparison={power_90d_diff} />
          </div>

          <h2 style={{ ...sectionTitleStyle, marginTop: '3rem' }}>Scores de Régularité</h2>
          <div style={gridStyle}>
            <StatCard title="Régularité (7j)" value={score7j_val} unit="%" comparison={score7j_comp} />
            <StatCard title="Régularité (Mois)" value={scoreMonth_val} unit="%" comparison={scoreMonth_comp} />
            <StatCard title="Régularité (30j)" value={score30j_val} unit="%" comparison={score30j_comp} />
            <StatCard title="Régularité (90j)" value={score90j_val} unit="%" comparison={score90j_comp} />
          </div>
        </div>
      )}

      {/* SECTION ACTIVITÉS RÉCENTES */}
      <div style={{ marginTop: '4rem', width: '100%' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '2rem',
          padding: '0 0.5rem',
        }}>
          <h2 style={{ 
            margin: 0, 
            color: 'var(--text)',
            fontWeight: 700,
            background: 'linear-gradient(135deg, #d04fd7 0%, #ff3c00 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontSize: '2rem',
          }}>
            Activités Récentes (14 jours)
          </h2> 
          <Link href="/activities" style={viewAllLinkStyle}>
            Voir tout →
          </Link>
        </div>

        {recentActivities.length > 0 ? (
          <div style={activitiesGridStyle}>
            {recentActivities.map((activity) => (
              <ActivityCard 
                key={activity.id} 
                activity={activity as ActivityCardData}
                specialBadges={specialBadgesMap}
              />
            ))}
          </div>
        ) : (
          <div style={emptyStateStyle}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }}>🚴‍♂️</div>
            <p style={{ color: 'var(--text-secondary)', margin: '0.5rem 0', fontSize: '1.1rem' }}>
              Aucune activité récente
            </p>
            <button onClick={handleManualRefresh} style={emptyButtonStyle}>
              Rafraîchir les données
            </button>
          </div>
        )}
      </div>

       {newRecords.length > 0 && (
        <NewRecordModal 
            records={newRecords} 
            onClose={() => setNewRecords([])} 
        />
    )}
    </div>
  </div>
);
}

// --- STYLES ---

const actionButtonStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)',
  color: 'var(--text)', padding: '0 1.2rem', height: '42px', borderRadius: '10px',
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
  fontSize: '0.9rem', fontWeight: 600, transition: 'all 0.2s', backdropFilter: 'blur(5px)'
};

const logoutButtonStyle: React.CSSProperties = { ...actionButtonStyle, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444' };

const tabContainerStyle: React.CSSProperties = {
  display: 'flex',
  gap: '1rem',
  marginBottom:'-0.5rem',
  padding: '0.5rem',
  background: 'var(--surface)',
  borderRadius: '12px',
  border: '1px solid var(--secondary)',
};

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  marginLeft: '1rem',
  marginBottom: '1rem',
    color: 'var(--text)',
    fontWeight: 700,
    background: 'linear-gradient(90deg, #d04fd7 0%, #ff6b9d 50%, #FF3C00 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    fontSize: '2rem',
};

const subsectionTitleStyle: React.CSSProperties = {
  fontSize: '1.25rem',
  fontWeight: 600,
  color: 'var(--text)',
  marginBottom: '1rem',
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: '1.25rem',
};



const activitiesGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
  gap: '1.5rem',
  // 🔥 CORRECTION : Suppression de padding ici, il est géré par le JSX
  padding: 0, 
  // 🔥 CORRECTION : S'assurer qu'il prend 100% de la largeur disponible du parent
  width: '100%', 
  alignItems: 'stretch',
};

const emptyStateStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: '4rem 2rem',
  background: 'var(--surface)',
  border: '2px dashed var(--secondary)',
  borderRadius: '12px',
};

const emptyButtonStyle: React.CSSProperties = {
  padding: '0.75rem 1.5rem',
  background: 'var(--accent)',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  fontSize: '0.9rem',
  fontWeight: 600,
  cursor: 'pointer',
  marginTop: '1rem',
  transition: 'all 0.2s ease',
};

const viewAllLinkStyle: React.CSSProperties = {
  color: 'var(--accent)',
  textDecoration: 'none',
  fontSize: '1rem',
  fontWeight: 600,
  transition: 'all 0.2s ease',
  cursor: 'pointer',
};

const chartWrapperStyle: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--secondary)', borderRadius: '12px', padding: '1.5rem', minHeight: '350px' };

const graphGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr', /* Deux colonnes égales */
  gap: '2rem', /* Espace entre les deux graphiques */
  marginTop: '3rem', /* Marge pour séparer des cartes de stats */
  marginBottom: '3rem',
  minHeight: '350px', /* Hauteur minimale pour que les graphiques s'affichent bien */
};

const miniStatStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column' };
const miniStatLabelStyle: React.CSSProperties = { fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '2px' };
const miniStatValueStyle: React.CSSProperties = { fontSize: '1.2rem', fontWeight: 700, color: 'var(--text)', lineHeight: 1 };
const miniStatDividerStyle: React.CSSProperties = { width: '1px', height: '30px', background: 'rgba(255,255,255,0.1)', alignSelf: 'center' };


const connectStravaButtonStyle: React.CSSProperties = { background: '#FC4C02', color: 'white', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' };




