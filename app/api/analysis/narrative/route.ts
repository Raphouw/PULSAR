// Fichier : app/api/analysis/narrative/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseAdminClient'; 
import { generateActivityNarrative } from '../../../../lib/analysis/narrativeEngine';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth'; 

interface NarrativeRequest {
  activityId: number;
}

export async function POST(request: Request) {
  
  // Sécurité : Vérifier la session utilisateur
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

    // 1. Récupérer l'activité
    const { data: activityRaw, error: activityError } = await supabaseAdmin
      .from('activities')
      .select(`streams_data, user_id, users ( ftp, weight, max_heart_rate )`)
      .eq('id', activityId)
      .limit(1)
      .maybeSingle();

    if (activityError || !activityRaw) {
        console.error("Erreur BDD ou activité introuvable:", activityError);
        return NextResponse.json({ error: 'Activité non trouvée ou erreur BDD.' }, { status: 404 });
    }

    // ⚡ FIX: On cast l'activité en any pour débloquer l'accès aux props
    const activityData = activityRaw as any;

    // 1.1 Sécurité : Vérifier l'appartenance
    if (activityData.user_id?.toString() !== userId) {
        return NextResponse.json({ error: 'Activité non associée à cet utilisateur.' }, { status: 403 });
    }
    
    // 1.2 Vérifier les streams
    if (!activityData.streams_data) {
         return NextResponse.json({ narrative: "Données de flux (streams) absentes. Impossible de générer le récit narratif." }, { status: 200 });
    }

    // 🔥 CORRECTION TYPESCRIPT RADICALE
    // On force le type 'any' ici pour dire à TS : "Laisse-moi gérer la structure, je sais ce que je fais".
    const rawUsersData: any = activityData.users; 
    
    type UserProfileData = { ftp: number | null; weight: number | null; max_heart_rate: number | null };
    let cleanUserProfile: UserProfileData | null = null;
    
    // Logique robuste : Tableau OU Objet unique
    if (Array.isArray(rawUsersData)) {
        if (rawUsersData.length > 0) {
            cleanUserProfile = rawUsersData[0] as UserProfileData;
        }
    } else if (rawUsersData) {
        cleanUserProfile = rawUsersData as UserProfileData;
    }
    
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