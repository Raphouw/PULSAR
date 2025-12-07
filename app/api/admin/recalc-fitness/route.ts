import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdminClient";
import { analyzeAndSaveActivity } from "../../../../lib/analysisEngine";

export const dynamic = 'force-dynamic';
export const maxDuration = 300; 

const BATCH_SIZE = 50; // On augmente un peu car on va skipper vite les sans-watts

interface ReportItem {
    userId: number | string;
    name: string;
    status: string;
    processed?: number;
    details?: string[];
}

export async function GET(req: Request) {
  const startTime = Date.now();
  console.log(`[Sequencer] 🚀 Démarrage Séquentiel (Smart Watt Detection)...`);

  try {
    const { data: allUsers } = await supabaseAdmin
        .from('users')
        .select('id, name, weight, ftp')
        .order('id', { ascending: true });

    if (!allUsers) throw new Error("Aucun user trouvé");

    const report: ReportItem[] = []; 
    let workDoneInThisRun = false;

    for (const user of allUsers) {
        if (workDoneInThisRun) {
            report.push({ userId: user.id, name: user.name, status: "En attente..." });
            continue;
        }

        console.log(`\n[Sequencer] 👤 Analyse de ${user.name} (ID: ${user.id})...`);

        // Récup dernière date
        const { data: lastHistory } = await supabaseAdmin
            .from('user_fitness_history')
            .select('date_calculated, ftp_value')
            .eq('user_id', user.id)
            .order('date_calculated', { ascending: false })
            .limit(1)
            .maybeSingle();

        let lastDateISO = '2000-01-01T00:00:00.000Z';
        let currentFtp = user.ftp || 200; 

        if (lastHistory) {
            lastDateISO = lastHistory.date_calculated;
            currentFtp = lastHistory.ftp_value;
            console.log(`[Sequencer]    Reprise après le ${new Date(lastDateISO).toLocaleDateString()}`);
        } else {
            console.log(`[Sequencer]    Démarrage à zéro.`);
        }

        // Récupération Activités Futures
        const { data: nextActivities } = await supabaseAdmin
            .from('activities')
            .select('id, name, start_time')
            .eq('user_id', user.id)
            .gt('start_time', lastDateISO) 
            .order('start_time', { ascending: true }) 
            .limit(BATCH_SIZE); 

        if (!nextActivities || nextActivities.length === 0) {
            console.log(`[Sequencer]    ✅ User à jour.`);
            report.push({ userId: user.id, name: user.name, status: "COMPLETED ✅" });
            continue; 
        }

        console.log(`[Sequencer]    ▶️ ${nextActivities.length} activités à scanner...`);
        workDoneInThisRun = true;
        const logs: string[] = [];

        for (const partialAct of nextActivities) {
            if (Date.now() - startTime > 250 * 1000) break;

            const { data: fullAct } = await supabaseAdmin
                .from('activities')
                .select('streams_data')
                .eq('id', partialAct.id)
                .single();

            // 1. CHECK STREAMS EXISTENCE
            if (!fullAct?.streams_data) {
                await recordHistorySkip(user.id, partialAct.id, partialAct.start_time, currentFtp);
                logs.push(`⚠️ Ignoré (Pas de GPS) : ${partialAct.start_time}`);
                continue;
            }

            // 2. CHECK WATTS (CRUCIAL)
            // On vérifie si le tableau 'watts' existe et n'est pas vide
            const streams = fullAct.streams_data as any;
            const hasWatts = (streams.watts && Array.isArray(streams.watts) && streams.watts.length > 0);

            if (!hasWatts) {
                // Pas de puissance = Pas de calcul de FTP possible.
                // On enregistre quand même l'historique pour "passer" cette date.
                await recordHistorySkip(user.id, partialAct.id, partialAct.start_time, currentFtp);
                logs.push(`⏩ Skipped (Pas de Watts) : ${partialAct.start_time}`);
                continue; 
            }

            // 3. ANALYSE (Seulement si Watts présents)
            const result = await analyzeAndSaveActivity(
                partialAct.id,
                0,
                streams,
                user.weight || 75,
                currentFtp
            );

            if (result.success && result.fitnessUpdate?.success) {
                const { newFtp } = result.fitnessUpdate;
                currentFtp = newFtp;
                const dateStr = new Date(partialAct.start_time).toLocaleDateString();
                logs.push(`✅ [${dateStr}] FTP -> ${newFtp}W`);
            } else {
                const reason = result.fitnessUpdate?.message || "Erreur interne";
                await recordHistorySkip(user.id, partialAct.id, partialAct.start_time, currentFtp);
                logs.push(`❌ Échec (${reason}) : ${partialAct.start_time}`);
            }
        }

        report.push({ 
            userId: user.id, 
            name: user.name, 
            status: "EN COURS ⏳", 
            processed: logs.length,
            details: logs 
        });
        break; 
    }

    const isTotallyFinished = !workDoneInThisRun;

    return NextResponse.json({
        success: true,
        status: isTotallyFinished ? "ALL_DONE" : "PARTIAL",
        message: isTotallyFinished ? "✅ Tous les utilisateurs sont à jour !" : "⚠️ TRAITEMENT EN COURS : Veuillez rafraîchir la page.",
        report
    });

  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Helper pour insérer l'historique "Skip" et faire avancer le curseur de date
async function recordHistorySkip(userId: number | string, actId: number, dateISO: string, ftp: number) {
    await supabaseAdmin.from('user_fitness_history').insert({
        user_id: userId,
        date_calculated: dateISO,
        ftp_value: ftp, 
        w_prime_value: 20000, // Valeur par défaut
        source_activity_id: actId
    });
}