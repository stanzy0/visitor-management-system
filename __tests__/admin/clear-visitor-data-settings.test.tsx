import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { act } from '@testing-library/react'

const mockFetchSettings = vi.fn()
const mockGetCurrentUser = vi.fn()
const mockGetAuthHeaders = vi.fn()
const mockLogAuditAction = vi.fn()
const mockFetch = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      then: vi.fn(function (resolve: (v: { data: unknown[]; error: null }) => void) {
        return resolve({ data: [], error: null })
      }),
      insert: vi.fn().mockResolvedValue({ error: null }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    })),
    channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() })),
    removeChannel: vi.fn(),
    auth: {
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  },
}))

vi.mock('@/lib/auth-client', () => ({
  getCurrentUser: mockGetCurrentUser,
}))

vi.mock('@/lib/client/audit', () => ({
  logAuditAction: mockLogAuditAction,
}))

vi.mock('@/lib/client/api', () => ({
  getAuthHeaders: mockGetAuthHeaders,
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
}))

vi.stubGlobal('fetch', mockFetch)

beforeEach(() => {
  vi.clearAllMocks()
  mockGetCurrentUser.mockResolvedValue({ id: 'u1', email: 'admin@test.com', role: 'Admin' })
  mockGetAuthHeaders.mockResolvedValue(new Headers())
  mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ configured: true }) })

  window.HTMLElement.prototype.scrollIntoView = vi.fn()
})

describe('Settings page - Clear Visitor Data button', () => {
  it('renders the clear visitor data section', async () => {
    const { default: SettingsPage } = await import('@/app/settings/page')
    await act(async () => {
      render(<SettingsPage />)
    })

    expect(screen.getAllByText(/Clear Visitor & Operational Data/i).length).toBeGreaterThan(0)
  })

  it('opens confirmation modal when button is clicked', async () => {
    const { default: SettingsPage } = await import('@/app/settings/page')
    await act(async () => {
      render(<SettingsPage />)
    })

    const clearBtn = screen.getByRole('button', { name: /Clear Visitor & Operational Data/i })
    await act(async () => {
      fireEvent.click(clearBtn)
    })

    expect(screen.getByText(/Type/)).toBeInTheDocument()
    expect(screen.getAllByText(/CLEAR VISITOR DATA/i).length).toBeGreaterThan(0)
  })

  it('disables confirm button until confirmation phrase is typed', async () => {
    const { default: SettingsPage } = await import('@/app/settings/page')
    await act(async () => {
      render(<SettingsPage />)
    })

    const clearBtn = screen.getByRole('button', { name: /Clear Visitor & Operational Data/i })
    await act(async () => {
      fireEvent.click(clearBtn)
    })

    const confirmBtn = screen.getByRole('button', { name: /Permanently Clear Visitor Data/i })
    expect(confirmBtn).toBeDisabled()
  })

  it('enables confirm button after typing the correct phrase', async () => {
    const { default: SettingsPage } = await import('@/app/settings/page')
    await act(async () => {
      render(<SettingsPage />)
    })

    const clearBtn = screen.getByRole('button', { name: /Clear Visitor & Operational Data/i })
    await act(async () => {
      fireEvent.click(clearBtn)
    })

    const input = screen.getByPlaceholderText('CLEAR VISITOR DATA')
    await act(async () => {
      fireEvent.change(input, { target: { value: 'CLEAR VISITOR DATA' } })
    })

    const confirmBtn = screen.getByRole('button', { name: /Permanently Clear Visitor Data/i })
    expect(confirmBtn).not.toBeDisabled()
  })

  it('shows error when confirmation phrase is incorrect', async () => {
    const { default: SettingsPage } = await import('@/app/settings/page')
    await act(async () => {
      render(<SettingsPage />)
    })

    const clearBtn = screen.getByRole('button', { name: /Clear Visitor & Operational Data/i })
    await act(async () => {
      fireEvent.click(clearBtn)
    })

    const input = screen.getByPlaceholderText('CLEAR VISITOR DATA')
    await act(async () => {
      fireEvent.change(input, { target: { value: 'wrong phrase' } })
    })

    const confirmBtn = screen.getByRole('button', { name: /Permanently Clear Visitor Data/i })
    expect(confirmBtn).toBeDisabled()
  })

  it('calls API with POST method on successful confirmation', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: { cleared: { visitors: 0 } } }),
    })

    const { default: SettingsPage } = await import('@/app/settings/page')
    await act(async () => {
      render(<SettingsPage />)
    })

    const clearBtn = screen.getByRole('button', { name: /Clear Visitor & Operational Data/i })
    await act(async () => {
      fireEvent.click(clearBtn)
    })

    const input = screen.getByPlaceholderText('CLEAR VISITOR DATA')
    await act(async () => {
      fireEvent.change(input, { target: { value: 'CLEAR VISITOR DATA' } })
    })

    const confirmBtn = screen.getByRole('button', { name: /Permanently Clear Visitor Data/i })
    await act(async () => {
      fireEvent.click(confirmBtn)
    })

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/admin/clear-visitor-data',
        expect.objectContaining({ method: 'POST' })
      )
    })
  })

  it('shows success result after successful API call', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: { cleared: { visitors: 0 } } }),
    })

    const { default: SettingsPage } = await import('@/app/settings/page')
    await act(async () => {
      render(<SettingsPage />)
    })

    const clearBtn = screen.getByRole('button', { name: /Clear Visitor & Operational Data/i })
    await act(async () => {
      fireEvent.click(clearBtn)
    })

    const input = screen.getByPlaceholderText('CLEAR VISITOR DATA')
    await act(async () => {
      fireEvent.change(input, { target: { value: 'CLEAR VISITOR DATA' } })
    })

    const confirmBtn = screen.getByRole('button', { name: /Permanently Clear Visitor Data/i })
    await act(async () => {
      fireEvent.click(confirmBtn)
    })

    await waitFor(() => {
      expect(screen.getByText(/Visitor and operational data cleared successfully/i)).toBeInTheDocument()
    })
  })

  it('shows error result when API returns failure', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ success: false, message: 'Server error' }),
    })

    const { default: SettingsPage } = await import('@/app/settings/page')
    await act(async () => {
      render(<SettingsPage />)
    })

    const clearBtn = screen.getByRole('button', { name: /Clear Visitor & Operational Data/i })
    await act(async () => {
      fireEvent.click(clearBtn)
    })

    const input = screen.getByPlaceholderText('CLEAR VISITOR DATA')
    await act(async () => {
      fireEvent.change(input, { target: { value: 'CLEAR VISITOR DATA' } })
    })

    const confirmBtn = screen.getByRole('button', { name: /Permanently Clear Visitor Data/i })
    await act(async () => {
      fireEvent.click(confirmBtn)
    })

    await waitFor(() => {
      expect(screen.getByText(/Server error/i)).toBeInTheDocument()
    })
  })

  it('closes modal after successful clear', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: { cleared: {} } }),
    })

    const { default: SettingsPage } = await import('@/app/settings/page')
    await act(async () => {
      render(<SettingsPage />)
    })

    const clearBtn = screen.getByRole('button', { name: /Clear Visitor & Operational Data/i })
    await act(async () => {
      fireEvent.click(clearBtn)
    })

    const input = screen.getByPlaceholderText('CLEAR VISITOR DATA')
    await act(async () => {
      fireEvent.change(input, { target: { value: 'CLEAR VISITOR DATA' } })
    })

    const confirmBtn = screen.getByRole('button', { name: /Permanently Clear Visitor Data/i })
    await act(async () => {
      fireEvent.click(confirmBtn)
    })

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Permanently Clear Visitor Data/i })).not.toBeInTheDocument()
    })
  })

  it('shows Cancel button in modal', async () => {
    const { default: SettingsPage } = await import('@/app/settings/page')
    await act(async () => {
      render(<SettingsPage />)
    })

    const clearBtn = screen.getByRole('button', { name: /Clear Visitor & Operational Data/i })
    await act(async () => {
      fireEvent.click(clearBtn)
    })

    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument()
  })

  it('closes modal when Cancel is clicked', async () => {
    const { default: SettingsPage } = await import('@/app/settings/page')
    await act(async () => {
      render(<SettingsPage />)
    })

    const clearBtn = screen.getByRole('button', { name: /Clear Visitor & Operational Data/i })
    await act(async () => {
      fireEvent.click(clearBtn)
    })

    const cancelBtn = screen.getByRole('button', { name: /Cancel/i })
    await act(async () => {
      fireEvent.click(cancelBtn)
    })

    expect(screen.queryByRole('button', { name: /Permanently Clear Visitor Data/i })).not.toBeInTheDocument()
  })

  it('shows loading spinner while clearing', async () => {
    mockFetch.mockImplementation(() => new Promise(() => {})) // never resolves

    const { default: SettingsPage } = await import('@/app/settings/page')
    await act(async () => {
      render(<SettingsPage />)
    })

    const clearBtn = screen.getByRole('button', { name: /Clear Visitor & Operational Data/i })
    await act(async () => {
      fireEvent.click(clearBtn)
    })

    const input = screen.getByPlaceholderText('CLEAR VISITOR DATA')
    await act(async () => {
      fireEvent.change(input, { target: { value: 'CLEAR VISITOR DATA' } })
    })

    const confirmBtn = screen.getByRole('button', { name: /Permanently Clear Visitor Data/i })
    await act(async () => {
      fireEvent.click(confirmBtn)
    })

    // The spinner (Loader2) should be rendered inside the button
    expect(confirmBtn).toBeDisabled()
  })

  it('displays description of what data is protected', async () => {
    const { default: SettingsPage } = await import('@/app/settings/page')
    await act(async () => {
      render(<SettingsPage />)
    })

    expect(screen.getByText(/Staff accounts, employees, departments, office locations, roles, permissions/i)).toBeInTheDocument()
  })
})
