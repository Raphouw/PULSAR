// Fichier : lib/treeUtils.ts

import { ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type ActivityType = "Run" | "Ride" | "Swim" | "Hike" | "Workout" | string;

// 🔥 NOUVEAUX TYPES DE FILTRES
export type DistanceCategory = "short" | "medium" | "long" | "ultra";

export interface Activity {
  id: number;
  start_time: string;
  name: string;
  type: ActivityType;
  distance_km: number; 
  elevation_gain_m: number; 
  duration_s: number; 
}

export interface ActivityNode {
  id: string;
  date: string;
  type: ActivityType;
  distance: number;
  elevation: number;
  duration: number;
  color: string;
  intensity: number; // 0-1 scale for visualization radius
  // 🔥 AJOUT DE LA CATÉGORIE POUR LE FILTRAGE CÔTÉ CLIENT
  category: DistanceCategory;
}

export interface YearStats {
  totalDistance: number;
  totalElevation: number;
  totalDuration: number;
  activityCount: number;
  // 🔥 COMPTE PAR CATÉGORIE DE DISTANCE
  counts: Record<DistanceCategory, number>;
  biggestRide: number;
}

// Nouvelle palette basée sur la distance (inchangée)
export const DISTANCE_PALETTE = {
  short: "#10b981",    // Courte (<50km)
  medium: "#3b82f6",   // Moyenne (50-100km)
  long: "#ffaa00",     // Longue (100-250km)
  ultra: "#ff00ff",    // Ultra (>250km)
  background: "#02040a"
};


/**
 * Maps DB activity data to the visual ActivityNode structure.
 * Assigns color and intensity based on distance (km).
 */
export const mapActivitiesToNodes = (activities: Activity[]): ActivityNode[] => {
  if (activities.length === 0) return [];
  
  // Trouver la distance maximale pour normaliser l'intensité (rayon)
  const maxDistance = activities.reduce((max, a) => Math.max(max, a.distance_km), 0);
  
  return activities.map((activity) => {
    let color: string;
    let category: DistanceCategory; // 🔥 Nouvelle variable
    let distanceKm = activity.distance_km;

    if (distanceKm < 50) {
      color = DISTANCE_PALETTE.short;
      category = 'short';
    } else if (distanceKm < 100) {
      color = DISTANCE_PALETTE.medium;
      category = 'medium';
    } else if (distanceKm < 250) {
      color = DISTANCE_PALETTE.long;
      category = 'long';
    } else {
      color = DISTANCE_PALETTE.ultra;
      category = 'ultra';
    }

    const intensity = 0.3 + (Math.min(1, distanceKm / (maxDistance || 1)) * 0.7);

    return {
      id: String(activity.id),
      date: activity.start_time,
      type: activity.type,
      distance: distanceKm,
      elevation: activity.elevation_gain_m,
      duration: activity.duration_s / 60, // Convertir secondes en minutes
      color,
      intensity,
      category, // 🔥 Export de la catégorie
    };
  });
};

export const calculateStats = (activities: ActivityNode[]): YearStats => {
  return activities.reduce((acc, curr) => {
    const distanceCategory = curr.category;
    
    return {
      totalDistance: acc.totalDistance + curr.distance,
      totalElevation: acc.totalElevation + curr.elevation,
      totalDuration: acc.totalDuration + curr.duration,
      activityCount: acc.activityCount + 1,
      counts: {
        ...acc.counts,
        [distanceCategory]: (acc.counts[distanceCategory] || 0) + 1
      },
      biggestRide: Math.max(acc.biggestRide, curr.type.includes('Ride') ? curr.distance : 0),
      // 🔥 SUPPRESSION : biggestRun n'est plus calculé
      // biggestRun: Math.max(acc.biggestRun, curr.type.includes('Run') ? curr.distance : 0)
    };
  }, {
    totalDistance: 0,
    totalElevation: 0,
    totalDuration: 0,
    activityCount: 0,
    counts: {} as Record<DistanceCategory, number>,
    biggestRide: 0,
    // 🔥 SUPPRESSION : biggestRun initialisé à 0
    // biggestRun: 0 
  });
};