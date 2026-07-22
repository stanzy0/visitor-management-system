import { supabaseAdmin } from '@/lib/supabase-admin'
import type { Visitor, VisitorFormData } from '@/lib/types/visitor'

export async function getVisitors(): Promise<Visitor[]> {
  if (!supabaseAdmin) throw new Error('Service role key not configured')

  const { data, error } = await supabaseAdmin
    .from('visitors')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data || []) as Visitor[]
}

export async function getVisitorById(id: string): Promise<Visitor | null> {
  if (!supabaseAdmin) throw new Error('Service role key not configured')

  const { data, error } = await supabaseAdmin
    .from('visitors')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) return null
  return data as Visitor
}

export async function createVisitor(data: VisitorFormData): Promise<Visitor> {
  if (!supabaseAdmin) throw new Error('Service role key not configured')

  const { data: visitor, error } = await supabaseAdmin
    .from('visitors')
    .insert(data)
    .select()
    .single()

  if (error || !visitor) {
    throw new Error(error?.message || 'Failed to create visitor')
  }

  return visitor as Visitor
}

export async function updateVisitor(id: string, data: Partial<VisitorFormData>): Promise<Visitor> {
  if (!supabaseAdmin) throw new Error('Service role key not configured')

  const { data: visitor, error } = await supabaseAdmin
    .from('visitors')
    .update(data)
    .eq('id', id)
    .select()
    .single()

  if (error || !visitor) {
    throw new Error(error?.message || 'Failed to update visitor')
  }

  return visitor as Visitor
}

export async function deleteVisitor(id: string): Promise<void> {
  if (!supabaseAdmin) throw new Error('Service role key not configured')

  const { error } = await supabaseAdmin
    .from('visitors')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }
}
