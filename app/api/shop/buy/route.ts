// Fichier : app/api/shop/buy/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth"; 
import { supabaseAdmin } from "../../../../lib/supabaseAdminClient";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  // Vérification Session
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { effectId, cost } = await req.json();
    
    // ⚡ FIX: Conversion de l'ID en nombre pour la BDD
    const userId = Number(session.user.id);

    // 1. VERIFICATION SOLDE (Côté Serveur)
    const { data: userDataRaw, error: userError } = await supabaseAdmin
      .from('users')
      .select('wallet_balance')
      .eq('id', userId)
      .single();

    if (userError || !userDataRaw) {
      throw new Error("Utilisateur introuvable en base");
    }

    // ⚡ FIX: Cast en any pour lire wallet_balance
    const userData = userDataRaw as any;

    if (userData.wallet_balance < cost) {
      return NextResponse.json({ error: 'Fonds insuffisants' }, { status: 403 });
    }

    // 2. VERIFICATION DOUBLON
    const { data: existing } = await supabaseAdmin
      .from('shop_purchases')
      .select('id')
      .eq('user_id', userId)
      .eq('effect_id', effectId)
      .maybeSingle(); // maybeSingle est plus sûr que single ici pour éviter une erreur si vide

    if (existing) {
      return NextResponse.json({ error: 'Objet déjà possédé' }, { status: 400 });
    }

    // 3. TRANSACTION
    // ⚡ FIX: Cast du builder en any pour l'insert
    const { error: insertError } = await (supabaseAdmin.from('shop_purchases') as any)
      .insert({
        user_id: userId,
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