'use client'

import type { VisitorFormData } from '@/lib/types/visitor'
import { useState } from 'react'

interface Step3Props {
  data: Pick<VisitorFormData, 'doc_type' | 'doc_number' | 'expiry_date' | 'doc_front_url' | 'doc_back_url' | 'issuing_country' | 'doc_front_image' | 'doc_back_image' | 'id_verification'>
  onChange: (field: keyof VisitorFormData, value: string | boolean | File | null) => void
  errors?: Record<string, string | null>
  touched?: Set<string>
  onBlur?: (field: string) => void
}

export default function Step3Identification({ data, onChange, errors = {}, touched = new Set(), onBlur }: Step3Props) {
  const { doc_type, doc_number, expiry_date, doc_front_url, doc_back_url, issuing_country, doc_front_image, doc_back_image, id_verification } = data
  const [docError, setDocError] = useState<string | null>(null)

  const COUNTRIES = [
    { code: 'NG', name: 'Nigeria' },
    { code: 'US', name: 'United States' },
    { code: 'GB', name: 'United Kingdom' },
    { code: 'GH', name: 'Ghana' },
    { code: 'ZA', name: 'South Africa' },
    { code: 'KE', name: 'Kenya' },
    { code: 'EG', name: 'Egypt' },
    { code: 'MA', name: 'Morocco' },
    { code: 'ET', name: 'Ethiopia' },
    { code: 'TZ', name: 'Tanzania' },
    { code: 'UG', name: 'Uganda' },
    { code: 'RW', name: 'Rwanda' },
    { code: 'SN', name: 'Senegal' },
    { code: 'CI', name: "Côte d'Ivoire" },
    { code: 'CM', name: 'Cameroon' },
    { code: 'BF', name: 'Burkina Faso' },
    { code: 'ML', name: 'Mali' },
    { code: 'NE', name: 'Niger' },
    { code: 'TD', name: 'Chad' },
    { code: 'CG', name: 'Congo' },
    { code: 'CD', name: 'Democratic Republic of the Congo' },
    { code: 'AO', name: 'Angola' },
    { code: 'MZ', name: 'Mozambique' },
    { code: 'ZW', name: 'Zimbabwe' },
    { code: 'BW', name: 'Botswana' },
    { code: 'NA', name: 'Namibia' },
    { code: 'SZ', name: 'Eswatini' },
    { code: 'LS', name: 'Lesotho' },
    { code: 'MU', name: 'Mauritius' },
    { code: 'SC', name: 'Seychelles' },
    { code: 'KM', name: 'Comoros' },
    { code: 'ST', name: 'São Tomé and Príncipe' },
    { code: 'CV', name: 'Cape Verde' },
    { code: 'GM', name: 'Gambia' },
    { code: 'GW', name: 'Guinea-Bissau' },
    { code: 'GN', name: 'Guinea' },
    { code: 'SL', name: 'Sierra Leone' },
    { code: 'LR', name: 'Liberia' },
    { code: 'CA', name: 'Canada' },
    { code: 'MX', name: 'Mexico' },
    { code: 'BR', name: 'Brazil' },
    { code: 'AR', name: 'Argentina' },
    { code: 'CL', name: 'Chile' },
    { code: 'CO', name: 'Colombia' },
    { code: 'PE', name: 'Peru' },
    { code: 'VE', name: 'Venezuela' },
    { code: 'EC', name: 'Ecuador' },
    { code: 'BO', name: 'Bolivia' },
    { code: 'PY', name: 'Paraguay' },
    { code: 'UY', name: 'Uruguay' },
    { code: 'DE', name: 'Germany' },
    { code: 'FR', name: 'France' },
    { code: 'IT', name: 'Italy' },
    { code: 'ES', name: 'Spain' },
    { code: 'NL', name: 'Netherlands' },
    { code: 'BE', name: 'Belgium' },
    { code: 'AT', name: 'Austria' },
    { code: 'CH', name: 'Switzerland' },
    { code: 'SE', name: 'Sweden' },
    { code: 'NO', name: 'Norway' },
    { code: 'DK', name: 'Denmark' },
    { code: 'FI', name: 'Finland' },
    { code: 'IE', name: 'Ireland' },
    { code: 'PT', name: 'Portugal' },
    { code: 'GR', name: 'Greece' },
    { code: 'PL', name: 'Poland' },
    { code: 'CZ', name: 'Czech Republic' },
    { code: 'HU', name: 'Hungary' },
    { code: 'RO', name: 'Romania' },
    { code: 'BG', name: 'Bulgaria' },
    { code: 'HR', name: 'Croatia' },
    { code: 'RS', name: 'Serbia' },
    { code: 'SK', name: 'Slovakia' },
    { code: 'SI', name: 'Slovenia' },
    { code: 'LT', name: 'Lithuania' },
    { code: 'LV', name: 'Latvia' },
    { code: 'EE', name: 'Estonia' },
    { code: 'CN', name: 'China' },
    { code: 'JP', name: 'Japan' },
    { code: 'KR', name: 'South Korea' },
    { code: 'IN', name: 'India' },
    { code: 'AU', name: 'Australia' },
    { code: 'NZ', name: 'New Zealand' },
    { code: 'SG', name: 'Singapore' },
    { code: 'MY', name: 'Malaysia' },
    { code: 'TH', name: 'Thailand' },
    { code: 'VN', name: 'Vietnam' },
    { code: 'PH', name: 'Philippines' },
    { code: 'ID', name: 'Indonesia' },
    { code: 'PK', name: 'Pakistan' },
    { code: 'BD', name: 'Bangladesh' },
    { code: 'LK', name: 'Sri Lanka' },
    { code: 'MM', name: 'Myanmar' },
    { code: 'KH', name: 'Cambodia' },
    { code: 'LA', name: 'Laos' },
    { code: 'MN', name: 'Mongolia' },
    { code: 'TR', name: 'Turkey' },
    { code: 'IL', name: 'Israel' },
    { code: 'AE', name: 'United Arab Emirates' },
    { code: 'SA', name: 'Saudi Arabia' },
    { code: 'QA', name: 'Qatar' },
    { code: 'KW', name: 'Kuwait' },
    { code: 'BH', name: 'Bahrain' },
    { code: 'OM', name: 'Oman' },
    { code: 'JO', name: 'Jordan' },
    { code: 'LB', name: 'Lebanon' },
    { code: 'SY', name: 'Syria' },
    { code: 'IQ', name: 'Iraq' },
    { code: 'IR', name: 'Iran' },
    { code: 'AF', name: 'Afghanistan' },
    { code: 'TM', name: 'Turkmenistan' },
    { code: 'UZ', name: 'Uzbekistan' },
    { code: 'KZ', name: 'Kazakhstan' },
    { code: 'KG', name: 'Kyrgyzstan' },
    { code: 'TJ', name: 'Tajikistan' },
    { code: 'GE', name: 'Georgia' },
    { code: 'AM', name: 'Armenia' },
    { code: 'AZ', name: 'Azerbaijan' },
  ]

  const inputClasses = (field: string) => {
    const base = 'w-full rounded-lg border px-3 py-2'
    const touchedAndError = touched.has(field) && errors[field]
    return `${base} ${touchedAndError ? 'border-red-500 text-red-600' : 'border-gray-300'}`
  }

  const handleNoIdentificationChange = (checked: boolean) => {
    onChange('id_verification', checked)

    if (checked) {
      onChange('doc_type', '')
      onChange('doc_number', '')
      onChange('expiry_date', '')
      onChange('issuing_country', '')
      onChange('doc_front_url', '')
      onChange('doc_back_url', '')
      onChange('doc_front_image', null)
      onChange('doc_back_image', null)
    }
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

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={id_verification || false}
          onChange={(e) => handleNoIdentificationChange(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <span className="text-sm font-medium text-gray-700">Visitor has no identification document</span>
      </label>
      <p className="text-xs text-gray-500">Identification is optional. Select this if the visitor did not provide an identification document.</p>

      {id_verification && (
        <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
          No identification document provided.
        </div>
      )}

      <div className={id_verification ? 'opacity-50 pointer-events-none' : ''}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ID Type *</label>
            <select value={doc_type} onChange={(e) => onChange('doc_type', e.target.value)} onBlur={() => onBlur?.('doc_type')} className={inputClasses('doc_type')} disabled={id_verification}>
              <option value="National ID">National ID</option>
              <option value="Passport">Passport</option>
              <option value="Driver License">Driver License</option>
            </select>
            {!id_verification && touched.has('doc_type') && errors.doc_type && <p className="text-sm text-red-600 mt-1">{errors.doc_type}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Document Number *</label>
            <input type="text" value={doc_number} onChange={(e) => onChange('doc_number', e.target.value)} onBlur={() => onBlur?.('doc_number')} className={inputClasses('doc_number')} disabled={id_verification} />
            {!id_verification && touched.has('doc_number') && errors.doc_number && <p className="text-sm text-red-600 mt-1">{errors.doc_number}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date *</label>
            <input type="date" value={expiry_date} onChange={(e) => onChange('expiry_date', e.target.value)} onBlur={() => onBlur?.('expiry_date')} className={inputClasses('expiry_date')} disabled={id_verification} />
            {!id_verification && touched.has('expiry_date') && errors.expiry_date && <p className="text-sm text-red-600 mt-1">{errors.expiry_date}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Issuing Country *</label>
            <select
              value={data.issuing_country || ''}
              onChange={(e) => onChange('issuing_country', e.target.value)}
              onBlur={() => onBlur?.('issuing_country')}
              className={inputClasses('issuing_country')}
              disabled={id_verification}
            >
              <option value="">Select Country</option>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
            {!id_verification && touched.has('issuing_country') && errors.issuing_country && <p className="text-sm text-red-600 mt-1">{errors.issuing_country}</p>}
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
                  disabled={id_verification}
                />
                <label htmlFor="doc-front-upload" className={`cursor-pointer ${id_verification ? 'opacity-50' : ''}`}>
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
                  disabled={id_verification}
                />
                <label htmlFor="doc-back-upload" className={`cursor-pointer ${id_verification ? 'opacity-50' : ''}`}>
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
            {!id_verification && touched.has('doc_front_url') && errors.doc_front_url && <p className="text-sm text-red-600 mt-1">{errors.doc_front_url}</p>}
            {!id_verification && (doc_type === 'National ID' || doc_type === 'Driver License') && touched.has('doc_back_url') && errors.doc_back_url && <p className="text-sm text-red-600 mt-1">{errors.doc_back_url}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
