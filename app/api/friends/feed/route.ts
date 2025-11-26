// Fichier : app/api/friends/feed/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { supabaseAdmin } from "../../../../lib/supabaseAdminClient";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '0');
    const limit = 5; // 5 activités par chargement (c'est lourd des cartes !)
    const myId = session.user.id;

    // 1. Récupérer les IDs des amis que je suis
    const { data: following, error: friendsError } = await supabaseAdmin
      .from('friends')
      .select('friend_id')
      .eq('user_id', myId)
      .eq('status', 'following');

    if (friendsError) throw friendsError;

    const friendIds = following.map(f => f.friend_id);

    if (friendIds.length === 0) {
        return NextResponse.json({ activities: [] });
    }

    // 2. Récupérer les activités de ces amis (avec pagination)
    // On joint la table 'users' pour avoir le nom/avatar de l'auteur
    const { data: activities, error: actError } = await supabaseAdmin
      .from('activities')
      .select(`
        *,
        user:users (id, name, avatar_url),
        likes:likes(count), 
        has_liked:likes!inner(user_id) 
      `)
      // ASTUCE SUPABASE : On utilise un trick pour récupérer si l'user courant a liké
      // Malheureusement, les filtres post-query complexes sont durs en API simple.
      // Pour simplifier ici, on va charger les likes et filtrer en JS (solution rapide)
      // OU mieux : On charge juste count et on fera un fetch client, MAIS pour la perf :
      
      // VERSION SIMPLE ET EFFICACE (On récupère tout et on nettoie) :
      .select(`
          *,
          user:users (id, name, avatar_url),
          likes (user_id)
      `)
      .in('user_id', friendIds)
      .order('start_time', { ascending: false })
      .range(page * limit, (page * limit) + limit - 1);

    if (actError) throw actError;

    // 3. Nettoyage des données pour le front
    const formattedActivities = activities.map(act => {
        const likes = act.likes || [];
        return {
            ...act,
            likes_count: likes.length,
            // Est-ce que MON id est dans la liste des likeurs ?
            is_liked: likes.some((l: any) => l.user_id === myId)
        };
    });

    return NextResponse.json({ activities: formattedActivities});

  } catch (err: any) {
    console.error("[Feed Error]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}