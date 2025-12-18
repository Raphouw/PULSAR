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
    const limit = 5; 
    
    // ⚡ FIX: Conversion ID en number
    const myId = Number(session.user.id);

    // 1. Récupérer les IDs des amis que je suis
    const { data: followingData, error: friendsError } = await supabaseAdmin
      .from('friends')
      .select('friend_id')
      .eq('user_id', myId)
      .eq('status', 'following');

    if (friendsError) throw friendsError;

    // ⚡ FIX: Cast en any[] pour lire friend_id
    const following = (followingData || []) as any[];
    const friendIds = following.map(f => f.friend_id);

    if (friendIds.length === 0) {
        return NextResponse.json({ activities: [] });
    }

    // 2. Récupérer les activités de ces amis (avec pagination)
    const { data: activitiesData, error: actError } = await supabaseAdmin
      .from('activities')
      .select(`
          *,
          user:users (id, name, avatar_url),
          likes (user_id)
      `)
      .in('user_id', friendIds)
      .order('start_time', { ascending: false })
      .range(page * limit, (page * limit) + limit - 1);

    if (actError) throw actError;

    // ⚡ FIX: Cast en any[] pour mapper et spread
    const activities = (activitiesData || []) as any[];

    // 3. Nettoyage des données pour le front
    const formattedActivities = activities.map(act => {
        const likes = act.likes || [];
        return {
            ...act,
            likes_count: likes.length,
            // Est-ce que MON id est dans la liste des likeurs ?
            // On convertit les IDs en string/number pour être sûr de la comparaison
            is_liked: likes.some((l: any) => Number(l.user_id) === myId)
        };
    });

    return NextResponse.json({ activities: formattedActivities});

  } catch (err: any) {
    console.error("[Feed Error]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}