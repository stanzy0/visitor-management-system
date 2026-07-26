import { supabaseAdmin } from '@/lib/supabase-admin'
import { supabase } from '@/lib/supabase'
import { logAuditAction } from '@/lib/client/audit'
import type { PropertyItem, PropertyFormData, PropertyHistoryRecord, PropertyStatistics } from '@/lib/types/property'

export async function getPropertyItems(filters: { visitId?: string; visitorId?: string; employeeId?: string; status?: string; search?: string } = {}): Promise<PropertyItem[]> {
  if (!supabaseAdmin) throw new Error('Service role key not configured')

  let query = supabaseAdmin
    .from('property_items')
    .select('*, visitor:visitors(*), employee:employees(*)')
    .order('created_at', { ascending: false })

  if (filters.visitId) {
    query = query.eq('visit_id', filters.visitId)
  }

  if (filters.visitorId) {
    query = query.eq('visitor_id', filters.visitorId)
  }

  if (filters.employeeId) {
    query = query.eq('employee_id', filters.employeeId)
  }

  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }

  if (filters.search) {
    query = query.or(`property_number.ilike.%${filters.search}%,name.ilike.%${filters.search}%,serial_number.ilike.%${filters.search}%,category.ilike.%${filters.search}%`)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(error.message)
  }

  return data || []
}

export async function getPropertyItemById(id: string): Promise<PropertyItem | null> {
  if (!supabaseAdmin) throw new Error('Service role key not configured')

  const { data, error } = await supabaseAdmin
    .from('property_items')
    .select('*, visitor:visitors(*), employee:employees(*)')
    .eq('id', id)
    .single()

  if (error || !data) {
    return null
  }

  return data as PropertyItem
}

export async function getPropertyItemByQR(token: string): Promise<PropertyItem | null> {
  if (!supabaseAdmin) throw new Error('Service role key not configured')

  const { data, error } = await supabaseAdmin
    .from('property_items')
    .select('*, visitor:visitors(*), employee:employees(*)')
    .eq('qr_token', token)
    .single()

  if (error || !data) {
    return null
  }

  return data as PropertyItem
}

export async function createPropertyItem(item: PropertyFormData, createdBy: string): Promise<PropertyItem> {
  if (!supabaseAdmin) throw new Error('Service role key not configured')

  const qrToken = Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, '0')).join('')
  const propertyNumber = `PROP-${Date.now().toString(36).toUpperCase()}`

  const { data, error } = await supabaseAdmin
    .from('property_items')
    .insert({
      ...item,
      property_number: propertyNumber,
      qr_token: qrToken,
      created_by: createdBy,
    })
    .select()
    .single()

  if (error || !data) {
    throw new Error(error?.message || 'Failed to create property item')
  }

  await addPropertyHistory(data.id, 'Property Registered', 'Pending Entry', 'Inside', createdBy, `Property ${propertyNumber} registered`)

  await logAuditAction('Property Registered', 'property', data.id, `Property ${propertyNumber} registered for visitor`)

  return data as PropertyItem
}

export async function updatePropertyItem(id: string, updates: Partial<PropertyFormData>, performedBy: string, reason?: string): Promise<PropertyItem> {
  if (!supabaseAdmin) throw new Error('Service role key not configured')

  const existing = await getPropertyItemById(id)
  if (!existing) {
    throw new Error('Property item not found')
  }

  const { data, error } = await supabaseAdmin
    .from('property_items')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error || !data) {
    throw new Error(error?.message || 'Failed to update property item')
  }

  if (updates.status && updates.status !== existing.status) {
    await addPropertyHistory(id, 'Property Updated', existing.status, updates.status, performedBy, reason || `Status changed to ${updates.status}`)
  }

  await logAuditAction('Property Updated', 'property', id, `Property ${existing.property_number} updated`)

  return data as PropertyItem
}

export async function confiscatePropertyItem(id: string, reason: string, performedBy: string, expectedReleaseAt?: string): Promise<PropertyItem> {
  if (!supabaseAdmin) throw new Error('Service role key not configured')

  const existing = await getPropertyItemById(id)
  if (!existing) {
    throw new Error('Property item not found')
  }

  const { data, error } = await supabaseAdmin
    .from('property_items')
    .update({
      confiscated: true,
      confiscated_at: new Date().toISOString(),
      confiscated_by: performedBy,
      confiscated_reason: reason,
      expected_release_at: expectedReleaseAt || null,
      status: 'Confiscated',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error || !data) {
    throw new Error(error?.message || 'Failed to confiscate property item')
  }

  await addPropertyHistory(id, 'Property Confiscated', existing.status, 'Confiscated', performedBy, reason)
  await logAuditAction('Property Confiscated', 'property', id, `Property ${existing.property_number} confiscated. Reason: ${reason}`)

  return data as PropertyItem
}

export async function releasePropertyItem(id: string, releasedTo: string, signatureUrl?: string, performedBy?: string): Promise<PropertyItem> {
  if (!supabaseAdmin) throw new Error('Service role key not configured')

  const existing = await getPropertyItemById(id)
  if (!existing) {
    throw new Error('Property item not found')
  }

  const { data, error } = await supabaseAdmin
    .from('property_items')
    .update({
      released_at: new Date().toISOString(),
      released_by: performedBy || null,
      released_to: releasedTo,
      signature_url: signatureUrl || null,
      status: 'Released',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error || !data) {
    throw new Error(error?.message || 'Failed to release property item')
  }

  await addPropertyHistory(id, 'Property Released', 'Confiscated', 'Released', performedBy || 'system', `Released to ${releasedTo}`)
  await logAuditAction('Property Released', 'property', id, `Property ${existing.property_number} released to ${releasedTo}`)

  return data as PropertyItem
}

export async function addPropertyHistory(propertyId: string, action: string, oldStatus?: string, newStatus?: string, performedBy?: string, reason?: string, metadata?: any): Promise<PropertyHistoryRecord> {
  if (!supabaseAdmin) throw new Error('Service role key not configured')

  const { data, error } = await supabaseAdmin
    .from('property_history')
    .insert({
      property_id: propertyId,
      action,
      old_status: oldStatus || null,
      new_status: newStatus || null,
      performed_by: performedBy || null,
      reason: reason || null,
      metadata: metadata || {},
    })
    .select()
    .single()

  if (error || !data) {
    throw new Error(error?.message || 'Failed to add property history')
  }

  return data as PropertyHistoryRecord
}

export async function getPropertyHistory(propertyId?: string): Promise<PropertyHistoryRecord[]> {
  if (!supabaseAdmin) throw new Error('Service role key not configured')

  let query = supabaseAdmin
    .from('property_history')
    .select('*')
    .order('created_at', { ascending: false })

  if (propertyId) {
    query = query.eq('property_id', propertyId)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(error.message)
  }

  return data || []
}

export async function getPropertyStatistics(): Promise<PropertyStatistics> {
  if (!supabaseAdmin) throw new Error('Service role key not configured')

  const today = new Date().toISOString().split('T')[0]

  const [
    totalItems,
    itemsInside,
    confiscatedItems,
    pendingRelease,
    releasedToday,
    lostItems,
    damagedItems,
    byCategory,
  ] = await Promise.all([
    supabaseAdmin.from('property_items').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('property_items').select('id', { count: 'exact', head: true }).eq('status', 'Inside'),
    supabaseAdmin.from('property_items').select('id', { count: 'exact', head: true }).eq('status', 'Confiscated'),
    supabaseAdmin.from('property_items').select('id', { count: 'exact', head: true }).eq('status', 'Confiscated').not('expected_release_at', 'is', null),
    supabaseAdmin.from('property_items').select('id', { count: 'exact', head: true }).eq('status', 'Released').gte('released_at', today),
    supabaseAdmin.from('property_items').select('id', { count: 'exact', head: true }).eq('status', 'Lost'),
    supabaseAdmin.from('property_items').select('id', { count: 'exact', head: true }).eq('status', 'Damaged'),
    supabaseAdmin.from('property_items').select('category').not('category', 'is', null),
  ])

  const categoryCounts = new Map<string, number>()
  byCategory.data?.forEach((item: any) => {
    const cat = item.category || 'Unknown'
    categoryCounts.set(cat, (categoryCounts.get(cat) || 0) + 1)
  })

  const categoryArray = Array.from(categoryCounts.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)

  return {
    totalItems: totalItems.count || 0,
    itemsInside: itemsInside.count || 0,
    confiscatedItems: confiscatedItems.count || 0,
    pendingRelease: pendingRelease.count || 0,
    releasedToday: releasedToday.count || 0,
    lostItems: lostItems.count || 0,
    damagedItems: damagedItems.count || 0,
    byCategory: categoryArray,
  }
}

export async function getPropertyItemsByVisit(visitId: string): Promise<PropertyItem[]> {
  return getPropertyItems({ visitId })
}

export async function getPropertyItemsByVisitor(visitorId: string): Promise<PropertyItem[]> {
  return getPropertyItems({ visitorId })
}

export async function getPropertyItemsByEmployee(employeeId: string): Promise<PropertyItem[]> {
  return getPropertyItems({ employeeId })
}

export async function verifyCheckout(visitId: string): Promise<{ match: boolean; discrepancies: string[] }> {
  if (!supabaseAdmin) throw new Error('Service role key not configured')

  const items = await getPropertyItems({ visitId, status: 'Inside' })

  const { data: visitData, error } = await supabaseAdmin
    .from('visits')
    .select('status')
    .eq('id', visitId)
    .single()

  if (error || !visitData) {
    return { match: false, discrepancies: ['Visit not found'] }
  }

  if (visitData.status !== 'checked_out') {
    return { match: false, discrepancies: ['Visit is not in checked_out status'] }
  }

  if (items.length === 0) {
    return { match: true, discrepancies: [] }
  }

  return { match: true, discrepancies: [] }
}
