// Fichier : types/events.ts

export type EventRoute = {
  id: number;
  name: string;
  type: 'GrandFondo' | 'MedioFondo' | 'Rando' | string; // Élargi pour supporter les autres types ('Ultra', 'Course', 'Autre')
  distance_km: number;
  elevation_gain_m: number;
  price_eur: number;
  aid_stations_count: number;
  start_time: string;
  participants_limit?: number | null;
  gpx_url?: string | null;
  polyline?: string | null; // Polyline encodée pour l'affichage carte
};

// Interface pour les entrées d'historique de l'ancienne table (conservée pour la rétrocompatibilité)
export type EventHistory = {
  year: number;
  participants_count: number | null;
  winner_name?: string | null;
  winner_time?: string | null;
  weather_condition?: string | null;
};

// Interface pour les événements d'une même série (utilisée par l'API GET)
export type SeriesEvent = {
    id: number;
    name: string;
    date_start: string;
    location: string;
    country: string;
    // Nouveaux champs de résultats
    winner_name_m?: string | null;
    winner_time_m?: string | null;
    winner_name_f?: string | null;
    winner_time_f?: string | null;
    // Champs légers de base
    routes?: EventRoute[]; // Les routes pourraient être incluses si besoin
};
export interface WeatherData {
  tempMax: number;
  tempMin: number;
  windSpeed: number;
  rain: number;
  code: number;
}

// Interface principale de l'événement
export type CycloEvent = {
  id: number;
  name: string;
  description?: string | null;
  date_start: string; 
  date_end?: string | null; 
  start_time?: string | null;  // Format "HH:MM"
  end_time?: string | null;    // Format "HH:MM"
  location: string;
  country: string;
  website_url?: string | null;
  registration_url?: string | null;
  image_url?: string | null;
  jersey_url?: string | null;
  rating_global: number;
  rating_quality_price: number;
  
  // NOUVEAUX CHAMPS STRUCTURANTS
  series_id?: string | null; // Identifiant pour lier les éditions historiques
  
  // NOUVEAUX CHAMPS DE RÉSULTATS (pour l'édition actuelle)
  winner_name_m?: string | null;
  winner_time_m?: string | null;
  winner_name_f?: string | null;
  winner_time_f?: string | null;

  routes: EventRoute[]; // Liste des parcours associés
  history?: EventHistory[]; // Anciennes entrées d'historique (potentiellement redondantes)

  // Coordonnées du point de départ pour la météo (Objet JSONB dans la BDD)
  coordinates?: { lat: number; lon: number } | null;

final_weather_json?: WeatherData | null;

  // 🔥 Champ enrichi par l'API GET pour l'historique de la série
  related_series_events?: SeriesEvent[]; 


};

export interface RelatedEdition {
    id: number;
    name: string;
    date_start: string;
    // Ajout des colonnes de vainqueurs pour toutes les éditions
    winner_name_m?: string | null;
    winner_time_m?: string | null;
    winner_name_f?: string | null;
    winner_time_f?: string | null;
}