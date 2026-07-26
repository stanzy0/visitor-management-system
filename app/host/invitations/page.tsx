'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { Loader2, Mail, QrCode, X, Calendar, Clock, Trash2, RefreshCw, Search } from 'lucide-react'

interface Invitation {
  id: string
  visitor_name: string
  visitor_email: string
  visitor_phone: string | null
  visitor_organization: string | null
  purpose: string
  expected_date: string
  expected_time: string | null
  status: string
  invitation_token: string
  created_at: string
  expires_at: string
}

export default function HostInvitationsPage() {
  const [userRole, setUserRole] = useState<string>('')
  const [employeeId, setEmployeeId] = useState<string | null>(null)
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedInvitation, setSelectedInvitation] = useState<Invitation | null>(null)
  const [qrModalOpen, setQrModalOpen] = useState(false)

  const fetchInvitations = async () => {
    if (!employeeId) return
    setLoading(true)

    try {
      let query = supabase
        .from('visitor_invitations')
        .select('*')
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false })

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      if (search) {
        query = query.or(`visitor_name.ilike.%${search}%,visitor_email.ilike.%${search}%`)
      }

      const { data, error } = await query

      if (error) {
        throw error
      }

      setInvitations(data || [])
    } catch (err) {
      console.error('Error fetching invitations:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const checkAuth = async () => {
      const user = await getCurrentUser()
      if (!user) {
        window.location.href = '/login'
        return
      }
      setUserRole(user.role)

      if (user.role === 'Host Employee') {
        const { data: empData } = await supabase
          .from('employees')
          .select('id')
          .eq('user_id', user.id)
          .single()
        if (empData) {
          setEmployeeId(empData.id)
        }
      } else if (user.role === 'Admin') {
        setEmployeeId('admin')
      }
    }
    checkAuth()
  }, [])

  useEffect(() => {
    if (employeeId) {
      fetchInvitations()
    }
  }, [employeeId, statusFilter, search])

  const handleCancel = async (invitationId: string) => {
    const { error } = await supabase
      .from('visitor_invitations')
      .update({ status: 'cancelled' })
      .eq('id', invitationId)

    if (error) {
      alert(error.message)
    } else {
      fetchInvitations()
    }
  }

  const handleReschedule = async (invitationId: string, newDate: string, newTime: string) => {
    const { error } = await supabase
      .from('visitor_invitations')
      .update({ expected_date: newDate, expected_time: newTime })
      .eq('id', invitationId)

    if (error) {
      alert(error.message)
    } else {
      fetchInvitations()
      setQrModalOpen(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-50 text-amber-700'
      case 'accepted':
        return 'bg-green-50 text-green-700'
      case 'expired':
        return 'bg-gray-50 text-gray-700'
      case 'cancelled':
        return 'bg-red-50 text-red-700'
      default:
        return 'bg-gray-50 text-gray-700'
    }
  }

  const canEdit = userRole === 'Admin' || userRole === 'Host Employee'

  if (!employeeId && userRole !== 'Admin') {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-gray-500">No employee record found for your account.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 lg:p-6 space-y-6">
        <div className="mb-6">
          <a href="/host" className="text-sm text-blue-600 hover:underline">
            ← Back to Host Portal
          </a>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Invitations</h1>
            <p className="text-sm text-gray-500">Manage visitor invitations</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search invitations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white pl-9 pr-3 py-2 text-sm text-black focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="expired">Expired</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 font-semibold text-gray-700">Visitor</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Email</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Date</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Time</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Purpose</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invitations.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <span className="font-medium text-gray-900">{inv.visitor_name}</span>
                        {inv.visitor_organization && (
                          <p className="text-xs text-gray-500">{inv.visitor_organization}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{inv.visitor_email}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {new Date(inv.expected_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {inv.expected_time ? new Date(`1970-01-01T${inv.expected_time}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{inv.purpose || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(inv.status)}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setSelectedInvitation(inv); setQrModalOpen(true) }}
                          className="p-1 rounded-md hover:bg-gray-100"
                          title="QR Code"
                        >
                          <QrCode className="h-4 w-4 text-gray-600" />
                        </button>
                        {canEdit && inv.status === 'pending' && (
                          <button
                            onClick={() => handleCancel(inv.id)}
                            className="p-1 rounded-md hover:bg-gray-100 text-red-600"
                            title="Cancel"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {invitations.length === 0 && !loading && (
            <div className="p-12 text-center">
              <Mail className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No invitations found</p>
            </div>
          )}
          {loading && (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          )}
        </div>
      </div>

      {qrModalOpen && selectedInvitation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 p-4">
              <h2 className="text-lg font-semibold text-gray-900">Invitation QR Code</h2>
              <button onClick={() => setQrModalOpen(false)} className="p-1 rounded-md hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 flex flex-col items-center">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${window.location.origin}/register/${selectedInvitation.invitation_token}`)}`}
                alt="Invitation QR"
                className="w-48 h-48 mb-4"
              />
              <p className="text-sm text-gray-600">Scan to register</p>
              <p className="text-xs text-gray-500 mt-1">Invitation: {selectedInvitation.invitation_token}</p>
              <div className="mt-4 w-full space-y-2">
                <p className="text-xs font-medium text-gray-700">Reschedule</p>
                <RescheduleForm invitation={selectedInvitation} onReschedule={handleReschedule} onCancel={() => setQrModalOpen(false)} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function RescheduleForm({ invitation, onReschedule, onCancel }: { invitation: Invitation; onReschedule: (id: string, date: string, time: string) => void; onCancel: () => void }) {
  const [date, setDate] = useState(invitation.expected_date)
  const [time, setTime] = useState(invitation.expected_time || '')

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onReschedule(invitation.id, date, time)
      }}
      className="flex items-end gap-2"
    >
      <div className="flex-1">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black"
        />
      </div>
      <div className="flex-1">
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black"
        />
      </div>
      <button type="submit" className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">
        <RefreshCw className="h-4 w-4" />
      </button>
      <button type="button" onClick={onCancel} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
        Close
      </button>
    </form>
  )
}
