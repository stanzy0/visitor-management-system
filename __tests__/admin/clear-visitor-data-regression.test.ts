import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSupabase = {
  from: vi.fn(),
  auth: {
    getUser: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } }
    })),
  },
  storage: {
    from: vi.fn(() => ({
      upload: vi.fn().mockResolvedValue({ error: null }),
      list: vi.fn().mockResolvedValue([]),
      remove: vi.fn().mockResolvedValue({ error: null }),
    })),
  },
  channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() })),
  removeChannel: vi.fn(),
}

vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabase,
}))

vi.mock('@/lib/auth-client', () => ({
  getCurrentUser: vi.fn(),
}))

vi.mock('@/lib/client/api', () => ({
  getAuthHeaders: vi.fn().mockResolvedValue(new Headers({ authorization: 'Bearer test' })),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => ({ get: vi.fn() }),
}))

vi.stubGlobal('fetch', vi.fn())

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Regression: Visitor registration unaffected', () => {
  it('visitor DELETE endpoint exists', async () => {
    const { DELETE } = await import('@/app/api/visitors/[id]/route')
    expect(typeof DELETE).toBe('function')
  })
})

describe('Regression: PA to CI workflow unaffected', () => {
  it('PA visitors API route exists', async () => {
    const { GET } = await import('@/app/api/pa/visitors/route')
    expect(typeof GET).toBe('function')
  })

  it('PA visit approve endpoint exists', async () => {
    const { POST } = await import('@/app/api/pa/visits/[id]/approve/route')
    expect(typeof POST).toBe('function')
  })

  it('PA visit reject endpoint exists', async () => {
    const { POST } = await import('@/app/api/pa/visits/[id]/reject/route')
    expect(typeof POST).toBe('function')
  })
})

describe('Regression: Security checkpoint workflow unaffected', () => {
  it('badge validate endpoint exists', async () => {
    const { GET } = await import('@/app/api/badges/validate/route')
    expect(typeof GET).toBe('function')
  })

  it('security exit endpoint exists', async () => {
    const { POST } = await import('@/app/api/security/exit/route')
    expect(typeof POST).toBe('function')
  })

  it('badge verify endpoint exists', async () => {
    const { GET } = await import('@/app/api/badges/verify/[qr_token]/route')
    expect(typeof GET).toBe('function')
  })
})

describe('Regression: Notifications unaffected', () => {
  it('notifications API route exists', async () => {
    const { GET } = await import('@/app/api/notifications/route')
    expect(typeof GET).toBe('function')
  })

  it('notifications endpoint returns data structure', async () => {
    mockSupabase.from = vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then: vi.fn(function (this: any, resolve: (v: { data: unknown[]; error: null }) => void) {
        return resolve({ data: [], error: null })
      }),
    }))

    const { GET } = await import('@/app/api/notifications/route')
    const req = new Request('http://localhost/api/notifications', { method: 'GET' })
    const res = await GET(req as any)
    const json = await res.json()

    expect(json).toHaveProperty('success')
  })
})

describe('Regression: Lookups endpoint unaffected', () => {
  it('employees lookups endpoint exists', async () => {
    const { GET } = await import('@/app/api/employees/lookups/route')
    expect(typeof GET).toBe('function')
  })

  it('lookups returns expected data structure', async () => {
    const mockFrom = (table: string) => {
      if (table === 'office_locations') {
        return {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          then: vi.fn(function (this: any, resolve: (v: { data: unknown[]; error: null }) => void) {
            return resolve({
              data: [{ id: 'loc-1', building: 'Main', office_name: 'HQ', department: 'IT', display_name: 'HQ IT' }],
              error: null,
            })
          }),
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: vi.fn(function (this: any, resolve: (v: { data: unknown[]; error: null }) => void) {
          return resolve({ data: [], error: null })
        }),
      }
    }
    mockSupabase.from = mockFrom as any

    const { GET } = await import('@/app/api/employees/lookups/route')
    const res = await GET()
    const json = await res.json()

    expect(json).toHaveProperty('departments')
    expect(json).toHaveProperty('positions')
    expect(json).toHaveProperty('office_locations')
  })

  it('office_locations still includes the Head Quarter entry', async () => {
    const mockFrom = (table: string) => {
      if (table === 'office_locations') {
        return {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          then: vi.fn(function (this: any, resolve: (v: { data: unknown[]; error: null }) => void) {
            return resolve({
              data: [{ id: 'loc-1', building: 'Main', office_name: 'HQ', department: 'IT', display_name: 'HQ IT' }],
              error: null,
            })
          }),
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: vi.fn(function (this: any, resolve: (v: { data: unknown[]; error: null }) => void) {
          return resolve({ data: [], error: null })
        }),
      }
    }
    mockSupabase.from = mockFrom as any

    const { GET } = await import('@/app/api/employees/lookups/route')
    const res = await GET()
    const json = await res.json()

    const hqEntry = json.office_locations.find(
      (loc: { display_name: string; name?: string }) =>
        loc.display_name?.includes('Head Quarter') || loc.name === 'Head Quarter'
    )
    expect(hqEntry).toBeDefined()
  })
})
