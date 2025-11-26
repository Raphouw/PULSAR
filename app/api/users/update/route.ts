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

    const body = await req.json();
    const { weight, ftp, max_heart_rate, resting_heart_rate } = body;

    // Validation simple
    if (!weight || !ftp) {
      return NextResponse.json({ error: "Poids et FTP sont requis" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("users")
      .update({
        weight: parseFloat(weight),
        ftp: parseInt(ftp),
        max_heart_rate: parseInt(max_heart_rate) || null,
        resting_heart_rate: parseInt(resting_heart_rate) || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Erreur API Update Profile:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}