// fichier : app/components/admin/AdminWorker.tsx

"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { supabase } from "../../../lib/supabaseClient";

interface AdminJob {
  id: number;
  type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  total: number;
  payload: {
    segmentName?: string;
    queue: number[];
  };
  created_at: string;
}

export default function AdminWorker() {
  const { data: session } = useSession();
  const [isProcessing, setIsProcessing] = useState(false);
  const workerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(false);
  const ADMIN_ID = "1";

  // Configuration
  const BATCH_SIZE = 5; // On traite 5 activités par "tick"
  const POLL_INTERVAL_IDLE = 3000;
  const POLL_INTERVAL_ACTIVE = 500;

  useEffect(() => {
    isMountedRef.current = true;

    const tick = async () => {
      if (!isMountedRef.current || isProcessing) return;

      try {
        // 1. Chercher un job
        const { data: jobsData } = await supabase
          .from('admin_jobs')
          .select('*')
          .in('status', ['pending', 'processing'])
          .in('type', ['global_sync', 'global_detect'])
          .order('created_at', { ascending: true })
          .limit(1);

        const jobs = jobsData as AdminJob[] | null;

        if (!jobs || jobs.length === 0) {
          scheduleNextTick(POLL_INTERVAL_IDLE);
          return;
        }

        const job = jobs[0];

        // 2. Job terminé ?
        if (job.progress >= job.total) {
          await (supabase.from('admin_jobs') as any).update({ status: 'completed' }).eq('id', job.id);
          scheduleNextTick(POLL_INTERVAL_ACTIVE);
          return;
        }

        // 3. Processing
        setIsProcessing(true);
        // console.log(`⚙️ [WORKER] Job #${job.id} batch [${job.progress} - ${Math.min(job.progress + BATCH_SIZE, job.total)}]`);

        const queue = job.payload.queue || [];
        const startIdx = job.progress;
        const endIdx = Math.min(startIdx + BATCH_SIZE, queue.length);
        const batchIds = queue.slice(startIdx, endIdx);

        if (batchIds.length === 0) {
           await (supabase.from('admin_jobs') as any).update({ status: 'completed' }).eq('id', job.id);
           finishCycle();
           return;
        }

        const endpoint = job.type === 'global_detect' ? "/api/admin/detect-climbs" : "/api/admin/scan-single";
        
        // Exécution en parallèle du batch
        await Promise.all(batchIds.map(async (actId) => {
            if (!isMountedRef.current) return;
            try {
                await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ activityId: actId, segmentId: (job.payload as any).segmentId })
                });
            } catch (e) {
                console.error(`Erreur fetch act ${actId}`, e);
            }
        }));

        // Mise à jour progrès
        if (isMountedRef.current) {
            const nextProgress = endIdx;
            const nextStatus = nextProgress >= job.total ? 'completed' : 'pending';

            await (supabase.from('admin_jobs') as any)
                .update({ 
                    progress: nextProgress, 
                    status: nextStatus,
                    updated_at: new Date().toISOString() 
                })
                .eq('id', job.id);
        }

        finishCycle();

      } catch (e) {
        console.error("❌ Worker Crash:", e);
        finishCycle();
      }
    };

    const finishCycle = () => {
        if (isMountedRef.current) {
            setIsProcessing(false);
            scheduleNextTick(POLL_INTERVAL_ACTIVE);
        }
    };

    const scheduleNextTick = (delay: number) => {
        if (workerRef.current) clearTimeout(workerRef.current);
        if (isMountedRef.current) {
            workerRef.current = setTimeout(tick, delay);
        }
    };

    if (session?.user && String((session.user as any).id) === ADMIN_ID) {
        // console.log("🟢 Admin Worker: STARTED");
        tick();
    }

    return () => {
        // console.log("🛑 Admin Worker: STOPPED");
        isMountedRef.current = false;
        if (workerRef.current) clearTimeout(workerRef.current);
    };
  }, [session]);

  return null;
}