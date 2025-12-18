import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_KEY

// Vérification stricte : On ne lance PAS l'appli si les clés critiques manquent.
if (!supabaseUrl) {
  throw new Error('🚨 CRITIQUE : NEXT_PUBLIC_SUPABASE_URL est manquant dans .env.local')
}

if (!supabaseServiceRoleKey) {
  throw new Error('🚨 CRITIQUE : SUPABASE_SERVICE_KEY est manquant dans .env.local (Requis pour auth & admin)')
}

// Maintenant, TypeScript et Supabase sont contents car les variables sont garanties string
export const supabaseAdmin = createClient<Database>(
  supabaseUrl,
  supabaseServiceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)