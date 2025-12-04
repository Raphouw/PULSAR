// Fichier : app/api/sync-stream/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import { supabaseAdmin } from "../../../lib/supabaseAdminClient";
import { analyzeAndSaveActivity } from "../../../lib/analysisEngine"; // Si dispo, sinon on fera l'update manuel

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { activityId, stravaId } = await req.json();
    
    // 1. Récup Token (Simplifié pour la réponse)
    const { data: user } = await supabaseAdmin.from("users").select("strava_access_token").eq("id", session.user.id).single();
    if (!user) throw new Error("User not found");
    const accessToken = user.strava_access_token; // Ajouter logique refresh si besoin

    // 2. Fetch Strava
    const res = await fetch(
      `https://www.strava.com/api/v3/activities/${stravaId}/streams?keys=time,distance,altitude,latlng,watts,heartrate,cadence,temp&key_by_type=true`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!res.ok) throw new Error("Strava API Error");
    const rawStreams = await res.json();

    // 🔥 HELPER NETTOYAGE (Copie locale pour être sûr)
    const extract = (key: string) => {
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

    // 3. Sauvegarde des Streams PROPRES
    await supabaseAdmin
        .from('activities')
        .update({ streams_data: cleanStreams })
        .eq('id', activityId);

    // 4. Relance de l'analyse avec les données PROPRES
    const { data: userProfile } = await supabaseAdmin.from('users').select('weight, ftp').eq('id', session.user.id).single();
    
    // Si tu as accès à analyzeAndSaveActivity ici :
    if (typeof analyzeAndSaveActivity === 'function') {
        await analyzeAndSaveActivity(
            activityId, 
            stravaId, 
            cleanStreams, 
            userProfile?.weight || 75, 
            userProfile?.ftp || 250
        );
    }

    return NextResponse.json({ success: true, streams: cleanStreams });

  } catch (error: any) {
    console.error("[Sync Stream] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}