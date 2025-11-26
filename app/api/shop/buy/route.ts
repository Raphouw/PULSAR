import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { supabaseAdmin } from "../../../../lib/supabaseAdminClient";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { effectId, cost } = await req.json();

  try {
    // 1. Vérifier si déjà acheté (Optionnel, le front le fait, mais sécu double)
    const { data: existing } = await supabaseAdmin
      .from('shop_purchases')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('effect_id', effectId)
      .single();

    if (existing) return NextResponse.json({ error: 'Already owned' }, { status: 400 });

    // 2. Enregistrer l'achat
    const { error } = await supabaseAdmin
      .from('shop_purchases')
      .insert({
        user_id: session.user.id,
        effect_id: effectId,
        cost: cost
      });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Buy Error", error);
    return NextResponse.json({ error: 'Transaction failed' }, { status: 500 });
  }
}