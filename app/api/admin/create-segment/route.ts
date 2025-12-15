// Fichier : app/api/admin/create-segment/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdminClient"; // Vérifie ce chemin d'import selon ton projet

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // On déstructure pour être sûr de bien tout récupérer, Y COMPRIS LES TAGS
    const { 
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
      tags // 🔥 C'est ici qu'il manquait probablement la récupération
    } = body;

    // Validation basique
    if (!name || !polyline) {
      return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
    }

    // Insertion en base avec le champ tags
    const { data, error } = await supabaseAdmin
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
        polyline,   // JSONB
        category,   // String
        tags,       // 🔥 JSONB : On passe le tableau d'objets reçu du front
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error("Erreur Supabase:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, segment: data });

  } catch (e) {
    console.error("Erreur API:", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}