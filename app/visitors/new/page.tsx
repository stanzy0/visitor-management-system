'use client'

import VisitorRegistrationWizard from '@/components/wizard/VisitorRegistrationWizard'
import { getCurrentUser } from '@/lib/auth-client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <VisitorRegistrationWizard onComplete={() => router.push('/dashboard')} />
    </div>
  )
}
