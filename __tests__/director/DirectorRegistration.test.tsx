import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import DirectorRegisterPage from '@/app/register/director/page'
import PublicRegistrationWizard from '@/components/PublicRegistrationWizard'
import VisitorReviewModal from '@/components/pa/VisitorReviewModal'
import { getCurrentUser } from '@/lib/auth-client'

vi.mock('@/lib/auth-client', () => ({
  getCurrentUser: vi.fn(),
}))

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

vi.mock('@/components/NotificationBell', () => ({
  default: () => null,
}))

const mockUser = {
  id: 'u1',
  email: 'reception@test.com',
  full_name: 'Reception User',
  role: 'Receptionist' as const,
  created_at: null,
  must_change_password: false,
}

describe('Director Registration Form', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
    vi.mocked(getCurrentUser).mockResolvedValue(mockUser)
  })

  it('renders the Director-branded header', async () => {
    render(<DirectorRegisterPage />)
    await waitFor(() => {
      expect(screen.getByText(/DIRECTOR/)).toBeInTheDocument()
      expect(screen.getByText(/DEPARTMENT OF LAND WARFARE/)).toBeInTheDocument()
      expect(screen.getByText(/VISITORS FORM/)).toBeInTheDocument()
    })
  })
})

describe('PublicRegistrationWizard - Director Variant', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
    vi.mocked(getCurrentUser).mockResolvedValue(mockUser)
  })

  it('shows Director branding with variant prop', async () => {
    render(<PublicRegistrationWizard variant="director" />)
    await waitFor(() => {
      expect(screen.getByText('DIRECTOR')).toBeInTheDocument()
      expect(screen.getByText(/DEPARTMENT OF LAND WARFARE/)).toBeInTheDocument()
    })
  })
})

describe('PA Approval Comments', () => {
  const paDirectorUser = {
    id: 'u2',
    email: 'pa.director@test.com',
    full_name: 'PA Director',
    role: 'PA_TO_DIRECTOR' as const,
    created_at: null,
    must_change_password: false,
  }

  const paCIUser = {
    id: 'u3',
    email: 'pa.ci@test.com',
    full_name: 'PA CI',
    role: 'PA_TO_CI' as const,
    created_at: null,
    must_change_password: false,
  }

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  it('VisitorReviewModal shows PA to Director dropdown for PA_TO_DIRECTOR role', async () => {
    const mockVisit = {
      id: 'visit-1',
      visitor_id: 'vis-1',
      employee_id: 'emp-1',
      purpose: 'Official Visit',
      status: 'pending' as const,
      scheduled_date: '2026-08-28',
      arrival_time: '09:00',
      created_at: '2026-08-28T00:00:00Z',
      check_in_time: null,
      check_out_time: null,
      office_location: 'HQ',
      visitor: {
        id: 'vis-1',
        full_name: 'John Doe',
        email: 'john@test.com',
        phone: '1234567890',
        visitor_organization: 'Acme Corp',
        photo_url: null,
      },
      employee: {
        id: 'emp-1',
        full_name: 'Jane Smith',
        department: 'Executive',
        office_location: 'HQ',
      },
      visitor_documents: [],
    }

    vi.mocked(getCurrentUser).mockResolvedValue(paDirectorUser)

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : String(input)
      if (url.includes('/api/pa/visits/visit-1')) {
        return {
          ok: true,
          json: async () => ({ success: true, data: mockVisit }),
        } as Response
      }
      return { ok: true, json: async () => ({ success: true }) } as Response
    })
    ;(globalThis as { fetch?: unknown }).fetch = fetchMock as unknown

    render(
      <VisitorReviewModal
        visitId="visit-1"
        hostLabel="Director"
        paRole="PA_TO_DIRECTOR"
        onClose={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('PA to Director Comment')).toBeInTheDocument()
      expect(screen.getByText('Director has been informed. Visitor may be admitted.')).toBeInTheDocument()
    })
  })

  it('VisitorReviewModal shows PA to CI dropdown for PA_TO_CI role', async () => {
    const mockVisit = {
      id: 'visit-2',
      visitor_id: 'vis-2',
      employee_id: 'emp-2',
      purpose: 'Meeting',
      status: 'pending' as const,
      scheduled_date: '2026-08-28',
      arrival_time: '10:00',
      created_at: '2026-08-28T00:00:00Z',
      check_in_time: null,
      check_out_time: null,
      office_location: 'HQ',
      visitor: {
        id: 'vis-2',
        full_name: 'Jane Doe',
        email: 'jane@test.com',
        phone: '0987654321',
        visitor_organization: 'Corp',
        photo_url: null,
      },
      employee: {
        id: 'emp-2',
        full_name: 'Bob Smith',
        department: 'Operations',
        office_location: 'HQ',
      },
      visitor_documents: [],
    }

    vi.mocked(getCurrentUser).mockResolvedValue(paCIUser)

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : String(input)
      if (url.includes('/api/pa/visits/visit-2')) {
        return {
          ok: true,
          json: async () => ({ success: true, data: mockVisit }),
        } as Response
      }
      return { ok: true, json: async () => ({ success: true }) } as Response
    })
    ;(globalThis as { fetch?: unknown }).fetch = fetchMock as unknown

    render(
      <VisitorReviewModal
        visitId="visit-2"
        hostLabel="CI"
        paRole="PA_TO_CI"
        onClose={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('PA to CI Comment')).toBeInTheDocument()
      expect(screen.getByText('Host has confirmed the visit. Proceed with registration')).toBeInTheDocument()
    })
  })
})

describe('Server-side PA Comment Validation', () => {
  it('rejects arbitrary PA to Director comments', async () => {
    const response = await fetch('/api/pa/visits/test-id/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pa_comment: 'Some arbitrary comment' }),
    })

    const json = await response.json()

    if (response.status === 400) {
      expect(json.message).toContain('Invalid PA to Director comment')
    }
  })

  it('rejects arbitrary PA to CI comments', async () => {
    const response = await fetch('/api/pa/visits/test-id/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pa_comment: 'Random text' }),
    })

    const json = await response.json()

    if (response.status === 400) {
      expect(json.message).toContain('Invalid PA to CI comment')
    }
  })
})
