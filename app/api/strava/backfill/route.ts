// Fichier : app/api/strava/backfill/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { supabaseAdmin } from "../../../../lib/supabaseAdminClient";
import { analyzeAndSaveActivity } from "../../../../lib/analysisEngine";
import { scanActivityAgainstSegments } from "../../../../lib/segmentScanner"; 

export const dynamic = 'force-dynamic';

// --- HELPER TOKEN ---
async function getValidStravaToken(userId: string) {
  const { data: user } = await supabaseAdmin
    .from("users")
    .select("strava_access_token, strava_refresh_token, strava_token_expires_at")
    .eq("id", userId)
    .single();

  if (!user) throw new Error("User not found");

  const now = Date.now();
  const expiresAt = new Date(user.strava_token_expires_at).getTime();

  if (now < expiresAt) return user.strava_access_token;

  console.log(`[Backfill] 🔄 Rafraîchissement du token pour l'user ${userId}...`);
  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: user.strava_refresh_token,
    }),
  });

  const tokens = await res.json();
  if (!res.ok) throw new Error("Token refresh failed");

  await supabaseAdmin.from("users").update({
    strava_access_token: tokens.access_token,
    strava_refresh_token: tokens.refresh_token,
    strava_token_expires_at: new Date(tokens.expires_at * 1000).toISOString(),
  }).eq("id", userId);

  return tokens.access_token;
}

export async function GET(req: Request) {
  console.log(">>> [BACKFILL] Démarrage du cycle de synchronisation...");

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = session.user.id;

    // 1. Trouver l'activité suivante à traiter
    const { data: activity, error: fetchError } = await supabaseAdmin
      .from('activities')
      .select('id, strava_id, name')
      .eq('user_id', userId)
      .is('streams_data', null) 
      .not('strava_id', 'is', null)
      .order('start_time', { ascending: false }) 
      .limit(1)
      .single();

    if (fetchError || !activity) {
      console.log("[Backfill] ✅ Toutes les activités sont à jour.");
      return NextResponse.json({ done: true, message: "Synchronisation terminée." });
    }

    console.log(`[Backfill] 📥 Traitement de : "${activity.name}" (ID Pulsar: ${activity.id})`);
    const token = await getValidStravaToken(userId);

    // 2. Récupération des Streams Strava
    const types = ['time', 'watts', 'heartrate', 'cadence', 'altitude', 'distance', 'latlng', 'temp'].join(',');
    const streamRes = await fetch(
      `https://www.strava.com/api/v3/activities/${activity.strava_id}/streams?keys=${types}&key_by_type=true`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!streamRes.ok) {
        if (streamRes.status === 404) {
            console.warn(`[Backfill] ⚠️ Activité ${activity.strava_id} introuvable sur Strava (404).`);
            await supabaseAdmin.from('activities').update({ streams_data: {} }).eq('id', activity.id);
            return NextResponse.json({ done: false, message: "Activité 404 ignorée." });
        }
        throw new Error(`Strava API Error: ${streamRes.statusText}`);
    }

    const rawStreams = await streamRes.json();
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
        temp: extract('temp')
    };

    console.log(`[Backfill] 📊 Données extraites : ${cleanStreams.latlng.length} points GPS.`);

    // 3. Calculs des moyennes pour l'update
    let avgPower: number | null = null;
    let avgHr: number | null = null;
    let maxHr: number | null = null;

    if (cleanStreams.watts.length > 0) {
        avgPower = Math.round(cleanStreams.watts.reduce((a, b) => a + b, 0) / cleanStreams.watts.length);
    }
    if (cleanStreams.heartrate.length > 0) {
        avgHr = Math.round(cleanStreams.heartrate.reduce((a, b) => a + b, 0) / cleanStreams.heartrate.length);
        maxHr = Math.max(...cleanStreams.heartrate);
    }

    // 4. Mise à jour BDD (Streams + Stats)
    const { error: updateError } = await supabaseAdmin
        .from('activities')
        .update({ 
            streams_data: cleanStreams,
            avg_power_w: avgPower,
            avg_heartrate: avgHr,
            max_heart_rate: maxHr
        })
        .eq('id', activity.id);

    if (updateError) {
        console.error(`[Backfill] ❌ Erreur Update BDD:`, updateError.message);
        throw updateError;
    }
    console.log(`[Backfill] 💾 Streams enregistrés en base.`);

    // 5. Analyse Fitness & Records (Ancien moteur)
    if (typeof analyzeAndSaveActivity === 'function') {
        const { data: userProfile } = await supabaseAdmin.from('users').select('weight, ftp').eq('id', userId).single();
        await analyzeAndSaveActivity(
            activity.id, 
            activity.strava_id as any, 
            cleanStreams as any, 
            userProfile?.weight || 75, 
            userProfile?.ftp || 250
        );
        console.log(`[Backfill] ⚡ Analyse fitness terminée.`);
    }

    // 6. 🔥 AUTO-SCAN DES SEGMENTS (Nouveau moteur PULSAR)
    console.log(`[Backfill] 🚀 Lancement du scanner de segments (Injection Directe)...`);
    
    // On passe cleanStreams directement pour éviter le lag d'indexation de la BDD
    const scanResult = await scanActivityAgainstSegments(activity.id, undefined, cleanStreams as any);
    
    if (scanResult.success) {
        console.log(`[Backfill] ✅ Scan réussi : ${scanResult.matchesFound} efforts détectés.`);
    } else {
        console.error(`[Backfill] ❌ Échec du scan auto :`, (scanResult as any).msg || (scanResult as any).error);
    }

    // 7. Calcul du reste à faire pour l'UI
    const { count } = await supabaseAdmin
        .from('activities')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .is('streams_data', null)
        .not('strava_id', 'is', null);

    console.log(`[Backfill] --- Fin du traitement. Restant : ${count || 0} ---`);

    return NextResponse.json({ 
        done: false, 
        processed: activity.name, 
        remaining: count || 0,
        scanMatches: scanResult.success ? scanResult.matchesFound : 0
    });

  } catch (error: any) {
    console.error("!!! [BACKFILL CRITICAL ERROR]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}