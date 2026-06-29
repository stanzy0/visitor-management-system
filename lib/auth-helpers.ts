import { supabase } from './supabase'

export async function requireAdmin() {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { authorized: false, error: 'Unauthorized', status: 401 as const }
  }

  const { data: userRole } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single()

  if (userRole?.role !== 'Admin') {
    return { authorized: false, error: 'Access denied', status: 403 as const }
  }

  return { authorized: true, userEmail: user.email }
}

export async function requireRole(allowedRoles: string[]) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { authorized: false, error: 'Unauthorized', status: 401 as const }
  }

  const { data: userRole } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single()

  if (!allowedRoles.includes(userRole?.role || '')) {
    return { authorized: false, error: 'Access denied', status: 403 as const }
  }

  return { authorized: true, userEmail: user.email }
}