// Fichier : app/api/strava/streams/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { supabaseAdmin } from "../../../../lib/supabaseAdminClient";
import { calculateMaxAveragePower } from "../../../../lib/physics";
import { scanActivityAgainstSegments } from "../../../../lib/segmentScanner";
import { ActivityStreams } from "../../../../types/next-auth";

// ---
// 1. GESTION DU TOKEN STRAVA
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

  console.log("[Strava Streams] Token proche de l'expiration, rafraîchissement...");
  
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
// 2. CALCUL DES RECORDS D'ACTIVITÉ (POWER CURVE)
// ---
const calculateActivityRecords = (
  streams: ActivityStreams,
  userId: string,
  activityId: number,
  activityDate: string
) => {
  const watts = (streams.watts || []).map(w => w ?? 0);
  const time = (streams.time || []).map(t => t ?? 0);

  if (watts.length === 0 || time.length === 0) return [];

  const durations = [
    { s: 1, type: "P1s" }, { s: 5, type: "P5s" }, { s: 30, type: "P30s" },
    { s: 60, type: "P1m" }, { s: 180, type: "CP3" }, { s: 300, type: "CP5" },
    { s: 600, type: "CP10" }, { s: 720, type: "CP12" }, { s: 1200, type: "CP20" },
    { s: 1800, type: "CP30" }, { s: 2700, type: "CP45" }, { s: 3600, type: "CP60" }
  ];

  const recordsToInsert: any[] = [];

  for (const dur of durations) {
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
// 3. ROUTE API POST
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

    console.log(`[Strava Streams] Récupération des données pour l'activité ${strava_id}...`);
    
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

    // Helper pour extraire les données indépendamment du format de réponse de Strava
    const getStreamData = (type: string) => {
        if (stravaStreams[type]?.data) return stravaStreams[type].data;
        if (Array.isArray(stravaStreams)) {
            const found = stravaStreams.find((s: any) => s.type === type);
            return found?.data || [];
        }
        return [];
    };

    const formattedStreams: ActivityStreams = {
      time: getStreamData('time'),
      watts: getStreamData('watts'),
      heartrate: getStreamData('heartrate'),
      cadence: getStreamData('cadence'),
      altitude: getStreamData('altitude'),
      latlng: getStreamData('latlng'),
      distance: getStreamData('distance'),
      temp: getStreamData('temp'), 
    };

    // 4. MISE À JOUR DE L'ACTIVITÉ AVEC LES STREAMS
    const { data: updatedActivity, error: updateError } = await supabaseAdmin
      .from("activities")
      .update({ streams_data: formattedStreams })
      .eq("strava_id", strava_id)
      .eq("user_id", userId) 
      .select("id, start_time") 
      .single();
    
    if (updateError) throw updateError;
    if (!updatedActivity) throw new Error("Activité non trouvée dans la base locale.");

    const internalActivityId = updatedActivity.id;
    const activityDate = updatedActivity.start_time;

    // 5. CALCUL ET SAUVEGARDE DES RECORDS
    const records = calculateActivityRecords(
      formattedStreams,
      userId,
      internalActivityId,
      activityDate
    );

    if (records.length > 0) {
      // Nettoyage des anciens records pour cette activité avant ré-insertion
      await supabaseAdmin.from("records").delete().eq("activity_id", internalActivityId);
      const { error: recordsError } = await supabaseAdmin.from("records").insert(records); 
      if (recordsError) console.error("[Strava Streams] Erreur records:", recordsError);
    }
    
    // 6. 🔥 AUTO-SCAN DES SEGMENTS PULSAR
    // Maintenant que streams_data est présent, on lance l'analyse de segments
    console.log(`[Strava Streams] Analyse automatique des segments pour l'ID ${internalActivityId}`);
    // On ne met pas de await ici pour libérer la réponse HTTP plus vite
    scanActivityAgainstSegments(internalActivityId).catch(e => 
      console.error(`[Strava Streams] Erreur lors du scan de segments:`, e)
    );
    
    return NextResponse.json({ success: true, streams: formattedStreams });

  } catch (err: any) {
    console.error("[Strava Streams] Erreur critique:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}