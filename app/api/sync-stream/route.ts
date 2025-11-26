// app/api/sync-stream/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth"; // Ton fichier auth
import { supabaseAdmin } from "../../../lib/supabaseAdminClient";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { activityId, stravaId } = body;

  if (!activityId || !stravaId) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

  try {
    // 1. On récupère le Token Strava de l'user (Géré par NextAuth généralement)
    // Note: Assure-toi d'avoir accès au accessToken Strava ici.
    // Si tu le stockes en BDD lors du login, récupère-le ici.
    // Pour l'exemple, supposons qu'il est dans la session ou récupéré via user_id
    const { data: userData } = await supabaseAdmin
        .from('users') // Ou ta table qui stocke les tokens
        .select('strava_access_token')
        .eq('id', session.user.id)
        .single();
        
    const token = userData?.strava_access_token; // À adapter selon ton stockage

    if (!token) return NextResponse.json({ error: 'No Token' }, { status: 401 });

    // 2. Appel Strava (On ne prend que latlng pour l'instant pour économiser la payload)
    const response = await fetch(`https://www.strava.com/api/v3/activities/${stravaId}/streams?keys=latlng,altitude,heartrate,watts,temp&key_by_type=true`, {      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) throw new Error('Strava Error');

    const streamData = await response.json();

    // 3. Sauvegarde en BDD (On remplit la colonne vide)
    const { error: updateError } = await supabaseAdmin
      .from('activities')
      .update({ 
        streams_data: streamData, // On sauvegarde tout le JSON
        // Optionnel : On peut aussi extraire et sauver start_lat/lon en dur pour aller plus vite la prochaine fois
      })
      .eq('id', activityId);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, streams: streamData });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Sync Failed' }, { status: 500 });
  }
}