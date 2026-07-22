import { supabaseAdmin } from '@/lib/supabase-admin'
import type { Visit, VisitFormData } from '@/lib/types/visit'

export async function getVisits(): Promise<Visit[]> {
  if (!supabaseAdmin) throw new Error('Service role key not configured')

  const { data, error } = await supabaseAdmin
    .from('visits')
    .select('*, visitor:visitors(*), employee:employees(*)')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data || []) as Visit[]
}

export async function getVisitById(id: string): Promise<Visit | null> {
  if (!supabaseAdmin) throw new Error('Service role key not configured')

  const { data, error } = await supabaseAdmin
    .from('visits')
    .select('*, visitor:visitors(*), employee:employees(*)')
    .eq('id', id)
    .single()

  if (error || !data) return null
  return data as Visit
}

export async function createVisit(data: VisitFormData): Promise<Visit> {
  if (!supabaseAdmin) throw new Error('Service role key not configured')

  const { data: visit, error } = await supabaseAdmin
    .from('visits')
    .insert(data)
    .select()
    .single()

  if (error || !visit) {
    throw new Error(error?.message || 'Failed to create visit')
  }

  return visit as Visit
}

export async function updateVisit(id: string, data: Partial<VisitFormData>): Promise<Visit> {
  if (!supabaseAdmin) throw new Error('Service role key not configured')

  const { data: visit, error } = await supabaseAdmin
    .from('visits')
    .update(data)
    .eq('id', id)
    .select()
    .single()

  if (error || !visit) {
    throw new Error(error?.message || 'Failed to update visit')
  }

  return visit as Visit
}
