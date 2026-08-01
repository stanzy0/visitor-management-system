import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { getPortalUrl, verifyPortalUrl, getBaseUrl, validateEnvVars } from '@/lib/utils/portal-url'

describe('getPortalUrl', () => {
  const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL
  const originalNodeEnv = process.env.NODE_ENV

  beforeEach(() => {
    vi.restoreAllMocks()
    process.env.NEXT_PUBLIC_APP_URL = 'https://visitor-management-system-alpha-neon.vercel.app'
    ;(process.env as any).NODE_ENV = 'test'
  })

  afterEach(() => {
    ;(process.env as any).NODE_ENV = originalNodeEnv
    process.env.NEXT_PUBLIC_APP_URL = originalAppUrl
  })

  it('should generate correct portal URL', () => {
    const token = 'a1b2c3d4e5f6'
    const url = getPortalUrl(token)
    expect(url).toBe(`https://visitor-management-system-alpha-neon.vercel.app/portal/${token}`)
  })

  it('should throw if qrToken is empty', () => {
    expect(() => getPortalUrl('')).toThrow('QR token is required')
  })

  it('should throw if NEXT_PUBLIC_APP_URL is not set', () => {
    delete process.env.NEXT_PUBLIC_APP_URL
    expect(() => getPortalUrl('token123')).toThrow('NEXT_PUBLIC_APP_URL is not configured')
  })

  it('should throw if NEXT_PUBLIC_APP_URL contains localhost in production', () => {
    ;(process.env as any).NODE_ENV = 'production'
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
    expect(() => getPortalUrl('token123')).toThrow('contains localhost in production')
  })

  it('should throw if NEXT_PUBLIC_APP_URL is not HTTPS in production', () => {
    ;(process.env as any).NODE_ENV = 'production'
    process.env.NEXT_PUBLIC_APP_URL = 'http://visitor-management-system-alpha-neon.vercel.app'
    expect(() => getPortalUrl('token123')).toThrow('must use HTTPS in production')
  })

  it('should allow localhost in development', () => {
    ;(process.env as any).NODE_ENV = 'development'
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
    const url = getPortalUrl('token123')
    expect(url).toBe('http://localhost:3000/portal/token123')
  })

  it('should URL-encode special characters in token', () => {
    const token = 'token%20with%20spaces'
    const url = getPortalUrl(token)
    expect(url).toContain(encodeURIComponent(token))
  })
})

describe('verifyPortalUrl', () => {
  const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL
  const originalNodeEnv = process.env.NODE_ENV

  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://visitor-management-system-alpha-neon.vercel.app'
    ;(process.env as any).NODE_ENV = 'test'
  })

  afterEach(() => {
    ;(process.env as any).NODE_ENV = originalNodeEnv
    process.env.NEXT_PUBLIC_APP_URL = originalAppUrl
  })

  it('should return true for valid URL matching token', () => {
    const token = 'a1b2c3d4e5f6'
    const url = getPortalUrl(token)
    expect(verifyPortalUrl(url, token)).toBe(true)
  })

  it('should return false for mismatched URL', () => {
    const url = 'https://wrong-domain.com/portal/token123'
    expect(verifyPortalUrl(url, 'token123')).toBe(false)
  })
})

describe('getBaseUrl', () => {
  const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL
  const originalNodeEnv = process.env.NODE_ENV

  beforeEach(() => {
    ;(process.env as any).NODE_ENV = 'test'
  })

  afterEach(() => {
    ;(process.env as any).NODE_ENV = originalNodeEnv
    process.env.NEXT_PUBLIC_APP_URL = originalAppUrl
  })

  it('should return the configured base URL', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://visitor-management-system-alpha-neon.vercel.app'
    expect(getBaseUrl()).toBe('https://visitor-management-system-alpha-neon.vercel.app')
  })

  it('should throw if NEXT_PUBLIC_APP_URL is not set', () => {
    delete process.env.NEXT_PUBLIC_APP_URL
    expect(() => getBaseUrl()).toThrow('NEXT_PUBLIC_APP_URL is not configured')
  })
})

describe('validateEnvVars', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.restoreAllMocks()
    process.env.NEXT_PUBLIC_APP_URL = 'https://visitor-management-system-alpha-neon.vercel.app'
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://phkmhrncmkvfgnraiyug.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
  })

  afterEach(() => {
    Object.keys(process.env).forEach((key) => {
      if (!(key in originalEnv)) delete process.env[key]
    })
    Object.entries(originalEnv).forEach(([key, value]) => {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    })
  })

  it('should return valid when all env vars are present', () => {
    const result = validateEnvVars()
    expect(result.valid).toBe(true)
    expect(result.missing).toHaveLength(0)
  })

  it('should return invalid with missing vars', () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    const result = validateEnvVars()
    expect(result.valid).toBe(false)
    expect(result.missing).toContain('SUPABASE_SERVICE_ROLE_KEY')
  })
})
