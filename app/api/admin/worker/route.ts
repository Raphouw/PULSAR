//fichier : app\api\admin\worker\route.ts

import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdminClient";

export const dynamic = 'force-dynamic'; // Force le non-cache

// Ce worker est le chef d'orchestre.
export async function GET(req: Request) {
    console.log("🔔 [WORKER START] Le worker s'est réveillé !");

    try {
        // 1. Chercher un job en attente
        const { data: rawJobs, error } = await supabaseAdmin
            .from('admin_jobs')
            .select('*')
            .eq('status', 'pending')
            .in('type', ['global_sync', 'global_detect']) 
            .order('created_at', { ascending: true }) 
            .limit(1);

        if (error) {
            console.error("❌ [WORKER ERROR] Erreur Supabase:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const jobs = rawJobs as any[];

        if (!jobs || jobs.length === 0) {
            console.log("💤 [WORKER SLEEP] Rien à faire.");
            return NextResponse.json({ message: "ZZZ... Aucune mission." });
        }

        const job = jobs[0];
        console.log(`🔥 [WORKER FOUND JOB] ID: ${job.id} | TYPE: ${job.type}`); // <--- ON VEUT VOIR ÇA DANS TES LOGS

        const queue = job.payload?.queue || [];
        const BATCH_SIZE = 5; 
        const batch = queue.slice(0, BATCH_SIZE);
        
        // Gestion fin de job
        if (batch.length === 0) {
            await (supabaseAdmin.from('admin_jobs') as any).update({ status: 'completed', progress: job.total }).eq('id', job.id);
            return NextResponse.json({ message: "Job terminé." });
        }

        // Update status
        await (supabaseAdmin.from('admin_jobs') as any).update({ status: 'processing' }).eq('id', job.id);

        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        let targetApiUrl = "";
        
        // LE ROUTAGE
        if (job.type === 'global_detect') {
            targetApiUrl = `${baseUrl}/api/admin/detect-climbs`;
            console.log(`👉 [ROUTING] Vers DÉTECTION DE COLS (detect-climbs)`);
        } else {
            targetApiUrl = `${baseUrl}/api/admin/scan-single`;
            console.log(`👉 [ROUTING] Vers SYNC SEGMENTS (scan-single)`);
        }

        // Exécution
        await Promise.all(batch.map(async (activityId: number) => {
            try {
                // On log l'URL appelée pour être sûr
                // console.log(`calling ${targetApiUrl} for ${activityId}`); 
                const res = await fetch(targetApiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ activityId })
                });
                if(!res.ok) console.warn(`⚠️ Erreur HTTP ${res.status} sur activité ${activityId}`);
            } catch (e) {
                console.error(`💥 Crash fetch ${activityId}`, e);
            }
        }));

        // Mise à jour job
        const remainingQueue = queue.slice(BATCH_SIZE);
        const newProgress = job.total - remainingQueue.length;
        
        await (supabaseAdmin.from('admin_jobs') as any).update({
            status: remainingQueue.length === 0 ? 'completed' : 'pending',
            progress: newProgress,
            payload: { ...job.payload, queue: remainingQueue }
        }).eq('id', job.id);

        return NextResponse.json({ success: true, type: job.type, processed: batch.length });

    } catch (err: any) {
        console.error("☠️ [WORKER CRITICAL FAIL]", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}