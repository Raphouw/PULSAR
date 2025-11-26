// Fichier : app/api/strava/streams/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { supabaseAdmin } from "../../../../lib/supabaseAdminClient.js";
import { calculateMaxAveragePower } from "../../../../lib/physics";
import { ActivityStreams } from "../../../../types/next-auth";

// ---
// 1. GESTION ROBUSTE DU TOKEN
// ---
async function getValidStravaToken(userId: string) {
  const { data: user, error } = await supabaseAdmin
    .from("users")
    .select("strava_access_token, strava_refresh_token, strava_token_expires_at")
    .eq("id", userId)
    .single();
    
  if (error || !user) throw new Error("Utilisateur non trouvé pour le token Strava.");

  const tokenExpiresAt = new Date(user.strava_token_expires_at).getTime();
  const now = new Date().getTime();
  
  // Buffer de sécurité de 5 minutes
  const BUFFER = 5 * 60 * 1000;

  if (now < (tokenExpiresAt - BUFFER)) {
    return user.strava_access_token;
  }

  console.log("[Strava Streams] Token proche de l'expiration, tentative de rafraîchissement...");
  
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

  const refreshedTokens = await res.json();
  if (!res.ok) {
    console.error("[Strava Streams] Échec du rafraîchissement:", refreshedTokens);
    throw new Error("Impossible de rafraîchir le token Strava.");
  }

  const newExpiresAtISO = new Date(refreshedTokens.expires_at * 1000).toISOString();
  
  await supabaseAdmin
    .from("users")
    .update({
      strava_access_token: refreshedTokens.access_token,
      strava_refresh_token: refreshedTokens.refresh_token,
      strava_token_expires_at: newExpiresAtISO, 
    })
    .eq("id", userId);
    
  return refreshedTokens.access_token;
}

// ---
// 2. HELPER POUR CALCULER LES RECORDS
// ---
const calculateActivityRecords = (
  streams: ActivityStreams,
  userId: string,
  activityId: number,
  activityDate: string
) => {
  // 🔥 CORRECTION TYPE : On s'assure que c'est bien number[] et pas (number|null)[]
  // On remplace les nulls par 0 pour ne pas casser les calculs
  const watts = (streams.watts || []).map(w => w ?? 0);
  const time = (streams.time || []).map(t => t ?? 0);

  // Si pas de watts, inutile de calculer
  if (watts.length === 0 || time.length === 0) return [];

  const durations = [
    { s: 1, type: "P1s" },
    { s: 5, type: "P5s" },
    { s: 30, type: "P30s" },
    { s: 60, type: "P1m" },
    { s: 180, type: "CP3" },
    { s: 300, type: "CP5" },
    { s: 600, type: "CP10" },
    { s: 720, type: "CP12" },
    { s: 1200, type: "CP20" },
    { s: 1800, type: "CP30" },
    { s: 2700, type: "CP45" },
    { s: 3600, type: "CP60" },
    { s: 7200, type: "CP120" },
  ];

  const recordsToInsert: any[] = [];

  for (const dur of durations) {
    // calculateMaxAveragePower accepte maintenant number[] propre
    const maxValue = calculateMaxAveragePower(watts, time, dur.s);
    
    if (maxValue !== null && maxValue > 0) {
      recordsToInsert.push({
        user_id: userId,
        activity_id: activityId,
        type: dur.type,
        duration_s: dur.s,
        value: maxValue,
        date_recorded: activityDate,
      });
    }
  }
  return recordsToInsert;
};

// ---
// 3. LA ROUTE API (POST)
// ---
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    const userId = session.user.id;

    const { strava_id } = await req.json();
    if (!strava_id) {
      return NextResponse.json({ error: "strava_id manquant" }, { status: 400 });
    }

    const accessToken = await getValidStravaToken(userId);

    // 4. APPEL À L'API STRAVA
    console.log(`[Strava Streams] Récupération des streams pour l'activité ${strava_id}...`);
    
    // 🔥 AJOUT DE 'temp' DANS LA REQUÊTE
    const keys = "watts,heartrate,cadence,altitude,latlng,distance,time,temp";
    
    const stravaRes = await fetch(
      `https://www.strava.com/api/v3/activities/${strava_id}/streams?keys=${keys}&key_by_type=true`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!stravaRes.ok) {
      const errorText = await stravaRes.text();
      console.error(`[Strava Streams] Erreur API Strava: ${errorText}`);
      throw new Error(`Échec de la récupération des streams Strava (ID: ${strava_id})`);
    }

    const stravaStreams = await stravaRes.json();

    // 5. FORMATAGE DES STREAMS
    const formattedStreams: ActivityStreams = {
      time: stravaStreams.time?.data || [],
      watts: stravaStreams.watts?.data || [],
      heartrate: stravaStreams.heartrate?.data || [],
      cadence: stravaStreams.cadence?.data || [],
      altitude: stravaStreams.altitude?.data || [],
      latlng: stravaStreams.latlng?.data || [],
      distance: stravaStreams.distance?.data || [],
      // 🔥 AJOUT DE LA TEMPÉRATURE
      temp: stravaStreams.temp?.data || [], 
    };

    // 6. SAUVEGARDE DES STREAMS DANS NOTRE BDD
    const { data: updatedActivity, error: updateError } = await supabaseAdmin
      .from("activities")
      .update({ streams_data: formattedStreams })
      .eq("strava_id", strava_id)
      .eq("user_id", userId) 
      .select("id, start_time") 
      .single();
    
    if (updateError) throw updateError;
    if (!updatedActivity) throw new Error("Activité non trouvée dans la BDD.");

    const internalActivityId = updatedActivity.id;
    const activityDate = updatedActivity.start_time;

    // 7. CALCUL ET SAUVEGARDE DES RECORDS
    const records = calculateActivityRecords(
      formattedStreams,
      userId,
      internalActivityId,
      activityDate
    );

    if (records.length > 0) {
      // Nettoyage des anciens records pour cette activité
      await supabaseAdmin.from("records").delete().eq("activity_id", internalActivityId);
      
      const { error: recordsError } = await supabaseAdmin
        .from("records")
        .insert(records); 
      
      if (recordsError) {
         console.error("[Strava Streams] Erreur sauvegarde records:", recordsError);
      }
    }
    
    console.log(`[Strava Streams] Analyse et sauvegarde terminées pour ${strava_id}.`);
    
    // 8. RENVOYER LES STREAMS AU CLIENT
    return NextResponse.json({ success: true, streams: formattedStreams });

  } catch (err: any) {
    console.error("[Strava Streams] Erreur:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}