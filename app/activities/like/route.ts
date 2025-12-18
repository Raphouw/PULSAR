import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Utilise l'alias @ si possible, sinon ../../../lib/auth
import { supabaseAdmin } from "@/lib/supabaseAdminClient";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { activityId } = await req.json();
    const userId = Number(session.user.id);

    // 1. Vérifier si le like existe déjà
    const { data: existingLike, error: fetchError } = await supabaseAdmin
      .from('likes')
      .select('id')
      // ⚡ FIX : On cast userId en 'any' pour éviter le conflit string/number des définitions
      .eq('user_id', userId as any) 
      .eq('activity_id', activityId)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (existingLike) {
      // --- UNLIKE ---
      // ⚡ FIX : On dit explicitement à TS que cet objet a un ID
      const likeData = existingLike as { id: number };
      
      await supabaseAdmin.from('likes').delete().eq('id', likeData.id);
      return NextResponse.json({ liked: false });
    } else {
      // --- LIKE ---
      // ⚡ FIX : Le "as any" ici force l'insertion même si les types ne matchent pas parfaitement
      await supabaseAdmin.from('likes').insert({ 
        user_id: userId, 
        activity_id: activityId 
      } as any);
      
      return NextResponse.json({ liked: true });
    }

  } catch (err: any) {
    console.error("Erreur Like:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}