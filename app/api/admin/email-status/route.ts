import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'

export async function GET() {
  try {
    const authResult = await requireAdmin()
    if (!authResult.authorized) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status as number })
    }

    const configured = !!process.env.RESEND_API_KEY
    return NextResponse.json({ configured })
  } catch (err) {
    console.error(err)
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    )
  }
}
