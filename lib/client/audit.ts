import { getAuthHeaders } from '@/lib/client/api'

export async function logAuditAction(
  action: string,
  entityType: string,
  entityId: string | null,
  details: string
): Promise<void> {
  try {
    await fetch('/api/audit', {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ action, entityType, entityId, details }),
    })
   } catch (err) {
  }
}
