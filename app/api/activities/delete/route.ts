import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { supabaseAdmin } from "../../../../lib/supabaseAdminClient.js";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { activityId } = await req.json();
    if (!activityId) {
      return NextResponse.json({ error: "ID manquant" }, { status: 400 });
    }

    // 1. Supprimer les records liés (Records de puissance, etc.)
    const { error: recordsError } = await supabaseAdmin
      .from("records")
      .delete()
      .eq("activity_id", activityId);

    if (recordsError) {
        console.error("Erreur delete records:", recordsError);
        throw new Error("Impossible de supprimer les records liés");
    }

    // 2. Supprimer les segments liés (si la table existe et est utilisée)
    await supabaseAdmin
      .from("activity_segments")
      .delete()
      .eq("activity_id", activityId);

    // 3. Supprimer l'activité elle-même
    const { error } = await supabaseAdmin
      .from("activities")
      .delete()
      .eq("id", activityId)
      .eq("user_id", session.user.id); // Sécurité supplémentaire

    if (error) throw error;

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error("Delete Activity Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}