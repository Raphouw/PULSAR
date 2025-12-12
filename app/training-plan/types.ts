// Fichier : app/training-plan/types.ts

export type Zone = 'Z1' | 'Z2' | 'Z3' | 'Z4' | 'Z5' | 'Z6';

export interface WorkoutStep {
  type: 'warmup' | 'steady' | 'interval' | 'rest' | 'cooldown' | 'ramp';
  duration_s: number;
  power_pct: number; // % de FTP
  cadence?: number; // Cible de cadence
  hr_zone?: Zone; // Cible cardiaque (optionnel)
  label?: string;
}

export interface Workout {
  id: string;
  template_id?: string;
  name: string;
  duration_s: number;
  tss: number;
  dominant_zone: Zone;
  day_number: number;
  completed?: boolean;
  steps: WorkoutStep[]; // Obligatoire maintenant pour l'édition
  if_est?: number;
}

export interface TrainingWeek {
  week_number: number;
  theme: string;
  workouts: Workout[];
}

export interface TrainingPlan {
  id: string;
  user_id?: string; // Important pour le filtre "Mes plans"
  name: string;
  description: string;
  category: 'Endurance' | 'Montagne' | 'Explosivité' | 'Force' | 'Seuil' | 'Perso'; // Ajout 'Perso'
  duration_weeks: number;
  total_tss: number;
  avg_hours_week: number;
  compatibility_score: number;
  weekly_load_progression: number[];
  zone_distribution: Record<Zone, number>;
  tags: string[];
  is_active?: boolean;
  weeks: TrainingWeek[];
  created_at?: string;
}