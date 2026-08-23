'use client'

import { useState } from 'react'
import type { VisitorFormData } from '@/lib/types/visitor'
import SearchableCombobox from '@/components/ui/SearchableCombobox'
import { VEHICLE_MAKES, VEHICLE_MODELS_BY_MAKE, VEHICLE_COLORS } from '@/lib/data/vehicles'

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
  const [customMake, setCustomMake] = useState('')
  const [customModel, setCustomModel] = useState('')
  const [customColor, setCustomColor] = useState('')

  const inputClasses = (field: string) => {
    const base = 'w-full rounded-lg border px-3 py-2'
    const touchedAndError = touched.has(field) && errors[field]
    return `${base} ${touchedAndError ? 'border-red-500 text-red-600' : 'border-gray-300'}`
  }

  const selectedMake = vehicle_make
  const modelOptions = selectedMake && VEHICLE_MODELS_BY_MAKE[selectedMake] ? VEHICLE_MODELS_BY_MAKE[selectedMake] : []
  const isModelDisabled = !selectedMake

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
            <label htmlFor="vehicle-make" className="block text-sm font-medium text-gray-700 mb-1">Make *</label>
            <SearchableCombobox
              options={VEHICLE_MAKES.map((make) => ({ value: make, label: make }))}
              value={selectedMake}
              onChange={(val) => {
                onChange('vehicle_make', val)
                if (val !== selectedMake) {
                  onChange('vehicle_model', '')
                  setCustomModel('')
                }
                if (val !== 'Other') {
                  setCustomMake('')
                }
              }}
              placeholder="Select vehicle make..."
              searchPlaceholder="Search vehicle make..."
              noResultsText="No matching make found"
              required
            />
            {selectedMake === 'Other' && (
              <input
                id="vehicle-make-other"
                type="text"
                value={customMake}
                onChange={(e) => {
                  setCustomMake(e.target.value)
                  onChange('vehicle_make', e.target.value)
                }}
                onBlur={() => onBlur?.('vehicle_make')}
                placeholder="Enter vehicle make"
                className={`${inputClasses('vehicle_make')} mt-2`}
              />
            )}
            {touched.has('vehicle_make') && errors.vehicle_make && <p className="text-sm text-red-600 mt-1">{errors.vehicle_make}</p>}
          </div>
          <div>
            <label htmlFor="vehicle-model" className="block text-sm font-medium text-gray-700 mb-1">Model *</label>
            <SearchableCombobox
              options={modelOptions.map((model) => ({ value: model, label: model }))}
              value={isModelDisabled ? '' : vehicle_model}
              onChange={(val) => {
                onChange('vehicle_model', val)
                if (val !== 'Other') {
                  setCustomModel('')
                }
              }}
              placeholder={isModelDisabled ? 'Select vehicle make first' : 'Select vehicle model...'}
              searchPlaceholder="Search vehicle model..."
              noResultsText="No matching model found"
              disabled={isModelDisabled}
              required
            />
            {!isModelDisabled && vehicle_model === 'Other' && (
              <input
                id="vehicle-model-other"
                type="text"
                value={customModel}
                onChange={(e) => {
                  setCustomModel(e.target.value)
                  onChange('vehicle_model', e.target.value)
                }}
                onBlur={() => onBlur?.('vehicle_model')}
                placeholder="Enter vehicle model"
                className={`${inputClasses('vehicle_model')} mt-2`}
              />
            )}
            {touched.has('vehicle_model') && errors.vehicle_model && <p className="text-sm text-red-600 mt-1">{errors.vehicle_model}</p>}
          </div>
          <div>
            <label htmlFor="vehicle-color" className="block text-sm font-medium text-gray-700 mb-1">Color *</label>
            <select
              id="vehicle-color"
              value={vehicle_color}
              onChange={(e) => {
                onChange('vehicle_color', e.target.value)
                if (e.target.value !== 'Other') {
                  setCustomColor('')
                }
              }}
              onBlur={() => onBlur?.('vehicle_color')}
              className={inputClasses('vehicle_color')}
            >
              <option value="">Select vehicle color...</option>
              {VEHICLE_COLORS.map((color) => (
                <option key={color} value={color}>{color}</option>
              ))}
            </select>
            {vehicle_color === 'Other' && (
              <input
                id="vehicle-color-other"
                type="text"
                value={customColor}
                onChange={(e) => {
                  setCustomColor(e.target.value)
                  onChange('vehicle_color', e.target.value)
                }}
                onBlur={() => onBlur?.('vehicle_color')}
                placeholder="Enter vehicle color"
                className={`${inputClasses('vehicle_color')} mt-2`}
              />
            )}
            {touched.has('vehicle_color') && errors.vehicle_color && <p className="text-sm text-red-600 mt-1">{errors.vehicle_color}</p>}
          </div>
          <div>
            <label htmlFor="registration-number" className="block text-sm font-medium text-gray-700 mb-1">Plate Number *</label>
            <input id="registration-number" type="text" value={registration_number} onChange={(e) => onChange('registration_number', e.target.value)} onBlur={() => onBlur?.('registration_number')} className={inputClasses('registration_number')} />
            {touched.has('registration_number') && errors.registration_number && <p className="text-sm text-red-600 mt-1">{errors.registration_number}</p>}
          </div>
        </div>
      )}
    </div>
  )
}
