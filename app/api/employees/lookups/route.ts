import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, message: 'Server configuration error', error: 'Service role key not configured' }, { status: 500 })
    }

    const [deptResult, posResult, locResult] = await Promise.all([
      supabaseAdmin.from('departments').select('*').order('name'),
      supabaseAdmin.from('positions').select('*').order('title'),
      supabaseAdmin.from('office_locations').select('*').order('display_name'),
    ])

    const officeLocations = (locResult.data || []).map((loc: any) => ({
      ...loc,
      display_name: loc.display_name || `${loc.building ? `${loc.building} — ` : ''}${loc.office_name || loc.name}`,
    }))

    const hqLandWarfare = {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Head Quarter',
      building: 'Head Quarter',
      department: 'Department of Land Warfare',
      office_name: 'Head Quarter',
      display_name: 'Head Quarter Department of Land Warfare',
    }

    const hasHqLandWarfare = officeLocations.some(
      (loc: any) => loc.name === 'Head Quarter' && loc.department === 'Department of Land Warfare'
    )

    if (!hasHqLandWarfare) {
      officeLocations.push(hqLandWarfare)
    }

    return NextResponse.json({
      departments: deptResult.data || [],
      positions: posResult.data || [],
      office_locations: officeLocations,
    })
  } catch {
    return NextResponse.json({ success: false, message: 'Something went wrong. Please try again.', error: 'Internal server error' }, { status: 500 })
  }
}
