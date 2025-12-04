// Fichier : app/api/strava/backfill/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { supabaseAdmin } from "../../../../lib/supabaseAdminClient";
import { analyzeAndSaveActivity } from "../../../../lib/analysisEngine";

export const dynamic = 'force-dynamic';

// --- HELPER TOKEN (Requis ici aussi) ---
async function getValidStravaToken(userId: string) {
  const { data: user } = await supabaseAdmin.from("users").select("strava_access_token, strava_refresh_token, strava_token_expires_at").eq("id", userId).single();
  if (!user) throw new Error("User not found");

  const now = Date.now();
  if (now < new Date(user.strava_token_expires_at).getTime()) return user.strava_access_token;

  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST", headers: { "Content-Type": "application/json" },
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
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = session.user.id;

    // 1. Trouver UNE activité incomplète (streams_data est NULL)
    // On priorise les plus récentes pour l'UX
    const { data: activity } = await supabaseAdmin
      .from('activities')
      .select('id, strava_id, name')
      .eq('user_id', userId)
      .is('streams_data', null) 
      .not('strava_id', 'is', null)
      .order('start_time', { ascending: false }) 
      .limit(1)
      .single();

    // S'il n'y a rien à traiter, on arrête proprement (200 OK, done: true)
    if (!activity) {
      return NextResponse.json({ done: true, message: "Tout est synchronisé." });
    }

    console.log(`📥 [Backfill] Traitement de : ${activity.name}`);
    const token = await getValidStravaToken(userId);

    // 2. Télécharger Strava
    const types = ['time', 'watts', 'heartrate', 'cadence', 'altitude', 'distance', 'latlng', 'temp'].join(',');
    const streamRes = await fetch(
      `https://www.strava.com/api/v3/activities/${activity.strava_id}/streams?keys=${types}&key_by_type=true`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!streamRes.ok) {
        // Si l'activité est introuvable sur Strava (404), on la marque comme "traitée" (vide) pour ne pas boucler
        if (streamRes.status === 404) {
            await supabaseAdmin.from('activities').update({ streams_data: {} }).eq('id', activity.id);
            return NextResponse.json({ done: false, message: "Activité introuvable sur Strava, ignorée." });
        }
        throw new Error(`Strava Error: ${streamRes.statusText}`);
    }

    const rawStreams = await streamRes.json();

    // 3. 🔥 NETTOYAGE & EXTRACTION (Le Fix Anti-4093)
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

    // 4. 🔥 CALCULS LOCAUX (Sécurité BDD)
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

    // 5. SAUVEGARDE EN BASE
    await supabaseAdmin
        .from('activities')
        .update({ 
            streams_data: cleanStreams, // Le JSON propre
            avg_power_w: avgPower,      // La vraie moyenne
            avg_heartrate: avgHr,
            max_heart_rate: maxHr
        })
        .eq('id', activity.id);

    // 6. LANCER L'ANALYSE AVANCÉE (Records)
    // On le fait après l'update pour être sûr que la BDD est propre
    const { data: userProfile } = await supabaseAdmin.from('users').select('weight, ftp').eq('id', userId).single();
    
    if (typeof analyzeAndSaveActivity === 'function') {
        await analyzeAndSaveActivity(
            activity.id, 
            activity.strava_id, 
            cleanStreams, // On passe les données PROPRES
            userProfile?.weight || 75, 
            userProfile?.ftp || 250
        );
    }

    // 7. Compter ce qu'il reste à faire pour la barre de progression
    const { count } = await supabaseAdmin
        .from('activities')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .is('streams_data', null)
        .not('strava_id', 'is', null);

    return NextResponse.json({ 
        done: false, 
        processed: activity.name, 
        remaining: count || 0 
    });

  } catch (error: any) {
    console.error("Backfill Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}