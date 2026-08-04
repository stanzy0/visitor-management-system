import { NextRequest, NextResponse } from 'next/server'
import { validateBadge } from '@/lib/server/badges'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json({ success: false, message: '', error: '' }, { status: 400 })
    }

    const result = await validateBadge(token)
    return NextResponse.json(result)
  } catch (err) {
    console.error('Badge validation error:', err)
    return NextResponse.json({ valid: false, reason: 'Validation failed' }, { status: 500 })
  }
}
