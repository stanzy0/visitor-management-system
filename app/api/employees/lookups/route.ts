import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 })
    }

    const [deptResult, posResult, locResult] = await Promise.all([
      supabaseAdmin.from('departments').select('*').order('name'),
      supabaseAdmin.from('positions').select('*').order('title'),
      supabaseAdmin.from('office_locations').select('*').order('display_name'),
    ])

    return NextResponse.json({
      departments: deptResult.data || [],
      positions: posResult.data || [],
      office_locations: (locResult.data || []).map((loc: any) => ({
        ...loc,
        display_name: loc.display_name || `${loc.building ? `${loc.building} — ` : ''}${loc.office_name || loc.name}`,
      })),
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
