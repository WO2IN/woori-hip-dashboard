'use client'

import Link from 'next/link'
import {
  ArrowRight,
  FolderOpen,
  Upload,
  Settings,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/components//auth/auth-context'

interface Props {
  href: string
  label: string
  description: string
  icon: 'folder' | 'upload' | 'settings'
  iconBg: string
  iconColor: string
  hoverBorder: string
}

const icons = {
  folder: FolderOpen,
  upload: Upload,
  settings: Settings,
} as const

export function QuickActionCard({
  href,
  label,
  description,
  icon,
  iconBg,
  iconColor,
  hoverBorder,
}: Props) {
  const { user } = useAuth()
  const Icon = icons[icon]

  const blocked =
    user?.role === 'viewer' &&
    (href === '/upload' || href === '/settings')

  return (
    <Link
      href={href}
      onClick={(e) => {
        if (!blocked) return

        e.preventDefault()
        toast.error('권한이 없습니다.')
      }}
      className={[
        'group bg-card border border-border rounded-2xl p-5 flex flex-col gap-3',
        'shadow-[0_1px_3px_oklch(0_0_0/0.05)] dark:shadow-[0_1px_3px_oklch(0_0_0/0.25)]',
        'hover:shadow-[0_4px_16px_oklch(0_0_0/0.08)] dark:hover:shadow-[0_4px_16px_oklch(0_0_0/0.35)]',
        'hover:-translate-y-0.5 transition-all duration-200',
        hoverBorder,
        'animate-fade-in-up',
      ].join(' ')}
    >
      <div
        className={`w-11 h-11 rounded-xl flex items-center justify-center ${iconBg}`}
      >
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>

      <div className="flex-1">
        <p className="font-semibold text-foreground text-sm mb-1">
          {label}
        </p>

        <p className="text-xs text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>

      <div className="flex items-center justify-end">
        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all duration-150" />
      </div>
    </Link>
  )
}