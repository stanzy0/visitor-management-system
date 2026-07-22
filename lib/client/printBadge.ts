export async function printBadgeWindow(badgeId: string): Promise<void> {
  if (!badgeId) {
    throw new Error('Badge ID is required for printing')
  }

  if (typeof window === 'undefined') {
    return
  }

  const width = 600
  const height = 380
  const left = (window.screen.width / 2) - (width / 2)
  const top = (window.screen.height / 2) - (height / 2)

  const printWindow = window.open(
    `/print-badge/${encodeURIComponent(badgeId)}`,
    'PrintBadge',
    `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=no`
  )

  if (!printWindow) {
    throw new Error('Popup blocked. Please allow popups for this site.')
  }
}
