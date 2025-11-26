// Fichier : app/api/friends/search/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth"; // Vérifie le chemin
import { supabaseAdmin } from "../../../../lib/supabaseAdminClient"; // Vérifie le chemin

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');

    // Pas de recherche en dessous de 2 lettres
    if (!query || query.length < 2) {
      return NextResponse.json({ users: [] });
    }

    const userId = session.user.id;
    const safeQuery = query.replace(/[^a-zA-Z0-9@.\s]/g, ""); // Nettoyage

    // Recherche simple d'utilisateurs (limité à 10 pour la perf)
    const { data: users, error } = await supabaseAdmin
      .from("users")
      .select("id, name, email, avatar_url")
      .or(`name.ilike.%${safeQuery}%,email.ilike.%${safeQuery}%`)
      .neq('id', userId) // On ne se cherche pas soi-même
      .limit(10);

    if (error) {
        console.error("Erreur recherche:", error);
        return NextResponse.json({ users: [] });
    }

    return NextResponse.json({ users: users || [] });

  } catch (err: any) {
    return NextResponse.json({ users: [], error: err.message }, { status: 500 });
  }
}