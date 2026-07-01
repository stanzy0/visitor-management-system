import { headers } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase-admin'

async function getUserFromAccessToken(token: string) {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`
  const response = await fetch(url, {
    headers: {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    return null
  }

  const body = await response.json()
  const user = body.user ?? body
  return user
}

export async function requireAdmin() {
  const authHeader = (await headers()).get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    return { authorized: false, error: 'Unauthorized', status: 401 as const }
  }

  const user = await getUserFromAccessToken(token)
  if (!user) {
    return { authorized: false, error: 'Unauthorized', status: 401 as const }
  }

  if (!supabaseAdmin) {
    return { authorized: false, error: 'Service role key not configured', status: 500 as const }
  }

  const { data: userRole, error } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (error || !userRole) {
    return { authorized: false, error: 'Access denied', status: 403 as const }
  }

  if (userRole.role !== 'Admin') {
    return { authorized: false, error: 'Access denied', status: 403 as const }
  }

  return { authorized: true, userEmail: user.email }
}

export async function requireRole(allowedRoles: string[]) {
  const authHeader = (await headers()).get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    return { authorized: false, error: 'Unauthorized', status: 401 as const }
  }

  const user = await getUserFromAccessToken(token)
  if (!user) {
    return { authorized: false, error: 'Unauthorized', status: 401 as const }
  }

  if (!supabaseAdmin) {
    return { authorized: false, error: 'Service role key not configured', status: 500 as const }
  }

  const { data: userRole, error } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (error || !userRole) {
    return { authorized: false, error: 'Access denied', status: 403 as const }
  }

  if (!allowedRoles.includes(userRole.role)) {
    return { authorized: false, error: 'Access denied', status: 403 as const }
  }

  return { authorized: true, userEmail: user.email }
}
