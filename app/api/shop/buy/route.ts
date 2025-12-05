import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth"; // J'utilise l'alias @/ pour la robustesse
import { supabaseAdmin } from "../../../../lib/supabaseAdminClient";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  // Vérification Session
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { effectId, cost } = await req.json();

    // 1. VERIFICATION SOLDE (Côté Serveur)
    // On ne fait pas confiance au front. On interroge la banque.
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('wallet_balance')
      .eq('id', session.user.id) // Supabase gère le cast string -> bigint
      .single();

    if (userError || !userData) {
      throw new Error("Utilisateur introuvable en base");
    }

    if (userData.wallet_balance < cost) {
      return NextResponse.json({ error: 'Fonds insuffisants' }, { status: 403 });
    }

    // 2. VERIFICATION DOUBLON
    const { data: existing } = await supabaseAdmin
      .from('shop_purchases')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('effect_id', effectId)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Objet déjà possédé' }, { status: 400 });
    }

    // 3. TRANSACTION
    // L'insertion déclenche le Trigger SQL qui met à jour le solde
    const { error: insertError } = await supabaseAdmin
      .from('shop_purchases')
      .insert({
        user_id: session.user.id,
        effect_id: effectId,
        cost: cost
      });

    if (insertError) throw insertError;

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Erreur Achat:", error);
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 });
  }
}