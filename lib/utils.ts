import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Fonction pour calculer les rangs avant insertion
async function calculateRanks(supabase: any, segmentId: number, userId: string, durationSeconds: number) {
  
  // 1. Calculer le RANG GLOBAL
  // On compte combien d'efforts sur ce segment sont STRICTEMENT plus rapides (< duration)
  const { count: fasterGlobalCount, error: errGlobal } = await supabase
    .from('activity_segments')
    .select('*', { count: 'exact', head: true }) // 'head: true' pour ne pas télécharger les données, juste compter
    .eq('segment_id', segmentId)
    .lt('duration_s', durationSeconds); // lt = lower than (plus rapide que)

  // 2. Calculer le RANG PERSONNEL
  const { count: fasterPersonalCount, error: errPerso } = await supabase
    .from('activity_segments')
    .select('*', { count: 'exact', head: true })
    .eq('segment_id', segmentId)
    .eq('user_id', userId)
    .lt('duration_s', durationSeconds);

  if (errGlobal || errPerso) {
    console.error("Erreur calcul rangs:", errGlobal || errPerso);
    return { rank_global: null, rank_personal: null, is_pr: false };
  }

  // Le rang = Nombre de gens plus rapides + 1
  const rank_global = (fasterGlobalCount || 0) + 1;
  const rank_personal = (fasterPersonalCount || 0) + 1;

  // Si rank_personal est 1, c'est un PR !
  const is_pr = rank_personal === 1;

  return { rank_global, rank_personal, is_pr };
}