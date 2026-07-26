import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getNotificationPreferences, updateNotificationPreferences } from '@/lib/server/notifications'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const preferences = await getNotificationPreferences(user.id)
    return NextResponse.json({ success: true, data: preferences })
  } catch (err) {
    console.error('Notification preferences fetch error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const success = await updateNotificationPreferences(user.id, body)

    if (!success) {
      return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Notification preferences update error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
