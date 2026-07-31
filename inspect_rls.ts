import { createClient } from '@supabase/supabase-js'

const client = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function inspect() {
  // Count rows
  const { count } = await client.from('visitor_documents').select('*', { count: 'exact', head: true })
  console.log('Total rows:', count)

  // Try to select with anon client (simulate RLS)
  const { createClient: createAnonClient } = await import('@supabase/supabase-js')
  const anon = createAnonClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data: anonData } = await anon.from('visitor_documents').select('id, verification_status').limit(10)
  console.log('Anon query count:', anonData?.length || 0)
  console.log('Anon sample:', anonData?.slice(0, 3))
}

inspect().catch(console.error)
