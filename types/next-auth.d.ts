// Fichier : types/next-auth.d.ts
import "next-auth";
import { JWT } from "next-auth/jwt";
import { ChartDataset, ChartType } from 'chart.js';

// ---------------------------------------------------------
// 1. EXTENSION DES TYPES NEXT-AUTH
// ---------------------------------------------------------
declare module "next-auth" {
  interface User {
    id: string; // Notre ID Supabase
    strava_id?: string | number | null;
    name?: string | null;
    email?: string | null;
    onboarding_completed: boolean;
    // 👇 AJOUTS ICI
    weight?: number | null;
    ftp?: number | null;
  }
  
  interface Session {
    user: {
      id: string; // Notre ID Supabase
      strava_id?: string | number | null;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      onboarding_completed: boolean;
      // 👇 AJOUTS ICI (Accessible via useSession)
      weight?: number | null;
      ftp?: number | null;
    };
    // Tokens Strava
    access_token?: string;
    refresh_token?: string;
    expires_at?: number;
    // Flags
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
    onboarding_completed: boolean;
    // 👇 AJOUTS ICI (Pour persister dans le cookie)
    weight?: number | null;
    ftp?: number | null;
  }
}

// ---------------------------------------------------------
// 2. EXTENSION CHART.JS (INCHANGÉ)
// ---------------------------------------------------------
declare module 'chart.js' {
  interface ChartDataset<TType extends ChartType, TData> {
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
    type: string; 
    distance_km: number;
    elevation_gain_m: number;
    price_eur: number;
    participants_limit: number | null;
    aid_stations_count: number;
    start_time: string | null; 
    gpx_url: string | null;
}

export interface EventHistory {
    id: number;
    event_id: number;
    year: number;
    participants_count: number | null;
    winner_name: string | null;
    winner_time: string | null;
    weather_condition: string | null;
}

export interface CycloEvent {
    id: number;
    name: string;
    description: string;
    date_start: string; 
    date_end: string;   
    location: string;
    country: string;
    registration_url: string | null;
    website_url: string | null;
    image_url: string | null;
    jersey_url: string | null;
    rating_global: number;
    rating_quality_price: number;
    routes: EventRoute[]; 
    history: EventHistory[]; 
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
  distance_km: number | null;
  elevation_gain_m: number | null;
  start_time: string;
  avg_speed_kmh: number | null;
  avg_power_w: number | null;
  tss: number | null;
  polyline: { polyline: string } | null;
  np_w: number | null;
  duration_s: number; 
  type?: string | null;
};

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
  historical_data: any; 
  rating: number | null;
  price_quality_ratio: number | null;
  main_image_url: string | null;
  courses: EventCourse[]; 
};