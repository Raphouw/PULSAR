// Fichier : app/api/admin/create-segment/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdminClient";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { 
      name, distance_m, elevation_gain_m, average_grade, 
      max_grade, start_lat, start_lon, end_lat, end_lon, 
      polyline, category, tags 
    } = body;

    // Validation de sécurité
    if (!name || !polyline) {
      return NextResponse.json({ error: "Données de segment incomplètes" }, { status: 400 });
    }

    // 1. INSERTION DU SEGMENT
    const { data: segment, error: segmentError } = await supabaseAdmin
      .from("segments")
      .insert({
        name,
        distance_m,
        elevation_gain_m,
        average_grade,
        max_grade,
        start_lat,
        start_lon,
        end_lat,
        end_lon,
        polyline,
        category,
        tags,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (segmentError) {
      console.error("❌ [DB ERROR] Échec création segment:", segmentError);
      return NextResponse.json({ error: segmentError.message }, { status: 500 });
    }

    // 2. RECHERCHE DES ACTIVITÉS PLAUSIBLES (FILTRE GÉOGRAPHIQUE)
    const { data: plausibleActivities, error: rpcError } = await supabaseAdmin
      .rpc('get_plausible_activities', {
        s_lat: start_lat,
        s_lon: start_lon,
        e_lat: end_lat,
        e_lon: end_lon,
        dist_threshold: 0.005 // Tolérance de ~500m
      });

    if (rpcError) {
      console.error("⚠️ [RPC ERROR] Échec du filtrage géographique:", rpcError);
    }

    const activityIds = plausibleActivities?.map((a: any) => a.id) || [];

    // 3. CRÉATION DU JOB POUR LE COMMAND CENTER
    // Cette tâche sera récupérée par le Worker du panel admin
    const { data: job, error: jobError } = await supabaseAdmin
      .from('admin_jobs')
      .insert({
        type: 'segment_scan',
        status: 'pending',
        total: activityIds.length,
        progress: 0,
        payload: { 
          segmentId: segment.id, 
          segmentName: name,
          queue: activityIds 
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (jobError) {
      console.error("⚠️ [JOB ERROR] Échec création de la tâche de fond:", jobError);
      // On ne bloque pas le retour car le segment est déjà créé
    }

    // 4. RÉPONSE AU FRONT
    // On renvoie l'ID du segment pour la redirection et l'ID du job pour info
    return NextResponse.json({ 
      success: true, 
      segmentId: segment.id,
      jobId: job?.id,
      activitiesCount: activityIds.length 
    });

  } catch (e) {
    console.error("💥 [SERVER ERROR]:", e);
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
  }
}