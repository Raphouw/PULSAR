import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabaseAdminClient";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    // 1. Récupérer les query params (start_index et end_index)
    const { searchParams } = new URL(req.url);
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');

    if (!id || id === 'undefined') {
      return NextResponse.json({ error: "ID manquant" }, { status: 400 });
    }

    // 2. Récupérer l'activité
    const { data: activityData, error } = await supabaseAdmin
      .from('activities')
      .select('streams_data')
      // ⚡ FIX : Conversion explicite en Number pour matcher la BDD
      .eq('id', Number(id))
      .single();

    // ⚡ FIX : On cast en 'any' pour éviter l'erreur "Property streams_data does not exist on type never"
    const activity = activityData as any;

    if (error || !activity) {
      console.error("Erreur SQL ou Activité introuvable:", error);
      return NextResponse.json({ error: "Activité introuvable" }, { status: 404 });
    }

    if (!activity.streams_data) {
      return NextResponse.json({ error: "Pas de streams pour cette activité" }, { status: 404 });
    }

    const streams = activity.streams_data as Record<string, any[]>;

    // 3. LOGIQUE DE DÉCOUPE (SLICING)
    // Si des index sont fournis, on coupe les tableaux avant de les renvoyer
    if (startParam && endParam) {
        const start = parseInt(startParam);
        const end = parseInt(endParam);

        // On vérifie que les nombres sont valides
        if (!isNaN(start) && !isNaN(end) && start <= end) {
            const slicedStreams: Record<string, any[]> = {};
            
            // On parcourt chaque clé (watts, heartrate, altitude...) et on coupe
            Object.keys(streams).forEach((key) => {
                if (Array.isArray(streams[key])) {
                    // slice(start, end + 1) car la fin est exclue dans slice
                    slicedStreams[key] = streams[key].slice(start, end + 1);
                }
            });
            
            return NextResponse.json(slicedStreams);
        }
    }

    // Si pas de params, on renvoie tout (comportement par défaut)
    return NextResponse.json(streams);

  } catch (err: any) {
    console.error("Erreur Serveur Streams:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}