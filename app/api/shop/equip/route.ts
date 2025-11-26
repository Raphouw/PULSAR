import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { supabaseAdmin } from "../../../../lib/supabaseAdminClient";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { loadout } = await req.json(); // On reçoit tout l'objet loadout { hover: '...', passive: '...' }

  try {
    // Upsert : Met à jour si existe, sinon crée
    const { error } = await supabaseAdmin
      .from('user_settings')
      .upsert({
        user_id: session.user.id,
        equipped_loadout: loadout,
        updated_at: new Date().toISOString()
      });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Save failed' }, { status: 500 });
  }
}