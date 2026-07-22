import type { VisitorInvitation, InvitationFormData } from '@/lib/types/invitation'
import { getAuthHeaders } from '@/lib/client/api'

export type { VisitorInvitation, InvitationFormData }

export async function getInvitations(status?: string, hostId?: string, date?: string): Promise<VisitorInvitation[]> {
  const params = new URLSearchParams()
  if (status) params.set('status', status)
  if (hostId) params.set('hostId', hostId)
  if (date) params.set('date', date)

  const res = await fetch(`/api/invitations?${params.toString()}`, {
    headers: await getAuthHeaders(),
  })
  if (!res.ok) throw new Error('Failed to fetch invitations')
  const { data } = await res.json()
  return data as VisitorInvitation[]
}

export async function getInvitationsByHost(hostEmployeeId: string): Promise<VisitorInvitation[]> {
  return getInvitations(undefined, hostEmployeeId)
}

export async function getAllInvitations(): Promise<VisitorInvitation[]> {
  return getInvitations()
}

export async function createInvitation(data: InvitationFormData & { host_employee_id?: string }): Promise<VisitorInvitation> {
  const res = await fetch('/api/invitations', {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to create invitation')
  }
  const { data: invitation } = await res.json()
  return invitation as VisitorInvitation
}

export async function getInvitationByToken(token: string): Promise<VisitorInvitation | null> {
  const res = await fetch(`/api/invitations/${token}`)
  if (!res.ok) return null
  const { data } = await res.json()
  return data as VisitorInvitation
}

export async function approveInvitation(token: string): Promise<VisitorInvitation> {
  const res = await fetch(`/api/invitations/${token}`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ action: 'approve' }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to approve invitation')
  }
  const { data } = await res.json()
  return data as VisitorInvitation
}

export async function rejectInvitation(token: string): Promise<VisitorInvitation> {
  const res = await fetch(`/api/invitations/${token}`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ action: 'reject' }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to reject invitation')
  }
  const { data } = await res.json()
  return data as VisitorInvitation
}

export async function cancelInvitation(token: string): Promise<void> {
  const res = await fetch(`/api/invitations/${token}`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ action: 'cancel' }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to cancel invitation')
  }
}
