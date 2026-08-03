'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { ensureUserInDatabase } from '@/lib/auth-client'
import { logAuditAction } from '@/lib/client/audit'
import { Shield, BadgeCheck, UserCheck, Activity, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

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
          root.style.setProperty('--branding-primary', data.primary_color || '#0B3D91')
          root.style.setProperty('--branding-secondary', data.secondary_color || '#1F6FEB')
          root.style.setProperty('--branding-accent', data.accent_color || '#D4AF37')
          setBranding({
            logo_url: data.logo_url,
            login_background_url: data.login_background_url,
            primary_color: data.primary_color || '#0B3D91',
            secondary_color: data.secondary_color || '#1F6FEB',
            accent_color: data.accent_color || '#D4AF37',
            college_name: data.college_name || 'AFCSC Visitor Management',
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
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
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
      } else {
        window.location.href = '/dashboard'
      }
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const primaryColor = branding?.primary_color || '#0B3D91'
  const secondaryColor = branding?.secondary_color || '#1F6FEB'
  const accentColor = branding?.accent_color || '#D4AF37'
  const loginBg = branding?.login_background_url || '/images/afcsc-login.jpg'
  const logoSrc = branding?.logo_url || '/images/afcsc-logo.png'
  const collegeName = branding?.college_name || 'AFCSC Visitor Management'

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <div className="relative hidden md:block w-1/2 h-full group">
        <div
          className="absolute inset-0 z-10"
          style={{
            background: 'linear-gradient(180deg, rgba(0,0,0,0.20) 0%, rgba(0,0,0,0.45) 55%, rgba(0,0,0,0.75) 100%)',
          }}
        />
        <Image
          src={loginBg}
          alt={collegeName}
          fill
          priority
          className="object-cover transition-transform duration-[20s] ease-in-out group-hover:scale-105"
        />
        <div className="absolute bottom-8 left-8 z-20 max-w-md">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-2 drop-shadow-lg tracking-tight">
            Visitor Management System
          </h2>
          <p className="text-lg text-white/90 drop-shadow-md">
            {collegeName}
          </p>
          <p className="mt-4 text-sm text-white/80 leading-relaxed drop-shadow-md">
            Secure visitor registration, approval,
            badge issuance and access management.
          </p>

          <div className="mt-8 space-y-6">
            <div className="flex items-center gap-3 text-white/90 text-lg">
              <Shield className="w-5 h-5" style={{ color: accentColor }} />
              <span>Secure Visitor Registration</span>
            </div>
            <div className="flex items-center gap-3 text-white/90 text-lg">
              <BadgeCheck className="w-5 h-5" style={{ color: accentColor }} />
              <span>Badge Management</span>
            </div>
            <div className="flex items-center gap-3 text-white/90 text-lg">
              <UserCheck className="w-5 h-5" style={{ color: accentColor }} />
              <span>Real-Time Check-In</span>
            </div>
            <div className="flex items-center gap-3 text-white/90 text-lg">
              <Activity className="w-5 h-5" style={{ color: accentColor }} />
              <span>Professional Visitor Tracking</span>
            </div>
          </div>
        </div>
      </div>

      <div
        className="relative w-full md:w-1/2 h-full flex flex-col justify-center px-16 lg:px-24"
        style={{
          background: 'rgba(255,255,255,.75)',
          backdropFilter: 'blur(18px)',
          borderLeft: '1px solid rgba(255,255,255,.35)',
        }}
      >
        <Link
          href="/"
          aria-label="Back to Home"
          className="absolute top-6 left-6 z-50 flex items-center gap-2 h-11 px-4 rounded-xl bg-white border border-gray-300 text-gray-700 text-sm font-medium transition-colors duration-200 hover:bg-gray-50 hover:border-gray-400"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <div className="mx-auto w-full max-w-[460px]">
          <div className="text-center mb-12">
            <Image
              src={logoSrc}
              alt={collegeName}
              width={115}
              height={115}
              priority
              className="mx-auto object-contain mt-14"
            />
            <h1 className="text-4xl font-bold mt-2 mb-3" style={{ color: primaryColor }}>
              Welcome Back
            </h1>
            <p className="text-gray-600 text-lg">
              Sign in to the Visitor Management System
            </p>
          </div>

          <div className="h-px w-full bg-gray-300/40 my-8" />

          {error && (
            <div className="mb-8 rounded-xl bg-red-50 border border-red-100 p-4 text-sm text-red-700" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="w-full space-y-8">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-3">
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
                className="w-full h-14 rounded-xl border border-gray-300 bg-white px-4 text-black placeholder:text-gray-400 transition-all duration-200 hover:border-gray-400 focus:outline-none focus:ring-2 text-base"
                style={{
                  borderColor: undefined,
                  '--tw-ring-color': `${secondaryColor}33`,
                } as React.CSSProperties}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-3">
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
                  className="w-full h-14 rounded-xl border border-gray-300 bg-white px-4 pr-12 text-black placeholder:text-gray-400 transition-all duration-200 hover:border-gray-400 focus:outline-none focus:ring-2 text-base"
                  style={{
                    '--tw-ring-color': `${secondaryColor}33`,
                  } as React.CSSProperties}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors duration-200">
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
                <div className="flex items-center gap-3">
                  <input
                    id="rememberDevice"
                    type="checkbox"
                    checked={rememberDevice}
                    onChange={(e) => setRememberDevice(e.target.checked)}
                    className="h-5 w-5 rounded border-gray-300 focus:ring-2 transition-colors duration-200"
                    style={{ color: primaryColor, accentColor: primaryColor }}
                    aria-label="Remember this device"
                  />
                  <label htmlFor="rememberDevice" className="text-sm text-gray-700">
                    Remember Me
                  </label>
                </div>
                <a
                  href="/forgot-password"
                  className="text-sm hover:underline transition-colors duration-200"
                  style={{ color: primaryColor }}
                  aria-label="Forgot password"
                >
                  Forgot Password?
                </a>
              </div>
            </div>

            <div className="mt-8">
              <button
                type="submit"
                disabled={loading}
                aria-label="Sign in"
                className="group flex w-full justify-center items-center gap-2 h-14 rounded-xl px-4 text-sm font-medium text-white transition-all duration-200 hover:brightness-105 hover:translate-y-[-2px] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
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

          <div className="my-8 flex items-center">
            <div className="flex-1 border-t border-gray-300"></div>
            <span className="px-4 text-xs text-gray-500">Or</span>
            <div className="flex-1 border-t border-gray-300"></div>
          </div>

          <div className="text-center text-sm text-gray-600">
            <p>Need help?</p>
            <a
              href="mailto:it-support@afcsc.edu.ng"
              className="hover:underline transition-colors duration-200"
              style={{ color: primaryColor }}
              aria-label="Contact system administrator"
            >
              Contact the System Administrator
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
