// Fichier : types/next-auth.d.ts
import "next-auth";
import { JWT } from "next-auth/jwt";
import { ChartDataset, ChartType } from 'chart.js';

// ---------------------------------------------------------
// 1. EXTENSION DES TYPES NEXT-AUTH (C'est ici qu'on modifie)
// ---------------------------------------------------------
declare module "next-auth" {
  interface User {
    id: string; // Notre ID Supabase
    strava_id?: string | number | null;
    name?: string | null;
    email?: string | null;
    // 🔥 AJOUT : Pour gérer l'inscription obligatoire
    onboarding_completed: boolean; 
  }
  
  interface Session {
    user: {
      id: string; // Notre ID Supabase
      strava_id?: string | number | null;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      // 🔥 AJOUT : Accessible dans useSession() côté client
      onboarding_completed: boolean; 
    };
    // Tokens Strava
    access_token?: string;
    refresh_token?: string;
    expires_at?: number;
    // Flags pour l'import et erreurs
    justConnectedStrava?: boolean;
    error?: string;
    stravaLinkError?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: string; // Notre ID Supabase
    strava_id?: string | number | null;
    access_token?: string;
    refresh_token?: string;
    expires_at?: number;
    justConnectedStrava?: boolean;
    error?: string;
    name?: string | null;
    email?: string | null;
    picture?: string | null;
    stravaLinkError?: string;
    // 🔥 AJOUT : Stocké dans le cookie crypté
    onboarding_completed: boolean; 
  }
}

// ---------------------------------------------------------
// 2. EXTENSION CHART.JS
// ---------------------------------------------------------
declare module 'chart.js' {
  interface ChartDataset<TType extends ChartType, TData> {
    // On déclare que 'customData' peut exister
    customData?: any; 
  }
}

// ---------------------------------------------------------
// 3. TES TYPES MÉTIERS (INCHANGÉS)
// ---------------------------------------------------------


export type ActivityStreams = {
  time: (number | null)[];
  watts?: (number | null)[];
  heartrate?: (number | null)[];
  cadence?: (number | null)[];
  altitude?: (number | null)[];
  latlng?: ([number, number] | null)[];
  distance?: (number | null)[];
  temp?: (number | null)[];
};

export interface EventRoute {
    id: number;
    event_id: number;
    name: string;
    type: string; // Ex: Course, Randonnée, RandoSportive
    distance_km: number;
    elevation_gain_m: number;
    price_eur: number;
    participants_limit: number | null;
    aid_stations_count: number;
    start_time: string | null; // Format TIME (HH:MM:SS)
    gpx_url: string | null;
}

/**
 * Représente une ligne de la table public.event_history.
 */
export interface EventHistory {
    id: number;
    event_id: number;
    year: number;
    participants_count: number | null;
    winner_name: string | null;
    winner_time: string | null; // Format INTERVAL (string)
    weather_condition: string | null;
}

/**
 * Représente une ligne de la table public.events, enrichie avec ses routes et son historique.
 */
export interface CycloEvent {
    // Champs de la table events (hypothétique)
    id: number;
    name: string;
    description: string;
    date_start: string; // ISO Date String
    date_end: string;   // ISO Date String
    location: string;
    country: string;
    registration_url: string | null;
    website_url: string | null;
    image_url: string | null;
    jersey_url: string | null;
    
    // Ratings PULSAR
    rating_global: number;
    rating_quality_price: number;
    
    // Relations
    routes: EventRoute[]; // Jointure sur event_routes
    history: EventHistory[]; // Jointure sur event_history
}



export type Activity = {
  id: number;
  name: string;
  distance_km: number;
  elevation_gain_m: number;
  start_time: string;
  duration_s: number;
};

export type ActivityCardData = {
  id: number;
  name: string;
  distance_km: number;
  elevation_gain_m: number;
  start_time: string;
  avg_speed_kmh: number;
  avg_power_w: number | null;
  tss: number | null;
  type?: string | null;
  duration_s: number | 0;
  polyline: { polyline: string } | null;
};

// --- Nouveaux Types pour le module ÉVÉNEMENT ---

export type EventCourse = {
  id: number;
  event_id: number;
  name: string;
  distance_km: number;
  elevation_gain_m: number;
  price_eur: number;
  price_per_km: number;
  polyline: { polyline: string } | null;
};

export type Event = {
  id: number;
  name: string;
  date: string;
  location: string;
  website_url: string;
  registration_url: string;
  budget_estimation: number | null;
  num_feed_stations: number | null;
  max_participants: number | null;
  historical_data: any; // jsonb
  rating: number | null;
  price_quality_ratio: number | null;
  main_image_url: string | null;
  courses: EventCourse[]; // Relation pour le front-end
};