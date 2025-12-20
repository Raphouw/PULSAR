//fichier : app\api\strava\check-latest\route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { fetchNewStravaActivities, importActivities } from "../import/route";
import { supabaseAdmin } from "../../../../lib/supabaseAdminClient";
import { analyzeAndSaveActivity } from '../../../../lib/analysisEngine';
import { triggerAutoDetection } from "../../../../lib/activityProcessing"; // <--- IMPORT 

export const dynamic = 'force-dynamic';

async function getStravaStreams(activityId: number, accessToken: string) {
  try {
    const types = ['time', 'distance', 'latlng', 'altitude', 'watts', 'heartrate', 'cadence', 'temp'].join(',');
    const response = await fetch(
      `https://www.strava.com/api/v3/activities/${activityId}/streams?keys=${types}&key_by_type=true`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!response.ok) return null;
    return await response.json();
  } catch (e) {
    console.error(`❌ Erreur streams ${activityId}:`, e);
    return null;
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const userId = session.user.id;
    if (!session.access_token) return NextResponse.json({ message: "Pas de token Strava" });

    // 1. Récupérer les nouvelles activités depuis l'API Strava
    const newActivities = await fetchNewStravaActivities(userId, session.access_token);

    if (newActivities.length === 0) {
      return NextResponse.json({ success: true, imported: 0, message: "Déjà à jour.", hasStrava: true });
    }

    // 2. Import initial (création des lignes dans la table activities)
    const importResult = await importActivities(userId, newActivities);

    // 3. Récupération profil
    // ⚡ FIX: Cast du profil utilisateur
    const { data: userData } = await supabaseAdmin.from('users').select('weight, ftp').eq('id', Number(userId)).single();
    const userProfile = userData as any;
    
    let analyzedCount = 0;
    let totalBrokenRecords: any[] = [];
    const newJobActivities: number[] = [];

    // 4. Boucle de traitement des données détaillées (Streams)
    const analysisPromises = newActivities.map(async (stravaActivity: any) => {
        try {
            // ⚡ FIX: Cast de la recherche d'activité
            const { data: dbActivityData } = await supabaseAdmin
                .from('activities').select('id').eq('strava_id', stravaActivity.id).single();

            const dbActivity = dbActivityData as any;
            if (!dbActivity) return;

            const rawStreams = await getStravaStreams(stravaActivity.id, session.access_token!);

            if (rawStreams) {
                const extract = (key: string): number[] => {
                    if (rawStreams[key]?.data) return rawStreams[key].data;
                    if (Array.isArray(rawStreams)) return rawStreams.find((s: any) => s.type === key)?.data || [];
                    return [];
                };

                const cleanStreams = {
                    time: extract('time'), distance: extract('distance'), altitude: extract('altitude'),
                    latlng: extract('latlng'), watts: extract('watts'), heartrate: extract('heartrate'),
                    cadence: extract('cadence'), temp: extract('temp'),
                };

                // Calcul puissance moyenne
                let avgPower: number | null = null;
                if (cleanStreams.watts.length > 0) {
                    avgPower = Math.round(cleanStreams.watts.reduce((a, b) => a + b, 0) / cleanStreams.watts.length);
                }

                // MISE À JOUR BDD
                // ⚡ FIX: Cast builder update
                await (supabaseAdmin.from('activities') as any)
                    .update({ streams_data: cleanStreams, avg_power_w: avgPower })
                    .eq('id', dbActivity.id);

                // Analyse de fitness
                const result = await analyzeAndSaveActivity(
                    dbActivity.id, 
                    stravaActivity.id, 
                    cleanStreams as any, 
                    userProfile?.weight || 75, 
                    userProfile?.ftp || 250
                );

                if (result.success) {
                    analyzedCount++;
                    if (result.brokenRecords?.length > 0) totalBrokenRecords.push(...result.brokenRecords);
                    newJobActivities.push(dbActivity.id);
                    triggerAutoDetection(dbActivity.id);
                }
            }
        } catch (err) {
            console.error(`❌ Erreur analyse ${stravaActivity.name}:`, err);
        }
    });

    await Promise.all(analysisPromises);

    // 5. 🔥 CRÉATION DU JOB DE SCAN
    if (newJobActivities.length > 0) {
        // ⚡ FIX: Cast builder insert
        await (supabaseAdmin.from('admin_jobs') as any).insert({
            type: 'segment_scan',
            status: 'pending',
            total: newJobActivities.length,
            progress: 0,
            payload: { 
                segmentId: null, 
                segmentName: `Nouvel import : ${newJobActivities.length} sortie(s)`,
                queue: newJobActivities 
            },
            created_at: new Date().toISOString()
        });
        console.log(`[Check Latest] 🛰️ ${newJobActivities.length} activités envoyées au registre des missions.`);
    }

    return NextResponse.json({ 
      ...importResult, 
      analyzed: analyzedCount,
      brokenRecords: totalBrokenRecords,
      message: `+${importResult.imported} activités synchronisées.`,
      hasStrava: true 
    });

  } catch (err: any) {
    console.error("💥 [Check Latest Critical Error]:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}