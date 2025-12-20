import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdminClient";

// Ce worker est le chef d'orchestre. Il gère TOUS les types de missions.
export async function GET(req: Request) {
    try {
        // 1. Chercher un job en attente (peu importe le type)
        const { data: rawJobs } = await supabaseAdmin
            .from('admin_jobs')
            .select('*')
            .eq('status', 'pending')
            .in('type', ['global_sync', 'global_detect']) // On accepte les deux types !
            .order('created_at', { ascending: true }) // FIFO (Premier arrivé, premier servi)
            .limit(1);

        const jobs = rawJobs as any[];

        if (!jobs || jobs.length === 0) {
            return NextResponse.json({ message: "ZZZ... Aucune mission en attente." });
        }

        const job = jobs[0];
        const queue = job.payload?.queue || [];
        
        // 2. Traiter un petit lot (Batch)
        const BATCH_SIZE = 5;
        const batch = queue.slice(0, BATCH_SIZE);
        
        // Si le job est vide/fini
        if (batch.length === 0) {
            await (supabaseAdmin.from('admin_jobs') as any).update({ status: 'completed', progress: job.total }).eq('id', job.id);
            return NextResponse.json({ message: "Mission terminée chef." });
        }

        // 3. Update status: Processing
        await (supabaseAdmin.from('admin_jobs') as any).update({ status: 'processing' }).eq('id', job.id);

        const jobTypeLabel = job.type === 'global_detect' ? '🕵️‍♂️ Chasseur' : '⏱️ Synchro';
        console.log(`[WORKER] ${jobTypeLabel} | Batch de ${batch.length} activités...`);
        
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

        // 4. 🔥 LE ROUTAGE INTELLIGENT
        // On choisit l'URL en fonction du type de job
        const targetApiUrl = job.type === 'global_detect' 
            ? `${baseUrl}/api/admin/detect-climbs` // NOUVEAU SYSTÈME
            : `${baseUrl}/api/admin/scan-single`;  // ANCIEN SYSTÈME (Segments Officiels)

        // Exécution parallèle
        await Promise.all(batch.map(async (activityId: number) => {
            try {
                const res = await fetch(targetApiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ activityId })
                });
                
                if(!res.ok) console.warn(`[WORKER] Erreur HTTP ${res.status} sur activité ${activityId}`);
                
            } catch (e) {
                console.error(`[WORKER] Crash sur activité ${activityId}`, e);
            }
        }));

        // 5. Mise à jour du job
        const remainingQueue = queue.slice(BATCH_SIZE);
        const newProgress = job.total - remainingQueue.length;
        
        const updatePayload = {
            status: remainingQueue.length === 0 ? 'completed' : 'pending',
            progress: newProgress,
            payload: { ...job.payload, queue: remainingQueue }
        };

        await (supabaseAdmin.from('admin_jobs') as any).update(updatePayload).eq('id', job.id);

        return NextResponse.json({ 
            success: true, 
            type: job.type,
            processed: batch.length, 
            remaining: remainingQueue.length 
        });

    } catch (err: any) {
        console.error("[WORKER CRITICAL ERROR]", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}