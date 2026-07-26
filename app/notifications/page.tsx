import { Suspense } from 'react'
import NotificationsClient from './NotificationsClient'

export default function NotificationsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>}>
      <NotificationsClient />
    </Suspense>
  )
}
