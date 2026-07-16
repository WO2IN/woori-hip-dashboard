'use client'

import { FileText, TrendingUp, Building2, Tag } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatsData {
  totalDocuments: number
  todayUploads: number
  companyCount: number
  documentTypeCount: number
}

interface StatsCardsProps {
  data: StatsData
}

const cards = [
  {
    key: 'totalDocuments' as const,
    label: '전체 문서',
    icon: FileText,
    suffix: '건',
    accent: 'blue',
    iconBg: 'bg-[oklch(0.52_0.19_258/0.12)] dark:bg-[oklch(0.62_0.18_258/0.15)]',
    iconColor: 'text-[oklch(0.52_0.19_258)] dark:text-[oklch(0.72_0.16_258)]',
    barColor: 'bg-[oklch(0.52_0.19_258)]',
    width: 'w-[72%]',
  },
  {
    key: 'todayUploads' as const,
    label: '오늘 등록',
    icon: TrendingUp,
    suffix: '건',
    accent: 'emerald',
    iconBg: 'bg-[oklch(0.55_0.17_162/0.12)] dark:bg-[oklch(0.62_0.17_162/0.15)]',
    iconColor: 'text-[oklch(0.45_0.17_162)] dark:text-[oklch(0.68_0.17_162)]',
    barColor: 'bg-[oklch(0.55_0.17_162)]',
    width: 'w-[38%]',
  },
  {
    key: 'companyCount' as const,
    label: '등록 업체',
    icon: Building2,
    suffix: '개',
    accent: 'violet',
    iconBg: 'bg-[oklch(0.55_0.18_288/0.12)] dark:bg-[oklch(0.62_0.18_288/0.15)]',
    iconColor: 'text-[oklch(0.45_0.18_288)] dark:text-[oklch(0.72_0.18_288)]',
    barColor: 'bg-[oklch(0.55_0.18_288)]',
    width: 'w-[55%]',
  },
  {
    key: 'documentTypeCount' as const,
    label: '문서 유형',
    icon: Tag,
    suffix: '종',
    accent: 'amber',
    iconBg: 'bg-[oklch(0.68_0.17_55/0.12)] dark:bg-[oklch(0.74_0.16_55/0.15)]',
    iconColor: 'text-[oklch(0.52_0.17_55)] dark:text-[oklch(0.78_0.15_55)]',
    barColor: 'bg-[oklch(0.68_0.17_55)]',
    width: 'w-[45%]',
  },
]

export function StatsCards({ data }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, i) => {
        const Icon = card.icon
        const value = data[card.key]
        return (
          <div
            key={card.key}
            className={cn(
              'relative bg-card border border-border rounded-2xl p-5 overflow-hidden',
              'shadow-[0_1px_3px_oklch(0_0_0/0.06),0_4px_12px_oklch(0_0_0/0.04)]',
              'dark:shadow-[0_1px_3px_oklch(0_0_0/0.3),0_4px_12px_oklch(0_0_0/0.2)]',
              'hover:shadow-[0_2px_8px_oklch(0_0_0/0.08),0_8px_24px_oklch(0_0_0/0.06)]',
              'dark:hover:shadow-[0_2px_8px_oklch(0_0_0/0.4),0_8px_24px_oklch(0_0_0/0.25)]',
              'hover:-translate-y-0.5 transition-all duration-200 animate-fade-in-up'
            )}
            style={{ animationDelay: `${i * 60}ms` }}
          >
            {/* Top row */}
            <div className="flex items-start justify-between mb-4">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', card.iconBg)}>
                <Icon className={cn('w-5 h-5', card.iconColor)} />
              </div>
              <span className="text-[11px] font-medium text-muted-foreground tracking-wide uppercase">
                {card.label}
              </span>
            </div>

            {/* Value */}
            <p className="text-3xl font-bold text-foreground tabular-nums leading-none mb-1">
              {value.toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground mb-4">{card.suffix}</p>

            {/* Progress bar */}
            <div className="h-1 w-full bg-border rounded-full overflow-hidden">
              <div className={cn('h-full rounded-full transition-all duration-700', card.barColor, card.width)} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
