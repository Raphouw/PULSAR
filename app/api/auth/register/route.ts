import { NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "../../../../lib/supabaseAdminClient";
import bcrypt from "bcrypt";

export async function POST(req: Request) {
  try {
    const { email, password, name } = await req.json();
    if (!email || !password || !name) {
      return NextResponse.json({ error: "Email, mot de passe et nom sont requis" }, { status: 400 });
    }

    // 1. Vérification si l'utilisateur existe déjà
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle(); // maybeSingle est plus propre ici que single() pour éviter une erreur 406 si vide

    if (existingUser) {
      return NextResponse.json({ error: "Cet email est déjà utilisé" }, { status: 409 });
    }

    // 2. Hachage du mot de passe
    // 
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // 3. Insertion du nouvel utilisateur
    // ⚡ FIX: Cast du builder en any pour accepter password_hash et les autres colonnes
    const { error: insertError } = await (supabase.from("users") as any)
      .insert({
        email: email,
        name: name,
        password_hash: password_hash,
        created_at: new Date().toISOString(),
        wallet_balance: 0 // Optionnel: initialisation du solde shop
      });

    if (insertError) {
      console.error("Erreur Inscription Supabase:", insertError);
      return NextResponse.json({ error: "Impossible de créer l'utilisateur" }, { status: 500 });
    }

    return NextResponse.json({ message: "Utilisateur créé" }, { status: 201 });

  } catch (err) {
    console.error("Inscription Error:", err);
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
  }
}