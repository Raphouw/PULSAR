// Fichier : app/api/sync-stream/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import { supabaseAdmin } from "../../../lib/supabaseAdminClient";
import { analyzeAndSaveActivity } from "../../../lib/analysisEngine"; 
import { scanActivityAgainstSegments } from "../../../lib/segmentScanner";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { activityId, stravaId } = await req.json();
    
    // 1. Récupération Token
    const { data: user } = await supabaseAdmin
        .from("users")
        .select("strava_access_token")
        .eq("id", session.user.id)
        .single();

    if (!user) throw new Error("User not found");
    const accessToken = user.strava_access_token; 

    // 2. Fetch Strava
    console.log(`[Sync Stream] 📥 Téléchargement de la télémétrie Strava pour ${stravaId}...`);
    const res = await fetch(
      `https://www.strava.com/api/v3/activities/${stravaId}/streams?keys=time,distance,altitude,latlng,watts,heartrate,cadence,temp&key_by_type=true`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!res.ok) throw new Error("Strava API Error");
    const rawStreams = await res.json();

    // 3. NETTOYAGE
    const extract = (key: string): number[] => {
        if (rawStreams[key]?.data) return rawStreams[key].data;
        if (Array.isArray(rawStreams)) return rawStreams.find((s: any) => s.type === key)?.data || [];
        return [];
    };

    const cleanStreams = {
        time: extract('time'),
        distance: extract('distance'),
        altitude: extract('altitude'),
        latlng: extract('latlng'),
        watts: extract('watts'),
        heartrate: extract('heartrate'),
        cadence: extract('cadence'),
        temp: extract('temp'),
    };

    // --- CORRECTION TYPE --- [cite: 1, 2]
    let avgPower: number | null = null;
    let avgHr: number | null = null;
    let maxHr: number | null = null;

    if (cleanStreams.watts.length > 0) {
        const total = cleanStreams.watts.reduce((a, b) => a + b, 0);
        avgPower = Math.round(total / cleanStreams.watts.length);
    }

    if (cleanStreams.heartrate.length > 0) {
        const totalHr = cleanStreams.heartrate.reduce((a, b) => a + b, 0);
        avgHr = Math.round(totalHr / cleanStreams.heartrate.length);
        maxHr = Math.max(...cleanStreams.heartrate);
    }

    // 4. SAUVEGARDE EN BDD
    console.log(`[Sync Stream] 💾 Enregistrement des flux en base pour l'ID Pulsar ${activityId}...`);
    const { error: updateError } = await supabaseAdmin
        .from('activities')
        .update({ 
            streams_data: cleanStreams,
            avg_power_w: avgPower,
            avg_heartrate: avgHr,
            max_heart_rate: maxHr
        })
        .eq('id', activityId);

    if (updateError) throw updateError;

    // 5. ANALYSE ET SCAN AUTOMATIQUE
    const { data: userProfile } = await supabaseAdmin
        .from('users')
        .select('weight, ftp')
        .eq('id', session.user.id)
        .single();
    
    // A. Records de puissance
    if (typeof analyzeAndSaveActivity === 'function') {
        await analyzeAndSaveActivity(
            activityId, 
            stravaId, 
            cleanStreams as any, 
            userProfile?.weight || 75, 
            userProfile?.ftp || 250
        );
        console.log(`[Sync Stream] ⚡ Analyse de fitness terminée.`);
    }

    // B. 🔥 AUTO-SCAN DES SEGMENTS (Injection Directe) [cite: 3]
    // On passe cleanStreams directement pour éviter le lag BDD
    console.log(`[Sync Stream] 🚀 Déclenchement du scan de segments (AUTO)...`);
    const scanResult = await scanActivityAgainstSegments(activityId, undefined, cleanStreams as any);
    
    if (scanResult.success) {
        console.log(`[Sync Stream] ✅ Scan terminé : ${scanResult.matchesFound} efforts détectés.`);
    } else {
        console.error(`[Sync Stream] ❌ Échec scan auto :`, (scanResult as any).msg || (scanResult as any).error);
    }

    return NextResponse.json({ 
        success: true, 
        streams: cleanStreams,
        matchesFound: scanResult.success ? scanResult.matchesFound : 0 
    });

  } catch (error: any) {
    console.error("!!! [SYNC STREAM CRITICAL ERROR]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}