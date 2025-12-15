import { NextResponse } from "next/server";
import { scanActivityAgainstSegments } from "../../../../lib/segmentScanner";

export const maxDuration = 60; 

export async function POST(req: Request) {
  try {
    // 🔥 On récupère aussi le segmentId si fourni
    const { activityId, segmentId } = await req.json();

    if (!activityId) {
        return NextResponse.json({ success: false, error: "activityId manquant" }, { status: 400 });
    }

    // On passe le segmentId au scanner pour qu'il ne scanne QUE celui-là
    const result = await scanActivityAgainstSegments(activityId, segmentId);

    return NextResponse.json(result);
  } catch (err: any) {
    console.error(`[API SCAN SINGLE] Erreur critique:`, err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}