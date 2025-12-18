// Fichier : app/api/shop/equip/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { supabaseAdmin } from "../../../../lib/supabaseAdminClient";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { loadout } = await req.json();

    // ⚡ FIX : Conversion de l'ID utilisateur en Number pour la BDD
    const userId = Number(session.user.id);

    // ⚡ FIX : Cast du builder en 'any' pour débloquer l'upsert sur le type 'never'
    const { error } = await (supabaseAdmin.from('user_settings') as any)
      .upsert({
        user_id: userId,
        equipped_loadout: loadout,
        updated_at: new Date().toISOString()
      }, { 
        onConflict: 'user_id' 
      });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Erreur Equip:", error);
    return NextResponse.json({ error: 'Sauvegarde impossible' }, { status: 500 });
  }
}