'use client';

import { useBackfill } from '../../app/context/BackfillContext';
import { useState, useEffect, useMemo } from 'react';

export default function GlobalStatusBar() {
  const { isBackfilling, status, progress, stopBackfill, startBackfill } = useBackfill();
  const [visible, setVisible] = useState(false);

  // 🔥 CALCUL DU TEMPS RESTANT ESTIMÉ
  const estimatedTime = useMemo(() => {
    if (!progress.remaining) return null;
    
    // On prend 6.2s par activité pour être large (6s délai + ~200ms réseau)
    const secondsLeft = progress.remaining * 6.2; 
    
    if (secondsLeft < 60) {
        return "< 1 min";
    }
    
    const minutes = Math.floor(secondsLeft / 60);
    const hours = Math.floor(minutes / 60);
    const minsRemaining = minutes % 60;

    if (hours > 0) {
        return `~${hours}h ${minsRemaining}m`;
    }
    
    return `~${minutes} min`;
  }, [progress.remaining]);

  useEffect(() => {
    if (status === 'running' || status === 'paused' || status === 'error') {
        setVisible(true);
    } else if (status === 'completed') {
        const t = setTimeout(() => setVisible(false), 5000);
        return () => clearTimeout(t);
    }
  }, [status]);

  if (!visible) return null;

  return (
    <div style={barContainerStyle}>
      <div style={contentStyle}>
        
        {/* Icône animée */}
        <div style={iconContainerStyle}>
            {status === 'running' && <span style={spinStyle}>⚡</span>}
            {status === 'paused' && <span>⏸️</span>}
            {status === 'error' && <span>❌</span>}
            {status === 'completed' && <span>✅</span>}
        </div>

        {/* Texte Principal */}
        <div style={textContainerStyle}>
            <div style={titleStyle}>SYNCHRONISATION PROFONDE</div>
            <div style={subTitleStyle}>
                {status === 'running' && `Analyse de : ${progress.lastProcessed || 'Chargement...'}`}
                {status === 'paused' && `Pause (Limite API Strava). Reprise auto.`}
                {status === 'error' && `Erreur de synchronisation.`}
                {status === 'completed' && `Terminé ! Toutes les activités sont à jour.`}
            </div>
        </div>

        {/* 🔥 BLOC INFO : Compteur + Temps */}
        {status === 'running' && (
            <div style={infoGroupStyle}>
                <div style={counterStyle}>
                    Reste: <span style={{color: '#fff'}}>{progress.remaining}</span>
                </div>
                {estimatedTime && (
                    <div style={timeStyle}>
                        Fin dans : <span style={{color: '#d04fd7'}}>{estimatedTime}</span>
                    </div>
                )}
            </div>
        )}

        {/* Bouton Stop/Resume */}
        <div style={{ marginLeft: 'auto' }}>
            {status === 'running' ? (
                <button onClick={stopBackfill} style={buttonStyle}>PAUSE</button>
            ) : status === 'paused' || status === 'error' ? (
                <button onClick={startBackfill} style={buttonStyle}>REPRENDRE</button>
            ) : (
                <button onClick={() => setVisible(false)} style={buttonStyle}>FERMER</button>
            )}
        </div>
      </div>
      
      {status === 'running' && <div style={progressLineStyle} />}
    </div>
  );
}

// --- Styles ---
const barContainerStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '90%',
    maxWidth: '650px', // Un peu plus large pour le temps
    background: 'rgba(10, 10, 15, 0.95)',
    border: '1px solid #d04fd7',
    borderRadius: '12px',
    boxShadow: '0 0 20px rgba(208, 79, 215, 0.3)',
    zIndex: 9999,
    overflow: 'hidden',
    backdropFilter: 'blur(10px)',
    animation: 'slideUp 0.3s ease-out'
};

const contentStyle: React.CSSProperties = {
    padding: '1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
};

const iconContainerStyle: React.CSSProperties = {
    fontSize: '1.5rem',
    flexShrink: 0
};

const textContainerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minWidth: 0 // Pour que le text-overflow fonctionne
};

// 🔥 Nouveau conteneur pour grouper le compteur et le temps
const infoGroupStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '0.2rem',
    marginRight: '1rem',
    flexShrink: 0
};

const titleStyle: React.CSSProperties = {
    fontSize: '0.75rem',
    fontWeight: 800,
    color: '#d04fd7',
    textTransform: 'uppercase',
    letterSpacing: '1px'
};

const subTitleStyle: React.CSSProperties = {
    fontSize: '0.85rem',
    color: '#a0a0a0',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
};

const counterStyle: React.CSSProperties = {
    fontSize: '0.85rem',
    color: '#a0a0a0',
    fontWeight: 600,
    background: 'rgba(255,255,255,0.05)',
    padding: '0.1rem 0.5rem',
    borderRadius: '4px',
    textAlign: 'right'
};

const timeStyle: React.CSSProperties = {
    fontSize: '0.75rem',
    color: '#a0a0a0',
    fontWeight: 500,
    textAlign: 'right'
};

const buttonStyle: React.CSSProperties = {
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.2)',
    color: '#fff',
    fontSize: '0.7rem',
    fontWeight: 700,
    padding: '0.4rem 0.8rem',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap'
};

const spinStyle: React.CSSProperties = {
    display: 'inline-block',
    animation: 'spin 1s linear infinite'
};

const progressLineStyle: React.CSSProperties = {
    height: '2px',
    width: '100%',
    background: 'linear-gradient(90deg, transparent, #d04fd7, transparent)',
    animation: 'scan 2s linear infinite',
    position: 'absolute',
    bottom: 0,
    left: 0
};