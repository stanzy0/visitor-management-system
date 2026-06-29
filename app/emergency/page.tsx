'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUser, PERMISSIONS } from '@/lib/auth'
import { Search, Users, UserCheck, Building2, Loader2, AlertTriangle } from 'lucide-react'

interface Visit {
  id: string
  purpose: string
  status: string
  check_in_time: string | null
  visitor: { full_name: string; visitor_organization: string | null; photo_url: string | null } | null
  employee: { full_name: string; department: string; office_location: string } | null
}

interface Summary {
  visitorsOnSite: number
  hosts: number
  departments: number
  buildings: number
}

export default function EmergencyPage() {
  const [visits, setVisits] = useState<Visit[]>([])
  const [loading, setLoading] = useState(true)
  const [authChecking, setAuthChecking] = useState(true)
  const [summary, setSummary] = useState<Summary>({
    visitorsOnSite: 0,
    hosts: 0,
    departments: 0,
    buildings: 0,
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [buildingFilter, setBuildingFilter] = useState('')
  const realtimeChannel = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      const user = await getCurrentUser()
      if (!user) {
        window.location.href = '/login'
        return
      }
      if (!PERMISSIONS[user.role]?.includes('emergency')) {
        window.location.href = '/unauthorized'
        return
      }
      setAuthChecking(false)
      fetchCheckedIn()
      setupRealtime()
    }
    checkAuth()

    return () => {
      if (realtimeChannel.current) {
        supabase.removeChannel(realtimeChannel.current)
      }
    }
  }, [])

  const fetchCheckedIn = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('visits')
      .select(`
        *,
        visitor:visitors(full_name, visitor_organization, photo_url),
        employee:employees(full_name, department, office_location)
      `)
      .eq('status', 'checked_in')
      .order('check_in_time', { ascending: true })

    if (error) {
      console.error('Error fetching checked-in visits:', error)
    } else {
      setVisits(data || [])
      computeSummary(data || [])
    }
    setLoading(false)
  }

  const computeSummary = (checkedIn: Visit[]) => {
    const hosts = new Set(checkedIn.map(v => v.employee?.full_name).filter(Boolean))
    const departments = new Set(checkedIn.map(v => v.employee?.department).filter(Boolean))
    const buildings = new Set(checkedIn.map(v => v.employee?.office_location).filter(Boolean))

    setSummary({
      visitorsOnSite: checkedIn.length,
      hosts: hosts.size,
      departments: departments.size,
      buildings: buildings.size,
    })
  }

  const setupRealtime = () => {
    if (realtimeChannel.current) {
      supabase.removeChannel(realtimeChannel.current)
    }

    realtimeChannel.current = supabase
      .channel('emergency-occupancy')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'visits' },
        (payload) => {
          const newVisit = payload.new as Visit | null
          const oldVisit = payload.old as Visit | null

          if (payload.eventType === 'INSERT' && newVisit?.status === 'checked_in') {
            setVisits(prev => {
              const exists = prev.some(v => v.id === newVisit.id)
              return exists ? prev : [...prev, newVisit]
            })
          } else if (payload.eventType === 'UPDATE' && newVisit) {
            if (newVisit.status === 'checked_in') {
              setVisits(prev => prev.some(v => v.id === newVisit.id) ? prev.map(v => v.id === newVisit.id ? newVisit : v) : [...prev, newVisit])
            } else {
              setVisits(prev => prev.filter(v => v.id !== newVisit.id))
            }
          } else if (payload.eventType === 'DELETE' && oldVisit) {
            setVisits(prev => prev.filter(v => v.id !== oldVisit.id))
          }

          setTimeout(() => {
            supabase
              .from('visits')
              .select(`
                *,
                visitor:visitors(full_name, visitor_organization, photo_url),
                employee:employees(full_name, department, office_location)
              `)
              .eq('status', 'checked_in')
              .then(({ data }) => {
                if (data) computeSummary(data)
              })
          }, 100)
        }
      )
      .subscribe()
  }

  const getTimeOnSite = (checkInTime: string | null) => {
    if (!checkInTime) return '—'
    const diff = Date.now() - new Date(checkInTime).getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m`
  }

  const filteredVisits = visits.filter(v => {
    const matchesSearch =
      (v.visitor?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.visitor?.visitor_organization || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.employee?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.purpose || '').toLowerCase().includes(searchTerm.toLowerCase())

    const matchesDepartment = !departmentFilter || v.employee?.department === departmentFilter
    const matchesBuilding = !buildingFilter || v.employee?.office_location === buildingFilter

    return matchesSearch && matchesDepartment && matchesBuilding
  })

  const departments = Array.from(new Set(visits.map(v => v.employee?.department).filter(Boolean) as string[]))
  const buildings = Array.from(new Set(visits.map(v => v.employee?.office_location).filter(Boolean) as string[]))

  if (authChecking) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 lg:p-6 space-y-6">
        <div className="mb-6">
          <a href="/dashboard" className="text-sm text-blue-600 hover:underline">
            ← Back to Dashboard
          </a>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-red-600" />
            <h1 className="text-2xl font-bold text-gray-900">Emergency Occupancy Dashboard</h1>
          </div>
          <div className="text-sm text-gray-500">
            Live updates via Supabase Realtime
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500">Visitors On Site</p>
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <p className="mt-2 text-3xl font-bold text-gray-900">{loading ? '...' : summary.visitorsOnSite}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500">Hosts Present</p>
              <UserCheck className="h-5 w-5 text-green-600" />
            </div>
            <p className="mt-2 text-3xl font-bold text-gray-900">{loading ? '...' : summary.hosts}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500">Departments</p>
              <Building2 className="h-5 w-5 text-purple-600" />
            </div>
            <p className="mt-2 text-3xl font-bold text-gray-900">{loading ? '...' : summary.departments}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500">Buildings</p>
              <Building2 className="h-5 w-5 text-amber-600" />
            </div>
            <p className="mt-2 text-3xl font-bold text-gray-900">{loading ? '...' : summary.buildings}</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-lg font-semibold text-gray-900">Current Occupancy</h2>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search visitors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg bg-white text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
                />
              </div>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-black focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Departments</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
              <select
                value={buildingFilter}
                onChange={(e) => setBuildingFilter(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-black focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Buildings</option>
                {buildings.map(building => (
                  <option key={building} value={building}>{building}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 font-semibold text-gray-700">Visitor</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Organization</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Host</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Department</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Office Location</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Purpose</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Check In Time</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Time On Site</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredVisits.map((visit) => (
                    <tr key={visit.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {visit.visitor?.photo_url ? (
                            <img
                              src={visit.visitor.photo_url}
                              alt={visit.visitor.full_name}
                              className="h-8 w-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                              <span className="text-xs text-gray-500">
                                {(visit.visitor?.full_name || '').charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <span className="font-medium text-gray-900">{visit.visitor?.full_name || '—'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{visit.visitor?.visitor_organization || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{visit.employee?.full_name || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{visit.employee?.department || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{visit.employee?.office_location || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{visit.purpose || '—'}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {visit.check_in_time ? new Date(visit.check_in_time).toLocaleTimeString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600 font-mono">
                        {getTimeOnSite(visit.check_in_time)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                          On Site
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {!loading && filteredVisits.length === 0 && (
              <div className="py-12 text-center">
                <p className="text-gray-500">No visitors currently on site</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
