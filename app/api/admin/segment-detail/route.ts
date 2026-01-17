// Fichier : app/api/admin/segment-detail/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdminClient";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

  try {
    // Ici, on récupère TOUT, y compris la grosse 'polyline' pour l'affichage map
    const { data, error } = await supabaseAdmin
      .from('segments')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}