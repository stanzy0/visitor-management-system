import PublicRegistrationWizard from '@/components/PublicRegistrationWizard'

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center">
                <span className="text-white font-bold text-lg">A</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">AFCSC Visitor Management</h1>
                <p className="text-xs text-gray-500">Public Registration Portal</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <a href="/register/status" className="text-sm font-medium text-blue-600 hover:text-blue-700">Check Status</a>
              <a href="/" className="text-sm font-medium text-gray-700 hover:text-gray-900">Home</a>
            </div>
          </div>
        </div>
      </header>
      <PublicRegistrationWizard />
    </div>
  )
}
