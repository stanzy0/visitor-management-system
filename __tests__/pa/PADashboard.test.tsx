import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'
import PADashboard from '@/components/pa/PADashboard'
import { getCurrentUser } from '@/lib/auth-client'

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

vi.mock('@/lib/auth-client', () => ({
  getCurrentUser: vi.fn(),
  getCurrentUserRole: vi.fn(),
  hasPermission: vi.fn(),
  requireRole: vi.fn(),
  ensureUserInDatabase: vi.fn(),
}))

vi.mock('@/lib/supabase', () => {
  const subscribe = vi.fn()
  const on = vi.fn(() => ({ subscribe }))
  const channel = { on, subscribe }
  const mockQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockResolvedValue({ count: 0, error: null }),
  }
  return {
    supabase: {
      channel: vi.fn(() => channel),
      removeChannel: vi.fn(),
      auth: { signOut: vi.fn().mockResolvedValue({}) },
      from: vi.fn(() => mockQuery),
    },
  }
})

const paUser = {
  id: 'u1',
  email: 'pato.ci@test.com',
  full_name: 'PA User',
  role: 'PA_TO_CI' as const,
  created_at: null,
  must_change_password: false,
}

const hostEmployee = { id: 'h1', full_name: 'Stanley Joseph', position: 'Chief Instructor', department: 'Executive', office_location: 'HQ' }

const now = () => new Date(Date.now() - 1000 * 60 * 30).toISOString()

const makeVisit = (id: string, status: string, overrides: Record<string, unknown> = {}) => ({
  id,
  visitor_id: 'vis-' + id,
  employee_id: 'emp-' + id,
  purpose: 'Site visit',
  status,
  created_at: now(),
  check_in_time: status === 'checked_in' ? new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() : null,
  check_out_time: status === 'checked_out' ? new Date(Date.now() - 1000 * 60 * 60).toISOString() : null,
  rejection_reason: status === 'rejected' ? 'Not a good fit' : null,
  scheduled_date: null,
  arrival_time: null,
  office_location: 'Reception',
  registration_number: 'REG-' + id,
  visitor: { id: 'vis-' + id, full_name: 'Visitor ' + id, photo_url: null, phone: '000-0000', email: 'v@test.com', visitor_organization: 'Acme' },
  employee: { id: 'emp-' + id, full_name: 'Stanley Joseph', department: 'Executive', position: 'Chief Instructor', office_location: 'HQ' },
  ...overrides,
})

const dashboardPayload = {
  success: true,
  data: {
    visitsToday: [
      makeVisit('1', 'pending'),
      makeVisit('2', 'approved'),
      makeVisit('3', 'checked_in'),
      makeVisit('4', 'checked_out'),
      makeVisit('5', 'rejected'),
    ],
    pendingVisits: [makeVisit('1', 'pending')],
    approvedVisits: [makeVisit('2', 'approved')],
    checkedInVisits: [makeVisit('3', 'checked_in')],
    checkedOutVisits: [makeVisit('4', 'checked_out')],
    hostEmployee,
  },
}

describe('PADashboard (PA to CI) UI', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()

    vi.mocked(getCurrentUser).mockResolvedValue(paUser)

    fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : String(input)
      if (url.includes('/api/pa/dashboard')) return { ok: true, json: async () => dashboardPayload } as Response
      if (url.includes('/api/pa/visits/1/approve')) return { ok: true, json: async () => ({ success: true, message: 'Visitor approved' }) } as Response
      if (url.includes('/api/pa/visits/1/reject')) return { ok: true, json: async () => ({ success: true, message: 'Visitor rejected' }) } as Response
      if (url.includes('/api/visits/2/status')) return { ok: true, json: async () => ({ success: true, message: 'Visitor checked in' }) } as Response
      if (url.includes('/api/visits/3/status')) return { ok: true, json: async () => ({ success: true, message: 'Visitor checked out' }) } as Response
      if (url.includes('/api/pa/visits/1')) return { ok: true, json: async () => ({ success: true, data: makeVisit('1', 'pending') }) } as Response
      return { ok: true, json: async () => ({ success: true }) } as Response
    })
    ;(globalThis as { fetch?: unknown }).fetch = fetchMock as unknown
  })

  it('renders the Reception-style interface with all required elements', async () => {
    render(<PADashboard paRole="PA_TO_CI" title="PA to Chief Instructor" hostTitle="Assigned CI" />)

    await waitFor(() => expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument())

    // Header / branding / auth
    expect(screen.getByText('PA to Chief Instructor')).toBeInTheDocument()
    expect(screen.getByText(/Department of Land Warfare/)).toBeInTheDocument()
    expect(screen.getByText('PA TO CI')).toBeInTheDocument()
    expect(screen.getByText('Assigned CI')).toBeInTheDocument()
    expect(screen.getAllByText('Stanley Joseph').length).toBeGreaterThan(0)
    expect(screen.getAllByText('pato.ci@test.com').length).toBeGreaterThan(0)

    // KPI cards (all 5 present)
    expect(screen.getAllByText("Today's Visitors").length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText('Pending Approvals').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('Awaiting Check-In')).toBeInTheDocument()
    expect(screen.getAllByText('Currently Checked-In').length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText('Completed Visits').length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(3)

    // Visitors present across statuses (appear in both table and dedicated sections)
    ;['Visitor 1', 'Visitor 2', 'Visitor 3', 'Visitor 4', 'Visitor 5'].forEach((name) => {
      expect(screen.getAllByText(name).length).toBeGreaterThan(0)
    })

    // Status badges for today's visitors
    expect(screen.getAllByText('Pending').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Approved').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Checked In').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Checked Out').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Rejected').length).toBeGreaterThan(0)

    // Status-aware inline actions
    expect(screen.getAllByRole('button', { name: /^accept$/i }).length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByRole('button', { name: /^reject$/i }).length).toBeGreaterThanOrEqual(2)
    expect(screen.getByRole('button', { name: /^check in$/i })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /^check out$/i }).length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByRole('button', { name: /^review$/i }).length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByRole('button', { name: /view details/i }).length).toBeGreaterThanOrEqual(4)

    // Pending Approval area is visible with actionable buttons
    expect(screen.getAllByText('Pending Approvals').length).toBeGreaterThanOrEqual(2)
  })

  it('triggers Approve -> Check In -> Check Out workflow against the right endpoints', async () => {
    render(<PADashboard paRole="PA_TO_CI" title="PA to Chief Instructor" hostTitle="Assigned CI" />)
    await waitFor(() => expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument())

    // Approve a pending visitor
    fireEvent.click(screen.getAllByRole('button', { name: /^accept$/i })[0])
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/pa/visits/1/approve', expect.objectContaining({ method: 'POST' })))

    // Check In an approved visitor
    fireEvent.click(screen.getByRole('button', { name: /^check in$/i }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/visits/2/status?id=2', expect.objectContaining({ method: 'POST' })))

    // Check Out a checked-in visitor (appears in table and "Currently Checked-In" list)
    fireEvent.click(screen.getAllByRole('button', { name: /^check out$/i })[0])
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/visits/3/status?id=3', expect.objectContaining({ method: 'POST' })))

    // Reject a pending visitor
    fireEvent.click(screen.getAllByRole('button', { name: /^reject$/i })[0])
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/pa/visits/1/reject', expect.objectContaining({ method: 'POST' })))
  })

  it('does not allow Check Out before Check In (approved row has Check In, not Check Out)', async () => {
    render(<PADashboard paRole="PA_TO_CI" title="PA to Chief Instructor" hostTitle="Assigned CI" />)
    await waitFor(() => expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument())

    // Approved visitor (Visitor 2) row: has Check In, must NOT have Check Out
    const approvedRow = screen.getByText('Visitor 2').closest('tr') as HTMLElement
    expect(within(approvedRow).queryByRole('button', { name: /^check in$/i })).not.toBeNull()
    expect(within(approvedRow).queryByRole('button', { name: /^check out$/i })).toBeNull()

    // Checked-out visitor (Visitor 4) row: has View Details, must NOT have Check Out
    const checkedOutRow = screen.getAllByText('Visitor 4')[0].closest('tr') as HTMLElement
    expect(within(checkedOutRow).queryByRole('button', { name: /view details/i })).not.toBeNull()
    expect(within(checkedOutRow).queryByRole('button', { name: /^check out$/i })).toBeNull()

    // Rejected visitor IS visible (not hidden from the dashboard)
    const rejectedRow = screen.getByText('Visitor 5').closest('tr') as HTMLElement
    expect(within(rejectedRow).queryByRole('button', { name: /view details/i })).not.toBeNull()
  })

  it('opens the Review/Details modal and shows full visitor details', async () => {
    render(<PADashboard paRole="PA_TO_CI" title="PA to Chief Instructor" hostTitle="Assigned CI" />)
    await waitFor(() => expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument())

    fireEvent.click(screen.getAllByRole('button', { name: /^review$/i })[0])
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/pa/visits/1'))
    await waitFor(() => expect(screen.getByText('Review Visitor — Assigned CI')).toBeInTheDocument())
  })

  it('renders the PA to Director variant with Director branding', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ ...paUser, role: 'PA_TO_DIRECTOR' as const })
    render(<PADashboard paRole="PA_TO_DIRECTOR" title="PA to Director of Studies" hostTitle="Assigned Director" />)
    await waitFor(() => expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument())

    expect(screen.getByText('PA to Director of Studies')).toBeInTheDocument()
    expect(screen.getByText('PA TO DIRECTOR')).toBeInTheDocument()
    expect(screen.getByText('Assigned Director')).toBeInTheDocument()
    expect(screen.getAllByText('Stanley Joseph').length).toBeGreaterThan(0)
  })
})
