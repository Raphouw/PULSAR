// Fichier : app/api/activities/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import { supabaseAdmin } from "../../../lib/supabaseAdminClient"; // Retire le .js si tu es en TS

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const userId = session.user.id;

    // Récupération des activités
    const { data: activities, error } = await supabaseAdmin
      .from("activities")
      // On sélectionne les champs nécessaires pour les cartes (optimisé, sans streams lourds)
      .select("id, name, start_time, distance_km, elevation_gain_m, duration_s, avg_speed_kmh, avg_power_w, tss, polyline, duration_s, type")
      .eq("user_id", userId)
      .order("start_time", { ascending: false }); // Du plus récent au plus ancien par défaut

    if (error) {
      console.error("Erreur Supabase activities:", error);
      throw error;
    }

    return NextResponse.json({ activities: activities || [] });

  } catch (err: any) {
    console.error("Erreur API activities:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}