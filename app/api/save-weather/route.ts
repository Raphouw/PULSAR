// Fichier : app/api/save-weather/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from "../../../lib/supabaseAdminClient";

export async function POST(req: Request) {
  const body = await req.json();
  const { activityId, weatherCode, tempMin, tempMax, tempAvg } = body;

  if (!activityId) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

  try {
    // ⚡ FIX: On cast le builder en 'any' pour débloquer l'update sur le type 'never'
    const { error } = await (supabaseAdmin.from('activities') as any)
      .update({ 
        weather_code: weatherCode,
        temp_min: tempMin,
        temp_max: tempMax,
        temp_avg: tempAvg
      })
      .eq('id', activityId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Save Weather Error:", error);
    return NextResponse.json({ error: 'Save Failed' }, { status: 500 });
  }
}