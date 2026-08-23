'use client'

import VisitorRegistrationWizard from '@/components/wizard/VisitorRegistrationWizard'
import { getCurrentUser } from '@/lib/auth-client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ImageWithFallback from '@/components/ui/ImageWithFallback'

export default function NewVisitorPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [user, setUser] = useState<Awaited<ReturnType<typeof getCurrentUser>> | null>(null)

  useEffect(() => {
    getCurrentUser().then(u => {
      setUser(u)
      setChecking(false)
      if (!u) {
        router.replace('/login')
      }
    })
  }, [router])

  if (checking) {
    return (
      <div className="min-h-screen bg-[#0B0F08] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-[#0B0F08] py-8 px-4">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <ImageWithFallback
            src="/images/afcsc-logo.png"
            alt="Armed Forces Command and Staff College Logo"
            className="h-16 w-16 object-contain"
          />
          <h1 className="text-xl font-bold text-[#F5F5DC]">Visitor Registration</h1>
          <ImageWithFallback
            src="/images/army logo.png"
            alt="Army Logo"
            className="h-16 w-16 object-contain"
          />
        </div>
        <VisitorRegistrationWizard onComplete={() => router.push('/dashboard')} />
      </div>
    </div>
  )
}

