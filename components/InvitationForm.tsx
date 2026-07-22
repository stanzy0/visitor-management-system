'use client'

import { useState } from 'react'
import { Loader2, X, Mail } from 'lucide-react'

interface InvitationFormData {
  visitor_name: string
  visitor_email: string
  visitor_phone: string
  visitor_organization: string
  purpose: string
  expected_date: string
  expected_time: string
  vehicle_required: boolean
  number_of_visitors: number
  notes: string
}

interface InvitationFormProps {
  onSubmit: (data: InvitationFormData) => Promise<void>
  onClose: () => void
  loading?: boolean
}

const defaultData: InvitationFormData = {
  visitor_name: '',
  visitor_email: '',
  visitor_phone: '',
  visitor_organization: '',
  purpose: '',
  expected_date: '',
  expected_time: '',
  vehicle_required: false,
  number_of_visitors: 1,
  notes: '',
}

export default function InvitationForm({ onSubmit, onClose, loading }: InvitationFormProps) {
  const [formData, setFormData] = useState<InvitationFormData>(defaultData)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit(formData)
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex-shrink-0 flex items-center justify-between border-b border-gray-200 p-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Mail className="h-5 w-5 text-blue-600" />
            Invite Visitor
          </h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Visitor Name *</label>
                <input
                  type="text"
                  required
                  value={formData.visitor_name}
                  onChange={(e) => setFormData({ ...formData, visitor_name: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={formData.visitor_email}
                  onChange={(e) => setFormData({ ...formData, visitor_email: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={formData.visitor_phone}
                  onChange={(e) => setFormData({ ...formData, visitor_phone: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Organization</label>
                <input
                  type="text"
                  value={formData.visitor_organization}
                  onChange={(e) => setFormData({ ...formData, visitor_organization: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Visit Date *</label>
                <input
                  type="date"
                  required
                  min={today}
                  value={formData.expected_date}
                  onChange={(e) => setFormData({ ...formData, expected_date: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Visit Time</label>
                <input
                  type="time"
                  value={formData.expected_time}
                  onChange={(e) => setFormData({ ...formData, expected_time: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Purpose *</label>
              <textarea
                required
                value={formData.purpose}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                rows={2}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Number of Visitors</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={formData.number_of_visitors}
                  onChange={(e) => setFormData({ ...formData, number_of_visitors: parseInt(e.target.value) || 1 })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black"
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="vehicle_required"
                  checked={formData.vehicle_required}
                  onChange={(e) => setFormData({ ...formData, vehicle_required: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="vehicle_required" className="text-sm text-gray-700">Vehicle Required</label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black"
              />
            </div>
          </div>

          <div className="border-t border-gray-200 p-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all duration-200"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              Send Invitation
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
