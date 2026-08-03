import { requireRole } from '@/lib/auth-helpers'
import { getBadge } from '@/lib/badge/badge-service'
import PrintableBadge from '@/components/badges/PrintableBadge'

export const dynamic = 'force-dynamic'

export default async function PrintBadgeRoute({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const authResult = await requireRole(['Admin', 'Receptionist'])
  if (!authResult.authorized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-red-600">Unauthorized</div>
      </div>
    )
  }

  const { id } = await params

  const badge = await getBadge(id)

  if (!badge) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-red-600">Badge not found</div>
      </div>
    )
  }

  return <PrintableBadge badge={badge} />
}
