'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ensureUserInDatabase } from '@/lib/auth-client'
import { logAuditAction } from '@/lib/client/audit'
import ImageWithFallback from '@/components/ui/ImageWithFallback'
import Link from 'next/link'
import { ShieldCheck, ArrowLeft } from 'lucide-react'

const MAX_FAILED_ATTEMPTS = 6

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [rememberDevice, setRememberDevice] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [branding, setBranding] = useState<{
    logo_url: string | null
    department_logo_url: string | null
    login_background_url: string | null
    primary_color: string
    secondary_color: string
    accent_color: string
    college_name: string
  } | null>(null)

  useEffect(() => {
    const checkRememberedDevice = async () => {
      try {
        const user = await createClient().auth.getUser()
        if (user.data.user) {
          window.location.href = '/dashboard'
        }
      } catch {
        // Network/auth unavailable — allow login page to render normally
      }
    }
    checkRememberedDevice()
  }, [])

  useEffect(() => {
    const fetchBranding = async () => {
      try {
        const res = await fetch('/api/branding')
        if (res.ok) {
          const { data } = await res.json()
          const root = document.documentElement
          root.style.setProperty('--branding-primary', data.primary_color || '#4B5320')
          root.style.setProperty('--branding-secondary', data.secondary_color || '#556B2F')
          root.style.setProperty('--branding-accent', data.accent_color || '#C8A646')
          setBranding({
            logo_url: data.logo_url,
            department_logo_url: data.department_logo_url,
            login_background_url: data.login_background_url,
            primary_color: data.primary_color || '#4B5320',
            secondary_color: data.secondary_color || '#556B2F',
            accent_color: data.accent_color || '#C8A646',
             college_name: data.college_name || 'Department of Land Warfare',
          })
        }
      } catch {
        // use defaults
      }
    }
    fetchBranding()
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const normalizedEmail = email.trim().toLowerCase()
      const loginPassword = password.trim()
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: loginPassword,
      })

      if (authError || !data.user) {
        setFailedAttempts(prev => prev + 1)
        if (failedAttempts + 1 >= MAX_FAILED_ATTEMPTS) {
          setError('Account locked due to too many failed attempts.')
        } else {
          setError(authError?.message || 'Invalid email or password')
        }
        await logAuditAction('Failed Login', 'auth', null, `Failed login attempt for ${email}`)
        return
      }

      await ensureUserInDatabase(data.user.id, data.user.email || '')

      if (rememberDevice) {
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        document.cookie = `remember_device=true; expires=${expiresAt.toUTCString()}; path=/; SameSite=Lax`
      }

      await logAuditAction('Login', 'auth', data.user.id, `User ${email} logged in`)

      if (data.user.user_metadata?.must_change_password) {
        window.location.href = '/change-password'
        return
      }

      const { data: userRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', data.user.id)
        .single()

      const role = userRole?.role
      if (role === 'PA_TO_CI') {
        window.location.href = '/pa-ci'
      } else if (role === 'PA_TO_DIRECTOR') {
        window.location.href = '/pa-director'
      } else if (role === 'Security') {
        window.location.href = '/security'
      } else if (role === 'Host Employee') {
        window.location.href = '/host'
      } else {
        window.location.href = '/dashboard'
      }
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const primaryColor = branding?.primary_color || '#4B5320'
  const secondaryColor = branding?.secondary_color || '#556B2F'
  const accentColor = branding?.accent_color || '#C8A646'
  const loginBg = branding?.login_background_url || '/images/afcsc-login.jpg'
  const collegeName = branding?.college_name || 'Department of Land Warfare'

  return (
    <div className="flex flex-col lg:flex-row h-screen w-screen overflow-hidden bg-[#0B0F08]">
      <div className="relative w-full lg:w-1/2 h-[40vh] lg:h-full flex-shrink-0 group">
        <div
          className="absolute inset-0 z-10"
          style={{
            background: 'linear-gradient(180deg, rgba(11,15,8,0.25) 0%, rgba(11,15,8,0.65) 55%, rgba(11,15,8,0.92) 100%)',
          }}
        />
        <img
          src={loginBg}
          alt={collegeName}
          className="absolute inset-0 object-cover transition-transform duration-[20s] ease-in-out group-hover:scale-105"
        />
        <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
          <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C8A646]/40 to-transparent animate-vms-scan-line" />
        </div>
        <div className="absolute bottom-8 left-8 z-20 max-w-md hidden lg:block">
          <div className="flex items-center gap-3 mb-2">
            <ImageWithFallback
              src={branding?.logo_url || '/images/afcsc-logo.png'}
              alt="Armed Forces Command and Staff College Logo"
              className="h-10 w-10 object-contain"
            />
            <ImageWithFallback
              src="/images/army logo.png"
              alt="Army Logo"
              className="h-10 w-10 object-contain"
            />
          </div>
          <h2 className="text-2xl font-bold text-white mb-1 drop-shadow-lg tracking-tight">
            Visitors Management System
          </h2>
          <p className="text-sm text-white/80 leading-relaxed drop-shadow-md">
            Secure Visitor Registration &amp; Access Management
          </p>
        </div>
      </div>

      <div
        className="relative w-full lg:w-1/2 flex-1 lg:h-full flex flex-col justify-start lg:justify-center px-6 lg:px-10 xl:px-12 overflow-y-auto bg-[#0B0F08]"
      >
        <Link
          href="/"
          aria-label="Back to Home"
          className="absolute top-6 left-6 z-50 flex items-center gap-2 h-10 px-4 rounded-xl border border-[rgba(85,107,47,0.5)] bg-[#10150D] text-[#9A9F87] text-sm font-medium transition-colors duration-200 hover:bg-[#4B5320]/10 hover:border-[#C8A646]/40 hover:text-[#F5F5DC]"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

          <div className="mx-auto w-full max-w-[420px]">
            <div className="text-center mb-6">
              <img
                src="/images/visit.png"
                alt="Visitor Management"
                className="mx-auto h-32 w-auto object-contain"
              />
              <p className="text-[#9A9F87] text-sm mt-4">
                Sign in to continue
              </p>
            </div>

          <div className="h-px w-full bg-[rgba(85,107,47,0.35)] my-4" />

          {error && (
            <div className="mb-4 rounded-xl border border-[#8B3A3A]/40 bg-[#8B3A3A]/10 p-4 text-sm text-[#F5F5DC]" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="w-full space-y-4 lg:space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#9A9F87] mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                aria-label="Email address"
                placeholder="Enter your email"
                className="w-full h-12 rounded-xl border border-[rgba(85,107,47,0.35)] bg-[#10150D] px-4 text-[#F5F5DC] placeholder:text-[#6B705A] transition-all duration-200 hover:border-[#C8A646]/40 focus:outline-none focus:ring-2 text-base"
                style={{
                  '--tw-ring-color': `${secondaryColor}33`,
                } as React.CSSProperties}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#9A9F87] mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  aria-label="Password"
                  placeholder="Enter your password"
                  className="w-full h-12 rounded-xl border border-[rgba(85,107,47,0.35)] bg-[#10150D] px-4 pr-12 text-[#F5F5DC] placeholder:text-[#6B705A] transition-all duration-200 hover:border-[#C8A646]/40 focus:outline-none focus:ring-2 text-base"
                  style={{
                    '--tw-ring-color': `${secondaryColor}33`,
                  } as React.CSSProperties}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9A9F87] hover:text-[#F5F5DC] transition-colors duration-200">
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.45 10.45 0 0 1 12 20c-3.35 0-6.37-1.3-8.7-3.56a17.2 17.2 0 0 1-2.59-2.46 1 1 0 0 1 0-1.28 17.2 17.2 0 0 1 2.59-2.46A10.45 10.45 0 0 1 12 4c1.5 0 2.9.4 4.06 1.07" />
                      <path d="M1 1l22 22" />
                      <path d="M9 9a3 3 0 1 0 4.24-.24" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input
                    id="rememberDevice"
                    type="checkbox"
                    checked={rememberDevice}
                    onChange={(e) => setRememberDevice(e.target.checked)}
                    className="h-5 w-5 rounded border-[rgba(85,107,47,0.35)] focus:ring-2 transition-colors duration-200 bg-[#10150D]"
                    style={{ color: primaryColor, accentColor: primaryColor }}
                    aria-label="Remember this device"
                  />
                  <label htmlFor="rememberDevice" className="text-sm text-[#9A9F87]">
                    Remember Me
                  </label>
                </div>
                <a
                  href="/forgot-password"
                  className="text-sm hover:underline transition-colors duration-200"
                  style={{ color: accentColor }}
                  aria-label="Forgot password"
                >
                  Forgot Password?
                </a>
              </div>
            </div>

            <div className="mt-6">
              <button
                type="submit"
                disabled={loading}
                aria-label="Sign in"
                className="group flex w-full justify-center items-center gap-2 h-12 rounded-xl px-4 text-sm font-medium text-[#0B0F08] transition-all duration-200 hover:brightness-110 hover:translate-y-[-2px] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                style={{
                  background: `linear-gradient(to bottom, ${secondaryColor}, ${primaryColor})`,
                  boxShadow: `0 10px 25px ${primaryColor}33`,
                }}
              >
                {loading ? (
                  <svg className="-ml-1 h-5 w-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                    <polyline points="10 17 15 12 10 7" />
                    <line x1="15" y1="12" x2="3" y2="12" />
                  </svg>
                )}
                {loading ? 'Signing In...' : 'Sign In'}
              </button>
            </div>
          </form>

          <div className="my-4 flex items-center">
            <div className="flex-1 border-t border-[rgba(85,107,47,0.35)]" />
            <span className="px-4 text-xs text-[#9A9F87]">Or</span>
            <div className="flex-1 border-t border-[rgba(85,107,47,0.35)]" />
          </div>

          <div className="text-center text-sm text-[#9A9F87]">
            <p>Need help?</p>
            <a
              href="mailto:it-support@afcsc.edu.ng"
              className="hover:underline transition-colors duration-200"
              style={{ color: accentColor }}
              aria-label="Contact system administrator"
            >
              Contact the System Administrator
            </a>
          </div>

          <div className="mt-4 flex items-center justify-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#C8A646]" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#9A9F87]">
              Secure Access Only
            </span>
            <span className="relative flex h-2 w-2">
              <span className="animate-vms-subtle-pulse absolute inline-flex h-full w-full rounded-full bg-[#4B5320] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#6B8E23]" />
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

