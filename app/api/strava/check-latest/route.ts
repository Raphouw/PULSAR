// Fichier : app/api/strava/check-latest/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { fetchNewStravaActivities, importActivities } from "../import/route";
import { supabaseAdmin } from "../../../../lib/supabaseAdminClient";
// On importe le moteur d'analyse que je t'ai fait créer
import { analyzeAndSaveActivity } from '../../../../lib/analysisEngine'; 

export const dynamic = 'force-dynamic';

// --- HELPER : Récupération des streams (Données brutes) ---
async function getStravaStreams(activityId: number, accessToken: string) {
  try {
const types = ['time', 'distance', 'latlng', 'altitude', 'watts', 'heartrate', 'cadence', 'temp'].join(',');    const response = await fetch(
      `https://www.strava.com/api/v3/activities/${activityId}/streams?keys=${types}&key_by_type=true`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    
    if (!response.ok) return null;
    return await response.json();
  } catch (e) {
    console.error(`❌ Erreur streams pour ${activityId}:`, e);
    return null;
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    console.log("[Check-Latest] Session reçue:", {
      userId: session?.user?.id,
      hasAccessToken: !!session?.access_token,
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const userId = session.user.id;

    if (!session.access_token || !session.refresh_token) {
      return NextResponse.json({ 
        success: true, 
        imported: 0, 
        message: "Aucun compte Strava lié",
        hasStrava: false 
      }, { status: 200 });
    }

    // Vérifier expiration token
    const nowInSeconds = Math.floor(Date.now() / 1000);
    const bufferTime = 300; 
    
    if (session.expires_at && session.expires_at < (nowInSeconds - bufferTime)) {
      return NextResponse.json({ 
        error: "Token Strava expiré",
        needsReauth: true,
        hasStrava: true 
      }, { status: 401 });
    }

    // 1. Récupérer les nouvelles activités depuis Strava
    const newActivities = await fetchNewStravaActivities(
      userId, 
      session.access_token 
    );

    if (newActivities.length === 0) {
      return NextResponse.json({ 
        success: true, 
        imported: 0, 
        message: "Aucune nouvelle activité.",
        hasStrava: true 
      });
    }

    // 2. Importer les métadonnées de base en BDD
    // (Cela crée les lignes dans la table 'activities' mais laisse TSS/Records vides)
    const importResult = await importActivities(userId, newActivities);

    // 3. 🔥 ANALYSE PROFONDE IMMÉDIATE 🔥
    // On récupère le profil utilisateur pour les calculs (Poids / FTP)
    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('weight, ftp')
      .eq('id', userId)
      .single();

    const userWeight = userProfile?.weight || 75;
    const userFtp = userProfile?.ftp || 250;

    let analyzedCount = 0;
    let totalBrokenRecords: any[] = [];

    // On boucle sur les activités fraîchement récupérées
    // Note : On utilise Promise.all pour paralléliser et aller plus vite (attention aux limites API si > 50 activités)
    const analysisPromises = newActivities.map(async (stravaActivity: any) => {
        try {
            // A. Retrouver l'ID interne (PULSAR ID) via le Strava ID
            const { data: dbActivity } = await supabaseAdmin
                .from('activities')
                .select('id')
                .eq('strava_id', stravaActivity.id)
                .single();

            if (!dbActivity) return;

            // B. Télécharger les Streams (Watts, Temps...)
            const streams = await getStravaStreams(stravaActivity.id, session.access_token!);

            if (streams) {
                // C. Lancer le Moteur Physique (Calcul TSS + Records + Update BDD)
                const result = await analyzeAndSaveActivity(
                    dbActivity.id, 
                    stravaActivity.id, 
                    streams, 
                    userWeight, 
                    userFtp
                );
                if (result.success) {
                    analyzedCount++;
                    // On ajoute les records battus à la liste globale
                    if (result.brokenRecords.length > 0) {
                        totalBrokenRecords.push(...result.brokenRecords);
                    }
                }
              }
        } catch (err) {
            console.error(`❌ Erreur analyse post-import ${stravaActivity.name}:`, err);
        }
    });

    await Promise.all(analysisPromises);

    console.log(`✅ [Check-Latest] ${importResult.imported} importées, ${analyzedCount} analysées complètement.`);

    return NextResponse.json({ 
      ...importResult, 
      analyzed: analyzedCount,
      brokenRecords: totalBrokenRecords,
      message: `${importResult.imported} activité(s) importée(s) et analysée(s).`,
      hasStrava: true 
    });

  } catch (err: any) {
    console.error("[Check-Latest] Erreur critique:", err);
    
    if (err.message.includes("401") || err.message.includes("token")) {
      return NextResponse.json({ 
        error: "Token Strava invalide",
        needsReauth: true,
        hasStrava: true 
      }, { status: 401 });
    }
    
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}