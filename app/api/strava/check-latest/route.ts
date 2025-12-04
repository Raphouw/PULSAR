// Fichier : app/api/strava/check-latest/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { fetchNewStravaActivities, importActivities } from "../import/route";
import { supabaseAdmin } from "../../../../lib/supabaseAdminClient";
import { analyzeAndSaveActivity } from '../../../../lib/analysisEngine'; 

export const dynamic = 'force-dynamic';

// --- HELPER CRITIQUE : NETTOYAGE DES STREAMS ---
const cleanStravaStreams = (raw: any) => {
    // Fonction qui extrait le tableau [1, 2, 3] depuis l'objet complexe Strava
    const extract = (key: string) => {
        // Cas A : Format { watts: { data: [...] } }
        if (raw[key]?.data) return raw[key].data;
        // Cas B : Format [{ type: 'watts', data: [...] }]
        if (Array.isArray(raw)) return raw.find((s: any) => s.type === key)?.data || [];
        return []; // Vide si non trouvé
    };

    return {
        time: extract('time'),
        distance: extract('distance'),
        altitude: extract('altitude'),
        latlng: extract('latlng'),
        watts: extract('watts'),
        heartrate: extract('heartrate'),
        cadence: extract('cadence'),
        temp: extract('temp'),
    };
};

// Récupération API Strava
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
    if (!session.access_token) return NextResponse.json({ message: "Pas de token" });

    // 1. Récupération Strava
    const newActivities = await fetchNewStravaActivities(userId, session.access_token);

    if (newActivities.length === 0) {
      return NextResponse.json({ success: true, imported: 0, message: "À jour.", hasStrava: true });
    }

    // 2. Création des lignes en BDD (Stats vides au début)
    const importResult = await importActivities(userId, newActivities);

    // 3. ANALYSE PROFONDE ET CORRECTION DES DONNÉES
    const { data: userProfile } = await supabaseAdmin.from('users').select('weight, ftp').eq('id', userId).single();
    
    let analyzedCount = 0;
    let totalBrokenRecords: any[] = [];

    const analysisPromises = newActivities.map(async (stravaActivity: any) => {
        try {
            // A. On récupère l'ID BDD
            const { data: dbActivity } = await supabaseAdmin
                .from('activities').select('id').eq('strava_id', stravaActivity.id).single();

            if (!dbActivity) return;

            // B. On télécharge les streams
            const rawStreams = await getStravaStreams(stravaActivity.id, session.access_token!);

            if (rawStreams) {
                // 🔥 LA CORRECTION EST ICI : ON NETTOIE AVANT D'ENVOYER
                const cleanStreams = cleanStravaStreams(rawStreams);

                // C. On envoie les données PROPRES au moteur
                const result = await analyzeAndSaveActivity(
                    dbActivity.id, 
                    stravaActivity.id, 
                    cleanStreams, // <--- ICI
                    userProfile?.weight || 75, 
                    userProfile?.ftp || 250
                );
                
                // D. On sauvegarde aussi les streams propres pour les graphes
                await supabaseAdmin.from('activities')
                    .update({ streams_data: cleanStreams })
                    .eq('id', dbActivity.id);

                if (result.success) {
                    analyzedCount++;
                    if (result.brokenRecords?.length > 0) totalBrokenRecords.push(...result.brokenRecords);
                }
            }
        } catch (err) {
            console.error(`❌ Erreur analyse ${stravaActivity.name}:`, err);
        }
    });

    await Promise.all(analysisPromises);

    return NextResponse.json({ 
      ...importResult, 
      analyzed: analyzedCount,
      brokenRecords: totalBrokenRecords,
      message: `+${importResult.imported} activités.`,
      hasStrava: true 
    });

  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}