import { supabaseAdmin } from '@/lib/supabase-admin'

export async function getSystemSetting(key: string): Promise<string | number | boolean | null> {
  if (!supabaseAdmin) return null

  const { data, error } = await supabaseAdmin
    .from('system_settings')
    .select('value')
    .eq('key', key)
    .single()

  if (error || !data) return null
  return data.value
}

export async function getSystemSettings(keys: string[]): Promise<Record<string, any>> {
  if (!supabaseAdmin) return {}

  const { data, error } = await supabaseAdmin
    .from('system_settings')
    .select('key, value')
    .in('key', keys)

  if (error || !data) return {}

  const result: Record<string, any> = {}
  data.forEach((row: { key: string; value: any }) => {
    result[row.key] = row.value
  })

  return result
}