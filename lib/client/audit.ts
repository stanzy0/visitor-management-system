import { getAuthHeaders } from '@/lib/client/api'

export async function logAuditAction(
  action: string,
  entityType: string,
  entityId: string | null,
  details: string
): Promise<void> {
  try {
    const headers = await getAuthHeaders()

    // If there is no active session (e.g. a failed login attempt), do not fire an
    // authenticated audit request — it would return 401 and surface a misleading
    // console error when authentication itself has already failed.
    if (!headers.get('Authorization')) {
      return
    }

    await fetch('/api/audit', {
      method: 'POST',
      headers,
      body: JSON.stringify({ action, entityType, entityId, details }),
    })
  } catch (err) {
    // Audit logging must never break the calling flow.
  }
}
