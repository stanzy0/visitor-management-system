import { NextResponse, NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { uploadBrandingAsset } from '@/lib/server/branding'

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
const MAX_SIZE = 5 * 1024 * 1024

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin()
  if (!authResult.authorized) {
    return NextResponse.json({ success: false, message: authResult.error, error: authResult.error }, { status: authResult.status })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const path = formData.get('path') as string | null

    if (!file || !path) {
      return NextResponse.json({ success: false, message: '', error: '' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ success: false, message: '', error: '' }, { status: 400 })
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ success: false, message: '', error: '' }, { status: 400 })
    }

    const url = await uploadBrandingAsset(file, path)
    return NextResponse.json({ data: { url } })
  } catch {
    return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.', error: '' }, { status: 500 })
  }
}
