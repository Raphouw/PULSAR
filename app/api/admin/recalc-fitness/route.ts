import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdminClient";
import { analyzeAndSaveActivity } from "../../../../lib/analysisEngine";

export const dynamic = 'force-dynamic';
export const maxDuration = 300; 

const BATCH_SIZE = 50; 

interface ReportItem {
    userId: number | string;
    name: string;
    status: string;
    processed?: number;
    details?: string[];
}

// État physiologique complet pour le tracking
interface PhysioState {
    ftp: number;
    w_prime: number;
    cp3: number;
    cp12: number;
    model_cp3: number;
    model_cp12: number;
    vo2max: number;
    tte: number;
}

export async function GET(req: Request) {
  const startTime = Date.now();
  console.log(`[Sequencer] 🚀 Démarrage Séquentiel (Smart Persistence V2)...`);

  try {
    const { data: allUsers } = await supabaseAdmin
        .from('users')
        .select('id, name, weight, ftp, w_prime, vo2max, TTE, CP3, CP12') // On charge tout le profil
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

        // 1. Récupération du dernier état CONNU en base (History)
        const { data: lastHistory } = await supabaseAdmin
            .from('user_fitness_history')
            .select('*') // On prend tout
            .eq('user_id', user.id)
            .order('date_calculated', { ascending: false })
            .limit(1)
            .maybeSingle();

        let lastDateISO = '2000-01-01T00:00:00.000Z';
        
        // Initialisation de l'état courant (Priorité : History > User Profile > Defaults)
        let currentState: PhysioState = {
            ftp: lastHistory?.ftp_value ?? user.ftp ?? 200,
            w_prime: lastHistory?.w_prime_value ?? user.w_prime ?? 20000,
            cp3: lastHistory?.cp3_value ?? user.CP3 ?? 0,
            cp12: lastHistory?.cp12_value ?? user.CP12 ?? 0,
            model_cp3: lastHistory?.model_cp3 ?? 0,
            model_cp12: lastHistory?.model_cp12 ?? 0,
            vo2max: lastHistory?.vo2max_value ?? user.vo2max ?? 45,
            tte: lastHistory?.tte_value ?? user.TTE ?? 3600
        };

        if (lastHistory) {
            lastDateISO = lastHistory.date_calculated;
            console.log(`[Sequencer]    Reprise après le ${new Date(lastDateISO).toLocaleDateString()}`);
        } else {
            console.log(`[Sequencer]    Démarrage à zéro.`);
        }

        // 2. Récupération Activités Futures
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
            // Watchdog (max 250s execution pour Vercel)
            if (Date.now() - startTime > 250 * 1000) break;

            const { data: fullAct } = await supabaseAdmin
                .from('activities')
                .select('streams_data')
                .eq('id', partialAct.id)
                .single();

            // A. CHECK STREAMS
            if (!fullAct?.streams_data) {
                // On propage l'état actuel sans changement
                await recordHistorySkip(user.id, partialAct.id, partialAct.start_time, currentState);
                logs.push(`⚠️ Ignoré (Pas de GPS) : ${partialAct.start_time}`);
                continue;
            }

            // B. CHECK WATTS
            const streams = fullAct.streams_data as any;
            const hasWatts = (streams.watts && Array.isArray(streams.watts) && streams.watts.length > 0);

            if (!hasWatts) {
                // Pas de puissance = On propage l'état actuel
                await recordHistorySkip(user.id, partialAct.id, partialAct.start_time, currentState);
                logs.push(`⏩ Skipped (Pas de Watts) : ${partialAct.start_time}`);
                continue; 
            }

            // C. ANALYSE & UPDATE
            const result = await analyzeAndSaveActivity(
                partialAct.id,
                0, // eventId (non utilisé ici)
                streams,
                user.weight || 75,
                currentState.ftp
            );

            if (result.success && result.fitnessUpdate?.success) {
                // MISE À JOUR DE L'ÉTAT COURANT
                const up = result.fitnessUpdate;
                
                // On met à jour l'objet d'état avec les nouvelles valeurs (ou on garde les anciennes si undefined)
                currentState = {
                    ftp: up.newFtp ?? currentState.ftp,
                    w_prime: up.newWPrime ?? currentState.w_prime,
                    cp3: up.newCp3 ?? currentState.cp3,
                    cp12: up.newCp12 ?? currentState.cp12,
                    // Si l'engine ne renvoie pas les modèles brutes, on garde les anciens ou on estime
                    model_cp3: up.newCp3 ?? currentState.model_cp3, 
                    model_cp12: up.newCp12 ?? currentState.model_cp12,
                    vo2max: up.newVo2Max ?? currentState.vo2max,
                    tte: up.newTte ?? currentState.tte
                };

                const dateStr = new Date(partialAct.start_time).toLocaleDateString();
                logs.push(`✅ [${dateStr}] FTP -> ${currentState.ftp}W`);
            } else {
                const reason = result.fitnessUpdate?.message || "Erreur interne";
                // En cas d'échec calcul, on propage l'ancien état pour ne pas casser la timeline
                await recordHistorySkip(user.id, partialAct.id, partialAct.start_time, currentState);
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

// Helper pour insérer l'historique "Skip" en conservant TOUTES les valeurs précédentes
// C'est ça qui empêche les trous (NULLs) dans la base
async function recordHistorySkip(userId: number | string, actId: number, dateISO: string, state: PhysioState) {
    await supabaseAdmin.from('user_fitness_history').insert({
        user_id: userId,
        date_calculated: dateISO,
        source_activity_id: actId,
        // On copie tout l'état
        ftp_value: state.ftp, 
        w_prime_value: state.w_prime,
        cp3_value: state.cp3,
        cp12_value: state.cp12,
        model_cp3: state.model_cp3,
        model_cp12: state.model_cp12,
        vo2max_value: state.vo2max,
        tte_value: state.tte
    });
}