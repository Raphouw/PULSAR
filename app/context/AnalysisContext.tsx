'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

type AnalysisContextType = {
  isAnalyzing: boolean;
  progress: { current: number; total: number };
  status: string;
  runDeepAnalysis: () => Promise<void>;
};

const AnalysisContext = createContext<AnalysisContextType | undefined>(undefined);

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [status, setStatus] = useState('');
  const router = useRouter();

  const runDeepAnalysis = async () => {
    if (isAnalyzing) return;
    
    setIsAnalyzing(true);
    setStatus('Initialisation...');
    
    try {
      // 1. Récupérer la liste (SANS force=true pour éviter l'inutile)
      const listRes = await fetch('/api/activities/missing-streams');
      const { activities } = await listRes.json();

      if (!activities || activities.length === 0) {
        setStatus('✅ Tout est à jour !');
        setTimeout(() => setIsAnalyzing(false), 3000);
        return;
      }

      setProgress({ current: 0, total: activities.length });

      // 2. Boucle séquentielle
      for (let i = 0; i < activities.length; i++) {
        const act = activities[i];
        setStatus(`Analyse : ${act.name}`);
        
        try {
            await fetch('/api/strava/streams', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ strava_id: act.strava_id }),
            });
        } catch (e) {
            console.error(e);
        }

        setProgress({ current: i + 1, total: activities.length });
        // Petite pause pour l'API
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      setStatus('Terminé ! Rafraîchissement...');
      router.refresh(); 

    } catch (error) {
      setStatus('Erreur analyse.');
      console.error(error);
    } finally {
      setTimeout(() => {
        setIsAnalyzing(false);
        setStatus('');
      }, 3000);
    }
  };

  return (
    <AnalysisContext.Provider value={{ isAnalyzing, progress, status, runDeepAnalysis }}>
      {children}
      
      {/* LA BARRE FLOTTANTE GLOBALE */}
      {isAnalyzing && (
        <div style={floatingCardStyle}>
          <div style={{ marginBottom: '0.5rem', fontWeight: 'bold', color: '#d04fd7', fontSize: '0.9rem' }}>
            {status}
          </div>
          <div style={progressBgStyle}>
            <div style={{ 
              ...progressFillStyle, 
              width: `${(progress.current / progress.total) * 100}%` 
            }} />
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem', textAlign: 'right' }}>
            {progress.current} / {progress.total}
          </div>
        </div>
      )}
    </AnalysisContext.Provider>
  );
}

export function useAnalysis() {
  const context = useContext(AnalysisContext);
  if (!context) throw new Error('useAnalysis must be used within an AnalysisProvider');
  return context;
}

// --- Styles de la notif flottante ---
const floatingCardStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: '20px',
  right: '20px',
  width: '300px',
  background: 'var(--surface)',
  border: '1px solid var(--accent)',
  borderRadius: '12px',
  padding: '1rem',
  boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
  zIndex: 9999, // Toujours au-dessus
  animation: 'expandIn 0.3s ease-out'
};

const progressBgStyle: React.CSSProperties = {
  width: '100%',
  height: '6px',
  background: 'var(--secondary)',
  borderRadius: '3px',
  overflow: 'hidden',
};

const progressFillStyle: React.CSSProperties = {
  height: '100%',
  background: 'linear-gradient(90deg, #d04fd7, #ff3c00)',
  transition: 'width 0.3s ease',
};