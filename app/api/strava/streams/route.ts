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
  // ⚡ FIX: Conversion de l'ID en Number pour la requête
  const { data: userData, error } = await supabaseAdmin
    .from("users")
    .select("strava_access_token, strava_refresh_token, strava_token_expires_at")
    .eq("id", Number(userId))
    .single();
    
  // ⚡ FIX: Cast en any pour accéder aux propriétés
  const user = userData as any;

  if (error || !user) throw new Error("Utilisateur non trouvé pour le token Strava.");

  const tokenExpiresAt = new Date(user.strava_token_expires_at).getTime();
  const now = new Date().getTime();
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
  if (!res.ok) throw new Error("Impossible de rafraîchir le token Strava.");

  const newExpiresAtISO = new Date(refreshedTokens.expires_at * 1000).toISOString();
  
  // ⚡ FIX: Cast builder update
  await (supabaseAdmin.from("users") as any)
    .update({
      strava_access_token: refreshedTokens.access_token,
      strava_refresh_token: refreshedTokens.refresh_token,
      strava_token_expires_at: newExpiresAtISO, 
    })
    .eq("id", Number(userId));
    
  return refreshedTokens.access_token;
}

// ---
// 2. CALCUL DES RECORDS (POWER CURVE)
// ---

const calculateActivityRecords = (
  streams: ActivityStreams,
  userId: number,
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
    if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    
    const userId = Number(session.user.id);
    const { strava_id } = await req.json();

    if (!strava_id) return NextResponse.json({ error: "strava_id manquant" }, { status: 400 });

    const accessToken = await getValidStravaToken(session.user.id);

    const keys = "watts,heartrate,cadence,altitude,latlng,distance,time,temp";
    const stravaRes = await fetch(
      `https://www.strava.com/api/v3/activities/${strava_id}/streams?keys=${keys}&key_by_type=true`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!stravaRes.ok) throw new Error("Échec Strava Streams API");

    const stravaStreams = await stravaRes.json();

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

    // 4. MISE À JOUR DE L'ACTIVITÉ
    // ⚡ FIX: Cast builder update + select
    const { data: updatedData, error: updateError } = await (supabaseAdmin.from("activities") as any)
      .update({ streams_data: formattedStreams })
      .eq("strava_id", strava_id)
      .eq("user_id", userId) 
      .select("id, start_time") 
      .single();
    
    const updatedActivity = updatedData as any;
    if (updateError || !updatedActivity) throw new Error("Activité introuvable.");

    // 5. CALCUL ET SAUVEGARDE DES RECORDS
    const records = calculateActivityRecords(
      formattedStreams,
      userId,
      updatedActivity.id,
      updatedActivity.start_time
    );

    if (records.length > 0) {
      await (supabaseAdmin.from("records") as any).delete().eq("activity_id", updatedActivity.id);
      await (supabaseAdmin.from("records") as any).insert(records); 
    }
    
    // 6. AUTO-SCAN SEGMENTS
    scanActivityAgainstSegments(updatedActivity.id).catch(e => console.error(e));
    
    return NextResponse.json({ success: true, streams: formattedStreams });

  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}