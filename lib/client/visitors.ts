import type { Visitor } from '@/lib/types/visitor'
import { getAuthHeaders } from '@/lib/client/api'

export async function getVisitors(): Promise<Visitor[]> {
  const res = await fetch('/api/visitors', {
    headers: await getAuthHeaders(),
  })
  if (!res.ok) throw new Error('Failed to fetch visitors')
  const { data } = await res.json()
  return data as Visitor[]
}

export async function getVisitorById(id: string): Promise<Visitor | null> {
  const res = await fetch(`/api/visitors/${id}`, {
    headers: await getAuthHeaders(),
  })
  if (!res.ok) return null
  const { data } = await res.json()
  return data as Visitor
}

export async function createVisitor(visitorData: Record<string, unknown>): Promise<Visitor> {
  const res = await fetch('/api/visitors', {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(visitorData),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to create visitor')
  }
  const { data } = await res.json()
  return data as Visitor
}

export async function updateVisitor(id: string, visitorData: Record<string, unknown>): Promise<Visitor> {
  const res = await fetch(`/api/visitors/${id}`, {
    method: 'PUT',
    headers: await getAuthHeaders(),
    body: JSON.stringify(visitorData),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to update visitor')
  }
  const { data } = await res.json()
  return data as Visitor
}

export async function deleteVisitor(id: string): Promise<void> {
  const res = await fetch(`/api/visitors/${id}`, {
    method: 'DELETE',
    headers: await getAuthHeaders(),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to delete visitor')
  }
}
