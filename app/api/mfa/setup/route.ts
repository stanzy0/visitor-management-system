import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { generateSecret } from '@/lib/mfa/totp'

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ success: false, message: 'Authentication required', error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { secret, otpauthUrl } = generateSecret()

    return NextResponse.json({
      secret,
      otpauthUrl,
    })
  } catch (err) {
    console.error('MFA setup error:', err)
    return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.', error: 'Internal server error' }, { status: 500 })
  }
}
