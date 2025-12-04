'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';

type BackfillContextType = {
  isBackfilling: boolean;
  startBackfill: () => void;
  stopBackfill: () => void;
  progress: { remaining: number; lastProcessed: string | null };
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
};

const BackfillContext = createContext<BackfillContextType | undefined>(undefined);

export const BackfillProvider = ({ children }: { children: React.ReactNode }) => {
  const { data: session } = useSession();
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [status, setStatus] = useState<'idle' | 'running' | 'paused' | 'completed' | 'error'>('idle');
  const [progress, setProgress] = useState<{ remaining: number; lastProcessed: string | null }>({ remaining: 0, lastProcessed: null });
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Délai entre chaque requête pour respecter les limites (6s = 10 requêtes/min = 150/15min => Safe car limite = 300)
  const SAFETY_DELAY_MS = 6000; 

  const processNext = useCallback(async () => {
    if (!mountedRef.current || status === 'paused') return;

    try {
      const res = await fetch('/api/strava/backfill');
      
      if (res.status === 429) {
        console.warn("⚠️ Rate Limit Strava atteint. Pause de 15 min.");
        setStatus('paused');
        // Retry dans 15 minutes
        timerRef.current = setTimeout(() => {
            setStatus('running');
            processNext();
        }, 15 * 60 * 1000);
        return;
      }

      if (!res.ok) throw new Error('Network error');

      const data = await res.json();

      if (data.done) {
        setStatus('completed');
        setIsBackfilling(false);
      } else {
        setProgress({ remaining: data.remaining, lastProcessed: data.processed });
        // Boucle récursive avec délai
        timerRef.current = setTimeout(processNext, SAFETY_DELAY_MS);
      }

    } catch (err) {
      console.error("Backfill halted:", err);
      setStatus('error');
      setIsBackfilling(false);
    }
  }, [status]);

  const startBackfill = () => {
    if (status === 'running') return;
    setStatus('running');
    setIsBackfilling(true);
    processNext();
  };

  const stopBackfill = () => {
    setStatus('paused');
    setIsBackfilling(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Auto-start si on détecte qu'il manque des données (Optionnel, à déclencher manuellement via Dashboard pour l'instant)
  
  return (
    <BackfillContext.Provider value={{ isBackfilling, startBackfill, stopBackfill, progress, status }}>
      {children}
    </BackfillContext.Provider>
  );
};

export const useBackfill = () => {
  const context = useContext(BackfillContext);
  if (!context) throw new Error("useBackfill must be used within a BackfillProvider");
  return context;
};