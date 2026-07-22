import type { Visit, VisitFormData } from '@/lib/types/visit'
import { getAuthHeaders } from '@/lib/client/api'

export async function getVisits(): Promise<Visit[]> {
  const res = await fetch('/api/visits', {
    headers: await getAuthHeaders(),
  })
  if (!res.ok) throw new Error('Failed to fetch visits')
  const { data } = await res.json()
  return data as Visit[]
}

export async function getVisitById(id: string): Promise<Visit | null> {
  const res = await fetch(`/api/visits/${id}`, {
    headers: await getAuthHeaders(),
  })
  if (!res.ok) return null
  const { data } = await res.json()
  return data as Visit
}

export async function createVisit(visitData: VisitFormData): Promise<Visit> {
  const res = await fetch('/api/visits', {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(visitData),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to create visit')
  }
  const { data } = await res.json()
  return data as Visit
}

export async function updateVisit(id: string, visitData: Partial<VisitFormData>): Promise<Visit> {
  const res = await fetch(`/api/visits/${id}`, {
    method: 'PUT',
    headers: await getAuthHeaders(),
    body: JSON.stringify(visitData),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to update visit')
  }
  const { data } = await res.json()
  return data as Visit
}
