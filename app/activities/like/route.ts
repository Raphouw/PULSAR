import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import { supabaseAdmin } from "../../../lib/supabaseAdminClient";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { activityId } = await req.json();
    const userId = session.user.id;

    // 1. Vérifier si le like existe déjà
    const { data: existingLike } = await supabaseAdmin
      .from('likes')
      .select('id')
      .eq('user_id', userId)
      .eq('activity_id', activityId)
      .maybeSingle();

    if (existingLike) {
      // --- UNLIKE ---
      await supabaseAdmin.from('likes').delete().eq('id', existingLike.id);
      return NextResponse.json({ liked: false });
    } else {
      // --- LIKE ---
      await supabaseAdmin.from('likes').insert({ user_id: userId, activity_id: activityId });
      return NextResponse.json({ liked: true });
    }

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}