// Fichier : app/api/strava/import/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { supabaseAdmin } from "../../../../lib/supabaseAdminClient.js";

// Type simple pour la réponse de l'API Strava
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
  // 🔥 AJOUTE CES DEUX LIGNES ICI
  start_latlng?: [number, number];
  end_latlng?: [number, number];
};

// ---
// 1. GESTION ROBUSTE DU TOKEN (MODIFIÉE pour accepter un token externe)
// ---
async function getValidStravaToken(userId: string, sessionToken?: string) {
  // Si un token de session est fourni, on l'utilise directement
  if (sessionToken) {
    console.log("[Strava Import] Utilisation du token de session");
    return sessionToken;
  }

  // 1. Récupérer le token actuel de l'utilisateur depuis la BDD
  const { data: user, error } = await supabaseAdmin
    .from("users")
    .select("strava_access_token, strava_refresh_token, strava_token_expires_at")
    .eq("id", userId)
    .single();

  if (error || !user) {
    throw new Error("Utilisateur non trouvé pour le token Strava.");
  }

  // 2. Vérifier si le token est expiré
  const tokenExpiresAt = new Date(user.strava_token_expires_at).getTime();
  const now = new Date().getTime();

  if (now < tokenExpiresAt) {
    return user.strava_access_token; // Le token est valide
  }

  // 3. Le token est expiré, il faut le rafraîchir
  console.log("[Strava Import] Token expiré, tentative de rafraîchissement...");
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
    console.error("[Strava Import] Échec du rafraîchissement:", refreshedTokens);
    throw new Error("Impossible de rafraîchir le token Strava.");
  }

  // 4. Mettre à jour la BDD avec les nouveaux tokens
  const newExpiresAtISO = new Date(refreshedTokens.expires_at * 1000).toISOString();
  await supabaseAdmin
    .from("users")
    .update({
      strava_access_token: refreshedTokens.access_token,
      strava_refresh_token: refreshedTokens.refresh_token,
      strava_token_expires_at: newExpiresAtISO,
    })
    .eq("id", userId);

  console.log("[Strava Import] Token rafraîchi avec succès.");
  return refreshedTokens.access_token;
}

export async function getLatestLocalActivity(userId: string) {
  const { data } = await supabaseAdmin
    .from("activities")
    .select("start_time")
    .eq("user_id", userId)
    .order("start_time", { ascending: false })
    .limit(1)
    .single();
  return data || null;
}

// 3. Récupérer toutes les nouvelles activités Strava depuis la dernière importée
// MODIFIÉE pour accepter un token de session
export async function fetchNewStravaActivities(userId: string, sessionToken?: string) {
  const accessToken = await getValidStravaToken(userId, sessionToken);

  // 1️⃣ Récupérer la dernière activité locale
  const lastLocal = await getLatestLocalActivity(userId);
  
  // 🔥 CORRECTION ICI : On ajoute un "Buffer" de sécurité (Chevauchement)
  // Au lieu de prendre strictement la date de fin, on recule de 14 jours.
  // Cela permet de retrouver des activités supprimées récemment ou oubliées.
 let after = 0;
  if (lastLocal?.start_time) {
      const lastTime = new Date(lastLocal.start_time).getTime();
      // On revient 14 jours en arrière
      const TWO_WEEKS = 14 * 24 * 60 * 60 * 1000; 
      after = Math.floor((lastTime - TWO_WEEKS) / 1000);
  }

  // 2️⃣ Récupérer tous les strava_id déjà présents en base (pour filtrer les doublons)
  const { data: existingActivities } = await supabaseAdmin
    .from("activities")
    .select("strava_id")
    .eq("user_id", userId);

  const existingIds = existingActivities?.map(a => a.strava_id) || [];

  // 3️⃣ Récupérer les activités Strava (Boucle de pagination)
  let page = 1;
  const perPage = 100;
  let allActivities: StravaActivity[] = [];

  while (true) {
    const res = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?page=${page}&per_page=${perPage}&after=${after}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!res.ok) throw new Error("Erreur récupération activités Strava.");

    const activities: StravaActivity[] = await res.json();
    if (activities.length === 0) break;

    allActivities = allActivities.concat(activities);
    page++;
  }

  // 4️⃣ Filtrer : On garde Rides/Run QUI NE SONT PAS DÉJÀ en BDD
  // C'est ici que la magie opère : l'activité supprimée n'étant plus dans 'existingIds', elle va repasser !
  const newActivities = allActivities
    .filter(act => 
        (act.type === "Ride" || act.type === "VirtualRide" || act.type === "Run" || act.type === "Hike") 
        && !existingIds.includes(act.id)
    );

  return newActivities;
}

// 4. Importer en base
export async function importActivities(userId: string, activities: StravaActivity[]) {
    if (activities.length === 0) return { success: true, imported: 0 };

   const toUpsert = activities.map(act => ({
        user_id: userId,
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
        
        // 🔥 INJECTION DES COORDONNÉES DE BASE (Start/End)
        // Cela permet au trigger de fonctionner et au filtrage géographique d'être actif de suite
        lat_start: act.start_latlng?.[0] || null,
        lon_start: act.start_latlng?.[1] || null,
        lat_end: act.end_latlng?.[0] || null,
        lon_end: act.end_latlng?.[1] || null
    }));

    const { error } = await supabaseAdmin
        .from("activities")
        .upsert(toUpsert, { onConflict: "strava_id" });

    if (error) throw new Error(error.message);

    return { success: true, imported: toUpsert.length };
}

// ---
// 2. LA ROUTE API (Fusionnée)
// ---
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    console.log("[Strava Import] Session reçue:", {
      userId: session?.user?.id,
      hasAccessToken: !!session?.access_token,
      hasRefreshToken: !!session?.refresh_token,
      expires_at: session?.expires_at
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const userId = session.user.id;

    // 🔥 CORRECTION : Vérifier si on a un token de session valide
    const nowInSeconds = Math.floor(Date.now() / 1000);
    const bufferTime = 300; // 5 minutes de buffer
    
    let accessToken: string;
    
    if (session.access_token && session.expires_at && session.expires_at > (nowInSeconds - bufferTime)) {
      // Utiliser le token de session s'il est valide
      console.log("[Strava Import] Utilisation du token de session frais");
      accessToken = session.access_token;
    } else {
      // Sinon, utiliser la méthode traditionnelle avec la BDD
      console.log("[Strava Import] Token de session expiré, utilisation de la BDD");
      accessToken = await getValidStravaToken(userId);
    }

    // ---
    // 3. LOGIQUE "DELTA" (Prise de ton code)
    // ---
    let lastActivityTimestamp = 0;
    const { data: lastActivity } = await supabaseAdmin
      .from("activities")
      .select("start_time")
      .eq("user_id", userId)
      .order("start_time", { ascending: false })
      .limit(1)
      .single();

    if (lastActivity && lastActivity.start_time) {
      lastActivityTimestamp = Math.floor(new Date(lastActivity.start_time).getTime() / 1000);
    } else {
      console.log("[Strava Import] Première importation (ou table vide).");
    }

    // ---
    // 4. BOUCLE D'IMPORT (Mon code, plus robuste)
    // ---
    let allNewActivities: StravaActivity[] = [];
    let page = 1;
    const perPage = 100;
    const afterParam = `&after=${lastActivityTimestamp}`; // Ne prend que ce qui est NOUVEAU

    while (true) {
      console.log(`[Strava Import] Récupération de la page ${page} (après ${lastActivityTimestamp})...`);
      
      const stravaRes = await fetch(
        `https://www.strava.com/api/v3/athlete/activities?page=${page}&per_page=${perPage}${afterParam}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (!stravaRes.ok) {
        throw new Error("Échec de la récupération des activités Strava.");
      }

      const activities: StravaActivity[] = await stravaRes.json();
      if (activities.length === 0) {
        break; // Plus de nouvelles activités, on sort de la boucle
      }

      allNewActivities = allNewActivities.concat(activities);
      page++;
    }

    if (allNewActivities.length === 0) {
      return NextResponse.json({ success: true, imported: 0, message: "Aucune nouvelle activité trouvée." });
    }

    // ---
    // 5. MAPPAGE (Corrigé pour ta BDD)
    // ---
    const activitiesToUpsert = allNewActivities
      .filter(act => {
          // Filtre : on garde tout ce qui ressemble à du sport (Vélo, CAP, Marche, Rando, Ski)
          const t = act.type || "";
          const st = act.sport_type || "";
          
          // Si tu veux TOUT garder, retire simplement ce bloc .filter()
          return (
             t.includes("Ride") || st.includes("Ride") || 
             t === "Run" || st === "Run" ||               
             t === "Walk" ||                              
             t === "Hike" ||                              
             t === "VirtualRun" ||
             t === "AlpineSki" || 
             t === "BackcountrySki" ||
             t === "NordicSki"
          );
      })
      .map(act => ({
        user_id: userId,
        strava_id: act.id,
        name: act.name,
        type: act.type || act.sport_type || "Unknown",
        distance_km: parseFloat((act.distance / 1000).toFixed(2)),
        elevation_gain_m: act.total_elevation_gain,
        duration_s: act.moving_time, 
        start_time: act.start_date,
        
        // Pour la vitesse, Strava renvoie des m/s. 
        // En CAP, on préfère souvent min/km, mais ici on stocke en km/h pour l'uniformité BDD
        avg_speed_kmh: parseFloat((act.average_speed * 3.6).toFixed(2)),
        max_speed_kmh: parseFloat((act.max_speed * 3.6).toFixed(2)),
        
        // Puissance : Souvent null pour la CAP (sauf si capteur Stryd)
        avg_power_w: act.average_watts || null,
        np_w: act.weighted_average_watts || null,
        
        // TSS : S'appelle souvent "suffer_score" ou "training_load" chez Strava
        tss: act.suffer_score || null,
        
        calories_kcal: act.kilojoules ? act.kilojoules / 4.184 : null,
        polyline: act.map?.summary_polyline ? { polyline: act.map.summary_polyline } : null,
      }));

      if (activitiesToUpsert.length === 0) {
        return NextResponse.json({ success: true, imported: 0, message: "Aucune activité correspondante trouvée." });
    }

    // ---
    // 6. UPSERT (Corrigé pour ta BDD)
    // ---
    const { error: upsertError } = await supabaseAdmin
      .from("activities")
      .upsert(activitiesToUpsert, { 
        onConflict: 'strava_id' // <-- CORRECTION: 'strava_id'
      });

    if (upsertError) {
      console.error("[Strava Import] Erreur Upsert:", upsertError);
      throw new Error("Erreur lors de la sauvegarde des activités.");
    }

    return NextResponse.json({ success: true, imported: activitiesToUpsert.length });

  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}