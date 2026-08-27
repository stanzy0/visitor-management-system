import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockRequireAdmin = vi.fn()
const mockLogAuditAction = vi.fn()

const mockSupabaseAdmin: any = {
  from: vi.fn(),
  storage: {
    from: vi.fn(),
  },
}

vi.mock('@/lib/auth-helpers', () => ({
  requireAdmin: mockRequireAdmin,
}))

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: mockSupabaseAdmin,
}))

vi.mock('@/lib/server/audit', () => ({
  logAuditAction: mockLogAuditAction,
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {},
}))

beforeEach(() => {
  vi.clearAllMocks()
})

function makeChainedQuery(data: unknown[], error: Error | null = null) {
  const promise = Promise.resolve({ data, error })
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error }),
    single: vi.fn().mockResolvedValue({ data, error }),
    then: vi.fn((resolve: (v: unknown) => unknown) => {
      return promise.then(resolve)
    }),
  }
  return chain
}

function makeTableMock(table: string, result: { data: unknown; error: Error | null; count?: number }) {
  const chain = makeChainedQuery(result.data, result.error)

  // Override select to handle both count mode and regular mode
  chain.select = vi.fn().mockImplementation((cols: string, opts?: { count?: string; head?: boolean }) => {
    if (opts && opts.count) {
      // Count query: returns a thenable that resolves with { count, error }
      return {
        then: vi.fn((resolve: (v: unknown) => unknown) => {
          return Promise.resolve(resolve({ count: result.count ?? 0, error: result.error })).then(() => undefined)
        }),
      }
    }
    // Regular select: return the chainable
    return chain
  })

  // Override delete to support both neq() and in()
  chain.delete = vi.fn().mockImplementation(() => {
    return {
      neq: vi.fn().mockImplementation(() => ({
        then: vi.fn((resolve: (v: unknown) => unknown) => {
          return Promise.resolve(resolve({ count: result.count ?? 0, error: result.error }))
        }),
      })),
      in: vi.fn().mockImplementation(() => ({
        then: vi.fn((resolve: (v: unknown) => unknown) => {
          return Promise.resolve(resolve({ count: result.count ?? 0, error: result.error }))
        }),
      })),
    }
  })

  // Make the chain itself awaitable for direct select().or() patterns
  chain.then = vi.fn((resolve: (v: unknown) => unknown) => {
    return Promise.resolve(resolve({ data: result.data, error: result.error }))
  })

  return chain
}

function setupSupabaseMock(tableResults: Record<string, { data: unknown; error: Error | null; count?: number }>) {
  mockSupabaseAdmin.from.mockImplementation((table: string) => {
    if (tableResults[table]) {
      return makeTableMock(table, tableResults[table])
    }
    return makeTableMock(table, { data: [], error: null, count: 0 })
  })

  mockSupabaseAdmin.storage.from.mockImplementation((bucket: string) => {
    const storageKey = `storage_${bucket}`
    let listCallCount = 0
    const listResults: unknown[] = tableResults[storageKey] ? (tableResults[storageKey].data as unknown[]) : []

    return {
      list: vi.fn().mockImplementation(() => {
        listCallCount++
        if (listCallCount === 1 && listResults.length > 0) {
          return Promise.resolve(listResults)
        }
        return Promise.resolve([])
      }),
      remove: vi.fn().mockResolvedValue({ error: null }),
    }
  })
}

async function callRoute(authResult: { authorized: boolean; status?: number; error?: string; userEmail?: string }) {
  mockRequireAdmin.mockResolvedValue(authResult)
  const { POST } = await import('@/app/api/admin/clear-visitor-data/route')
  const req = new NextRequest('http://localhost/api/admin/clear-visitor-data', { method: 'POST' })
  return POST(req)
}

const ALL_VISITOR_TABLES = [
  'badge_scan_logs',
  'badge_history',
  'visitor_invitations',
  'visitor_badges',
  'property_history',
  'property_items',
  'document_verifications',
  'visitor_documents',
  'visitor_portal_tokens',
  'lifecycle_events',
  'incident_timeline',
  'incidents',
  'gate_activities',
  'security_decisions',
  'security_alerts',
  'roll_call_entries',
  'emergency_sessions',
  'vehicles',
  'vehicle_blacklist',
  'visitor_watchlist',
  'watchlist',
  'visits',
  'visitors',
]

function defaultTableResults() {
  const results: Record<string, { data: unknown; error: Error | null; count?: number }> = {}
  ALL_VISITOR_TABLES.forEach((t) => {
    results[t] = { data: [], error: null, count: 0 }
  })
  results['notifications'] = { data: [], error: null }
  results['email_logs'] = { data: [], error: null }
  results['storage_visitor-documents'] = { data: [], error: null }
  results['storage_visitor-photos'] = { data: [], error: null }
  return results
}

describe('POST /api/admin/clear-visitor-data - Authorization', () => {
  it('returns 401 when requireAdmin fails with unauthorized', async () => {
    const res = await callRoute({ authorized: false, error: 'Unauthorized', status: 401 })
    const json = await res.json()

    expect(res.status).toBe(401)
    expect(json).toEqual({ success: false, message: 'Unauthorized', error: 'Unauthorized' })
  })

  it('returns 403 when user is not an admin', async () => {
    const res = await callRoute({ authorized: false, error: 'Access denied', status: 403 })
    const json = await res.json()

    expect(res.status).toBe(403)
    expect(json).toEqual({ success: false, message: 'Access denied', error: 'Access denied' })
  })

  it('returns 500 when supabaseAdmin is not configured', async () => {
    const res = await callRoute({ authorized: false, error: 'Service role key not configured', status: 500 })
    const json = await res.json()

    expect(res.status).toBe(500)
    expect(json).toEqual({ success: false, message: 'Service role key not configured', error: 'Service role key not configured' })
  })
})

describe('POST /api/admin/clear-visitor-data - Visitor Data Cleanup', () => {
  beforeEach(() => {
    mockRequireAdmin.mockResolvedValue({ authorized: true, userEmail: 'admin@test.com' })
  })

  it('returns 200 and success on successful clear', async () => {
    setupSupabaseMock(defaultTableResults())
    const res = await callRoute({ authorized: true })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
  })

  it('deletes all visitor-activity tables including visitors, visits, and visitor_badges', async () => {
    setupSupabaseMock(defaultTableResults())
    await callRoute({ authorized: true })

    const allCalledTables = mockSupabaseAdmin.from.mock.calls.map((c: unknown[]) => c[0])

    for (const table of ALL_VISITOR_TABLES) {
      expect(allCalledTables).toContain(table)
    }
  })

  it('deletes visitor_invitations, document_verifications, visitor_documents, and visitor_portal_tokens', async () => {
    setupSupabaseMock(defaultTableResults())
    await callRoute({ authorized: true })

    const allCalledTables = mockSupabaseAdmin.from.mock.calls.map((c: unknown[]) => c[0])
    expect(allCalledTables).toContain('visitor_invitations')
    expect(allCalledTables).toContain('document_verifications')
    expect(allCalledTables).toContain('visitor_documents')
    expect(allCalledTables).toContain('visitor_portal_tokens')
  })

  it('deletes incidents, incident_timeline, and lifecycle_events', async () => {
    setupSupabaseMock(defaultTableResults())
    await callRoute({ authorized: true })

    const allCalledTables = mockSupabaseAdmin.from.mock.calls.map((c: unknown[]) => c[0])
    expect(allCalledTables).toContain('incidents')
    expect(allCalledTables).toContain('incident_timeline')
    expect(allCalledTables).toContain('lifecycle_events')
  })

  it('deletes security_alerts, security_decisions, gate_activities', async () => {
    setupSupabaseMock(defaultTableResults())
    await callRoute({ authorized: true })

    const allCalledTables = mockSupabaseAdmin.from.mock.calls.map((c: unknown[]) => c[0])
    expect(allCalledTables).toContain('security_alerts')
    expect(allCalledTables).toContain('security_decisions')
    expect(allCalledTables).toContain('gate_activities')
  })

  it('deletes property_items, property_history, vehicles, vehicle_blacklist', async () => {
    setupSupabaseMock(defaultTableResults())
    await callRoute({ authorized: true })

    const allCalledTables = mockSupabaseAdmin.from.mock.calls.map((c: unknown[]) => c[0])
    expect(allCalledTables).toContain('property_items')
    expect(allCalledTables).toContain('property_history')
    expect(allCalledTables).toContain('vehicles')
    expect(allCalledTables).toContain('vehicle_blacklist')
  })

  it('deletes visitor_watchlist and watchlist entries', async () => {
    setupSupabaseMock(defaultTableResults())
    await callRoute({ authorized: true })

    const allCalledTables = mockSupabaseAdmin.from.mock.calls.map((c: unknown[]) => c[0])
    expect(allCalledTables).toContain('visitor_watchlist')
    expect(allCalledTables).toContain('watchlist')
  })

  it('deletes roll_call_entries and emergency_sessions', async () => {
    setupSupabaseMock(defaultTableResults())
    await callRoute({ authorized: true })

    const allCalledTables = mockSupabaseAdmin.from.mock.calls.map((c: unknown[]) => c[0])
    expect(allCalledTables).toContain('roll_call_entries')
    expect(allCalledTables).toContain('emergency_sessions')
  })

  it('deletes badge_scan_logs and badge_history', async () => {
    setupSupabaseMock(defaultTableResults())
    await callRoute({ authorized: true })

    const allCalledTables = mockSupabaseAdmin.from.mock.calls.map((c: unknown[]) => c[0])
    expect(allCalledTables).toContain('badge_scan_logs')
    expect(allCalledTables).toContain('badge_history')
  })

  it('clears storage files from visitor-documents and visitor-photos buckets', async () => {
    const results = defaultTableResults()
    results['storage_visitor-documents'] = { data: [{ name: 'file1.pdf' }], error: null }
    results['storage_visitor-photos'] = { data: [{ name: 'photo1.jpg' }], error: null }
    setupSupabaseMock(results)
    await callRoute({ authorized: true })

    const bucketsUsed = mockSupabaseAdmin.storage.from.mock.calls.map((c: unknown[]) => c[0])
    expect(bucketsUsed).toContain('visitor-documents')
    expect(bucketsUsed).toContain('visitor-photos')
  })

  it('calls storage remove for files in visitor-documents bucket', async () => {
    setupSupabaseMock(defaultTableResults())
    const removeSpy = vi.fn().mockResolvedValue({ error: null })
    mockSupabaseAdmin.storage.from.mockImplementation((bucket: string) => ({
      list: vi.fn().mockResolvedValue({ data: [{ name: 'doc1.pdf' }, { name: 'doc2.pdf' }], error: null }),
      remove: removeSpy,
    }))

    await callRoute({ authorized: true })

    expect(removeSpy).toHaveBeenCalled()
    expect(removeSpy).toHaveBeenCalledWith(['doc1.pdf', 'doc2.pdf'])
  })

  it('deletes visitor-related notifications using OR filter', async () => {
    const results = defaultTableResults()
    results['notifications'] = { data: [{ id: 'notif-1' }, { id: 'notif-2' }], error: null }
    setupSupabaseMock(results)
    await callRoute({ authorized: true })

    const allCalledTables = mockSupabaseAdmin.from.mock.calls.map((c: unknown[]) => c[0])
    expect(allCalledTables).toContain('notifications')
  })

  it('deletes visitor-related email_logs using OR filter on related_type', async () => {
    const results = defaultTableResults()
    results['email_logs'] = { data: [{ id: 'email-1' }], error: null }
    setupSupabaseMock(results)
    await callRoute({ authorized: true })

    const allCalledTables = mockSupabaseAdmin.from.mock.calls.map((c: unknown[]) => c[0])
    expect(allCalledTables).toContain('email_logs')
  })

  it('logs an audit action with admin email and counts', async () => {
    const results = defaultTableResults()
    results['notifications'] = { data: [{ id: 'n1' }, { id: 'n2' }], error: null }
    results['email_logs'] = { data: [{ id: 'e1' }], error: null }
    results.visitors.count = 3
    results.visits.count = 5
    setupSupabaseMock(results)
    await callRoute({ authorized: true, userEmail: 'admin@example.com' })

    expect(mockLogAuditAction).toHaveBeenCalledWith(
      'All Visitor & Operational Data Cleared',
      'system',
      null,
      expect.stringContaining('admin@example.com')
    )
  })

  it('returns counts in response data', async () => {
    const results = defaultTableResults()
    results.visitors.count = 3
    results.visits.count = 5
    results.visitor_badges.count = 2
    setupSupabaseMock(results)
    const res = await callRoute({ authorized: true })
    const json = await res.json()

    expect(json.success).toBe(true)
    expect(json.data).toHaveProperty('cleared')
    expect(json.data.cleared).toHaveProperty('visitors')
    expect(json.data.cleared).toHaveProperty('visits')
  })

  it('handles empty database (no records to clear)', async () => {
    setupSupabaseMock(defaultTableResults())
    const res = await callRoute({ authorized: true })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
  })

  it('returns success with cleared counts in response', async () => {
    const results = defaultTableResults()
    results.visitors.count = 10
    results.visits.count = 25
    setupSupabaseMock(results)
    const res = await callRoute({ authorized: true })
    const json = await res.json()

    expect(json.data.cleared.visitors).toBeDefined()
    expect(json.data.cleared.visits).toBeDefined()
  })
})

describe('POST /api/admin/clear-visitor-data - Permanent Data Protection', () => {
  const PERMANENT_TABLES = [
    'employees',
    'departments',
    'office_locations',
    'users',
    'user_roles',
    'roles',
    'permissions',
    'role_permissions',
    'system_settings',
    'badge_templates',
    'badge_printers',
    'pa_ci_assignments',
    'pa_director_assignments',
  ]

  beforeEach(() => {
    mockRequireAdmin.mockResolvedValue({ authorized: true, userEmail: 'admin@test.com' })
    setupSupabaseMock(defaultTableResults())
  })

  it('does NOT call from() on any permanent data table', async () => {
    await callRoute({ authorized: true })

    const allCalledTables = mockSupabaseAdmin.from.mock.calls.map((c: unknown[]) => c[0])

    for (const table of PERMANENT_TABLES) {
      expect(allCalledTables).not.toContain(table)
    }
  })

  it('VISITOR_ACTIVITY_TABLES list matches the expected set', async () => {
    await callRoute({ authorized: true })
    const allCalledTables = mockSupabaseAdmin.from.mock.calls.map((c: unknown[]) => c[0])

    expect(allCalledTables).toContain('visitors')
    expect(allCalledTables).toContain('visits')
    expect(allCalledTables).toContain('visitor_badges')
    expect(allCalledTables).toContain('badge_scan_logs')
    expect(allCalledTables).toContain('badge_history')
    expect(allCalledTables).toContain('visitor_invitations')
    expect(allCalledTables).toContain('property_items')
    expect(allCalledTables).toContain('property_history')
    expect(allCalledTables).toContain('document_verifications')
    expect(allCalledTables).toContain('visitor_documents')
    expect(allCalledTables).toContain('visitor_portal_tokens')
    expect(allCalledTables).toContain('lifecycle_events')
    expect(allCalledTables).toContain('incident_timeline')
    expect(allCalledTables).toContain('incidents')
    expect(allCalledTables).toContain('gate_activities')
    expect(allCalledTables).toContain('security_decisions')
    expect(allCalledTables).toContain('security_alerts')
    expect(allCalledTables).toContain('roll_call_entries')
    expect(allCalledTables).toContain('emergency_sessions')
    expect(allCalledTables).toContain('vehicles')
    expect(allCalledTables).toContain('vehicle_blacklist')
    expect(allCalledTables).toContain('visitor_watchlist')
    expect(allCalledTables).toContain('watchlist')
  })
})

describe('POST /api/admin/clear-visitor-data - Error Handling', () => {
  beforeEach(() => {
    mockRequireAdmin.mockResolvedValue({ authorized: true, userEmail: 'admin@test.com' })
  })

  it('returns 500 when database operation fails', async () => {
    setupSupabaseMock(defaultTableResults())

    mockSupabaseAdmin.from = vi.fn((table: string) => {
      if (table === 'badge_scan_logs') {
        throw new Error('DB connection failed')
      }
      // Return a valid mock for other tables (should never reach them)
      return makeTableMock(table, { data: [], error: null, count: 0 })
    })

    const res = await callRoute({ authorized: true })
    const json = await res.json()

    expect(res.status).toBe(500)
    expect(json).toEqual({ success: false, message: 'Visitor data could not be cleared.', error: 'A database operation failed.' })
  })

  it('logs audit action after successful clear', async () => {
    setupSupabaseMock(defaultTableResults())
    await callRoute({ authorized: true, userEmail: 'admin@test.com' })

    expect(mockLogAuditAction).toHaveBeenCalled()
  })
})
