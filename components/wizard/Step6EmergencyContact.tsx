'use client'

import type { VisitorFormData } from '@/lib/types/visitor'

interface Step6Props {
  emergency_contact?: string
  emergency_relationship?: string
  emergency_phone?: string
  onChange: (field: keyof VisitorFormData, value: string) => void
  errors?: Record<string, string | null>
  touched?: Set<string>
  onBlur?: (field: string) => void
}

export default function Step6EmergencyContact({ emergency_contact = '', emergency_relationship = '', emergency_phone = '', onChange, errors = {}, touched = new Set(), onBlur }: Step6Props) {
  const inputClasses = (field: string) => {
    const base = 'w-full rounded-lg border px-3 py-2'
    const touchedAndError = touched.has(field) && errors[field]
    return `${base} ${touchedAndError ? 'border-red-500 text-red-600' : 'border-gray-300'}`
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Emergency Contact</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact Name *</label>
          <input type="text" value={emergency_contact} onChange={(e) => onChange('emergency_contact', e.target.value)} onBlur={() => onBlur?.('emergency_contact')} className={inputClasses('emergency_contact')} />
          {touched.has('emergency_contact') && errors.emergency_contact && <p className="text-sm text-red-600 mt-1">{errors.emergency_contact}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Relationship *</label>
          <input type="text" value={emergency_relationship} onChange={(e) => onChange('emergency_relationship', e.target.value)} onBlur={() => onBlur?.('emergency_relationship')} className={inputClasses('emergency_relationship')} />
          {touched.has('emergency_relationship') && errors.emergency_relationship && <p className="text-sm text-red-600 mt-1">{errors.emergency_relationship}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
          <input type="tel" value={emergency_phone} onChange={(e) => onChange('emergency_phone', e.target.value)} onBlur={() => onBlur?.('emergency_phone')} className={inputClasses('emergency_phone')} />
          {touched.has('emergency_phone') && errors.emergency_phone && <p className="text-sm text-red-600 mt-1">{errors.emergency_phone}</p>}
        </div>
      </div>
    </div>
  )
}
