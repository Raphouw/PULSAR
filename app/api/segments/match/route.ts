// Fichier : app/api/segments/match/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { supabaseAdmin } from "../../../../lib/supabaseAdminClient";
import { scanActivityAgainstSegments } from "../../../../lib/segmentScanner";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { mode, id } = await req.json();
    const isAdmin = session.user.id === '1' || session.user.id === '2';

    // --- CAS 1 : SCAN D'UNE ACTIVITÉ (Nouvelle sortie ou re-scan manuel) ---
    if (mode === 'activity') {
      const result = await scanActivityAgainstSegments(id);
      return NextResponse.json(result);
    }

    // --- CAS 2 : SCAN D'UN SEGMENT (Rétroactivité sur tout l'historique) ---
    if (mode === 'segment') {
    if (!isAdmin) return NextResponse.json({ error: "Droits insuffisants" }, { status: 403 });

    const { data: allActivities, error: actError } = await supabaseAdmin
        .from('activities')
        .select('id')
        .not('streams_data', 'is', null);

    if (actError) throw actError;

    // 🔥 DÉCLENCHEMENT ASYNCHRONE : On ne met pas 'await' devant la boucle
    // On répond immédiatement au client
    const runRetroScan = async () => {
        let totalMatches = 0;
        console.log(`[BACKGROUND-SCAN] Début pour le segment ${id} sur ${allActivities.length} activités.`);
        
        for (const activity of allActivities) {
            try {
                const res = await scanActivityAgainstSegments(activity.id, id);
                if (res.success && typeof res.matchesFound === 'number') {
                    totalMatches += res.matchesFound;
                }
            } catch (err) {
                console.error(`Erreur scan activité ${activity.id}:`, err);
            }
        }
        console.log(`[BACKGROUND-SCAN] Terminé. ${totalMatches} efforts créés.`);
    };

    runRetroScan(); // On lance sans attendre

    return NextResponse.json({ 
        success: true, 
        msg: "Scan rétroactif lancé en tâche de fond. Les classements se peupleront d'ici quelques instants." 
    });
}

    return NextResponse.json({ error: "Mode non reconnu" }, { status: 400 });

  } catch (err: any) {
    console.error("Match API Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}