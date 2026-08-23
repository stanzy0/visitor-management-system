import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import VisitorRegistrationWizard from '@/components/wizard/VisitorRegistrationWizard'
import Step6EmergencyContact from '@/components/wizard/Step6EmergencyContact'
import Step2PersonalInfo from '@/components/wizard/Step2PersonalInfo'
import Step3Identification from '@/components/wizard/Step3Identification'
import Step7Review from '@/components/wizard/Step7Review'
import { validateStep6 } from '@/lib/validation/visitor'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
}))

vi.mock('@/lib/auth-client', () => ({
  getCurrentUser: vi.fn(() => Promise.resolve({ id: 'u1', email: 'test@test.com', role: 'Admin' })),
}))

beforeEach(() => {
  window.HTMLElement.prototype.scrollIntoView = () => {}
})

let visitorsInsertResult: { data: { id: string } | null; error: Error | null } = { data: { id: 'visitor-123' }, error: null }
let visitsInsertResult: { data: { id: string } | null; error: Error | null } = { data: { id: 'visit-456' }, error: null }
let capturedVisitsPayload: Record<string, unknown> = {}

vi.mock('@/lib/supabase', () => {
  const employeesData = { data: { id: 'emp-1', office_location: 'HQ', department: 'Engineering', full_name: 'John Doe', position: 'Manager', phone: '1234567890', email: 'john@example.com' }, error: null }

  const mockQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(employeesData),
    then: vi.fn(function (this: { _table: string }, resolve: (value: { data: unknown; error: null }) => { data: unknown; error: null }) {
      const table = this._table
      if (table === 'employees') {
        return resolve({ data: [
          { id: 'emp-1', full_name: 'John Doe', department: 'Engineering', position: 'Manager', office_location: 'HQ', phone: '1234567890', email: 'john@example.com' },
          { id: 'emp-2', full_name: 'Jane Smith', department: 'HR', position: 'Director', office_location: 'Branch', phone: '0987654321', email: 'jane@example.com' },
        ], error: null })
      }
      return resolve({ data: [], error: null })
    }),
    insert: vi.fn(function (this: { _table: string }, payload: Record<string, unknown>) {
      const table = this._table
      if (table === 'visitors') {
        return {
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue(visitorsInsertResult),
        } as unknown as typeof mockQuery
      }
      if (table === 'visits') {
        capturedVisitsPayload = payload
        return {
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue(visitsInsertResult),
        } as unknown as typeof mockQuery
      }
      return {
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      } as unknown as typeof mockQuery
    }),
    _table: '' as string,
  }

  function insertMock(table: string) {
    const q = Object.create(mockQuery) as typeof mockQuery
    q._table = table
    return q
  }

  const from = vi.fn(function (this: ReturnType<typeof fromMock>, table: string) {
    return insertMock(table)
  })

  return {
    supabase: {
      from,
      channel: vi.fn(() => ({ on: vi.fn(), subscribe: vi.fn() })),
      removeChannel: vi.fn(),
      auth: { signOut: vi.fn().mockResolvedValue({}) },
      storage: {
        from: vi.fn(() => ({
          upload: vi.fn().mockResolvedValue({ error: null }),
          getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'http://example.com/photo.jpg' } })),
        })),
      },
    },
  }
})

async function fillStep2() {
  const textboxes = screen.getAllByRole('textbox')
  fireEvent.change(textboxes[0], { target: { value: 'Test Visitor' } })
  fireEvent.change(textboxes[1], { target: { value: '+1234567890' } })
  fireEvent.change(textboxes[2], { target: { value: 'test@example.com' } })
  fireEvent.change(textboxes[3], { target: { value: 'Acme Corp' } })
  fireEvent.change(textboxes[4], { target: { value: 'Lagos' } })

  const nationalityInput = screen.getByPlaceholderText('Select nationality')
  fireEvent.focus(nationalityInput)
  fireEvent.change(nationalityInput, { target: { value: 'Nigeria' } })

  fireEvent.keyDown(nationalityInput, { key: 'ArrowDown' })
  fireEvent.keyDown(nationalityInput, { key: 'Enter' })

  const genderSelect = screen.getAllByRole('combobox')[0]
  fireEvent.change(genderSelect, { target: { value: 'Male' } })
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function goToStep(targetStep: number) {
  for (let attempt = 0; attempt < 20; attempt++) {
    const stepHeader = screen.queryByText(/Step \d+ of 7/)
    if (stepHeader?.textContent === `Step ${targetStep} of 7`) return
    const nextBtn = screen.queryByRole('button', { name: /next|submit registration/i })
    if (!nextBtn) break
    await act(async () => { fireEvent.click(nextBtn) })
    await delay(50)
  }
}

describe('validateStep6', () => {
  it('returns no errors when all required fields are valid', () => {
    const errors = validateStep6({
      emergency_contact: 'Jane Doe',
      emergency_relationship: 'Spouse',
      emergency_phone: '+1234567890',
    })
    expect(errors).toEqual({})
  })

  it('returns error when emergency contact name is empty', () => {
    const errors = validateStep6({
      emergency_contact: '',
      emergency_relationship: 'Spouse',
      emergency_phone: '+1234567890',
    })
    expect(errors.emergency_contact).toBe('Emergency Contact Name is required.')
  })

  it('returns error when relationship is empty', () => {
    const errors = validateStep6({
      emergency_contact: 'Jane Doe',
      emergency_relationship: '',
      emergency_phone: '+1234567890',
    })
    expect(errors.emergency_relationship).toBe('Relationship is required.')
  })

  it('returns error when phone is empty', () => {
    const errors = validateStep6({
      emergency_contact: 'Jane Doe',
      emergency_relationship: 'Spouse',
      emergency_phone: '',
    })
    expect(errors.emergency_phone).toBe('Phone number is required.')
  })

  it('returns error for invalid phone format', () => {
    const errors = validateStep6({
      emergency_contact: 'Jane Doe',
      emergency_relationship: 'Spouse',
      emergency_phone: 'abc',
    })
    expect(errors.emergency_phone).toBe('Invalid phone number format.')
  })
})

describe('Step6EmergencyContact', () => {
  it('shows validation errors for required fields', () => {
    render(
      <Step6EmergencyContact
        onChange={vi.fn()}
        onBlur={vi.fn()}
        errors={{
          emergency_contact: 'Emergency Contact Name is required.',
          emergency_relationship: 'Relationship is required.',
          emergency_phone: 'Invalid phone number format.',
        }}
        touched={new Set(['emergency_contact', 'emergency_relationship', 'emergency_phone'])}
      />
    )

    expect(screen.getByText('Emergency Contact Name is required.')).toBeInTheDocument()
    expect(screen.getByText('Relationship is required.')).toBeInTheDocument()
    expect(screen.getByText('Invalid phone number format.')).toBeInTheDocument()
  })

  it('allows entering emergency contact data', () => {
    const onChange = vi.fn()
    render(
      <Step6EmergencyContact
        onChange={onChange}
        onBlur={vi.fn()}
      />
    )

    const nameInput = screen.getByLabelText('Emergency Contact Name *')
    fireEvent.change(nameInput, { target: { value: 'Jane Doe' } })

    const relationshipSelect = screen.getByLabelText('Relationship *')
    fireEvent.change(relationshipSelect, { target: { value: 'Spouse' } })

    const phoneInput = screen.getByLabelText('Phone Number *')
    fireEvent.change(phoneInput, { target: { value: '+1234567890' } })

    expect(onChange).toHaveBeenCalledWith('emergency_contact', 'Jane Doe')
    expect(onChange).toHaveBeenCalledWith('emergency_relationship', 'Spouse')
    expect(onChange).toHaveBeenCalledWith('emergency_phone', '+1234567890')
  })
})

describe('Step2PersonalInfo', () => {
  it('displays visitor photo capture controls', () => {
    render(
      <Step2PersonalInfo
        onChange={vi.fn()}
        onBlur={vi.fn()}
      />
    )

    expect(screen.getByText('Visitor Photograph')).toBeInTheDocument()
    expect(screen.getByText('Take Photo')).toBeInTheDocument()
    expect(screen.getByText('Upload Passport Photograph')).toBeInTheDocument()
  })

  it('shows photo preview when photo_url is provided', () => {
    render(
      <Step2PersonalInfo
        photo_url="http://example.com/photo.jpg"
        onChange={vi.fn()}
        onBlur={vi.fn()}
      />
    )

    expect(screen.getByText('Retake Photo')).toBeInTheDocument()
  })
})

describe('Step3Identification', () => {
  it('shows no-identification checkbox', () => {
    render(
      <Step3Identification
        data={{
          doc_type: '',
          doc_number: '',
          expiry_date: '',
          doc_front_url: '',
          doc_back_url: '',
          issuing_country: '',
          doc_front_image: null,
          doc_back_image: null,
          id_verification: false,
        }}
        onChange={vi.fn()}
        onBlur={vi.fn()}
      />
    )

    expect(screen.getByText('Visitor has no identification document')).toBeInTheDocument()
  })

  it('clears fields when no-identification is checked', () => {
    const onChange = vi.fn()
    render(
      <Step3Identification
        data={{
          doc_type: 'Passport',
          doc_number: 'A1234567',
          expiry_date: '2030-01-01',
          doc_front_url: 'http://example.com/front.jpg',
          doc_back_url: 'http://example.com/back.jpg',
          issuing_country: 'Nigeria',
          doc_front_image: null,
          doc_back_image: null,
          id_verification: false,
        }}
        onChange={onChange}
        onBlur={vi.fn()}
      />
    )

    const checkbox = screen.getByRole('checkbox')
    fireEvent.click(checkbox)

    expect(onChange).toHaveBeenCalledWith('id_verification', true)
    expect(onChange).toHaveBeenCalledWith('doc_type', '')
    expect(onChange).toHaveBeenCalledWith('doc_number', '')
    expect(onChange).toHaveBeenCalledWith('expiry_date', '')
    expect(onChange).toHaveBeenCalledWith('issuing_country', '')
    expect(onChange).toHaveBeenCalledWith('doc_front_url', '')
    expect(onChange).toHaveBeenCalledWith('doc_back_url', '')
    expect(onChange).toHaveBeenCalledWith('doc_front_image', null)
    expect(onChange).toHaveBeenCalledWith('doc_back_image', null)
  })
})

describe('Step7Review', () => {
  it('shows Not provided when identification is skipped', () => {
    render(
      <Step7Review
        id_verification={true}
        doc_type=""
        doc_number=""
        expiry_date=""
      />
    )

    expect(screen.getByText('Not provided')).toBeInTheDocument()
  })

  it('displays visitor photo when supplied', () => {
    render(
      <Step7Review
        photo_url="http://example.com/photo.jpg"
        full_name="Test Visitor"
      />
    )

    expect(screen.getByText('Photo:')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /Test Visitor/i })).toBeInTheDocument()
  })

  it('displays host department and office location', () => {
    render(
      <Step7Review
        host_employee_id="emp-1"
        host_department="Engineering"
        office_location="HQ"
      />
    )

    expect(screen.getByText('Host Department:')).toBeInTheDocument()
    expect(screen.getByText(/Engineering/)).toBeInTheDocument()
    expect(screen.getByText('Office Location:')).toBeInTheDocument()
    expect(screen.getByText(/HQ/)).toBeInTheDocument()
  })

  it('uses dark text classes for labels and values', () => {
    const { container } = render(
      <Step7Review
        visitorType="Visitor"
        full_name="Test Visitor"
        phone="+1234567890"
      />
    )

    const heading = container.querySelector('h3')
    expect(heading).toHaveClass('text-gray-900')

    const reviewBox = container.querySelector('.rounded-lg')
    expect(reviewBox).toHaveClass('text-gray-900')

    const paragraphs = container.querySelectorAll('p')
    paragraphs.forEach((p) => {
      expect(p).toHaveClass('text-gray-900')
    })

    const labels = container.querySelectorAll('strong')
    labels.forEach((label) => {
      expect(label).toHaveClass('text-gray-700')
    })
  })
})

describe('VisitorRegistrationWizard submission', () => {
  beforeEach(() => {
    visitorsInsertResult = { data: { id: 'visitor-123' }, error: null }
    visitsInsertResult = { data: { id: 'visit-456' }, error: null }
    capturedVisitsPayload = {}
  })

  it('creates visitor and visit with correct payload and without schema-banned columns', async () => {
    render(<VisitorRegistrationWizard />)

    await goToStep(2)
    await fillStep2()
    await goToStep(3)

    const noIdCheckbox = screen.getByRole('checkbox')
    await act(async () => { fireEvent.click(noIdCheckbox) })

    await goToStep(4)

    const hostSelect = screen.getAllByRole('combobox')[0]
    fireEvent.focus(hostSelect)
    fireEvent.keyDown(hostSelect, { key: 'ArrowDown' })
    fireEvent.keyDown(hostSelect, { key: 'Enter' })

    const purposeSelect = screen.getAllByRole('combobox')[1]
    fireEvent.focus(purposeSelect)
    fireEvent.keyDown(purposeSelect, { key: 'ArrowDown' })
    fireEvent.keyDown(purposeSelect, { key: 'ArrowDown' })
    fireEvent.keyDown(purposeSelect, { key: 'Enter' })

    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement
    fireEvent.change(dateInput, { target: { value: '2030-01-01' } })

    const timeInput = document.querySelector('input[type="time"]') as HTMLInputElement
    fireEvent.change(timeInput, { target: { value: '10:00' } })

    const durationInput = document.querySelector('input[type="number"]') as HTMLInputElement
    fireEvent.change(durationInput, { target: { value: '60' } })

    await goToStep(5)

    await goToStep(6)

    const emergencyNameInput = screen.getByLabelText('Emergency Contact Name *')
    fireEvent.change(emergencyNameInput, { target: { value: 'Jane Doe' } })

    const relationshipSelect = screen.getByLabelText('Relationship *')
    fireEvent.change(relationshipSelect, { target: { value: 'Brother' } })

    const emergencyPhoneInput = screen.getByLabelText('Phone Number *')
    fireEvent.change(emergencyPhoneInput, { target: { value: '+1234567890' } })

    await goToStep(7)

    const submitBtn = screen.getByRole('button', { name: /submit registration/i })
    await act(async () => { fireEvent.click(submitBtn) })

    await act(async () => { await delay(50) })

    expect(capturedVisitsPayload.visitor_id).toBe('visitor-123')
    expect(capturedVisitsPayload.employee_id).toBe('emp-1')
    expect(capturedVisitsPayload.status).toBe('pending')
    expect(capturedVisitsPayload.source).toBe('internal')
    expect(capturedVisitsPayload).not.toHaveProperty('visit_date')
    expect(capturedVisitsPayload).not.toHaveProperty('arrival_time')
    expect(capturedVisitsPayload).not.toHaveProperty('expected_duration')
  })

  it('surfaces visit creation failure as an error', async () => {
    visitsInsertResult = { data: null, error: new Error('visits constraint violation') }

    render(<VisitorRegistrationWizard />)

    await goToStep(2)
    await fillStep2()
    await goToStep(3)

    const noIdCheckbox = screen.getByRole('checkbox')
    await act(async () => { fireEvent.click(noIdCheckbox) })

    await goToStep(4)

    const hostSelect = screen.getAllByRole('combobox')[0]
    fireEvent.focus(hostSelect)
    fireEvent.keyDown(hostSelect, { key: 'ArrowDown' })
    fireEvent.keyDown(hostSelect, { key: 'Enter' })

    const purposeSelect = screen.getAllByRole('combobox')[1]
    fireEvent.focus(purposeSelect)
    fireEvent.keyDown(purposeSelect, { key: 'ArrowDown' })
    fireEvent.keyDown(purposeSelect, { key: 'ArrowDown' })
    fireEvent.keyDown(purposeSelect, { key: 'Enter' })

    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement
    fireEvent.change(dateInput, { target: { value: '2030-01-01' } })

    const timeInput = document.querySelector('input[type="time"]') as HTMLInputElement
    fireEvent.change(timeInput, { target: { value: '10:00' } })

    const durationInput = document.querySelector('input[type="number"]') as HTMLInputElement
    fireEvent.change(durationInput, { target: { value: '60' } })

    await goToStep(5)

    await goToStep(6)

    const emergencyNameInput = screen.getByLabelText('Emergency Contact Name *')
    fireEvent.change(emergencyNameInput, { target: { value: 'Jane Doe' } })

    const relationshipSelect = screen.getByLabelText('Relationship *')
    fireEvent.change(relationshipSelect, { target: { value: 'Brother' } })

    const emergencyPhoneInput = screen.getByLabelText('Phone Number *')
    fireEvent.change(emergencyPhoneInput, { target: { value: '+1234567890' } })

    await goToStep(7)

    const submitBtn = screen.getByRole('button', { name: /submit registration/i })
    await act(async () => { fireEvent.click(submitBtn) })

    await waitFor(() => {
      expect(screen.getByText(/visits constraint violation/i)).toBeInTheDocument()
    })
  })
})
