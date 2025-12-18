import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'

// Vérification stricte des variables d'env
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('❌ Missing Supabase environment variables')
}

// Le client est maintenant générique avec <Database>
// Toutes les requêtes seront autocomplétées !
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)