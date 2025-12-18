import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { supabaseAdmin } from "../../../../lib/supabaseAdminClient";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json();
    const { weight, height, ftp, max_heart_rate, resting_heart_rate } = body;

    // 1. Validation de présence
    if (!weight || !ftp || !height) {
      return NextResponse.json({ error: "Poids, taille et FTP sont requis" }, { status: 400 });
    }

    // 2. Conversion sécurisée des IDs
    const userId = Number(session.user.id);

    // ⚡ FIX: Cast du builder en 'any' pour débloquer l'accès aux colonnes (type 'never')
    // On nettoie les entrées avec parseFloat/parseInt pour garantir l'intégrité SQL
    const { error } = await (supabaseAdmin.from("users") as any)
      .update({
        weight: parseFloat(weight),
        height: parseFloat(height),
        ftp: parseInt(ftp),
        max_heart_rate: max_heart_rate ? parseInt(max_heart_rate) : null,
        resting_heart_rate: resting_heart_rate ? parseInt(resting_heart_rate) : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) throw error;

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Erreur API Update Profile:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}