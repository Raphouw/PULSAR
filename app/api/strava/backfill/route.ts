import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { supabaseAdmin } from "../../../../lib/supabaseAdminClient";
import { analyzeAndSaveActivity } from "../../../../lib/analysisEngine";

export const dynamic = 'force-dynamic';

// --- Helper Token (Inchangé) ---
async function getValidStravaToken(userId: string, sessionToken?: string) {
  if (sessionToken) return sessionToken;

  const { data: user } = await supabaseAdmin
    .from("users")
    .select("strava_access_token, strava_refresh_token, strava_token_expires_at")
    .eq("id", userId)
    .single();

  if (!user) throw new Error("User not found");

  const now = Date.now();
  if (now < new Date(user.strava_token_expires_at).getTime()) {
    return user.strava_access_token;
  }

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
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = session.user.id;
    const token = await getValidStravaToken(userId, session.access_token);

    // 1. 🔥 NOUVELLE STRATÉGIE : Trouver une activité sans 'streams_data'
    // On ignore le TSS ici. On veut juste remplir les streams manquants.
    const { data: activity } = await supabaseAdmin
      .from('activities')
      .select('id, strava_id, name, start_time')
      .eq('user_id', userId)
      .is('streams_data', null) // <--- CIBLE LA DONNÉE BRUTE MANQUANTE
      .not('strava_id', 'is', null)
      .order('start_time', { ascending: false }) 
      .limit(1)
      .single();

    // S'il n'y a plus rien à traiter
    if (!activity) {
      return NextResponse.json({ done: true, message: "Toutes les streams sont téléchargées." });
    }

    console.log(`📥 [Backfill] Téléchargement streams pour : ${activity.name} (${activity.strava_id})`);

    // 2. Télécharger les streams depuis Strava
    const types = ['time', 'watts', 'heartrate', 'cadence', 'altitude', 'distance', 'latlng'].join(',');
    const streamRes = await fetch(
      `https://www.strava.com/api/v3/activities/${activity.strava_id}/streams?keys=${types}&key_by_type=true`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (streamRes.status === 429) {
      return NextResponse.json({ error: "Rate Limit Strava" }, { status: 429 });
    }

    if (!streamRes.ok) {
        console.error(`Erreur Stream ${activity.strava_id}: ${streamRes.statusText}`);
        // Optionnel : Si l'activité est morte sur Strava, on pourrait mettre un flag pour l'ignorer
        return NextResponse.json({ error: "Stream fetch error", activityId: activity.id }, { status: 500 });
    }

    const streams = await streamRes.json();

    // 3. 🔥 SAUVEGARDE CRITIQUE : On stocke le JSON brut
    // C'est ça qui empêchera la boucle infinie. La prochaine requête verra que streams_data n'est plus null.
    const { error: saveError } = await supabaseAdmin
        .from('activities')
        .update({ streams_data: streams })
        .eq('id', activity.id);

    if (saveError) {
        console.error("Erreur sauvegarde streams:", saveError);
        throw new Error("Impossible de sauvegarder les streams");
    }

    // 4. Lancer le Moteur Physique (Recalcul et Homogénéisation)
    // Cela va écraser le TSS/Power existant avec TA formule
    const { data: userProfile } = await supabaseAdmin.from('users').select('weight, ftp').eq('id', userId).single();
    
    const analysis = await analyzeAndSaveActivity(
        activity.id, 
        activity.strava_id, 
        streams, 
        userProfile?.weight || 75, 
        userProfile?.ftp || 250
    );

    // 5. Compter le reste (Basé sur streams_data null)
    const { count } = await supabaseAdmin
        .from('activities')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .is('streams_data', null) // <--- Compte ce qui reste
        .not('strava_id', 'is', null);

    return NextResponse.json({ 
        done: false, 
        processed: activity.name, 
        remaining: count || 0,
        analysisResult: analysis
    });

  } catch (error: any) {
    console.error("Backfill Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}