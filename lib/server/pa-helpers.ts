import { supabaseAdmin } from '@/lib/supabase-admin'

export type PARole = 'PA_TO_CI' | 'PA_TO_DIRECTOR'

export interface AssignedHostResult {
  role: PARole | null
  hostEmployeeId: string | null
}

/**
 * Canonical authorization resolver for PA roles.
 *
 * 1. Resolves the logged-in user's role.
 * 2. Confirms they are PA_TO_CI or PA_TO_DIRECTOR.
 * 3. Reads their user_host_assignments entry.
 * 4. Returns the assigned employee_id.
 *
 * The authoritative relationship is user_host_assignments. No position-based
 * fallback is used once an assignment exists; PA users without a valid
 * assignment see no host visitors.
 */
export async function getAssignedHostEmployeeForPA(
  userId: string,
  role?: string
): Promise<AssignedHostResult> {
  if (!supabaseAdmin) return { role: null, hostEmployeeId: null }

  let resolvedRole = role
  if (!resolvedRole || (resolvedRole !== 'PA_TO_CI' && resolvedRole !== 'PA_TO_DIRECTOR')) {
    const { data: userRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle()
    resolvedRole = userRole?.role
  }

  if (resolvedRole !== 'PA_TO_CI' && resolvedRole !== 'PA_TO_DIRECTOR') {
    return { role: null, hostEmployeeId: null }
  }

  const { data: assignment } = await supabaseAdmin
    .from('user_host_assignments')
    .select('employee_id')
    .eq('user_id', userId)
    .maybeSingle()

  return {
    role: resolvedRole as PARole,
    hostEmployeeId: assignment?.employee_id || null,
  }
}

/**
 * Resolves the assigned host employee id for a PA user from user_host_assignments.
 * Deprecated position-based fallback removed: the authoritative relationship is
 * the explicit user_host_assignments row.
 */
export async function getHostEmployeeIdForPA(userId: string, paRole: string): Promise<string | null> {
  const { hostEmployeeId } = await getAssignedHostEmployeeForPA(userId, paRole)
  return hostEmployeeId
}

export async function getAssignedHostEmployeeId(userId: string): Promise<string | null> {
  if (!supabaseAdmin) return null

  const { data: assignment } = await supabaseAdmin
    .from('user_host_assignments')
    .select('employee_id')
    .eq('user_id', userId)
    .single()

  return assignment?.employee_id || null
}

export async function setHostAssignment(userId: string, employeeId: string): Promise<boolean> {
  if (!supabaseAdmin) return false

  try {
    await supabaseAdmin
      .from('user_host_assignments')
      .upsert({ user_id: userId, employee_id: employeeId })

    return true
  } catch {
    return false
  }
}

export async function clearHostAssignment(userId: string): Promise<boolean> {
  if (!supabaseAdmin) return false

  try {
    await supabaseAdmin
      .from('user_host_assignments')
      .delete()
      .eq('user_id', userId)

    return true
  } catch {
    return false
  }
}

export async function getPARole(userId: string): Promise<string | null> {
  if (!supabaseAdmin) return null

  const { data: userRole } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single()

  if (!userRole) return null

  if (userRole.role === 'PA_TO_DIRECTOR' || userRole.role === 'PA_TO_CI') {
    return userRole.role
  }

  return null
}
