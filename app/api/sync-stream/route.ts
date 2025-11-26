// Fichier : app/api/sync-stream/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import { supabaseAdmin } from "../../../lib/supabaseAdminClient";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { activityId, stravaId } = await req.json();
    
    // 1. Récupérer le Token (Même logique que l'autre fichier)
    const { data: user } = await supabaseAdmin
      .from("users")
      .select("strava_access_token, strava_refresh_token, strava_token_expires_at")
      .eq("id", session.user.id)
      .single();

    if (!user) throw new Error("User not found");
    
    // (Logique de refresh token simplifiée ici, idéalement factorisée)
    let accessToken = user.strava_access_token;
    if (new Date().getTime() > new Date(user.strava_token_expires_at).getTime()) {
        const tokenRes = await fetch("https://www.strava.com/oauth/token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                client_id: process.env.STRAVA_CLIENT_ID,
                client_secret: process.env.STRAVA_CLIENT_SECRET,
                grant_type: "refresh_token",
                refresh_token: user.strava_refresh_token,
            }),
        });
        const tokens = await tokenRes.json();
        if (tokens.access_token) {
            accessToken = tokens.access_token;
            await supabaseAdmin.from("users").update({
                strava_access_token: tokens.access_token,
                strava_refresh_token: tokens.refresh_token,
                strava_token_expires_at: new Date(tokens.expires_at * 1000).toISOString()
            }).eq("id", session.user.id);
        }
    }

    // 2. Appel Strava
    // On demande explicitement key_by_type=true pour éviter les tableaux mélangés
    const res = await fetch(
      `https://www.strava.com/api/v3/activities/${stravaId}/streams?keys=time,distance,altitude,latlng,watts,heartrate,cadence,temp&key_by_type=true`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!res.ok) throw new Error("Failed to fetch streams from Strava");
    
    const stravaStreams = await res.json();

    // 🔥 LE FIX EST ICI : Parsing Sécurisé (comme dans l'autre fichier)
    const getStreamData = (type: string) => {
        if (stravaStreams[type]?.data) return stravaStreams[type].data;
        if (Array.isArray(stravaStreams)) {
            const found = stravaStreams.find((s: any) => s.type === type);
            return found?.data || [];
        }
        return [];
    };

    const streams = {
        time: getStreamData('time'),
        distance: getStreamData('distance'),
        altitude: getStreamData('altitude'),
        latlng: getStreamData('latlng'),
        watts: getStreamData('watts'),
        heartrate: getStreamData('heartrate'),
        cadence: getStreamData('cadence'),
        temp: getStreamData('temp'),
    };

    // 3. Sauvegarde (Update sans écraser les autres champs)
    await supabaseAdmin
        .from('activities')
        .update({ streams_data: streams })
        .eq('id', activityId);

    return NextResponse.json({ success: true, streams });

  } catch (error: any) {
    console.error("[Sync Stream] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}