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
    
    // ⚡ FIX: Conversion des IDs en Number pour la BDD
    const myId = Number(session.user.id);
    const targetId = Number(targetUserId);

    if (!targetId || myId === targetId) {
        return NextResponse.json({ error: "Cible invalide" }, { status: 400 });
    }

    // --- SUIVRE (FOLLOW) ---
    if (action === 'follow') {
      // ⚡ FIX: Cast du builder en any pour l'upsert
      const { error } = await (supabaseAdmin.from("friends") as any)
        .upsert({ 
            user_id: myId, 
            friend_id: targetId, 
            status: 'following' 
        }, { onConflict: 'user_id, friend_id' });

      if (error) throw error;
    }

    // --- NE PLUS SUIVRE (UNFOLLOW) ---
    else if (action === 'unfollow') {
      // ⚡ FIX: Cast du builder en any pour le delete
      const { error } = await (supabaseAdmin.from("friends") as any)
        .delete()
        .eq("user_id", myId)
        .eq("friend_id", targetId)
        .eq("status", "following"); 

      if (error) throw error;
    }

    // --- BLOQUER (BLOCK) ---
    else if (action === 'block') {
      // 1. Je bloque la cible (Upsert force le status à blocked)
      // ⚡ FIX: Cast du builder en any pour l'upsert
      const { error: blockError } = await (supabaseAdmin.from("friends") as any)
        .upsert({ 
            user_id: myId, 
            friend_id: targetId, 
            status: 'blocked' 
        }, { onConflict: 'user_id, friend_id' });
      
      if (blockError) throw blockError;

      // 2. Je force la cible à ne plus me suivre (Nettoyage)
      // ⚡ FIX: Cast du builder en any pour le delete
      await (supabaseAdmin.from("friends") as any)
        .delete()
        .eq("user_id", targetId) // C'est LUI qui me suit
        .eq("friend_id", myId);
    }

    // --- DÉBLOQUER (UNBLOCK) ---
    else if (action === 'unblock') {
      // ⚡ FIX: Cast du builder en any pour le delete
      const { error } = await (supabaseAdmin.from("friends") as any)
        .delete()
        .eq("user_id", myId)
        .eq("friend_id", targetId)
        .eq("status", "blocked");

      if (error) throw error;
    }

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error("[Friend Action Error]:", err);
    return NextResponse.json({ error: err.message || "Erreur serveur" }, { status: 500 });
  }
}