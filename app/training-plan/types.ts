// Fichier : app/training-plan/types.ts

export type Zone = 'Z1' | 'Z2' | 'Z3' | 'Z4' | 'Z5' | 'Z6';

export interface Workout {
  id: string;
  name: string;
  duration_s: number;
  tss: number;
  dominant_zone: Zone;
  day_number: number; // 1 à 7
  completed?: boolean;
}

export interface TrainingWeek {
  week_number: number;
  theme: string;
  workouts: Workout[];
}

export interface TrainingPlan {
  id: string;
  name: string;
  description: string;
  category: 'Endurance' | 'Montagne' | 'Explosivité' | 'Force' | 'Seuil';
  duration_weeks: number;
  total_tss: number;
  avg_hours_week: number;
  compatibility_score: number;
  weekly_load_progression: number[];
  zone_distribution: Record<Zone, number>;
  tags: string[];
  is_active?: boolean;
  weeks: TrainingWeek[];
}