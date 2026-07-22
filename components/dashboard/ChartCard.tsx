'use client'

interface ChartCardProps {
  title: string
  subtitle?: string
  children: React.ReactNode
  onExport?: () => void
  exporting?: boolean
}

export default function ChartCard({ title, subtitle, children, onExport, exporting }: ChartCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        {onExport && (
          <button
            onClick={onExport}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Export
          </button>
        )}
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  )
}
