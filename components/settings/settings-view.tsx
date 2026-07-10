'use client'

import { useState } from 'react'
import { Building2, FileType, Layers, Tag, Package, ChevronRight } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ConfigManager } from './config-manager'
import { cn } from '@/lib/utils'

const settingsItems = [
  {
    key: 'companies',
    label: '업체 관리',
    description: '업체명 목록을 추가하거나 삭제합니다.',
    icon: Building2,
    color: 'text-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    configName: 'companies',
    placeholder: '새 업체명 입력',
  },
  {
    key: 'document-types',
    label: '문서유형 관리',
    description: '문서 유형(성적서, 도면 등) 목록을 관리합니다.',
    icon: FileType,
    color: 'text-purple-500',
    bg: 'bg-purple-50 dark:bg-purple-950/30',
    configName: 'document-types',
    placeholder: '새 문서유형 입력',
  },
  {
    key: 'materials',
    label: '재질 관리',
    description: '재질 목록을 추가하거나 삭제합니다.',
    icon: Layers,
    color: 'text-green-500',
    bg: 'bg-green-50 dark:bg-green-950/30',
    configName: 'materials',
    placeholder: '새 재질 입력 (예: SUS304)',
  },
  {
    key: 'specifications',
    label: '도금사양 관리',
    description: '도금사양 목록을 관리합니다.',
    icon: Tag,
    color: 'text-orange-500',
    bg: 'bg-orange-50 dark:bg-orange-950/30',
    configName: 'specifications',
    placeholder: '새 도금사양 입력 (예: 니켈도금)',
  },
  {
    key: 'products',
    label: '품목 관리',
    description: '품목 목록을 추가하거나 삭제합니다.',
    icon: Package,
    color: 'text-red-500',
    bg: 'bg-red-50 dark:bg-red-950/30',
    configName: 'products',
    placeholder: '새 품목 입력 (예: 볼트)',
  },
]

export function SettingsView() {
  const [activeDialog, setActiveDialog] = useState<string | null>(null)

  const active = settingsItems.find(s => s.key === activeDialog)

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">설정</h2>
        <p className="text-sm text-muted-foreground mt-1">
          시스템 기준 정보를 관리합니다.
        </p>
      </div>

      <div className="space-y-3">
        {settingsItems.map(item => {
          const Icon = item.icon
          return (
            <button
              key={item.key}
              onClick={() => setActiveDialog(item.key)}
              className="w-full bg-card border border-border rounded-xl p-5 flex items-center gap-4 text-left hover:border-primary/40 hover:shadow-md transition-all group animate-fade-in-up"
            >
              <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0', item.bg)}>
                <Icon className={cn('w-6 h-6', item.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground">{item.label}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{item.description}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
            </button>
          )
        })}
      </div>

      {/* Management Dialog */}
      <Dialog open={!!activeDialog} onOpenChange={v => !v && setActiveDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {active && (
                <>
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', active.bg)}>
                    <active.icon className={cn('w-4 h-4', active.color)} />
                  </div>
                  {active.label}
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          {active && (
            <ConfigManager
              configName={active.configName}
              label={active.label.replace(' 관리', '')}
              placeholder={active.placeholder}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
