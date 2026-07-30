import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error(
    '[AlumniCV] Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY.\n' +
    'En desarrollo: cópialas en frontend/.env.local\n' +
    'En Railway: agrégalas en Variables y haz redeploy para que Vite las incluya en el build.'
  )
}

export const supabase = createClient(
  supabaseUrl ?? 'https://placeholder.supabase.co',
  supabaseKey ?? 'placeholder'
)
