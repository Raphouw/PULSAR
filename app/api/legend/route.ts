// Fichier : app/api/legends/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdminClient";

export async function GET() {
  try {
    // On interroge directement la vue qu'on vient de créer
    const { data, error } = await supabaseAdmin
      .from('view_hall_of_legends')
      .select('*')
      // On peut limiter aux 50 premiers pour ne pas charger 1000 users
      .limit(50); 

    if (error) throw error;

    return NextResponse.json(data);

  } catch (err: any) {
    console.error("Legends Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}