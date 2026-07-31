import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('[Supabase Admin] Service role configured:', !!supabaseServiceKey)
console.log('[Supabase Admin] Service role key value:', supabaseServiceKey)

export const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      db: { timeout: 30000 },
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null