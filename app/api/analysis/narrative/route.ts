// Fichier : app/api/analysis/narrative/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseAdminClient'; 
import { generateActivityNarrative } from '../../../../lib/analysis/narrativeEngine';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth'; 

// Définir la structure de la réponse (pour éviter les erreurs d'inconnus)
interface NarrativeRequest {
  activityId: number;
}

// Handler POST pour générer la narration
export async function POST(request: Request) {
  
  // Sécurité : Vérifier la session utilisateur (crucial pour l'accès aux données privées)
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: 'UNAUTHORIZED_ACCESS' }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    const { activityId }: NarrativeRequest = await request.json();

    if (!activityId) {
      return NextResponse.json({ error: 'Activity ID manquant.' }, { status: 400 });
    }

    // 1. Récupérer l'activité, les streams et le profil utilisateur
    const { data: activityData, error: activityError } = await supabaseAdmin
      .from('activities')
      .select(`streams_data, user_id, users ( ftp, weight, max_heart_rate )`)
      .eq('id', activityId)
      .limit(1)
      .maybeSingle();

    if (activityError || !activityData) {
        console.error("Erreur BDD ou activité introuvable:", activityError);
        return NextResponse.json({ error: 'Activité non trouvée ou erreur BDD.' }, { status: 404 });
    }

    // 1.1 Sécurité : Vérifier que l'activité appartient à l'utilisateur
    if (activityData.user_id?.toString() !== userId) {
        return NextResponse.json({ error: 'Activité non associée à cet utilisateur.' }, { status: 403 });
    }
    
    // 1.2 Vérifier les streams (sans quoi la narration est inutile)
    if (!activityData.streams_data) {
         return NextResponse.json({ narrative: "Données de flux (streams) absentes. Impossible de générer le récit narratif." }, { status: 200 });
    }

    // @ts-ignore
    const rawUsersData = activityData.users; // Renommage pour plus de clarté
    
    // Définir le type de l'objet utilisateur que nous attendons (sans la nullité initiale)
    type UserProfileData = { ftp: number | null; weight: number | null; max_heart_rate: number | null };

    let cleanUserProfile: UserProfileData | null = null;
    
    // 🔥 CORRECTION: Extraire l'objet utilisateur en gérant le cas du tableau
    if (Array.isArray(rawUsersData) && rawUsersData.length > 0) {
        // C'est un tableau : prendre le premier élément et l'affiner (assertion implicite)
        cleanUserProfile = rawUsersData[0] as UserProfileData;
    } else if (rawUsersData && typeof rawUsersData === 'object') {
        // C'est déjà l'objet (si Supabase a aplati la réponse)
        cleanUserProfile = rawUsersData as UserProfileData;
    }
    
    // Assurez-vous que userProfile est bien un objet après l'opération (pour le type check)
    const profile = {
        ftp: cleanUserProfile?.ftp || 250,
        weight: cleanUserProfile?.weight || 75,
        maxHr: cleanUserProfile?.max_heart_rate || 190,
    };


    // 2. Exécuter le moteur narratif
    const narrative = generateActivityNarrative(activityData.streams_data as any, profile);

    // 3. Retourner le récit
    return NextResponse.json({ narrative });

  } catch (error) {
    console.error('Erreur dans l’API Narratif:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur lors de la génération du récit.' }, { status: 500 });
  }
}