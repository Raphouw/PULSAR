// Fichier : app/api/auth/register/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "../../../../lib/supabaseAdminClient.js";
import bcrypt from "bcrypt";

export async function POST(req: Request) {
  try {
    const { email, password, name } = await req.json();
    if (!email || !password || !name) {
      return NextResponse.json({ error: "Email, mot de passe et nom sont requis" }, { status: 400 });
    }

    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single();

    if (existingUser) {
      return NextResponse.json({ error: "Cet email est déjà utilisé" }, { status: 409 });
    }

    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    const { error: insertError } = await supabase
      .from("users")
      .insert({
        email: email,
        name: name,
        password_hash: password_hash,
      });

    if (insertError) {
      console.error("Erreur Inscription Supabase:", insertError);
      return NextResponse.json({ error: "Impossible de créer l'utilisateur" }, { status: 500 });
    }

    return NextResponse.json({ message: "Utilisateur créé" }, { status: 201 });

  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
  }
}