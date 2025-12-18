import { getServerSession } from "next-auth/next";
import { authOptions } from "../../lib/auth";
import { redirect } from "next/navigation";
import WorldClient from "./WorldClient";
import { Activity, mapActivitiesToNodes, calculateStats } from "../../lib/treeUtils";
import { supabaseAdmin } from "../../lib/supabaseAdminClient";

// 🔥 FONCTION DE FETCH DES ACTIVITÉS DE LA BDD
async function fetchUserActivities(userId: string): Promise<Activity[]> {
    const today = new Date();
    // Début de l'année courante (simule "cette année")
    const startOfYear = new Date(today.getFullYear(), 0, 1).toISOString(); 

    const { data, error } = await supabaseAdmin
        .from("activities")
        .select(`
          id,
          name,
          type,
          distance_km,
          elevation_gain_m,
          duration_s,
          start_time
        `)
        .eq("user_id", userId)
        .gte("start_time", startOfYear) // 🔥 Filtre par année courante
        .order("start_time", { ascending: true })
        .limit(300); // Max 300 activités pour une fluidité d'affichage

    if (error) {
        console.error("Erreur de fetch des activités pour l'Arbre-Monde:", error);
        return [];
    }
    
    // @ts-ignore 
    return data as Activity[];
}


export default async function WorldPage() {
  const session = await getServerSession(authOptions);

  // @ts-ignore
  if (!session || !session.user?.id) {
    redirect("/"); 
  }
  
  // @ts-ignore
  const userId = session.user.id; 

  // 🔥 Récupération des données réelles
  const rawActivities = await fetchUserActivities(userId);
  
  // 🔥 Mapping des données réelles vers les nœuds visuels
  const activityData = mapActivitiesToNodes(rawActivities); 
  
  // Calcul des statistiques globales (maintenant basées sur les données réelles)
  const yearStats = calculateStats(activityData);

  if (activityData.length === 0) {
      // Affichage minimal si aucune activité n'est trouvée
      return (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <h1 style={{color: 'var(--accent)'}}>Arbre-Monde</h1>
              <p>Connectez Strava ou importez des activités pour faire pousser votre arbre !</p>
          </div>
      );
  }


  return (
    <WorldClient 
      data={activityData}
      yearStats={yearStats}
    />
  );
}