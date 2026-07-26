import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 })
    }

    const { data, error } = await supabaseAdmin
      .from('document_verifications')
      .select('status, created_at')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const today = new Date().toISOString().split('T')[0]
    const stats = {
      pending: 0,
      approved: 0,
      rejected: 0,
      replacement_requested: 0,
      reuploaded: 0,
      total: data?.length || 0,
      today_reviews: 0,
    }

    data?.forEach((item: { status: string; created_at: string }) => {
      if (item.status === 'Pending') stats.pending++
      else if (item.status === 'Approved') stats.approved++
      else if (item.status === 'Rejected') stats.rejected++
      else if (item.status === 'Replacement Requested') stats.replacement_requested++
      else if (item.status === 'Reuploaded') stats.reuploaded++

      if (item.created_at.startsWith(today)) stats.today_reviews++
    })

    return NextResponse.json({ success: true, data: stats })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
