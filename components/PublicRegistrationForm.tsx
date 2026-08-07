'use client'

import { useState } from 'react'
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react'

interface Invitation {
  id: string
  invitation_token: string
  visitor_name: string
  visitor_email: string
  visitor_phone?: string
  visitor_organization?: string
  purpose: string
  expected_date: string
  expected_time?: string
  vehicle_required: boolean
  number_of_visitors: number
  notes?: string
  host: {
    full_name: string
    department?: string
    office_location?: string
  }
}

interface PublicRegistrationFormProps {
  invitation: Invitation
}

export default function PublicRegistrationForm({ invitation }: PublicRegistrationFormProps) {
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    full_name: invitation.visitor_name || '',
    email: invitation.visitor_email || '',
    phone: invitation.visitor_phone || '',
    organization: invitation.visitor_organization || '',
    address: '',
    nationality: '',
    gender: '',
    vehicle_plate: '',
    vehicle_type: '',
    emergency_contact: '',
    purpose: invitation.purpose || '',
    accept_privacy: false,
    update_existing: false,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/invitations/${invitation.invitation_token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          ...formData,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Registration failed')
      }

      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white shadow-lg p-8 text-center">
        <div className="mx-auto h-16 w-16 rounded-full bg-[#0B3D91]/10 flex items-center justify-center mb-6">
          <CheckCircle className="h-8 w-8 text-[#0B3D91]" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Complete!</h2>
        <p className="text-gray-600 mb-4">
          Thank you, {formData.full_name}. Your registration has been submitted successfully.
        </p>
        <div className="bg-[#0B3D91]/5 border border-[#0B3D91]/20 rounded-xl p-4 text-left text-sm">
          <h3 className="font-semibold text-[#0B3D91] mb-2">Visit Details</h3>
          <p className="text-gray-700">Date: {invitation.expected_date}</p>
          <p className="text-gray-700">Time: {invitation.expected_time || 'TBD'}</p>
          <p className="text-gray-700">Host: {invitation.host.full_name}</p>
          <p className="text-gray-700">Purpose: {invitation.purpose}</p>
        </div>
        <p className="text-gray-500 text-sm mt-4">
          You will receive an email confirmation once your registration is reviewed and approved.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black focus:border-[#0B3D91] focus:outline-none focus:ring-2 focus:ring-[#0B3D91]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black focus:border-[#0B3D91] focus:outline-none focus:ring-2 focus:ring-[#0B3D91]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black focus:border-[#0B3D91] focus:outline-none focus:ring-2 focus:ring-[#0B3D91]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Organization</label>
            <input
              type="text"
              value={formData.organization}
              onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black focus:border-[#0B3D91] focus:outline-none focus:ring-2 focus:ring-[#0B3D91]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black focus:border-[#0B3D91] focus:outline-none focus:ring-2 focus:ring-[#0B3D91]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nationality</label>
            <input
              type="text"
              value={formData.nationality}
              onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black focus:border-[#0B3D91] focus:outline-none focus:ring-2 focus:ring-[#0B3D91]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
            <select
              value={formData.gender}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black focus:border-[#0B3D91] focus:outline-none focus:ring-2 focus:ring-[#0B3D91]"
            >
              <option value="">Select</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact</label>
            <input
              type="text"
              value={formData.emergency_contact}
              onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black focus:border-[#0B3D91] focus:outline-none focus:ring-2 focus:ring-[#0B3D91]"
            />
          </div>
        </div>
      </div>

      {invitation.vehicle_required && (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Vehicle Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Plate</label>
              <input
                type="text"
                value={formData.vehicle_plate}
                onChange={(e) => setFormData({ ...formData, vehicle_plate: e.target.value })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black focus:border-[#0B3D91] focus:outline-none focus:ring-2 focus:ring-[#0B3D91]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type</label>
              <select
                value={formData.vehicle_type}
                onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black focus:border-[#0B3D91] focus:outline-none focus:ring-2 focus:ring-[#0B3D91]"
              >
                <option value="">Select</option>
                <option value="Car">Car</option>
                <option value="Motorcycle">Motorcycle</option>
                <option value="Van">Van</option>
                <option value="Truck">Truck</option>
                <option value="Bus">Bus</option>
              </select>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Visit Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Purpose</label>
            <input
              type="text"
              value={formData.purpose}
              onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black focus:border-[#0B3D91] focus:outline-none focus:ring-2 focus:ring-[#0B3D91]"
            />
          </div>
        </div>

        <div className="mt-4 p-4 bg-gray-50 rounded-lg text-sm">
          <p className="text-gray-700">Host: <span className="font-medium">{invitation.host.full_name}</span></p>
          {invitation.host.department && <p className="text-gray-700">Department: <span className="font-medium">{invitation.host.department}</span></p>}
          <p className="text-gray-700">Date: <span className="font-medium">{invitation.expected_date}</span></p>
          {invitation.expected_time && <p className="text-gray-700">Time: <span className="font-medium">{invitation.expected_time}</span></p>}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Declarations</h2>
        <div className="space-y-3">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              required
              checked={formData.accept_privacy}
              onChange={(e) => setFormData({ ...formData, accept_privacy: e.target.checked })}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-[#0B3D91] focus:ring-[#0B3D91]"
            />
            <span className="text-sm text-gray-700">
              I accept the Privacy Policy and consent to the processing of my personal data for the purpose of visitor management.
            </span>
          </label>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-[#0B3D91] px-6 py-3 text-sm font-semibold text-white shadow-md shadow-[#0B3D91]/20 hover:shadow-lg hover:shadow-[#0B3D91]/30 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all duration-200"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
          Submit Registration
        </button>
      </div>
    </form>
  )
}