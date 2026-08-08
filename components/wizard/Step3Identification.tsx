'use client'

import type { VisitorFormData } from '@/lib/types/visitor'
import { useState } from 'react'

interface Step3Props {
  data: Pick<VisitorFormData, 'doc_type' | 'doc_number' | 'expiry_date' | 'doc_front_url' | 'doc_back_url' | 'issuing_country' | 'doc_front_image' | 'doc_back_image'>
  onChange: (field: keyof VisitorFormData, value: string | File | null) => void
  errors?: Record<string, string | null>
  touched?: Set<string>
  onBlur?: (field: string) => void
}

export default function Step3Identification({ data, onChange, errors = {}, touched = new Set(), onBlur }: Step3Props) {
  const { doc_type, doc_number, expiry_date, doc_front_url, doc_back_url, issuing_country, doc_front_image, doc_back_image } = data
  const [docError, setDocError] = useState<string | null>(null)

  const inputClasses = (field: string) => {
    const base = 'w-full rounded-lg border px-3 py-2'
    const touchedAndError = touched.has(field) && errors[field]
    return `${base} ${touchedAndError ? 'border-red-500 text-red-600' : 'border-gray-300'}`
  }

  const handleFileChange = (side: 'front' | 'back') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setDocError('File is too large. Please upload an image or PDF under 5 MB.')
      return
    }
    setDocError(null)
    if (side === 'front') {
      onChange('doc_front_image', file)
    } else {
      onChange('doc_back_image', file)
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Identification</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ID Type *</label>
          <select value={doc_type} onChange={(e) => onChange('doc_type', e.target.value)} onBlur={() => onBlur?.('doc_type')} className={inputClasses('doc_type')}>
            <option value="National ID">National ID</option>
            <option value="Passport">Passport</option>
            <option value="Driver License">Driver License</option>
          </select>
          {touched.has('doc_type') && errors.doc_type && <p className="text-sm text-red-600 mt-1">{errors.doc_type}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Document Number *</label>
          <input type="text" value={doc_number} onChange={(e) => onChange('doc_number', e.target.value)} onBlur={() => onBlur?.('doc_number')} className={inputClasses('doc_number')} />
          {touched.has('doc_number') && errors.doc_number && <p className="text-sm text-red-600 mt-1">{errors.doc_number}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date *</label>
          <input type="date" value={expiry_date} onChange={(e) => onChange('expiry_date', e.target.value)} onBlur={() => onBlur?.('expiry_date')} className={inputClasses('expiry_date')} />
          {touched.has('expiry_date') && errors.expiry_date && <p className="text-sm text-red-600 mt-1">{errors.expiry_date}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Issuing Country *</label>
          <input type="text" value={data.issuing_country || ''} onChange={(e) => onChange('issuing_country', e.target.value)} onBlur={() => onBlur?.('issuing_country')} className={inputClasses('issuing_country')} />
          {touched.has('issuing_country') && errors.issuing_country && <p className="text-sm text-red-600 mt-1">{errors.issuing_country}</p>}
        </div>
        <div className="md:col-span-2">
          <p className="text-sm text-gray-500 mb-2">Upload scanned documents.</p>
          {docError && <p className="text-sm text-red-600 mb-2">{docError}</p>}
          <div className="grid grid-cols-2 gap-4">
            <div className={`rounded-lg border-2 border-dashed p-4 text-center text-sm ${touched.has('doc_front_url') && errors.doc_front_url ? 'border-red-500 text-red-600' : 'border-gray-300 text-gray-500'}`}>
              <input
                id="doc-front-upload"
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileChange('front')}
                className="hidden"
              />
              <label htmlFor="doc-front-upload" className="cursor-pointer">
                {doc_front_image ? (
                  <img src={URL.createObjectURL(doc_front_image)} alt="Front preview" className="mx-auto h-32 object-cover rounded" />
                ) : doc_front_url ? (
                  <img src={doc_front_url} alt="Front" className="mx-auto h-32 object-cover rounded" />
                ) : (
                  'Front upload'
                )}
              </label>
              <p className="text-xs text-gray-400 mt-1">Click to upload front</p>
            </div>
            <div className={`rounded-lg border-2 border-dashed p-4 text-center text-sm ${(doc_type === 'National ID' || doc_type === 'Driver License') && touched.has('doc_back_url') && errors.doc_back_url ? 'border-red-500 text-red-600' : 'border-gray-300 text-gray-500'}`}>
              <input
                id="doc-back-upload"
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileChange('back')}
                className="hidden"
              />
              <label htmlFor="doc-back-upload" className="cursor-pointer">
                {doc_back_image ? (
                  <img src={URL.createObjectURL(doc_back_image)} alt="Back preview" className="mx-auto h-32 object-cover rounded" />
                ) : doc_back_url ? (
                  <img src={doc_back_url} alt="Back" className="mx-auto h-32 object-cover rounded" />
                ) : (
                  'Back upload'
                )}
              </label>
              <p className="text-xs text-gray-400 mt-1">Click to upload back</p>
            </div>
          </div>
          {touched.has('doc_front_url') && errors.doc_front_url && <p className="text-sm text-red-600 mt-1">{errors.doc_front_url}</p>}
          {(doc_type === 'National ID' || doc_type === 'Driver License') && touched.has('doc_back_url') && errors.doc_back_url && <p className="text-sm text-red-600 mt-1">{errors.doc_back_url}</p>}
        </div>
      </div>
    </div>
  )
}
