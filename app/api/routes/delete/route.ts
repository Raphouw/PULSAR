// Fichier : app/api/routes/delete/route.ts 
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { supabaseAdmin } from "../../../../lib/supabaseAdminClient";

// Cette méthode gère la suppression d'une route spécifique
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { routeId } = await req.json();
    if (!routeId) {
      return NextResponse.json({ error: "ID de route manquant" }, { status: 400 });
    }
    
    // NOTE: Si vous utilisez des tables de liaison (ex: simulations_routes), il faudra ajouter 
    // leur suppression ici avant de supprimer la route.

    // Suppression de la route elle-même
    const { error } = await supabaseAdmin
      .from("routes") // Assurez-vous que le nom de table est correct
      .delete()
      .eq("id", routeId)
      .eq("user_id", session.user.id); // Sécurité

    if (error) throw error;

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error("[API Delete Route] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}