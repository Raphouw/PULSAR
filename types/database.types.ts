export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      activities: {
        Row: {
          id: number
          user_id: number | null
          name: string | null
          polyline: Json | null
          distance_km: number | null
          elevation_gain_m: number | null
          duration_s: number | null
          avg_speed_kmh: number | null
          max_speed_kmh: number | null
          avg_power_w: number | null
          np_w: number | null
          tss: number | null
          intensity_factor: number | null
          calories_kcal: number | null
          start_time: string | null
          created_at: string | null
          updated_at: string | null
          strava_activity_id: number | null
          streams_data: Json | null
          strava_id: number | null
          type: string | null
          avg_heartrate: number | null
          max_heart_rate: number | null
          weather_code: number | null
          temp_min: number | null
          temp_max: number | null
          temp_avg: number | null
        }
        Insert: {
          id?: never // Généré
          user_id?: number | null
          name?: string | null
          polyline?: Json | null
          distance_km?: number | null
          elevation_gain_m?: number | null
          duration_s?: number | null
          avg_speed_kmh?: number | null
          max_speed_kmh?: number | null
          avg_power_w?: number | null
          np_w?: number | null
          tss?: number | null
          intensity_factor?: number | null
          calories_kcal?: number | null
          start_time?: string | null
          created_at?: string | null
          updated_at?: string | null
          strava_activity_id?: number | null
          streams_data?: Json | null
          strava_id?: number | null
          type?: string | null
          avg_heartrate?: number | null
          max_heart_rate?: number | null
          weather_code?: number | null
          temp_min?: number | null
          temp_max?: number | null
          temp_avg?: number | null
        }
        Update: {
          id?: never
          user_id?: number | null
          name?: string | null
          polyline?: Json | null
          distance_km?: number | null
          elevation_gain_m?: number | null
          duration_s?: number | null
          avg_speed_kmh?: number | null
          max_speed_kmh?: number | null
          avg_power_w?: number | null
          np_w?: number | null
          tss?: number | null
          intensity_factor?: number | null
          calories_kcal?: number | null
          start_time?: string | null
          created_at?: string | null
          updated_at?: string | null
          strava_activity_id?: number | null
          streams_data?: Json | null
          strava_id?: number | null
          type?: string | null
          avg_heartrate?: number | null
          max_heart_rate?: number | null
          weather_code?: number | null
          temp_min?: number | null
          temp_max?: number | null
          temp_avg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      activity_segments: {
        Row: {
          id: number
          activity_id: number | null
          segment_id: number | null
          avg_power_w: number | null
          avg_speed_kmh: number | null
          duration_s: number | null
          calories_kcal: number | null
          created_at: string
          start_index: number | null
          end_index: number | null
          np_w: number | null
          avg_heartrate: number | null
          max_heartrate: number | null
          avg_cadence: number | null
          vam: number | null
          w_kg: number | null
          intensity_factor: number | null
          is_pr: boolean | null
          pr_gap_seconds: number | null
        }
        Insert: {
          id?: never
          activity_id?: number | null
          segment_id?: number | null
          avg_power_w?: number | null
          avg_speed_kmh?: number | null
          duration_s?: number | null
          calories_kcal?: number | null
          created_at?: string
          start_index?: number | null
          end_index?: number | null
          np_w?: number | null
          avg_heartrate?: number | null
          max_heartrate?: number | null
          avg_cadence?: number | null
          vam?: number | null
          w_kg?: number | null
          intensity_factor?: number | null
          is_pr?: boolean | null
          pr_gap_seconds?: number | null
        }
        Update: {
          id?: never
          activity_id?: number | null
          segment_id?: number | null
          avg_power_w?: number | null
          avg_speed_kmh?: number | null
          duration_s?: number | null
          calories_kcal?: number | null
          created_at?: string
          start_index?: number | null
          end_index?: number | null
          np_w?: number | null
          avg_heartrate?: number | null
          max_heartrate?: number | null
          avg_cadence?: number | null
          vam?: number | null
          w_kg?: number | null
          intensity_factor?: number | null
          is_pr?: boolean | null
          pr_gap_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_segments_activity_id_fkey"
            columns: ["activity_id"]
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_segments_segment_id_fkey"
            columns: ["segment_id"]
            referencedRelation: "segments"
            referencedColumns: ["id"]
          }
        ]
      }
      events: {
        Row: {
          id: number
          name: string
          description: string | null
          date_start: string
          location: string
          country: string
          website_url: string | null
          registration_url: string | null
          image_url: string | null
          jersey_url: string | null
          organizer: string | null
          rating_global: number | null
          rating_quality_price: number | null
          created_at: string | null
          coordinates: Json | null
          date_end: string | null
          start_time: string | null
          end_time: string | null
          series_id: string | null
          final_weather_json: Json | null
          winner_name_m: string | null
          winner_time_m: string | null
          winner_name_f: string | null
          winner_time_f: string | null
        }
        Insert: {
          id?: never
          name: string
          description?: string | null
          date_start: string
          location: string
          country: string
          website_url?: string | null
          registration_url?: string | null
          image_url?: string | null
          jersey_url?: string | null
          organizer?: string | null
          rating_global?: number | null
          rating_quality_price?: number | null
          created_at?: string | null
          coordinates?: Json | null
          date_end?: string | null
          start_time?: string | null
          end_time?: string | null
          series_id?: string | null
          final_weather_json?: Json | null
          winner_name_m?: string | null
          winner_time_m?: string | null
          winner_name_f?: string | null
          winner_time_f?: string | null
        }
        Update: {
          id?: never
          name?: string
          description?: string | null
          date_start?: string
          location?: string
          country?: string
          website_url?: string | null
          registration_url?: string | null
          image_url?: string | null
          jersey_url?: string | null
          organizer?: string | null
          rating_global?: number | null
          rating_quality_price?: number | null
          created_at?: string | null
          coordinates?: Json | null
          date_end?: string | null
          start_time?: string | null
          end_time?: string | null
          series_id?: string | null
          final_weather_json?: Json | null
          winner_name_m?: string | null
          winner_time_m?: string | null
          winner_name_f?: string | null
          winner_time_f?: string | null
        }
        Relationships: []
      }
      event_history: {
        Row: {
          id: number
          event_id: number
          year: number
          participants_count: number | null
          winner_name: string | null
          winner_time: string | null
          weather_condition: string | null
        }
        Insert: {
          id?: never
          event_id: number
          year: number
          participants_count?: number | null
          winner_name?: string | null
          winner_time?: string | null
          weather_condition?: string | null
        }
        Update: {
          id?: never
          event_id?: number
          year?: number
          participants_count?: number | null
          winner_name?: string | null
          winner_time?: string | null
          weather_condition?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_history_event_id_fkey"
            columns: ["event_id"]
            referencedRelation: "events"
            referencedColumns: ["id"]
          }
        ]
      }
      event_participations: {
        Row: {
          id: number
          user_id: number
          event_id: number
          activity_id: number
          route_id: number | null
          type: 'RACE' | 'RECON'
          performance_time_s: number | null
          pulsar_rank: number | null
          created_at: string | null
        }
        Insert: {
          id?: never
          user_id: number
          event_id: number
          activity_id: number
          route_id?: number | null
          type: 'RACE' | 'RECON'
          performance_time_s?: number | null
          pulsar_rank?: number | null
          created_at?: string | null
        }
        Update: {
          id?: never
          user_id?: number
          event_id?: number
          activity_id?: number
          route_id?: number | null
          type?: 'RACE' | 'RECON'
          performance_time_s?: number | null
          pulsar_rank?: number | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_participations_activity_id_fkey"
            columns: ["activity_id"]
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_participations_event_id_fkey"
            columns: ["event_id"]
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_participations_route_id_fkey"
            columns: ["route_id"]
            referencedRelation: "event_routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_participations_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      event_routes: {
        Row: {
          id: number
          event_id: number
          name: string
          type: string
          distance_km: number
          elevation_gain_m: number
          price_eur: number
          participants_limit: number | null
          aid_stations_count: number | null
          start_time: string | null
          gpx_url: string | null
          polyline: string | null
        }
        Insert: {
          id?: never
          event_id: number
          name: string
          type: string
          distance_km: number
          elevation_gain_m: number
          price_eur: number
          participants_limit?: number | null
          aid_stations_count?: number | null
          start_time?: string | null
          gpx_url?: string | null
          polyline?: string | null
        }
        Update: {
          id?: never
          event_id?: number
          name?: string
          type?: string
          distance_km?: number
          elevation_gain_m?: number
          price_eur?: number
          participants_limit?: number | null
          aid_stations_count?: number | null
          start_time?: string | null
          gpx_url?: string | null
          polyline?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_routes_event_id_fkey"
            columns: ["event_id"]
            referencedRelation: "events"
            referencedColumns: ["id"]
          }
        ]
      }
      event_weather: {
        Row: {
          id: number
          event_id: number
          forecast_date: string
          temperature_max: number | null
          temperature_min: number | null
          windspeed_mean: number | null
          precipitation_sum: number | null
          weather_code: number | null
          fetched_at: string
        }
        Insert: {
          id?: never
          event_id: number
          forecast_date: string
          temperature_max?: number | null
          temperature_min?: number | null
          windspeed_mean?: number | null
          precipitation_sum?: number | null
          weather_code?: number | null
          fetched_at?: string
        }
        Update: {
          id?: never
          event_id?: number
          forecast_date?: string
          temperature_max?: number | null
          temperature_min?: number | null
          windspeed_mean?: number | null
          precipitation_sum?: number | null
          weather_code?: number | null
          fetched_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_weather_event_id_fkey"
            columns: ["event_id"]
            referencedRelation: "events"
            referencedColumns: ["id"]
          }
        ]
      }
      friends: {
        Row: {
          id: number
          user_id: number | null
          friend_id: number | null
          status: string | null
          created_at: string
        }
        Insert: {
          id?: never
          user_id?: number | null
          friend_id?: number | null
          status?: string | null
          created_at?: string
        }
        Update: {
          id?: never
          user_id?: number | null
          friend_id?: number | null
          status?: string | null
          created_at?: string
        }
        Relationships: []
      }
      likes: {
        Row: {
          id: number
          user_id: string
          activity_id: number
          created_at: string | null
        }
        Insert: {
          id?: never
          user_id: string
          activity_id: number
          created_at?: string | null
        }
        Update: {
          id?: never
          user_id?: string
          activity_id?: number
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "likes_activity_id_fkey"
            columns: ["activity_id"]
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          // Note: "likes_user_id_fkey" référence auth.users, qui n'est pas dans public.
        ]
      }
      records: {
        Row: {
          id: number
          user_id: number | null
          type: string | null
          duration_s: number | null
          value: number | null
          date_recorded: string | null
          activity_id: number
        }
        Insert: {
          id?: never
          user_id?: number | null
          type?: string | null
          duration_s?: number | null
          value?: number | null
          date_recorded?: string | null
          activity_id: number
        }
        Update: {
          id?: never
          user_id?: number | null
          type?: string | null
          duration_s?: number | null
          value?: number | null
          date_recorded?: string | null
          activity_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "records_activity_id_fkey"
            columns: ["activity_id"]
            referencedRelation: "activities"
            referencedColumns: ["id"]
          }
        ]
      }
      routes: {
        Row: {
          id: number
          name: string | null
          gpx_data: Json | null
          distance_km: number | null
          elevation_gain_m: number | null
          updated_at: string | null
          created_at: string
          user_id: number | null
        }
        Insert: {
          id?: never
          name?: string | null
          gpx_data?: Json | null
          distance_km?: number | null
          elevation_gain_m?: number | null
          updated_at?: string | null
          created_at?: string
          user_id?: number | null
        }
        Update: {
          id?: never
          name?: string | null
          gpx_data?: Json | null
          distance_km?: number | null
          elevation_gain_m?: number | null
          updated_at?: string | null
          created_at?: string
          user_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "routes_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      segments: {
        Row: {
          id: number
          name: string
          user_id: number | null
          start_lat: number | null
          start_lon: number | null
          end_lat: number | null
          end_lon: number | null
          distance_m: number | null
          elevation_gain_m: number | null
          average_grade: number | null
          max_grade: number | null
          category: string | null
          created_at: string | null
          updated_at: string | null
          polyline: Json | null
          tags: Json | null
          pulsar_index: number | null
          pulsar_density: number | null
          pulsar_category: string | null
          city: string | null
          is_official: boolean | null
        }
        Insert: {
          id?: never
          name: string
          user_id?: number | null
          start_lat?: number | null
          start_lon?: number | null
          end_lat?: number | null
          end_lon?: number | null
          distance_m?: number | null
          elevation_gain_m?: number | null
          average_grade?: number | null
          max_grade?: number | null
          category?: string | null
          created_at?: string | null
          updated_at?: string | null
          polyline?: Json | null
          tags?: Json | null
          pulsar_index?: number | null
          pulsar_density?: number | null
          pulsar_category?: string | null
          city?: string | null
          is_official?: boolean | null
        }
        Update: {
          id?: never
          name?: string
          user_id?: number | null
          start_lat?: number | null
          start_lon?: number | null
          end_lat?: number | null
          end_lon?: number | null
          distance_m?: number | null
          elevation_gain_m?: number | null
          average_grade?: number | null
          max_grade?: number | null
          category?: string | null
          created_at?: string | null
          updated_at?: string | null
          polyline?: Json | null
          tags?: Json | null
          pulsar_index?: number | null
          pulsar_density?: number | null
          pulsar_category?: string | null
          city?: string | null
          is_official?: boolean | null
        }
        Relationships: []
      }
      shop_purchases: {
        Row: {
          id: number
          user_id: number
          effect_id: string
          cost: number
          created_at: string | null
        }
        Insert: {
          id?: never
          user_id: number
          effect_id: string
          cost: number
          created_at?: string | null
        }
        Update: {
          id?: never
          user_id?: number
          effect_id?: string
          cost?: number
          created_at?: string | null
        }
        Relationships: []
      }
      simulations: {
        Row: {
          id: number
          user_id: number | null
          name: string | null
          route_id: number | null
          target_mode: string | null
          config_json: Json | null
          updated_at: string | null
          created_at: string
        }
        Insert: {
          id?: never
          user_id?: number | null
          name?: string | null
          route_id?: number | null
          target_mode?: string | null
          config_json?: Json | null
          updated_at?: string | null
          created_at?: string
        }
        Update: {
          id?: never
          user_id?: number | null
          name?: string | null
          route_id?: number | null
          target_mode?: string | null
          config_json?: Json | null
          updated_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "simulations_route_id_fkey"
            columns: ["route_id"]
            referencedRelation: "routes"
            referencedColumns: ["id"]
          }
        ]
      }
      training_load: {
        Row: {
          id: number
          user_id: number | null
          date: string | null
          tss: number | null
          fatigue_score: number | null
          created_at: string
        }
        Insert: {
          id?: never
          user_id?: number | null
          date?: string | null
          tss?: number | null
          fatigue_score?: number | null
          created_at?: string
        }
        Update: {
          id?: never
          user_id?: number | null
          date?: string | null
          tss?: number | null
          fatigue_score?: number | null
          created_at?: string
        }
        Relationships: []
      }
      training_plans: {
        Row: {
          id: number
          user_id: number
          name: string
          description: string | null
          category: string | null
          duration_weeks: number
          total_tss: number | null
          structure_json: Json
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: never
          user_id: number
          name: string
          description?: string | null
          category?: string | null
          duration_weeks: number
          total_tss?: number | null
          structure_json: Json
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: never
          user_id?: number
          name?: string
          description?: string | null
          category?: string | null
          duration_weeks?: number
          total_tss?: number | null
          structure_json?: Json
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_plans_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      user_fitness_history: {
        Row: {
          id: number
          user_id: number
          date_calculated: string | null
          ftp_value: number | null
          w_prime_value: number | null
          cp3_value: number | null
          cp12_value: number | null
          vo2max_value: number | null
          tte_value: number | null
          source_activity_id: number | null
          model_cp3: number | null
          model_cp12: number | null
        }
        Insert: {
          id?: never
          user_id: number
          date_calculated?: string | null
          ftp_value?: number | null
          w_prime_value?: number | null
          cp3_value?: number | null
          cp12_value?: number | null
          vo2max_value?: number | null
          tte_value?: number | null
          source_activity_id?: number | null
          model_cp3?: number | null
          model_cp12?: number | null
        }
        Update: {
          id?: never
          user_id?: number
          date_calculated?: string | null
          ftp_value?: number | null
          w_prime_value?: number | null
          cp3_value?: number | null
          cp12_value?: number | null
          vo2max_value?: number | null
          tte_value?: number | null
          source_activity_id?: number | null
          model_cp3?: number | null
          model_cp12?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_fitness_history_user_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      user_settings: {
        Row: {
          user_id: number
          equipped_loadout: Json | null
          updated_at: string | null
        }
        Insert: {
          user_id: number
          equipped_loadout?: Json | null
          updated_at?: string | null
        }
        Update: {
          user_id?: number
          equipped_loadout?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          id: number
          email: string
          password_hash: string | null
          name: string | null
          weight: number | null
          age: number | null
          gender: string | null
          ftp: number | null
          CP3: number | null
          CP12: number | null
          w_prime: number | null
          vo2max: number | null
          TTE: number | null
          created_at: string | null
          updated_at: string | null
          avatar_url: string | null
          strava_id: number | null
          strava_token_expires_at: string | null
          strava_access_token: string | null
          strava_refresh_token: string | null
          max_heart_rate: number | null
          resting_heart_rate: number | null
          onboarding_completed: boolean | null
          height: number | null
          wallet_balance: number | null
          spent_tss: number | null
          modeled_ftp: number | null
        }
        Insert: {
          id?: never
          email: string
          password_hash?: string | null
          name?: string | null
          weight?: number | null
          age?: number | null
          gender?: string | null
          ftp?: number | null
          CP3?: number | null
          CP12?: number | null
          w_prime?: number | null
          vo2max?: number | null
          TTE?: number | null
          created_at?: string | null
          updated_at?: string | null
          avatar_url?: string | null
          strava_id?: number | null
          strava_token_expires_at?: string | null
          strava_access_token?: string | null
          strava_refresh_token?: string | null
          max_heart_rate?: number | null
          resting_heart_rate?: number | null
          onboarding_completed?: boolean | null
          height?: number | null
          wallet_balance?: number | null
          spent_tss?: number | null
          modeled_ftp?: number | null
        }
        Update: {
          id?: never
          email?: string
          password_hash?: string | null
          name?: string | null
          weight?: number | null
          age?: number | null
          gender?: string | null
          ftp?: number | null
          CP3?: number | null
          CP12?: number | null
          w_prime?: number | null
          vo2max?: number | null
          TTE?: number | null
          created_at?: string | null
          updated_at?: string | null
          avatar_url?: string | null
          strava_id?: number | null
          strava_token_expires_at?: string | null
          strava_access_token?: string | null
          strava_refresh_token?: string | null
          max_heart_rate?: number | null
          resting_heart_rate?: number | null
          onboarding_completed?: boolean | null
          height?: number | null
          wallet_balance?: number | null
          spent_tss?: number | null
          modeled_ftp?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      hall_of_records: {
        Row: {
          // J'infère les colonnes d'après tes erreurs
          id: number
          user_id: number
          value: number | null
          type: string
          date_recorded: string | null
          activity_id: number | null
          avatar_url: string | null
          name: string | null
        }
      }
      admin_jobs: {
        Row: {
          id: number
          status: string | null
          payload: Json | null
          progress: number | null
          created_at: string | null
          updated_at: string | null
          type: string | null
        }
      }
      user_daily_tss: {
        Row: {
          user_id: number
          date: string
          tss: number | null
          ctl: number | null
          atl: number | null
          tsb: number | null
        }
        Relationships: []
      }
      // Ajoute ici d'autres vues si nécessaire
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}