import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdminClient";
import { scanActivityAgainstSegments } from "../../../../lib/segmentScanner";

// On augmente le temps de réponse max pour cette route spécifique si besoin
export const maxDuration = 60; 

export async function POST(req: Request) {
  try {
    const { activityId } = await req.json();

    if (!activityId) {
        return NextResponse.json({ success: false, error: "activityId manquant" }, { status: 400 });
    }

    // Appel au scanner que nous avons blindé ensemble
    const result = await scanActivityAgainstSegments(activityId);

    return NextResponse.json(result);
  } catch (err: any) {
    console.error(`[API SCAN SINGLE] Erreur critique activityId:`, err);
    return NextResponse.json({ 
        success: false, 
        error: err.message,
        matchesFound: 0 
    }, { status: 500 });
  }
}