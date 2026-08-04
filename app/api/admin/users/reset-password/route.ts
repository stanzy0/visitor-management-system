import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { resetUserPassword } from '@/lib/server/admin'

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin()
  if (!authResult.authorized) {
    return NextResponse.json({ success: false, message: authResult.error, error: authResult.error }, { status: authResult.status })
  }

  try {
    const body = await request.json()
    const { user_id, new_password } = body

    if (!user_id || !new_password) {
      return NextResponse.json({ success: false, message: '', error: '' }, { status: 400 })
    }

    await resetUserPassword(user_id, new_password)
    return NextResponse.json({ success: true, message: 'Password reset successfully' })
  } catch (err) {
    console.error('Reset password error:', err)
    return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.', error: 'Internal server error' }, { status: 500 })
  }
}
