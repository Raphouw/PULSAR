import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import { supabaseAdmin } from "../../../../lib/supabaseAdminClient";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ⚡ FIX: Conversion de l'ID en Number pour la BDD
  const userId = Number(session.user.id);

  try {
    // 1. On récupère le FormData (car on envoie un fichier)
    const formData = await req.formData();
    
    // 2. Extraction des données textuelles
    const age = Number(formData.get('age'));
    const gender = formData.get('gender') as string;
    const weight = Number(formData.get('weight'));
    const height = Number(formData.get('height'));
    const max_heart_rate = Number(formData.get('max_heart_rate'));
    const resting_heart_rate = Number(formData.get('resting_heart_rate'));
    const ftp = Number(formData.get('ftp'));
    const vo2max = formData.get('vo2max') ? Number(formData.get('vo2max')) : null;
    
    // 3. Extraction du Fichier (Avatar)
    const file = formData.get('avatar') as File | null;
    let avatar_url: string | null = null;

    // --- VALIDATION SÉCURITÉ ---
    if (age < 10 || age > 100) return err("Âge invalide");
    if (height < 80 || height > 220) return err("Taille invalide");
    if (weight < 40 || weight > 150) return err("Poids invalide");
    if (max_heart_rate < 100 || max_heart_rate > 250) return err("FC Max invalide");
    if (resting_heart_rate < 30 || resting_heart_rate > 120) return err("FC Repos invalide");
    if (resting_heart_rate >= max_heart_rate) return err("FC Repos >= FC Max");
    if (ftp < 50 || ftp > 600) return err("FTP invalide");

    // --- TRAITEMENT DE L'IMAGE ---
    if (file && file.size > 0) {
        if (!file.type.startsWith("image/")) return err("Le fichier doit être une image");
        if (file.size > 5 * 1024 * 1024) return err("L'image ne doit pas dépasser 5Mo");

        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}-${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        // Upload vers Supabase Storage
        const { error: uploadError } = await supabaseAdmin
          .storage
          .from('avatars')
          .upload(filePath, file, {
              contentType: file.type,
              upsert: true
          });

        if (uploadError) {
            console.error('Upload Error:', uploadError);
            return err("Erreur lors de l'upload de l'avatar");
        }

        // Récupération de l'URL publique
        const { data: { publicUrl } } = supabaseAdmin
          .storage
          .from('avatars')
          .getPublicUrl(filePath);
        
        avatar_url = publicUrl;
    }

    // --- MISE À JOUR BDD ---
    // 
    const updatePayload: any = {
      age, 
      gender, 
      weight, 
      height,
      max_heart_rate, 
      resting_heart_rate,
      ftp, 
      vo2max,
      onboarding_completed: true
    };

    if (avatar_url) {
        updatePayload.avatar_url = avatar_url;
    }

    // ⚡ FIX: Cast builder en any pour débloquer l'update
    const { error } = await (supabaseAdmin.from("users") as any)
      .update(updatePayload)
      .eq("id", userId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Onboarding Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

function err(msg: string) {
    return NextResponse.json({ error: msg }, { status: 400 });
}