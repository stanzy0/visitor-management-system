import VisitorRegistrationWizard from '@/components/wizard/VisitorRegistrationWizard'
import { getCurrentUser } from '@/lib/auth-client'
import { redirect } from 'next/navigation'

export default async function NewVisitorPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <VisitorRegistrationWizard onComplete={() => {}} />
    </div>
  )
}
