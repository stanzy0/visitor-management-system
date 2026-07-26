'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Loader2, CheckCircle2, ChevronRight, ChevronLeft, Upload, Camera, AlertCircle } from 'lucide-react'
import PhotoCapture from '@/components/PhotoCapture'

type VisitorType = 'Visitor' | 'Contractor' | 'Vendor' | 'Guest Lecturer' | 'VIP' | 'Family Visitor' | 'Other'

interface Employee {
  id: string
  full_name: string
  department: string | null
  office_location: string | null
}

interface OfficeLocation {
  id: string
  name: string
  building: string | null
  department: string | null
}

const VISITOR_TYPES: VisitorType[] = ['Visitor', 'Contractor', 'Vendor', 'Guest Lecturer', 'VIP', 'Family Visitor', 'Other']

const VISITOR_TYPE_INFO: Record<VisitorType, { description: string; helperText: string }> = {
  'Visitor': { description: 'Standard visitor for general meetings', helperText: 'Regular access' },
  'Contractor': { description: 'External contractor for specific work', helperText: 'Temporary access' },
  'Vendor': { description: 'Supplier or vendor for business purposes', helperText: 'Business access' },
  'Guest Lecturer': { description: 'Guest speaker or lecturer', helperText: 'Event access' },
  'VIP': { description: 'Very Important Person, priority access', helperText: 'Priority access' },
  'Family Visitor': { description: 'Family member visiting personnel', helperText: 'Escorted access' },
  'Other': { description: 'Other type of visitor', helperText: 'Special access' },
}

const REQUIRED_DOCUMENT_TYPES = ['National ID', 'Passport', 'Driver License']

const NATIONALITIES = [
  'Afghan',
  'Albanian',
  'Algerian',
  'American',
  'Andorran',
  'Angolan',
  'Antiguan',
  'Argentine',
  'Armenian',
  'Australian',
  'Austrian',
  'Azerbaijani',
  'Bahamian',
  'Bahraini',
  'Bangladeshi',
  'Barbadian',
  'Belarusian',
  'Belgian',
  'Belizean',
  'Beninese',
  'Bhutanese',
  'Bolivian',
  'Bosnian',
  'Botswanan',
  'Brazilian',
  'British',
  'Bruneian',
  'Bulgarian',
  'Burkinabe',
  'Burmese',
  'Burundian',
  'Cambodian',
  'Cameroonian',
  'Canadian',
  'Cape Verdean',
  'Central African',
  'Chadian',
  'Chilean',
  'Chinese',
  'Colombian',
  'Comoran',
  'Congolese',
  'Costa Rican',
  'Croatian',
  'Cuban',
  'Cypriot',
  'Czech',
  'Danish',
  'Djiboutian',
  'Dominican',
  'Dutch',
  'Ecuadorean',
  'Egyptian',
  'Emirati',
  'Equatorial Guinean',
  'Eritrean',
  'Estonian',
  'Ethiopian',
  'Fijian',
  'Filipino',
  'Finnish',
  'French',
  'Gabonese',
  'Gambian',
  'Georgian',
  'German',
  'Ghanaian',
  'Greek',
  'Grenadian',
  'Guatemalan',
  'Guinean',
  'Guyanese',
  'Haitian',
  'Honduran',
  'Hungarian',
  'Icelandic',
  'Indian',
  'Indonesian',
  'Iranian',
  'Iraqi',
  'Irish',
  'Israeli',
  'Italian',
  'Ivorian',
  'Jamaican',
  'Japanese',
  'Jordanian',
  'Kazakh',
  'Kenyan',
  'Kiribati',
  'Kuwaiti',
  'Kyrgyz',
  'Laotian',
  'Latvian',
  'Lebanese',
  'Liberian',
  'Libyan',
  'Lithuanian',
  'Luxembourg',
  'Macedonian',
  'Malagasy',
  'Malawian',
  'Malaysian',
  'Maldivian',
  'Malian',
  'Maltese',
  'Marshallese',
  'Mauritanian',
  'Mauritian',
  'Mexican',
  'Micronesian',
  'Moldovan',
  'Monacan',
  'Mongolian',
  'Montenegrin',
  'Moroccan',
  'Mozambican',
  'Namibian',
  'Nauruan',
  'Nepalese',
  'New Zealander',
  'Nicaraguan',
  'Nigerien',
  'Nigerian',
  'North Korean',
  'Norwegian',
  'Omani',
  'Pakistani',
  'Palauan',
  'Palestinian',
  'Panamanian',
  'Papua New Guinean',
  'Paraguayan',
  'Peruvian',
  'Polish',
  'Portuguese',
  'Qatari',
  'Romanian',
  'Russian',
  'Rwandan',
  'Saint Lucian',
  'Salvadoran',
  'Samoan',
  'San Marinese',
  'Sao Tomean',
  'Saudi',
  'Senegalese',
  'Serbian',
  'Seychellois',
  'Sierra Leonean',
  'Singaporean',
  'Slovak',
  'Slovenian',
  'Solomon Islander',
  'Somali',
  'South African',
  'South Korean',
  'South Sudanese',
  'Spanish',
  'Sri Lankan',
  'Sudanese',
  'Surinamese',
  'Swazi',
  'Swedish',
  'Swiss',
  'Syrian',
  'Taiwanese',
  'Tajik',
  'Tanzanian',
  'Thai',
  'Timorese',
  'Togolese',
  'Tongan',
  'Trinidadian',
  'Tunisian',
  'Turkish',
  'Turkmen',
  'Tuvaluan',
  'Ugandan',
  'Ukrainian',
  'Uruguayan',
  'Uzbek',
  'Vanuatuan',
  'Vatican',
  'Venezuelan',
  'Vietnamese',
  'Yemeni',
  'Zambian',
  'Zimbabwean',
]

export default function PublicRegistrationWizard() {
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [registrationNumber, setRegistrationNumber] = useState<string | null>(null)
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [visitorType, setVisitorType] = useState<VisitorType>('Visitor')
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loadingEmployees, setLoadingEmployees] = useState(true)
  const [officeLocations, setOfficeLocations] = useState<OfficeLocation[]>([])
  const [loadingLocations, setLoadingLocations] = useState(true)

  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    visitor_organization: '',
    nationality: '',
    visitor_address: '',
    gender: '',
    photo_url: null as string | null,
    doc_type: 'National ID',
    doc_number: '',
    issuing_country: '',
    expiry_date: '',
    doc_front_url: null as string | null,
    doc_back_url: null as string | null,
    employee_id: '',
    purpose: '',
    visit_date: '',
    arrival_time: '',
    expected_duration: 60,
    office_location: '',
    has_vehicle: false,
    registration_number: '',
    vehicle_type: '',
    vehicle_color: '',
    emergency_name: '',
    emergency_relationship: '',
    emergency_phone: '',
    notes: '',
    accept_terms: false,
  })

  useEffect(() => {
    supabase
      .from('employees')
      .select('id, full_name, department, office_location')
      .order('full_name')
      .then(({ data }) => {
        setEmployees(data || [])
        setLoadingEmployees(false)
      })
  }, [])

  useEffect(() => {
    supabase
      .from('office_locations')
      .select('id, name, building, department')
      .order('name')
      .then(({ data }) => {
        setOfficeLocations(data || [])
        setLoadingLocations(false)
      })
  }, [])

  const totalSteps = 7

  const updateField = (field: string, value: string | boolean | number | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const next = () => {
    if (step === 2 && !formData.photo_url) {
      setError('Visitor photograph is required.')
      return
    }
    if (step === 4 && !formData.office_location) {
      setError('Office location is required.')
      return
    }
    setStep((s) => Math.min(s + 1, totalSteps))
  }
  const back = () => setStep((s) => Math.max(s - 1, 1))

  const handleDocUpload = async (file: File, side: 'front' | 'back') => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      if (side === 'front') updateField('doc_front_url', dataUrl)
      else updateField('doc_back_url', dataUrl)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)

    try {
      const visitDate = new Date(formData.visit_date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (visitDate < today) {
        setError('Visit date cannot be in the past')
        setSubmitting(false)
        return
      }

      const regNumber = `REG-${Date.now().toString(36).toUpperCase()}`

      const { data: employee } = await supabase
        .from('employees')
        .select('id, full_name, department, office_location')
        .eq('id', formData.employee_id)
        .single()

      if (!employee) {
        setError('Invalid host employee selected')
        setSubmitting(false)
        return
      }

      const { data: visitor, error: visitorError } = await supabase
        .from('visitors')
        .insert({
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone,
          visitor_organization: formData.visitor_organization,
          visitor_address: formData.visitor_address,
          nationality: formData.nationality,
          gender: formData.gender,
          photo_url: formData.photo_url,
          emergency_contact: formData.emergency_phone,
          vehicle_plate: formData.registration_number,
          vehicle_type: formData.vehicle_type,
        })
        .select()
        .single()

      if (visitorError || !visitor) {
        setError(visitorError?.message || 'Failed to create visitor record')
        setSubmitting(false)
        return
      }

      const { data: visit, error: visitError } = await supabase
        .from('visits')
        .insert({
          visitor_id: visitor.id,
          employee_id: employee.id,
          purpose: formData.purpose,
          status: 'pending',
          source: 'public',
          registration_number: regNumber,
          visitor_type: visitorType,
          notes: formData.notes,
          appointment_id: null,
        })
        .select()
        .single()

      if (visitError || !visit) {
        setError(visitError?.message || 'Failed to create visit record')
        setSubmitting(false)
        return
      }

      if (formData.doc_number) {
        await supabase.from('visitor_documents').insert({
          visitor_id: visitor.id,
          document_type: formData.doc_type,
          document_number: formData.doc_number,
          issuing_country: formData.issuing_country,
          expiry_date: formData.expiry_date,
          file_url: formData.doc_front_url,
          verification_status: 'Pending',
        })
      }

      const QRCode = (await import('qrcode')).default
      const qrPayload = JSON.stringify({ registrationNumber: regNumber, visitId: visit.id, type: 'public-visitor' })
      const qrDataUrl = await QRCode.toDataURL(qrPayload, { width: 300, margin: 2 })

      setRegistrationNumber(regNumber)
      setQrCodeUrl(qrDataUrl)
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted && registrationNumber) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="mx-auto max-w-2xl px-4 lg:px-6">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-8 text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-6">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Submitted Successfully</h2>
            <p className="text-gray-600 mb-6">Your registration has been submitted and is pending approval.</p>

            <div className="rounded-xl border border-gray-200 p-6 mb-6">
              <p className="text-sm text-gray-500 mb-1">Registration Number</p>
              <p className="text-2xl font-mono font-bold text-gray-900 mb-4">{registrationNumber}</p>

              {qrCodeUrl && (
                <div className="flex flex-col items-center">
                  <img src={qrCodeUrl} alt="QR Code" className="h-48 w-48 mb-2" />
                  <p className="text-sm text-gray-500">Present this QR code at the gate</p>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 mb-6">
              <p className="text-sm text-blue-800">
                <strong>Status:</strong> Pending Approval
              </p>
              <p className="text-sm text-blue-700 mt-1">
                You will receive an email confirmation once your registration is approved.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/register/status" className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700 min-h-[52px]">
                Check Status
              </Link>
              <Link href="/register" className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-300 min-h-[52px]">
                New Registration
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-3xl px-4 lg:px-6">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Visitor Registration</h1>
          <p className="text-gray-600 mt-2">Step {step} of {totalSteps}</p>
          <div className="mt-3 h-2 w-full rounded-full bg-gray-200">
            <div className="h-2 rounded-full bg-blue-600 transition-all" style={{ width: `${(step / totalSteps) * 100}%` }} />
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 md:p-8">
          {error && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Visitor Type</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {VISITOR_TYPES.map((type) => (
                  <button
                    key={type}
                    onClick={() => setVisitorType(type)}
                    className={`rounded-xl border-2 p-4 text-center transition-all min-h-[52px] ${
                      visitorType === type ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <p className="text-sm font-semibold text-gray-900">{type}</p>
                    <p className="text-xs text-gray-600 mt-1">{VISITOR_TYPE_INFO[type].description}</p>
                    <p className="text-xs text-gray-500 mt-1">{VISITOR_TYPE_INFO[type].helperText}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Personal Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <input type="text" value={formData.full_name} onChange={(e) => updateField('full_name', e.target.value)} required className="w-full rounded-lg border border-gray-300 px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                  <input type="tel" value={formData.phone} onChange={(e) => updateField('phone', e.target.value)} required className="w-full rounded-lg border border-gray-300 px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
                  <input type="email" value={formData.email} onChange={(e) => updateField('email', e.target.value)} required className="w-full rounded-lg border border-gray-300 px-3 py-2" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company / Organization</label>
                  <input type="text" value={formData.visitor_organization} onChange={(e) => updateField('visitor_organization', e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nationality</label>
                  <select value={formData.nationality} onChange={(e) => updateField('nationality', e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2">
                    <option value="">Select nationality</option>
                    {NATIONALITIES.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                  <select value={formData.gender} onChange={(e) => updateField('gender', e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2">
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Residential Address</label>
                  <textarea value={formData.visitor_address} onChange={(e) => updateField('visitor_address', e.target.value)} rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Photograph *</label>
                  <PhotoCapture
                    value={formData.photo_url}
                    onChange={(dataUrl) => {
                      updateField('photo_url', dataUrl)
                      setError(null)
                    }}
                    error={step === 2 && !formData.photo_url ? 'Visitor photograph is required.' : undefined}
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Identification</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ID Type *</label>
                  <select value={formData.doc_type} onChange={(e) => updateField('doc_type', e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2">
                    {REQUIRED_DOCUMENT_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ID Number *</label>
                  <input type="text" value={formData.doc_number} onChange={(e) => updateField('doc_number', e.target.value)} required className="w-full rounded-lg border border-gray-300 px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Issuing Country</label>
                  <select value={formData.issuing_country} onChange={(e) => updateField('issuing_country', e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2">
                    <option value="">Select country</option>
                    <option value="Afghanistan">Afghanistan</option>
                    <option value="Albania">Albania</option>
                    <option value="Algeria">Algeria</option>
                    <option value="Argentina">Argentina</option>
                    <option value="Australia">Australia</option>
                    <option value="Austria">Austria</option>
                    <option value="Bangladesh">Bangladesh</option>
                    <option value="Belgium">Belgium</option>
                    <option value="Brazil">Brazil</option>
                    <option value="Canada">Canada</option>
                    <option value="China">China</option>
                    <option value="Colombia">Colombia</option>
                    <option value="Cuba">Cuba</option>
                    <option value="Czech Republic">Czech Republic</option>
                    <option value="Denmark">Denmark</option>
                    <option value="Egypt">Egypt</option>
                    <option value="Finland">Finland</option>
                    <option value="France">France</option>
                    <option value="Germany">Germany</option>
                    <option value="Ghana">Ghana</option>
                    <option value="Greece">Greece</option>
                    <option value="India">India</option>
                    <option value="Indonesia">Indonesia</option>
                    <option value="Iran">Iran</option>
                    <option value="Iraq">Iraq</option>
                    <option value="Ireland">Ireland</option>
                    <option value="Israel">Israel</option>
                    <option value="Italy">Italy</option>
                    <option value="Japan">Japan</option>
                    <option value="Kenya">Kenya</option>
                    <option value="Lebanon">Lebanon</option>
                    <option value="Mexico">Mexico</option>
                    <option value="Morocco">Morocco</option>
                    <option value="Netherlands">Netherlands</option>
                    <option value="New Zealand">New Zealand</option>
                    <option value="Nigeria">Nigeria</option>
                    <option value="Norway">Norway</option>
                    <option value="Pakistan">Pakistan</option>
                    <option value="Philippines">Philippines</option>
                    <option value="Poland">Poland</option>
                    <option value="Portugal">Portugal</option>
                    <option value="Russia">Russia</option>
                    <option value="Saudi Arabia">Saudi Arabia</option>
                    <option value="South Africa">South Africa</option>
                    <option value="South Korea">South Korea</option>
                    <option value="Spain">Spain</option>
                    <option value="Sweden">Sweden</option>
                    <option value="Switzerland">Switzerland</option>
                    <option value="Thailand">Thailand</option>
                    <option value="Turkey">Turkey</option>
                    <option value="Uganda">Uganda</option>
                    <option value="Ukraine">Ukraine</option>
                    <option value="United Arab Emirates">United Arab Emirates</option>
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="United States">United States</option>
                    <option value="Vietnam">Vietnam</option>
                    <option value="Zimbabwe">Zimbabwe</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                  <input type="date" value={formData.expiry_date} onChange={(e) => updateField('expiry_date', e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Front ID</label>
                  <div className="flex items-center gap-4">
                    {formData.doc_front_url && <img src={formData.doc_front_url} alt="Front ID" className="h-16 w-24 object-cover rounded border border-gray-200" />}
                    <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleDocUpload(e.target.files[0], 'front')} className="block text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700" />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Back ID (optional)</label>
                  <div className="flex items-center gap-4">
                    {formData.doc_back_url && <img src={formData.doc_back_url} alt="Back ID" className="h-16 w-24 object-cover rounded border border-gray-200" />}
                    <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleDocUpload(e.target.files[0], 'back')} className="block text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Visit Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Host Employee *</label>
                  <select value={formData.employee_id} onChange={(e) => {
                    const empId = e.target.value
                    updateField('employee_id', empId)
                    const emp = employees.find((el) => el.id === empId)
                    if (emp) {
                      updateField('office_location', emp.office_location || '')
                    }
                  }} required className="w-full rounded-lg border border-gray-300 px-3 py-2" disabled={loadingEmployees}>
                    <option value="">
                      {loadingEmployees ? 'Loading employees...' : 'Select Host Employee'}
                    </option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.full_name} — {emp.department}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Office Location *</label>
                  {loadingLocations ? (
                    <div className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-500">
                      Loading locations...
                    </div>
                  ) : officeLocations.length === 0 ? (
                    <div className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-500">
                      No office locations available
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        type="text"
                        value={formData.office_location}
                        onChange={(e) => updateField('office_location', e.target.value)}
                        placeholder="Search location..."
                        className="w-full rounded-lg border border-gray-300 px-3 py-2"
                      />
                      {formData.office_location && (
                        <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-auto">
                          {officeLocations
                            .filter((loc) =>
                              loc.name.toLowerCase().includes(formData.office_location.toLowerCase())
                            )
                            .map((loc) => (
                              <li
                                key={loc.id}
                                className="px-3 py-2 cursor-pointer hover:bg-blue-50 text-sm"
                                onClick={() => {
                                  updateField('office_location', loc.name)
                                }}
                              >
                                <span className="font-medium">{loc.name}</span>
                                {loc.building && (
                                  <span className="text-gray-500 ml-2">— {loc.building}</span>
                                )}
                              </li>
                            ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Purpose *</label>
                  <textarea value={formData.purpose} onChange={(e) => updateField('purpose', e.target.value)} required rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Visit Date *</label>
                  <input type="date" value={formData.visit_date} onChange={(e) => updateField('visit_date', e.target.value)} min={new Date().toISOString().split('T')[0]} required className="w-full rounded-lg border border-gray-300 px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Arrival Time</label>
                  <input type="time" value={formData.arrival_time} onChange={(e) => updateField('arrival_time', e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expected Duration (minutes)</label>
                  <input type="number" value={formData.expected_duration} onChange={(e) => updateField('expected_duration', parseInt(e.target.value) || 60)} min="15" step="15" className="w-full rounded-lg border border-gray-300 px-3 py-2" />
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Vehicle Information (Optional)</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 flex items-center gap-2">
                  <input type="checkbox" id="has_vehicle" checked={formData.has_vehicle} onChange={(e) => updateField('has_vehicle', e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                  <label htmlFor="has_vehicle" className="text-sm font-medium text-gray-700">I will be bringing a vehicle</label>
                </div>
                {formData.has_vehicle && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Registration Number</label>
                      <input type="text" value={formData.registration_number} onChange={(e) => updateField('registration_number', e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type</label>
                      <select value={formData.vehicle_type} onChange={(e) => updateField('vehicle_type', e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2">
                        <option value="">Select</option>
                        <option value="Sedan">Sedan</option>
                        <option value="SUV">SUV</option>
                        <option value="Van">Van</option>
                        <option value="Truck">Truck</option>
                        <option value="Motorcycle">Motorcycle</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Colour</label>
                      <input type="text" value={formData.vehicle_color} onChange={(e) => updateField('vehicle_color', e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Emergency Contact</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <input type="text" value={formData.emergency_name} onChange={(e) => updateField('emergency_name', e.target.value)} required className="w-full rounded-lg border border-gray-300 px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Relationship *</label>
                  <input type="text" value={formData.emergency_relationship} onChange={(e) => updateField('emergency_relationship', e.target.value)} required className="w-full rounded-lg border border-gray-300 px-3 py-2" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                  <input type="tel" value={formData.emergency_phone} onChange={(e) => updateField('emergency_phone', e.target.value)} required className="w-full rounded-lg border border-gray-300 px-3 py-2" />
                </div>
              </div>
            </div>
          )}

          {step === 7 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Review & Submit</h2>
              <div className="rounded-xl border border-gray-200 p-4 space-y-3">
                <ReviewRow label="Visitor Type" value={visitorType} />
                <ReviewRow label="Full Name" value={formData.full_name} />
                <ReviewRow label="Phone" value={formData.phone} />
                <ReviewRow label="Email" value={formData.email} />
                <ReviewRow label="Organization" value={formData.visitor_organization} />
                <ReviewRow label="Nationality" value={formData.nationality} />
                <ReviewRow label="ID Type" value={formData.doc_type} />
                <ReviewRow label="ID Number" value={formData.doc_number} />
                <ReviewRow label="Host" value={formData.employee_id} />
                <ReviewRow label="Purpose" value={formData.purpose} />
                <ReviewRow label="Visit Date" value={formData.visit_date} />
                <ReviewRow label="Arrival Time" value={formData.arrival_time} />
                <ReviewRow label="Vehicle" value={formData.has_vehicle ? `${formData.registration_number} (${formData.vehicle_type})` : 'No'} />
                <ReviewRow label="Emergency Contact" value={`${formData.emergency_name} (${formData.emergency_relationship}) - ${formData.emergency_phone}`} />
              </div>
              <div className="flex items-start gap-2">
                <input type="checkbox" id="accept_terms" checked={formData.accept_terms} onChange={(e) => updateField('accept_terms', e.target.checked)} className="h-4 w-4 mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                <label htmlFor="accept_terms" className="text-sm text-gray-600">
                  I confirm that the information provided is accurate and I agree to abide by the visitor guidelines of the Armed Forces Command and Staff College.
                </label>
              </div>
            </div>
          )}

          <div className="mt-8 flex items-center justify-between">
            <button
              onClick={back}
              disabled={step === 1}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 min-h-[52px]"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
            {step < totalSteps ? (
              <button
                onClick={next}
                disabled={(step === 1 && !visitorType) || (step === 2 && !formData.photo_url) || (step === 4 && !formData.office_location)}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 min-h-[52px]"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting || !formData.accept_terms}
                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-6 py-3 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 min-h-[52px]"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Submit Registration
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ReviewRow({ label, value }: { label: string; value: string | boolean | number | null }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900">{String(value || '—')}</span>
    </div>
  )
}

