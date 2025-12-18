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
    // ⚡ FIX: On cast le builder en any pour éviter l'erreur "never"
    const { data: segmentData, error: segmentError } = await (supabaseAdmin.from("segments") as any)
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

    // ⚡ FIX: On cast le résultat
    const segment = segmentData as any;

    // 2. RECHERCHE DES ACTIVITÉS PLAUSIBLES (FILTRE GÉOGRAPHIQUE)
    const { data: plausibleActivitiesData, error: rpcError } = await supabaseAdmin
      .rpc('get_plausible_activities', {
        s_lat: start_lat,
        s_lon: start_lon,
        e_lat: end_lat,
        e_lon: end_lon,
        dist_threshold: 0.005 // Tolérance de ~500m
      } as any); // ⚡ FIX: On force les arguments

    if (rpcError) {
      console.error("⚠️ [RPC ERROR] Échec du filtrage géographique:", rpcError);
    }

    // ⚡ FIX: On cast le tableau
    const plausibleActivities = (plausibleActivitiesData || []) as any[];
    const activityIds = plausibleActivities.map((a: any) => a.id);

    // 3. CRÉATION DU JOB POUR LE COMMAND CENTER
    // ⚡ FIX: On cast le builder en any pour l'insertion du job
    const { data: jobData, error: jobError } = await (supabaseAdmin.from('admin_jobs') as any)
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
    }

    // ⚡ FIX: On cast le résultat
    const job = jobData as any;

    // 4. RÉPONSE AU FRONT
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