// --- TYPES ---
export type CalendarActivity = {
  id: number
  name: string
  start_time: string
  start_lat?: number | null
  start_lng?: number | null
  distance_km: number
  elevation_gain_m: number
  duration_s: number
  tss: number | null
  type: string | null
  avg_power_w?: number | null
  avg_heartrate?: number | null
  max_heartrate?: number | null
  avg_speed_kmh?: number | null
  calories_kcal?: number | null
  // Nouveaux champs pour l'estimation
  estimated_tss?: number 
}


export type EffectSlot = 
  | "FRAME"       // Bordures (Néon, Magma...)
  | "HOVER"       // Effet au survol de la carte (Glitch, Jelly...)
  | "TRAIL"       // Particules qui suivent la souris (Feu, Neige...)
  | "INTERACTION" // Clic (Explosion...)
  | "AMBIANCE"    // Global (Météo, IA)
  | "TODAY"
  | "SPECIAL"
  | "AURA"



export type UserLoadout = {
  [key in EffectSlot]: string | null // Un ID d'effet par slot
}

export type ShopData = {
  serverBalance?: number // 🔥 Nouveau champ optionnel (le vrai solde)
  spentTSS: number
  ownedEffects: string[]
  loadout: UserLoadout
}

export interface CalendarDay {
  dayNum: number
  acts: CalendarActivity[]
  totalTSS: number
  streakIndex: number
  isFullWeek?: boolean
}

export interface CumulativeDataPoint {
  day: number
  km: number
}

export type ShopEffect = {
  id: string
  name: string
  description: string
  price: number
  slot: EffectSlot // 🔥 REMPLACE "type" pour être plus strict
  preview: string  // Emoji ou icône
  colors: string[] // Pour les particules
  cssClass?: string // La classe CSS appliquée
  requiresActivity?: boolean // True si l'effet ne marche que sur une case active (ex: Pulse)
}