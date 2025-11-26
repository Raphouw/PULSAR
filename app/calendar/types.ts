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
}

export type UserLoadout = {
  hover: string | null
  flip: string | null
  card: string | null
  passive: string | null
  click: string | null
  today: string | null // Pour le réacteur
}

export type ShopData = {
  spentTSS: number
  ownedEffects: string[] // Liste des IDs ['black_hole', 'neon_frame']
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
  type: "hover" | "flip" | "card" | "click" | "passive"
  preview: string
  colors: string[]
  owned: boolean
  cssClass?: string
}