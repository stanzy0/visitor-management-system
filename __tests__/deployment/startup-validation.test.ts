import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { validateStartup, resetStartupValidation } from '@/lib/startup-validation'

describe('validateStartup', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    resetStartupValidation()
    process.env.NEXT_PUBLIC_APP_URL = 'https://visitor-management-system-alpha-neon.vercel.app'
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://phkmhrncmkvfgnraiyug.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
    ;(process.env as unknown as Record<string, string>).NODE_ENV = 'test'
  })

  afterEach(() => {
    Object.keys(process.env).forEach((key) => {
      if (!(key in originalEnv)) delete process.env[key]
    })
    Object.entries(originalEnv).forEach(([key, value]) => {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    })
    resetStartupValidation()
  })

  it('should pass validation when all env vars are present', () => {
    const result = validateStartup()
    expect(result.passed).toBe(true)
    expect(result.error).toBeNull()
  })

  it('should fail when NEXT_PUBLIC_APP_URL is missing', () => {
    delete process.env.NEXT_PUBLIC_APP_URL
    const result = validateStartup()
    expect(result.passed).toBe(false)
    expect(result.error).toContain('NEXT_PUBLIC_APP_URL')
  })

  it('should fail when NEXT_PUBLIC_SUPABASE_URL is missing', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    const result = validateStartup()
    expect(result.passed).toBe(false)
    expect(result.error).toContain('NEXT_PUBLIC_SUPABASE_URL')
  })

  it('should fail when NEXT_PUBLIC_SUPABASE_ANON_KEY is missing', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const result = validateStartup()
    expect(result.passed).toBe(false)
    expect(result.error).toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  })

  it('should fail when SUPABASE_SERVICE_ROLE_KEY is missing', () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    const result = validateStartup()
    expect(result.passed).toBe(false)
    expect(result.error).toContain('SUPABASE_SERVICE_ROLE_KEY')
  })

  it('should fail in production when NEXT_PUBLIC_APP_URL is localhost', () => {
    ;(process.env as unknown as Record<string, string>).NODE_ENV = 'production'
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
    const result = validateStartup()
    expect(result.passed).toBe(false)
    expect(result.error).toContain('localhost')
  })

  it('should fail in production when NEXT_PUBLIC_APP_URL is HTTP', () => {
    ;(process.env as unknown as Record<string, string>).NODE_ENV = 'production'
    process.env.NEXT_PUBLIC_APP_URL = 'http://visitor-management-system-alpha-neon.vercel.app'
    const result = validateStartup()
    expect(result.passed).toBe(false)
    expect(result.error).toContain('HTTPS')
  })

  it('should pass in production with HTTPS URL', () => {
    ;(process.env as unknown as Record<string, string>).NODE_ENV = 'production'
    process.env.NEXT_PUBLIC_APP_URL = 'https://visitor-management-system-alpha-neon.vercel.app'
    const result = validateStartup()
    expect(result.passed).toBe(true)
    expect(result.error).toBeNull()
  })
})
