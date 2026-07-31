'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Loader2, CheckCircle2, ChevronRight, ChevronLeft, Upload, Camera, AlertCircle } from 'lucide-react'
import PhotoCapture from '@/components/PhotoCapture'
import SearchableCombobox from '@/components/ui/SearchableCombobox'
import { validateStep1, validateStep2, validateStep3, validateStep4, validateStep5, validateStep6, hasValidationErrors } from '@/lib/validation/visitor'

type VisitorType = 'Visitor' | 'Contractor' | 'Vendor' | 'Guest Lecturer' | 'VIP' | 'Family Visitor' | 'Other'

interface Employee {
  id: string
  full_name: string
  department: string | null
  position: string | null
  office_location: string | null
  phone: string | null
  email: string | null
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

const PURPOSE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'Official Visit', label: 'Official Visit' },
  { value: 'Meeting', label: 'Meeting' },
  { value: 'Lecture / Seminar', label: 'Lecture / Seminar' },
  { value: 'Training', label: 'Training' },
  { value: 'Examination', label: 'Examination' },
  { value: 'Administrative Matter', label: 'Administrative Matter' },
  { value: 'Document Submission', label: 'Document Submission' },
  { value: 'Interview', label: 'Interview' },
  { value: 'Maintenance / Repair', label: 'Maintenance / Repair' },
  { value: 'Contractor Visit', label: 'Contractor Visit' },
  { value: 'Delivery', label: 'Delivery' },
  { value: 'Medical Visit', label: 'Medical Visit' },
  { value: 'VIP Visit', label: 'VIP Visit' },
  { value: 'Family Visit', label: 'Family Visit' },
  { value: 'Vendor / Supplier', label: 'Vendor / Supplier' },
  { value: 'Inspection', label: 'Inspection' },
  { value: 'Research', label: 'Research' },
  { value: 'Event', label: 'Event' },
  { value: 'Other', label: 'Other' },
]

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
  const [docUploadError, setDocUploadError] = useState<string | null>(null)
   const [visitorType, setVisitorType] = useState<VisitorType>('Visitor')
   const [employees, setEmployees] = useState<Employee[]>([])
   const [loadingEmployees, setLoadingEmployees] = useState(true)
   const [availabilityStatus, setAvailabilityStatus] = useState<string | null>(null)
   const [availabilityMessage, setAvailabilityMessage] = useState<string | null>(null)
   const [availabilityAlternatives, setAvailabilityAlternatives] = useState<Array<{ time: string; availableAt: string }>>([])
   const [checkingAvailability, setCheckingAvailability] = useState(false)
   const [nextAvailableAt, setNextAvailableAt] = useState<string | null>(null)
   const [customPurpose, setCustomPurpose] = useState('')
  const [validationErrors, setValidationErrors] = useState<Record<string, string | null>>({})
  const [touched, setTouched] = useState<Set<string>>(new Set())

  const markTouched = (field: string) => {
    setTouched((prev) => {
      const next = new Set(prev)
      next.add(field)
      return next
    })
  }

  const scrollToFirstInvalid = () => {
    const firstInvalid = document.querySelector('.border-red-500, .text-red-600')
    if (firstInvalid instanceof HTMLElement) {
      firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' })
      firstInvalid.focus()
    }
  }

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
    vehicle_make: '',
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
      .select('id, full_name, department, position, office_location, phone, email')
      .order('full_name')
      .then(({ data, error }) => {
        if (error) {
          console.error('Failed to load employees:', error)
          setEmployees([])
        } else {
          setEmployees(data ?? [])
        }
        setLoadingEmployees(false)
      })
  }, [])

  useEffect(() => {
    if (formData.employee_id && formData.visit_date && formData.arrival_time) {
      checkAvailability()
    }
  }, [formData.employee_id, formData.visit_date, formData.arrival_time, formData.expected_duration])

  useEffect(() => {
    if (!formData.employee_id) return

    const channel = supabase
      .channel('host-availability-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `employee_id=eq.${formData.employee_id}`,
        },
        (payload) => {
          if (payload.new && (payload.new as any).appointment_date === formData.visit_date) {
            checkAvailability()
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'employees',
          filter: `id=eq.${formData.employee_id}`,
        },
        () => {
          checkAvailability()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [formData.employee_id, formData.visit_date])

  const totalSteps = 7

  const updateField = (field: string, value: string | boolean | number | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const checkAvailability = async () => {
    if (!formData.employee_id || !formData.visit_date || !formData.arrival_time) {
      setAvailabilityStatus(null)
      setAvailabilityMessage(null)
      setAvailabilityAlternatives([])
      setNextAvailableAt(null)
      return
    }

    setCheckingAvailability(true)
    try {
      const params = new URLSearchParams({
        employee_id: formData.employee_id,
        date: formData.visit_date,
        time: formData.arrival_time,
        duration: String(formData.expected_duration || 60),
      })

      const res = await fetch(`/api/public/host-availability?${params}`)
      console.log('[host-availability] request', `/api/public/host-availability?${params}`)
      const data = await res.json()
      console.log('[host-availability] response', data)
      setAvailabilityStatus(data.status || null)
      setAvailabilityMessage(data.message || null)
      setAvailabilityAlternatives(data.alternatives || [])
      setNextAvailableAt(data.nextAvailableAt || null)
    } catch {
      setAvailabilityStatus('Unavailable')
      setAvailabilityMessage('Failed to check availability.')
      setAvailabilityAlternatives([])
      setNextAvailableAt(null)
    } finally {
      setCheckingAvailability(false)
    }
  }

  const next = async () => {
    setError(null)
    let errors: Record<string, string | null> = {}

    if (step === 1) {
      errors = validateStep1(visitorType)
    } else if (step === 2) {
      errors = validateStep2({
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone,
        visitor_organization: formData.visitor_organization,
        nationality: formData.nationality,
        gender: formData.gender,
      })
      if (!formData.photo_url) {
        errors.photo_url = 'Visitor photograph is required.'
      }
    } else if (step === 3) {
      errors = validateStep3({
        doc_type: formData.doc_type,
        doc_number: formData.doc_number,
        issuing_country: formData.issuing_country,
        expiry_date: formData.expiry_date,
        doc_front_url: formData.doc_front_url,
        doc_back_url: formData.doc_back_url,
      })
    } else if (step === 4) {
      errors = validateStep4({
        host_employee_id: formData.employee_id,
        purpose: formData.purpose === 'Other' ? customPurpose : formData.purpose,
        custom_purpose: customPurpose,
        visit_date: formData.visit_date,
        arrival_time: formData.arrival_time,
        expected_duration: formData.expected_duration,
      })

      const selectedEmployee = employees.find((e) => e.id === formData.employee_id)
      if (!selectedEmployee?.department) {
        errors.employee_id = 'The selected employee has no department assigned. Please contact Reception.'
      }
      if (!selectedEmployee?.office_location) {
        errors.office_location = 'The selected employee has no assigned office location. Please contact Reception.'
      }
      if (availabilityStatus && availabilityStatus !== 'Available') {
        errors.availability = availabilityMessage || 'Host is not available for the selected time.'
      }
    } else if (step === 5) {
      errors = validateStep5({
        has_vehicle: formData.has_vehicle,
        registration_number: formData.registration_number,
        vehicle_type: formData.vehicle_type,
        vehicle_make: formData.vehicle_make,
      })
    } else if (step === 6) {
      errors = validateStep6({
        emergency_contact: formData.emergency_name,
        emergency_relationship: formData.emergency_relationship,
        emergency_phone: formData.emergency_phone,
      })
    }

    const hasErrors = Object.values(errors).some((err) => err !== null && err !== undefined)
    if (hasErrors) {
      setValidationErrors(errors)
      setTouched((prev) => {
        const next = new Set(prev)
        Object.keys(errors).forEach((field) => next.add(field))
        return next
      })
      setError('Please complete all required fields before continuing.')
      setTimeout(scrollToFirstInvalid, 0)
      return
    }

    setValidationErrors({})
    setStep((s) => Math.min(s + 1, totalSteps))
  }
  const back = () => setStep((s) => Math.max(s - 1, 1))

  const handleDocUpload = async (file: File, side: 'front' | 'back') => {
    console.log('[handleDocUpload] Starting upload for', side, 'file:', file.name, 'type:', file.type, 'size:', file.size)
    setDocUploadError(null)

    const storagePath = `public-reg/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    console.log('[handleDocUpload] Storage path:', storagePath)

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('visitor-documents')
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      })

    console.log('[handleDocUpload] Upload result:', uploadError ? 'ERROR' : 'SUCCESS')
    if (uploadError) {
      console.error('[handleDocUpload] Upload failed:', uploadError)
      setDocUploadError(uploadError.message)
      return
    }

    const {
      data: { publicUrl },
    } = supabase.storage
      .from('visitor-documents')
      .getPublicUrl(storagePath)

    console.log('[handleDocUpload] Public URL:', publicUrl)

    if (side === 'front') {
      updateField('doc_front_url', publicUrl)
      updateField('front_image_url', publicUrl)
    } else {
      updateField('doc_back_url', publicUrl)
      updateField('back_image_url', publicUrl)
    }

    console.log('[handleDocUpload] Updated field for', side, ':', side === 'front' ? 'doc_front_url' : 'doc_back_url')
  }

  const handleSubmit = async () => {
    const allErrors: Record<string, string | null> = {
      ...validateStep1(visitorType),
      ...validateStep2({
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone,
        visitor_organization: formData.visitor_organization,
        nationality: formData.nationality,
        gender: formData.gender,
      }),
      ...(!formData.photo_url ? { photo_url: 'Visitor photograph is required.' } : {}),
      ...validateStep3({
        doc_type: formData.doc_type,
        doc_number: formData.doc_number,
        issuing_country: formData.issuing_country,
        expiry_date: formData.expiry_date,
        doc_front_url: formData.doc_front_url,
        doc_back_url: formData.doc_back_url,
      }),
      ...validateStep4({
        host_employee_id: formData.employee_id,
        purpose: formData.purpose === 'Other' ? customPurpose : formData.purpose,
        custom_purpose: customPurpose,
        visit_date: formData.visit_date,
        arrival_time: formData.arrival_time,
        expected_duration: formData.expected_duration,
      }),
      ...validateStep5({
        has_vehicle: formData.has_vehicle,
        registration_number: formData.registration_number,
        vehicle_type: formData.vehicle_type,
        vehicle_make: formData.vehicle_make,
      }),
      ...validateStep6({
        emergency_contact: formData.emergency_name,
        emergency_relationship: formData.emergency_relationship,
        emergency_phone: formData.emergency_phone,
      }),
    }

    const hasErrors = hasValidationErrors(allErrors)
    if (hasErrors) {
      setValidationErrors(allErrors)
      setTouched((prev) => {
        const next = new Set(prev)
        Object.keys(allErrors).forEach((field) => next.add(field))
        return next
      })
      setError('Please complete all required fields before submitting.')
      setTimeout(scrollToFirstInvalid, 0)
      return
    }

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
           purpose: formData.purpose === 'Other' ? customPurpose : formData.purpose,
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

      if (docUploadError) {
        setError(docUploadError)
        setSubmitting(false)
        return
      }

      if (formData.doc_number && formData.doc_front_url) {
        const insertPayload = {
          visitor_id: visitor.id,
          document_type: formData.doc_type,
          document_number: formData.doc_number,
          issuing_country: formData.issuing_country,
          expiry_date: formData.expiry_date,
          front_image_url: formData.doc_front_url,
          file_url: formData.doc_front_url,
          back_image_url: formData.doc_back_url || null,
          verified: false,
          verification_status: 'Pending',
        }
        
        console.log('[PublicRegistrationWizard] Insert payload before visitor_documents:', insertPayload)
        
        const isStorageUrl = insertPayload.front_image_url.startsWith('http')
        if (!isStorageUrl) {
          const msg = `Refusing to insert non-Storage URL into visitor_documents: ${insertPayload.front_image_url}`
          console.error('[PublicRegistrationWizard]', msg)
          setError('Document upload failed. Only Storage URLs are accepted.')
          setSubmitting(false)
          return
        }
        
        const { error: docError } = await supabase.from('visitor_documents').insert(insertPayload)
        
        if (docError) {
          console.error('[PublicRegistrationWizard] visitor_documents insert error:', docError)
        } else {
          console.log('[PublicRegistrationWizard] visitor_documents insert succeeded')
        }
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

const isStepInvalid = () => {
     if (step === 1) return hasValidationErrors(validateStep1(visitorType))
     if (step === 2) {
       const errors = validateStep2({
         full_name: formData.full_name,
         email: formData.email,
         phone: formData.phone,
         visitor_organization: formData.visitor_organization,
         nationality: formData.nationality,
         gender: formData.gender,
       })
       if (!formData.photo_url) errors.photo_url = 'Visitor photograph is required.'
       return hasValidationErrors(errors)
     }
     if (step === 3) {
       const errors = validateStep3({
         doc_type: formData.doc_type,
         doc_number: formData.doc_number,
         issuing_country: formData.issuing_country,
         expiry_date: formData.expiry_date,
         doc_front_url: formData.doc_front_url,
         doc_back_url: formData.doc_back_url,
       })
       if (docUploadError) errors.doc_front_url = docUploadError
       return hasValidationErrors(errors)
     }
     if (step === 4) return hasValidationErrors(validateStep4({
       host_employee_id: formData.employee_id,
       purpose: formData.purpose === 'Other' ? customPurpose : formData.purpose,
       custom_purpose: customPurpose,
       visit_date: formData.visit_date,
       arrival_time: formData.arrival_time,
       expected_duration: formData.expected_duration,
     }))
     if (step === 5) return hasValidationErrors(validateStep5({
       has_vehicle: formData.has_vehicle,
       registration_number: formData.registration_number,
       vehicle_type: formData.vehicle_type,
       vehicle_make: formData.vehicle_make,
     }))
     if (step === 6) return hasValidationErrors(validateStep6({
      emergency_contact: formData.emergency_name,
      emergency_relationship: formData.emergency_relationship,
      emergency_phone: formData.emergency_phone,
    }))
    return false
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
              {validationErrors.visitor_type && <p className="text-sm text-red-600">{validationErrors.visitor_type}</p>}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {VISITOR_TYPES.map((type) => (
                  <button
                    key={type}
                    onClick={() => setVisitorType(type)}
                    className={`rounded-xl border-2 p-4 text-center transition-all min-h-[52px] ${
                      visitorType === type ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'
                    } ${touched.has('visitorType') && validationErrors.visitor_type ? 'border-red-500' : ''}`}
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
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => updateField('full_name', e.target.value)}
                    onBlur={() => markTouched('full_name')}
                    className={`${touched.has('full_name') && validationErrors.full_name ? 'border-red-500 text-red-600' : 'border-gray-300'} w-full rounded-lg border px-3 py-2`}
                  />
                  {touched.has('full_name') && validationErrors.full_name && <p className="text-sm text-red-600 mt-1">{validationErrors.full_name}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    onBlur={() => markTouched('phone')}
                    className={`${touched.has('phone') && validationErrors.phone ? 'border-red-500 text-red-600' : 'border-gray-300'} w-full rounded-lg border px-3 py-2`}
                  />
                  {touched.has('phone') && validationErrors.phone && <p className="text-sm text-red-600 mt-1">{validationErrors.phone}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    onBlur={() => markTouched('email')}
                    className={`${touched.has('email') && validationErrors.email ? 'border-red-500 text-red-600' : 'border-gray-300'} w-full rounded-lg border px-3 py-2`}
                  />
                  {touched.has('email') && validationErrors.email && <p className="text-sm text-red-600 mt-1">{validationErrors.email}</p>}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Organization / Company *</label>
                  <input
                    type="text"
                    value={formData.visitor_organization}
                    onChange={(e) => updateField('visitor_organization', e.target.value)}
                    onBlur={() => markTouched('visitor_organization')}
                    className={`${touched.has('visitor_organization') && validationErrors.visitor_organization ? 'border-red-500 text-red-600' : 'border-gray-300'} w-full rounded-lg border px-3 py-2`}
                  />
                  {touched.has('visitor_organization') && validationErrors.visitor_organization && <p className="text-sm text-red-600 mt-1">{validationErrors.visitor_organization}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nationality *</label>
                  <select
                    value={formData.nationality}
                    onChange={(e) => updateField('nationality', e.target.value)}
                    onBlur={() => markTouched('nationality')}
                    className={`${touched.has('nationality') && validationErrors.nationality ? 'border-red-500 text-red-600' : 'border-gray-300'} w-full rounded-lg border px-3 py-2`}
                  >
                    <option value="">Select nationality</option>
                    {NATIONALITIES.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                  {touched.has('nationality') && validationErrors.nationality && <p className="text-sm text-red-600 mt-1">{validationErrors.nationality}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gender *</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => updateField('gender', e.target.value)}
                    onBlur={() => markTouched('gender')}
                    className={`${touched.has('gender') && validationErrors.gender ? 'border-red-500 text-red-600' : 'border-gray-300'} w-full rounded-lg border px-3 py-2`}
                  >
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                  {touched.has('gender') && validationErrors.gender && <p className="text-sm text-red-600 mt-1">{validationErrors.gender}</p>}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Residential Address</label>
                  <textarea
                    value={formData.visitor_address}
                    onChange={(e) => updateField('visitor_address', e.target.value)}
                    onBlur={() => markTouched('visitor_address')}
                    rows={2}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Photograph *</label>
                  <PhotoCapture
                    value={formData.photo_url}
                    onChange={(dataUrl) => {
                      updateField('photo_url', dataUrl)
                      setError(null)
                    }}
                    error={touched.has('photo_url') && validationErrors.photo_url ? validationErrors.photo_url : undefined}
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
                  <select
                    value={formData.doc_type}
                    onChange={(e) => updateField('doc_type', e.target.value)}
                    onBlur={() => markTouched('doc_type')}
                    className={`${touched.has('doc_type') && validationErrors.doc_type ? 'border-red-500 text-red-600' : 'border-gray-300'} w-full rounded-lg border px-3 py-2`}
                  >
                    {REQUIRED_DOCUMENT_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  {touched.has('doc_type') && validationErrors.doc_type && <p className="text-sm text-red-600 mt-1">{validationErrors.doc_type}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ID Number *</label>
                  <input
                    type="text"
                    value={formData.doc_number}
                    onChange={(e) => updateField('doc_number', e.target.value)}
                    onBlur={() => markTouched('doc_number')}
                    className={`${touched.has('doc_number') && validationErrors.doc_number ? 'border-red-500 text-red-600' : 'border-gray-300'} w-full rounded-lg border px-3 py-2`}
                  />
                  {touched.has('doc_number') && validationErrors.doc_number && <p className="text-sm text-red-600 mt-1">{validationErrors.doc_number}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Issuing Country *</label>
                  <select
                    value={formData.issuing_country}
                    onChange={(e) => updateField('issuing_country', e.target.value)}
                    onBlur={() => markTouched('issuing_country')}
                    className={`${touched.has('issuing_country') && validationErrors.issuing_country ? 'border-red-500 text-red-600' : 'border-gray-300'} w-full rounded-lg border px-3 py-2`}
                  >
                    <option value="">Select country</option>
                    {NATIONALITIES.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                  {touched.has('issuing_country') && validationErrors.issuing_country && <p className="text-sm text-red-600 mt-1">{validationErrors.issuing_country}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date *</label>
                  <input
                    type="date"
                    value={formData.expiry_date}
                    onChange={(e) => updateField('expiry_date', e.target.value)}
                    onBlur={() => markTouched('expiry_date')}
                    className={`${touched.has('expiry_date') && validationErrors.expiry_date ? 'border-red-500 text-red-600' : 'border-gray-300'} w-full rounded-lg border px-3 py-2`}
                  />
                  {touched.has('expiry_date') && validationErrors.expiry_date && <p className="text-sm text-red-600 mt-1">{validationErrors.expiry_date}</p>}
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-500 mb-2">Upload scanned documents.</p>
                  <div className="grid grid-cols-2 gap-4">
                    <label
                      htmlFor="doc-front-upload"
                      className={`rounded-lg border-2 border-dashed p-4 text-center text-sm cursor-pointer transition-colors ${
                        touched.has('doc_front_url') && validationErrors.doc_front_url ? 'border-red-500 text-red-600' : 'border-gray-300 text-gray-500 hover:border-blue-400'
                      }`}
                    >
                      <input
                        id="doc-front-upload"
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                        onChange={(e) => e.target.files?.[0] && handleDocUpload(e.target.files[0], 'front')}
                        className="hidden"
                      />
                      {formData.doc_front_url ? (
                        <img src={formData.doc_front_url} alt="Front" className="mx-auto h-32 object-cover rounded" />
                      ) : (
                        <div className="space-y-2">
                          <Upload className="h-8 w-8 mx-auto" />
                          <p className="text-xs">Click to upload Front</p>
                        </div>
                      )}
                    </label>
                    <label
                      htmlFor="doc-back-upload"
                      className={`rounded-lg border-2 border-dashed p-4 text-center text-sm cursor-pointer transition-colors ${(formData.doc_type === 'National ID' || formData.doc_type === 'Driver License') && touched.has('doc_back_url') && validationErrors.doc_back_url ? 'border-red-500 text-red-600' : 'border-gray-300 text-gray-500 hover:border-blue-400'}`}
                    >
                      <input
                        id="doc-back-upload"
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                        onChange={(e) => e.target.files?.[0] && handleDocUpload(e.target.files[0], 'back')}
                        className="hidden"
                      />
                      {formData.doc_back_url ? (
                        <img src={formData.doc_back_url} alt="Back" className="mx-auto h-32 object-cover rounded" />
                      ) : (
                        <div className="space-y-2">
                          <Upload className="h-8 w-8 mx-auto" />
                          <p className="text-xs">Click to upload Back</p>
                        </div>
                      )}
                    </label>
                  </div>
                  {touched.has('doc_front_url') && validationErrors.doc_front_url && <p className="text-sm text-red-600 mt-1">{validationErrors.doc_front_url}</p>}
                  {(formData.doc_type === 'National ID' || formData.doc_type === 'Driver License') && touched.has('doc_back_url') && validationErrors.doc_back_url && <p className="text-sm text-red-600 mt-1">{validationErrors.doc_back_url}</p>}
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Visit Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Host Employee *</label>
                  <SearchableCombobox
                    options={employees.map((emp) => ({
                      value: emp.id,
                      label: emp.full_name,
                      description: `${emp.department || ''}${emp.position ? ` · ${emp.position}` : ''}`,
                    }))}
                    value={formData.employee_id}
                     onChange={(val) => {
                       const emp = employees.find((e) => e.id === val)
                       updateField('employee_id', val)
                       updateField('office_location', emp?.office_location || '')
                     }}
                    placeholder="Search by name, department, or position..."
                    searchPlaceholder="Search employees..."
                    noResultsText="No employees found"
                    loading={loadingEmployees}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={employees.find((e) => e.id === formData.employee_id)?.department || ''}
                    readOnly
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Office Location</label>
                  {formData.employee_id && !employees.find((e) => e.id === formData.employee_id)?.office_location ? (
                    <div className="w-full rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                      <p className="text-sm text-amber-700">⚠️ This employee has no assigned office location.</p>
                      <p className="text-xs text-amber-600 mt-1">Please contact Reception.</p>
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={employees.find((e) => e.id === formData.employee_id)?.office_location || ''}
                      readOnly
                      className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-600"
                    />
                  )}
                </div>
                {formData.employee_id && (() => {
                  const selectedEmployee = employees.find((e) => e.id === formData.employee_id)
                  if (!selectedEmployee) return null
                  return (
                    <div className="md:col-span-2">
                      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                        <h3 className="text-sm font-medium text-gray-900 mb-3">Host Information</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-gray-500">Name</p>
                            <p className="text-sm font-medium text-gray-900">{selectedEmployee.full_name}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Department</p>
                            <p className="text-sm font-medium text-gray-900">{selectedEmployee.department || '—'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Office</p>
                            <p className="text-sm font-medium text-gray-900">{selectedEmployee.office_location || '—'}</p>
                          </div>
                          {selectedEmployee.position && (
                            <div>
                              <p className="text-xs text-gray-500">Position</p>
                              <p className="text-sm font-medium text-gray-900">{selectedEmployee.position}</p>
                            </div>
                          )}
                          {selectedEmployee.phone && (
                            <div>
                              <p className="text-xs text-gray-500">Phone</p>
                              <p className="text-sm font-medium text-gray-900">{selectedEmployee.phone}</p>
                            </div>
                          )}
                          {selectedEmployee.email && (
                            <div>
                              <p className="text-xs text-gray-500">Email</p>
                              <p className="text-sm font-medium text-gray-900">{selectedEmployee.email}</p>
                            </div>
                          )}
                           <div>
                             <p className="text-xs text-gray-500">Availability</p>
                             <p className="text-sm font-medium text-gray-900">Available</p>
                           </div>
                          <div>
                            <p className="text-xs text-gray-500">Next Available Time</p>
                            <p className="text-sm font-medium text-gray-900">{nextAvailableAt || '—'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })()}
                {formData.employee_id && formData.visit_date && formData.arrival_time && (
                  <div className="md:col-span-2">
                    {checkingAvailability ? (
                      <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                        Checking availability...
                      </div>
                    ) : availabilityStatus === 'Available' ? (
                      <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3">
                        <p className="text-sm font-medium text-green-800">🟢 Host Available</p>
                        <p className="text-xs text-green-700 mt-1">{availabilityMessage}</p>
                      </div>
                    ) : availabilityStatus === 'Busy' ? (
                      <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3">
                        <p className="text-sm font-medium text-orange-800">🟠 Host Busy</p>
                        <p className="text-xs text-orange-700 mt-1">{availabilityMessage}</p>
                        {nextAvailableAt && (
                          <p className="text-xs text-orange-700 mt-1">Available again at: {nextAvailableAt}</p>
                        )}
                        {availabilityAlternatives.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs font-medium text-orange-800">Choose another time:</p>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {availabilityAlternatives.map((alt) => (
                                <button
                                  key={alt.time}
                                  type="button"
                                  onClick={() => updateField('arrival_time', alt.time)}
                                  className="inline-flex items-center rounded-lg border border-orange-300 bg-white px-3 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-100"
                                >
                                  {alt.time}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : availabilityStatus === 'In Meeting' ? (
                      <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3">
                        <p className="text-sm font-medium text-yellow-800">🟡 Host In Meeting</p>
                        <p className="text-xs text-yellow-700 mt-1">{availabilityMessage}</p>
                        {availabilityAlternatives.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs font-medium text-yellow-800">Choose another time:</p>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {availabilityAlternatives.map((alt) => (
                                <button
                                  key={alt.time}
                                  type="button"
                                  onClick={() => updateField('arrival_time', alt.time)}
                                  className="inline-flex items-center rounded-lg border border-yellow-300 bg-white px-3 py-1.5 text-xs font-medium text-yellow-700 hover:bg-yellow-100"
                                >
                                  {alt.time}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : availabilityStatus === 'On Leave' || availabilityStatus === 'Training' || availabilityStatus === 'Restricted' || availabilityStatus === 'Unavailable' || availabilityStatus === 'Off Duty' ? (
                      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                        <p className="text-sm font-medium text-red-800">
                          {availabilityStatus === 'On Leave' ? '🔴 Host On Leave' : availabilityStatus === 'Restricted' ? '🔴 Restricted' : '⚪ Host Off Duty'}
                        </p>
                        <p className="text-xs text-red-700 mt-1">{availabilityMessage}</p>
                      </div>
                    ) : null}
                  </div>
                )}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Purpose *</label>
                  <SearchableCombobox
                    options={PURPOSE_OPTIONS}
                    value={formData.purpose}
                    onChange={(val) => {
                      updateField('purpose', val)
                    }}
                    placeholder="Select purpose..."
                    searchPlaceholder="Search purpose..."
                    noResultsText="No matching purpose"
                    required
                  />
                  {formData.purpose === 'Other' && (
                    <div className="mt-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Specify Purpose *</label>
                      <input
                        type="text"
                        value={customPurpose}
                        onChange={(e) => setCustomPurpose(e.target.value)}
                        placeholder="Please specify the purpose"
                        required
                        className="w-full rounded-lg border border-gray-300 px-3 py-2"
                      />
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Visit Date *</label>
                  <input type="date" value={formData.visit_date} onChange={(e) => updateField('visit_date', e.target.value)} min={new Date().toISOString().split('T')[0]} required className="w-full rounded-lg border border-gray-300 px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Arrival Time *</label>
                  <input type="time" value={formData.arrival_time} onChange={(e) => updateField('arrival_time', e.target.value)} required className="w-full rounded-lg border border-gray-300 px-3 py-2" />
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
                <ReviewRow label="Host" value={employees.find((e) => e.id === formData.employee_id)?.full_name || formData.employee_id} />
                 <ReviewRow label="Purpose" value={formData.purpose === 'Other' ? customPurpose : formData.purpose} />
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
                disabled={isStepInvalid()}
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

