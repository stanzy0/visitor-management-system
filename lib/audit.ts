import { supabase } from './supabase'

export async function logAuditAction(
  action: string,
  entityType: string,
  entityId: string | null,
  details: string
) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const userEmail = user?.email || 'anonymous'

    const { error } = await supabase.from('audit_logs').insert({
      action,
      entity_type: entityType,
      entity_id: entityId,
      performed_by: userEmail,
      details,
    })

    if (error) {
      console.error('Audit log error:', error)
    }
  } catch (err) {
    console.error('Failed to log audit action:', err)
  }
}