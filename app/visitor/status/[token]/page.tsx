import { Suspense } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import VisitorStatusCard from '@/components/VisitorStatusCard'

interface PageProps {
  params: Promise<{ token: string }>
}

export default async function VisitorStatusPage({ params }: PageProps) {
  const { token } = await params

  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/invitations/${token}`, {
    cache: 'no-store',
  })

  if (!res.ok) {
    const error = await res.json()
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-xl border border-gray-200 bg-white shadow-sm p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Invalid Invitation</h1>
          <p className="text-gray-600 mb-6">{error.error || 'This invitation link is invalid or has expired.'}</p>
          <Link href="/" className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Go to Home
          </Link>
        </div>
      </div>
    )
  }

  const { data: invitation } = await res.json()

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 lg:px-6">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Visitor Registration Status</h1>
          <p className="text-gray-600 mt-2">Track your invitation and registration status</p>
        </div>

        <Suspense fallback={<div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>}>
          <VisitorStatusCard invitation={invitation} />
        </Suspense>
      </div>
    </div>
  )
}
