// Fichier : app/training-plan/data/workoutLibrary.ts

import { Zone } from "../types";

export type WorkoutCategory = 'RECOVERY' | 'ENDURANCE' | 'TEMPO/SST' | 'THRESHOLD' | 'VO2MAX' | 'ANAEROBIC' | 'PRO_REPLICA';

export interface WorkoutTemplate {
  id: string;
  name: string;
  description: string;
  duration_s: number;
  tss_est: number;
  dominant_zone: Zone;
  category: WorkoutCategory;
  steps: {
    type: 'warmup' | 'steady' | 'interval' | 'rest' | 'cooldown' | 'ramp';
    duration_s: number;
    power_pct: number; // % de FTP
    label?: string;
  }[];
}

export interface WeekSchema {
  id: string;
  name: string;
  description: string;
  days_per_week: number;
  difficulty: 'Débutant' | 'Intermédiaire' | 'Avancé' | 'Elite';
  // Mapping: Jour (1=Lundi) -> ID du WorkoutTemplate ou null (repos)
  structure: Record<number, string | null>; 
}

// --- BIBLIOTHÈQUE DE SÉANCES (TEMPLATES) ---
export const WORKOUT_LIBRARY: Record<string, WorkoutTemplate> = {
  // --- RÉCUPÉRATION ---
  'recup_active': {
    id: 'recup_active', name: 'Coffee Ride', description: 'Faire tourner les jambes, zéro stress.',
    duration_s: 2700, tss_est: 20, dominant_zone: 'Z1', category: 'RECOVERY',
    steps: [{ type: 'steady', duration_s: 2700, power_pct: 50 }]
  },

  // --- ENDURANCE ---
  'z2_fondation': {
    id: 'z2_fondation', name: 'Fondation (1h30)', description: 'Le pain et le beurre du cycliste.',
    duration_s: 5400, tss_est: 65, dominant_zone: 'Z2', category: 'ENDURANCE',
    steps: [{ type: 'steady', duration_s: 5400, power_pct: 65 }]
  },
  'z2_long': {
    id: 'z2_long', name: 'Sortie Longue (3h)', description: 'Endurance pure pour la résistance.',
    duration_s: 10800, tss_est: 150, dominant_zone: 'Z2', category: 'ENDURANCE',
    steps: [{ type: 'steady', duration_s: 10800, power_pct: 65 }]
  },

  // --- SWEET SPOT / SEUIL ---
  'sst_classic': {
    id: 'sst_classic', name: 'SweetSpot 2x20', description: 'Le classique pour monter la FTP.',
    duration_s: 5400, tss_est: 85, dominant_zone: 'Z4', category: 'TEMPO/SST',
    steps: [
      { type: 'warmup', duration_s: 1200, power_pct: 55 },
      { type: 'interval', duration_s: 1200, power_pct: 90, label: 'SST 1' },
      { type: 'rest', duration_s: 300, power_pct: 50 },
      { type: 'interval', duration_s: 1200, power_pct: 90, label: 'SST 2' },
      { type: 'cooldown', duration_s: 1500, power_pct: 55 }
    ]
  },
  'over_under': {
    id: 'over_under', name: 'Over-Under (Lactate)', description: 'Alternance au-dessus et en-dessous du seuil pour la clairance du lactate.',
    duration_s: 3600, tss_est: 75, dominant_zone: 'Z4', category: 'THRESHOLD',
    steps: [
      { type: 'warmup', duration_s: 900, power_pct: 55 },
      { type: 'interval', duration_s: 120, power_pct: 95, label: 'Under' },
      { type: 'interval', duration_s: 60, power_pct: 105, label: 'Over' },
      // Répétition simplifiée pour l'exemple
      { type: 'steady', duration_s: 600, power_pct: 90, label: 'Maintien' },
      { type: 'cooldown', duration_s: 900, power_pct: 50 }
    ]
  },

  // --- PRO REPLICAS & HAUTE INTENSITÉ ---
  'ronnestad_30_15': {
    id: 'ronnestad_30_15', name: 'Rønnestad 30/15', description: 'Protocole Norvégien. 3 séries de 13x(30s @120% / 15s Rep).',
    duration_s: 3600, tss_est: 90, dominant_zone: 'Z5', category: 'PRO_REPLICA',
    steps: [{ type: 'interval', duration_s: 3600, power_pct: 85 }] // Simplifié graphiquement
  },
  'mvdp_finish': {
    id: 'mvdp_finish', name: 'MvdP Final K', description: 'Simulation finale Strade Bianche. Anaérobie pure.',
    duration_s: 4500, tss_est: 85, dominant_zone: 'Z6', category: 'PRO_REPLICA',
    steps: [{ type: 'interval', duration_s: 60, power_pct: 150 }] 
  },
  'pogacar_zone2': {
    id: 'pogacar_zone2', name: 'Pogi Z2 (Fatmax)', description: 'Zone 2 haute cadence (95-100rpm) comme utilisé par UAE.',
    duration_s: 7200, tss_est: 110, dominant_zone: 'Z2', category: 'PRO_REPLICA',
    steps: [{ type: 'steady', duration_s: 7200, power_pct: 72 }]
  }
};

// --- ARCHÉTYPES DE SEMAINE ---
export const WEEK_SCHEMAS: WeekSchema[] = [
  {
    id: 'time_crunched',
    name: 'Time Crunched (Express)',
    description: '4 séances courtes mais intenses. Idéal pour ceux qui ont peu de temps (6h/sem).',
    days_per_week: 4,
    difficulty: 'Intermédiaire',
    structure: {
      1: null, // Lundi Repos
      2: 'sst_classic', // Mardi Qualité
      3: 'recup_active', // Mercredi Cool
      4: 'ronnestad_30_15', // Jeudi Intensité
      5: null, // Vendredi Repos
      6: 'z2_fondation', // Samedi
      7: 'z2_fondation' // Dimanche
    }
  },
  {
    id: 'polarized',
    name: 'Polarisé 80/20',
    description: 'Beaucoup de volume à basse intensité, une seule séance très dure. La méthode des pros.',
    days_per_week: 5,
    difficulty: 'Avancé',
    structure: {
      1: 'recup_active',
      2: 'mvdp_finish', // La séance dure
      3: 'z2_fondation',
      4: null,
      5: 'z2_long',
      6: 'z2_long',
      7: null
    }
  },
  {
    id: 'weekend_warrior',
    name: 'Weekend Warrior',
    description: 'La semaine cool, le weekend à fond.',
    days_per_week: 3,
    difficulty: 'Débutant',
    structure: {
      1: null, 2: null, 3: 'sst_classic', 4: null, 5: null, 
      6: 'z2_long', 7: 'z2_fondation'
    }
  }
];