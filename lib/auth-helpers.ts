import { headers } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

async function getUserFromAccessToken(token: string) {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`
  const response = await fetch(url, {
    headers: {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  })

  console.log('[DEBUG] GET', url)
  console.log('[DEBUG] Supabase Auth response status:', response.status)

  if (!response.ok) {
    let errorBody = 'unable to parse'
    try {
      errorBody = JSON.stringify(await response.json())
    } catch {
      // keep default
    }
    console.log('[DEBUG] Supabase Auth error response:', errorBody)
    return null
  }

  const { data } = await response.json()
  return data
}

export async function requireAdmin() {
  const authHeader = (await headers()).get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  console.log('[DEBUG] Authorization header received:', !!authHeader)
  console.log('[DEBUG] Bearer token extracted:', !!token)
  console.log('[DEBUG] Token length:', token?.length || 0)

  if (!token) {
    console.log('[DEBUG] No token found, returning 401')
    return { authorized: false, error: 'Unauthorized', status: 401 as const }
  }

  const user = await getUserFromAccessToken(token)
  if (!user) {
    console.log('[DEBUG] Supabase Auth returned no user, returning 401')
    return { authorized: false, error: 'Unauthorized', status: 401 as const }
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: userRole } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  console.log('[DEBUG] user_roles result:', userRole?.role || 'not found')

  if (userRole?.role !== 'Admin') {
    return { authorized: false, error: 'Access denied', status: 403 as const }
  }

  return { authorized: true, userEmail: user.email }
}

export async function requireRole(allowedRoles: string[]) {
  const authHeader = (await headers()).get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  console.log('[DEBUG] [requireRole] Authorization header received:', !!authHeader)
  console.log('[DEBUG] [requireRole] Bearer token extracted:', !!token)
  console.log('[DEBUG] [requireRole] Token length:', token?.length || 0)

  if (!token) {
    return { authorized: false, error: 'Unauthorized', status: 401 as const }
  }

  const user = await getUserFromAccessToken(token)
  if (!user) {
    console.log('[DEBUG] [requireRole] Supabase Auth returned no user, returning 401')
    return { authorized: false, error: 'Unauthorized', status: 401 as const }
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: userRole } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (!allowedRoles.includes(userRole?.role || '')) {
    return { authorized: false, error: 'Access denied', status: 403 as const }
  }

  return { authorized: true, userEmail: user.email }
}
