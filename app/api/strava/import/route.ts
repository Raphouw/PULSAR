// Fichier : app/api/strava/import/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { supabaseAdmin } from "../../../../lib/supabaseAdminClient";

type StravaActivity = {
  id: number;
  name: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  type: string;
  sport_type?: string;
  start_date: string;
  timezone: string;
  average_speed: number;
  max_speed: number;
  average_watts?: number;
  weighted_average_watts?: number;
  kilojoules?: number;
  device_watts?: boolean;
  average_heartrate?: number;
  max_heartrate?: number;
  suffer_score?: number;
  map: {
    id: string;
    summary_polyline: string;
  };
  start_latlng?: [number, number];
  end_latlng?: [number, number];
};

// ---
// 1. GESTION DU TOKEN
// ---
async function getValidStravaToken(userId: string, sessionToken?: string) {
  if (sessionToken) return sessionToken;

  const { data: userData, error } = await supabaseAdmin
    .from("users")
    .select("strava_access_token, strava_refresh_token, strava_token_expires_at")
    .eq("id", Number(userId))
    .single();

  // ⚡ FIX: Cast en any pour accéder aux propriétés
  const user = userData as any;

  if (error || !user) {
    throw new Error("Utilisateur non trouvé pour le token Strava.");
  }

  const tokenExpiresAt = new Date(user.strava_token_expires_at).getTime();
  const now = new Date().getTime();

  if (now < tokenExpiresAt) {
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

  const refreshedTokens = await res.json();
  if (!res.ok) throw new Error("Impossible de rafraîchir le token Strava.");

  const newExpiresAtISO = new Date(refreshedTokens.expires_at * 1000).toISOString();
  
  // ⚡ FIX: Cast du builder en any pour l'update
  await (supabaseAdmin.from("users") as any)
    .update({
      strava_access_token: refreshedTokens.access_token,
      strava_refresh_token: refreshedTokens.refresh_token,
      strava_token_expires_at: newExpiresAtISO,
    })
    .eq("id", Number(userId));

  return refreshedTokens.access_token;
}

export async function getLatestLocalActivity(userId: string) {
  const { data: activityData } = await supabaseAdmin
    .from("activities")
    .select("start_time")
    .eq("user_id", Number(userId))
    .order("start_time", { ascending: false })
    .limit(1)
    .maybeSingle();
  
  return (activityData as any) || null;
}

// 3. Récupérer les nouvelles activités
export async function fetchNewStravaActivities(userId: string, sessionToken?: string) {
  const accessToken = await getValidStravaToken(userId, sessionToken);
  const lastLocal = await getLatestLocalActivity(userId);
  
  let after = 0;
  if (lastLocal?.start_time) {
      const lastTime = new Date(lastLocal.start_time).getTime();
      const TWO_WEEKS = 14 * 24 * 60 * 60 * 1000; 
      after = Math.floor((lastTime - TWO_WEEKS) / 1000);
  }

  const { data: existingActivitiesData } = await supabaseAdmin
    .from("activities")
    .select("strava_id")
    .eq("user_id", Number(userId));

  const existingIds = (existingActivitiesData as any[])?.map(a => a.strava_id) || [];

  let page = 1;
  let allActivities: StravaActivity[] = [];

  while (true) {
    const res = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?page=${page}&per_page=100&after=${after}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!res.ok) throw new Error("Erreur récupération activités Strava.");

    const activities: StravaActivity[] = await res.json();
    if (activities.length === 0) break;
    allActivities = allActivities.concat(activities);
    page++;
  }

  return allActivities.filter(act => 
    (act.type === "Ride" || act.type === "VirtualRide" || act.type === "Run" || act.type === "Hike") 
    && !existingIds.includes(act.id)
  );
}

// 4. Importer en base
export async function importActivities(userId: string, activities: StravaActivity[]) {
    if (activities.length === 0) return { success: true, imported: 0 };

   const toUpsert = activities.map(act => ({
        user_id: Number(userId),
        strava_id: act.id,
        name: act.name,
        type: act.type || act.sport_type || "Unknown",
        distance_km: parseFloat((act.distance / 1000).toFixed(2)),
        elevation_gain_m: act.total_elevation_gain,
        duration_s: act.moving_time,
        start_time: act.start_date,
        avg_speed_kmh: parseFloat((act.average_speed * 3.6).toFixed(2)),
        max_speed_kmh: parseFloat((act.max_speed * 3.6).toFixed(2)),
        avg_heartrate: (act.average_heartrate && act.average_heartrate > 0) ? Math.round(act.average_heartrate) : null,
        max_heart_rate: (act.max_heartrate && act.max_heartrate > 0) ? Math.round(act.max_heartrate) : null,
        avg_power_w: act.average_watts || null,
        np_w: act.weighted_average_watts || null,
        tss: act.suffer_score || null,
        calories_kcal: act.kilojoules ? act.kilojoules / 4.184 : null,
        polyline: act.map?.summary_polyline ? { polyline: act.map.summary_polyline } : null,
        lat_start: act.start_latlng?.[0] || null,
        lon_start: act.start_latlng?.[1] || null,
        lat_end: act.end_latlng?.[0] || null,
        lon_end: act.end_latlng?.[1] || null
    }));

    // ⚡ FIX: Cast du builder en any pour l'upsert
    const { error } = await (supabaseAdmin.from("activities") as any)
        .upsert(toUpsert, { onConflict: "strava_id" });

    if (error) throw new Error(error.message);
    return { success: true, imported: toUpsert.length };
}

// ---
// 2. LA ROUTE API
// ---
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const userId = session.user.id;
    const nowInSeconds = Math.floor(Date.now() / 1000);
    const bufferTime = 300; 
    
    let accessToken: string;
    if (session.access_token && session.expires_at && session.expires_at > (nowInSeconds - bufferTime)) {
      accessToken = session.access_token;
    } else {
      accessToken = await getValidStravaToken(userId);
    }

    let lastActivityTimestamp = 0;
    const { data: lastActivityData } = await supabaseAdmin
      .from("activities")
      .select("start_time")
      .eq("user_id", Number(userId))
      .order("start_time", { ascending: false })
      .limit(1)
      .maybeSingle();
    
    const lastActivity = lastActivityData as any;

    if (lastActivity && lastActivity.start_time) {
      lastActivityTimestamp = Math.floor(new Date(lastActivity.start_time).getTime() / 1000);
    }

    let allNewActivities: StravaActivity[] = [];
    let page = 1;
    const afterParam = `&after=${lastActivityTimestamp}`;

    while (true) {
      const stravaRes = await fetch(
        `https://www.strava.com/api/v3/athlete/activities?page=${page}&per_page=100${afterParam}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (!stravaRes.ok) throw new Error("Échec Strava API.");

      const activities: StravaActivity[] = await stravaRes.json();
      if (activities.length === 0) break;
      allNewActivities = allNewActivities.concat(activities);
      page++;
    }

    if (allNewActivities.length === 0) {
      return NextResponse.json({ success: true, imported: 0 });
    }

    const activitiesToUpsert = allNewActivities
      .filter(act => {
          const t = act.type || "";
          const st = act.sport_type || "";
          return (
             t.includes("Ride") || st.includes("Ride") || 
             t === "Run" || st === "Run" ||               
             t === "Walk" || t === "Hike" ||                               
             t === "VirtualRun" || t.includes("Ski")
          );
      })
      .map(act => ({
        user_id: Number(userId),
        strava_id: act.id,
        name: act.name,
        type: act.type || act.sport_type || "Unknown",
        distance_km: parseFloat((act.distance / 1000).toFixed(2)),
        elevation_gain_m: act.total_elevation_gain,
        duration_s: act.moving_time, 
        start_time: act.start_date,
        avg_speed_kmh: parseFloat((act.average_speed * 3.6).toFixed(2)),
        max_speed_kmh: parseFloat((act.max_speed * 3.6).toFixed(2)),
        avg_power_w: act.average_watts || null,
        np_w: act.weighted_average_watts || null,
        tss: act.suffer_score || null,
        calories_kcal: act.kilojoules ? act.kilojoules / 4.184 : null,
        polyline: act.map?.summary_polyline ? { polyline: act.map.summary_polyline } : null,
      }));

    if (activitiesToUpsert.length === 0) {
        return NextResponse.json({ success: true, imported: 0 });
    }

    // ⚡ FIX: Cast du builder en any pour l'upsert
    const { error: upsertError } = await (supabaseAdmin.from("activities") as any)
      .upsert(activitiesToUpsert, { onConflict: 'strava_id' });

    if (upsertError) throw upsertError;

    return NextResponse.json({ success: true, imported: activitiesToUpsert.length });

  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}