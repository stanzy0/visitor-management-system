import { ButtonHTMLAttributes } from 'react'

interface KioskButtonProps extends ButtonHTMLAttributes<HTMLButtonElement | HTMLAnchorElement> {
  icon: React.ReactNode
  label: string
  href?: string
  color?: 'blue' | 'green' | 'purple' | 'amber' | 'gray'
}

const colorClasses = {
  blue: 'bg-blue-600 hover:bg-blue-700',
  green: 'bg-green-600 hover:bg-green-700',
  purple: 'bg-purple-600 hover:bg-purple-700',
  amber: 'bg-amber-600 hover:bg-amber-700',
  gray: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
}

export function KioskButton({ icon, label, href, color = 'blue', ...props }: KioskButtonProps) {
  const className = `rounded-2xl p-6 flex flex-col items-center justify-center transition-colors min-h-[120px] ${colorClasses[color]} text-white`

  if (href) {
    return (
      <a href={href} className={className} {...(props as any)}>
        <div className="h-12 w-12 mb-3">{icon}</div>
        <span className="text-lg font-semibold">{label}</span>
      </a>
    )
  }

  return (
    <button className={className} {...(props as any)}>
      <div className="h-12 w-12 mb-3">{icon}</div>
      <span className="text-lg font-semibold">{label}</span>
    </button>
  )
}