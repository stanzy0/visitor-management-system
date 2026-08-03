import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { verifyBadgeQR } from '@/lib/qrcode-verification'

describe('verifyBadgeQR', () => {
  const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL
  const originalNodeEnv = process.env.NODE_ENV

  beforeEach(() => {
    vi.restoreAllMocks()
    process.env.NEXT_PUBLIC_APP_URL = 'https://visitor-management-system-alpha-neon.vercel.app'
    ;(process.env as unknown as Record<string, string>).NODE_ENV = 'test'
  })

  afterEach(() => {
    ;(process.env as unknown as Record<string, string>).NODE_ENV = originalNodeEnv
    process.env.NEXT_PUBLIC_APP_URL = originalAppUrl
  })

  it('should verify QR URL format for valid token', async () => {
    const qrToken = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2'
    const result = await verifyBadgeQR('badge-123', qrToken)
    expect(result.valid).toBe(true)
    expect(result.error).toBeNull()
  })

  it('should fail for empty token', async () => {
    const result = await verifyBadgeQR('badge-123', '')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('QR token is required')
  })

  it('should fail when NEXT_PUBLIC_APP_URL is not configured', async () => {
    delete process.env.NEXT_PUBLIC_APP_URL
    const result = await verifyBadgeQR('badge-123', 'token123')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('NEXT_PUBLIC_APP_URL is not configured')
  })

  it('should handle tokens with special characters', async () => {
    const qrToken = 'test-token-with-special-chars'
    const result = await verifyBadgeQR('badge-456', qrToken)
    expect(result.valid).toBe(true)
  })
})
