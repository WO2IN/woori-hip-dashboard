'use client'

import { FileText, Upload, Building2, Tag, TrendingUp } from 'lucide-react'
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
    label: '전체 문서 수',
    icon: FileText,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    suffix: '건',
  },
  {
    key: 'todayUploads' as const,
    label: '오늘 등록',
    icon: TrendingUp,
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-50 dark:bg-green-950/30',
    suffix: '건',
  },
  {
    key: 'companyCount' as const,
    label: '업체 수',
    icon: Building2,
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-950/30',
    suffix: '개',
  },
  {
    key: 'documentTypeCount' as const,
    label: '문서유형 수',
    icon: Tag,
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-50 dark:bg-orange-950/30',
    suffix: '종',
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
            className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow animate-fade-in-up"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">{card.label}</p>
                <p className="text-3xl font-bold text-foreground tabular-nums">
                  {value.toLocaleString()}
                  <span className="text-base font-normal text-muted-foreground ml-1">{card.suffix}</span>
                </p>
              </div>
              <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', card.bg)}>
                <Icon className={cn('w-5 h-5', card.color)} />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
