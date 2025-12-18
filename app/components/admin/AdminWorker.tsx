"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { supabase } from "../../../lib/supabaseClient";

export default function AdminWorker() {
  const { data: session } = useSession();
  const [isProcessing, setIsProcessing] = useState(false);
  const workerTimerRef = useRef<NodeJS.Timeout | null>(null);
  const ADMIN_ID = "1";

  const runWorker = useCallback(async () => {
    if (isProcessing) return;

    try {
      // 1. On cherche un job (Pending ou Processing)
      const { data: jobsData } = await supabase
        .from('admin_jobs')
        .select('*')
        .or('status.eq.pending,status.eq.processing')
        .order('created_at', { ascending: true })
        .limit(1);

      // ⚡ FIX: On cast le résultat en any[] pour éviter l'erreur "never"
      const jobs = (jobsData || []) as any[];
      const activeJob = jobs?.[0];

      // Si pas de job, on ne fait rien (le setInterval relancera plus tard)
      if (!activeJob) return false; // Retourne false pour dire "j'ai rien fait"

      setIsProcessing(true);

      // Si le job était "pending", on le passe en "processing" pour dire à l'UI que ça démarre
      if (activeJob.status === 'pending') {
         // ⚡ FIX: On cast le builder en any pour débloquer l'update
         await (supabase.from('admin_jobs') as any)
            .update({ status: 'processing' })
            .eq('id', activeJob.id);
      }

      const { segmentId, queue } = activeJob.payload;
      const startIdx = activeJob.progress;
      
      // ⚡ TURBO MODE : On passe de 3 à 10 par lot
      const BATCH_SIZE = 10; 
      const endIdx = Math.min(startIdx + BATCH_SIZE, queue.length);
      
      // On prépare les promesses pour lancer les 10 requêtes EN PARALLÈLE
      const promises: Promise<any>[] = [];
      for (let i = startIdx; i < endIdx; i++) {
        const activityId = queue[i];
        if (!activityId) continue;

        // On push la requête dans le tableau sans l'attendre tout de suite
        promises.push(
          fetch("/api/admin/scan-single", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              activityId: activityId, 
              segmentId: segmentId || null 
            }),
          })
        );
      }

      // 💥 On attend que les 10 finissent (Vercel gère très bien 10 requêtes simultanées)
      await Promise.all(promises);

      // Mise à jour de la progression en BDD (Une seule écriture pour 10 items = UI plus fluide)
      const nextProgress = endIdx;
      const isFinished = nextProgress >= queue.length;

      // ⚡ FIX: On cast le builder en any pour débloquer l'update final
      await (supabase.from('admin_jobs') as any)
        .update({ 
            progress: nextProgress, 
            status: isFinished ? 'completed' : 'processing',
            updated_at: new Date().toISOString() 
        })
        .eq('id', activeJob.id);

      setIsProcessing(false);
      return true; // Retourne true pour dire "j'ai bossé, relance-moi vite !"

    } catch (e) {
      console.error("❌ Worker Error:", e);
      setIsProcessing(false);
      return false;
    }
  }, [isProcessing]);

  useEffect(() => {
    if (session?.user && String((session.user as any).id) === ADMIN_ID) {
      console.log("⚙️ Pulsar Admin Worker: TURBO ACTIVE");

      // Boucle intelligente
      const tick = async () => {
        const didWork = await runWorker();
        
        // Si on a bossé, on enchaîne très vite (1s) pour dépiler la queue
        // Si on a rien fait, on dort un peu plus longtemps (5s) pour économiser les ressources
        const delay = didWork ? 1000 : 5000;
        
        workerTimerRef.current = setTimeout(tick, delay);
      };

      // Premier lancement
      tick();

      return () => {
        if (workerTimerRef.current) clearTimeout(workerTimerRef.current);
      };
    }
  }, [session, runWorker]);

  return null;
}