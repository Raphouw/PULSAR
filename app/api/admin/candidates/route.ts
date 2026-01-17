//fichier : app\api\admin\candidates\route.ts

import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdminClient";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('segments')
      .select('id, name, distance_m, average_grade, elevation_gain_m, tags, created_at') 
      .eq('is_official', false)
      // 🔥 LE FIX EST ICI : On exclut ceux qui ont le status 'rejected' dans le JSON tags
      .not('tags->>status', 'eq', 'rejected') 
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("Erreur liste candidats:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}