// Fichier : app/api/friends/action/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth"; 
import { supabaseAdmin } from "../../../../lib/supabaseAdminClient";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { action, targetUserId } = await req.json();
    const myId = session.user.id;

    if (!targetUserId || myId === targetUserId) {
        return NextResponse.json({ error: "Cible invalide" }, { status: 400 });
    }

    // --- SUIVRE (FOLLOW) ---
    if (action === 'follow') {
      // On utilise upsert : Si la ligne existe, on met à jour le status. Sinon on crée.
      // Cela gère le cas où on a déjà une relation (ex: ancienne ou autre)
      const { error } = await supabaseAdmin
        .from("friends")
        .upsert({ 
            user_id: myId, 
            friend_id: targetUserId, 
            status: 'following' 
        }, { onConflict: 'user_id, friend_id' }); // Utilise l'index unique

      if (error) throw error;
    }

    // --- NE PLUS SUIVRE (UNFOLLOW) ---
    else if (action === 'unfollow') {
      // On ne supprime QUE si le statut est 'following'. 
      // On ne veut pas supprimer accidentellement un 'blocked'.
      const { error } = await supabaseAdmin
        .from("friends")
        .delete()
        .eq("user_id", myId)
        .eq("friend_id", targetUserId)
        .eq("status", "following"); 

      if (error) throw error;
    }

    // --- BLOQUER (BLOCK) ---
    else if (action === 'block') {
      // 1. Je bloque la cible (Upsert force le status à blocked)
      const { error: blockError } = await supabaseAdmin
        .from("friends")
        .upsert({ 
            user_id: myId, 
            friend_id: targetUserId, 
            status: 'blocked' 
        }, { onConflict: 'user_id, friend_id' });
      
      if (blockError) throw blockError;

      // 2. Je force la cible à ne plus me suivre (Nettoyage)
      await supabaseAdmin
        .from("friends")
        .delete()
        .eq("user_id", targetUserId) // C'est LUI qui me suit
        .eq("friend_id", myId);
    }

    // --- DÉBLOQUER (UNBLOCK) ---
    else if (action === 'unblock') {
      const { error } = await supabaseAdmin
        .from("friends")
        .delete()
        .eq("user_id", myId)
        .eq("friend_id", targetUserId)
        .eq("status", "blocked");

      if (error) throw error;
    }

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error("[Friend Action Error]:", err);
    return NextResponse.json({ error: err.message || "Erreur serveur" }, { status: 500 });
  }
}