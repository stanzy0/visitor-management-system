import { supabaseAdmin } from '@/lib/supabase-admin'
import type { BrandingSettings, BrandingUpdatePayload } from '@/lib/types/branding'
import { DEFAULT_BRANDING } from '@/lib/types/branding'

const TABLE = 'branding_settings'
const FIXED_ID = '00000000-0000-0000-0000-000000000000'

export async function getBranding(): Promise<BrandingSettings> {
  if (!supabaseAdmin) {
    return { ...DEFAULT_BRANDING }
  }

  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .select('*')
    .eq('id', FIXED_ID)
    .single()

  if (error || !data) {
    return { ...DEFAULT_BRANDING }
  }

  return data as BrandingSettings
}

export async function updateBranding(payload: BrandingUpdatePayload): Promise<BrandingSettings> {
  if (!supabaseAdmin) {
    throw new Error('Service role key not configured')
  }

  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .upsert({
      id: FIXED_ID,
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data as BrandingSettings
}

export async function uploadBrandingAsset(file: File, path: string): Promise<string> {
  if (!supabaseAdmin) {
    throw new Error('Service role key not configured')
  }

  const bytes = await file.arrayBuffer()
  const fileExt = file.name.split('.').pop() || 'png'
  const fileName = `${path}-${Date.now()}.${fileExt}`

  const { error: uploadError } = await supabaseAdmin.storage
    .from('branding')
    .upload(fileName, bytes, {
      contentType: file.type,
      upsert: true,
    })

  if (uploadError) {
    throw new Error(uploadError.message)
  }

  const { data: publicUrlData } = supabaseAdmin.storage
    .from('branding')
    .getPublicUrl(fileName)

  return publicUrlData.publicUrl
}

export async function deleteBrandingAsset(filePath: string): Promise<void> {
  if (!supabaseAdmin) {
    throw new Error('Service role key not configured')
  }

  await supabaseAdmin.storage.from('branding').remove([filePath])
}
