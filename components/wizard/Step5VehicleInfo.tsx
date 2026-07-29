'use client'

import type { VisitorFormData } from '@/lib/types/visitor'

interface Step5Props {
  has_vehicle?: boolean
  vehicle_make?: string
  vehicle_model?: string
  vehicle_color?: string
  registration_number?: string
  onChange: (field: keyof VisitorFormData, value: string | boolean) => void
  errors?: Record<string, string | null>
  touched?: Set<string>
  onBlur?: (field: string) => void
}

export default function Step5VehicleInfo({ has_vehicle = false, vehicle_make = '', vehicle_model = '', vehicle_color = '', registration_number = '', onChange, errors = {}, touched = new Set(), onBlur }: Step5Props) {
  const inputClasses = (field: string) => {
    const base = 'w-full rounded-lg border px-3 py-2'
    const touchedAndError = touched.has(field) && errors[field]
    return `${base} ${touchedAndError ? 'border-red-500 text-red-600' : 'border-gray-300'}`
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Vehicle Information</h3>
      <label className="flex items-center gap-2 rounded-lg border border-gray-200 p-4">
        <input type="checkbox" checked={has_vehicle} onChange={(e) => onChange('has_vehicle', e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
        <span className="text-sm font-medium text-gray-700">Visitor will arrive with a vehicle</span>
      </label>
      {has_vehicle && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Make *</label>
            <input type="text" value={vehicle_make} onChange={(e) => onChange('vehicle_make', e.target.value)} onBlur={() => onBlur?.('vehicle_make')} className={inputClasses('vehicle_make')} />
            {touched.has('vehicle_make') && errors.vehicle_make && <p className="text-sm text-red-600 mt-1">{errors.vehicle_make}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Model *</label>
            <input type="text" value={vehicle_model} onChange={(e) => onChange('vehicle_model', e.target.value)} onBlur={() => onBlur?.('vehicle_model')} className={inputClasses('vehicle_model')} />
            {touched.has('vehicle_model') && errors.vehicle_model && <p className="text-sm text-red-600 mt-1">{errors.vehicle_model}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Color *</label>
            <input type="text" value={vehicle_color} onChange={(e) => onChange('vehicle_color', e.target.value)} onBlur={() => onBlur?.('vehicle_color')} className={inputClasses('vehicle_color')} />
            {touched.has('vehicle_color') && errors.vehicle_color && <p className="text-sm text-red-600 mt-1">{errors.vehicle_color}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Plate Number *</label>
            <input type="text" value={registration_number} onChange={(e) => onChange('registration_number', e.target.value)} onBlur={() => onBlur?.('registration_number')} className={inputClasses('registration_number')} />
            {touched.has('registration_number') && errors.registration_number && <p className="text-sm text-red-600 mt-1">{errors.registration_number}</p>}
          </div>
        </div>
      )}
    </div>
  )
}
