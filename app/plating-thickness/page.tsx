'use client'

import { PlatingThicknessViewer } from '@/components/upload/plating-thickness-viewer'
import { Layers } from 'lucide-react'

export default function PlatingThicknessPage() {
  return (
    <div className="w-full h-full p-6 overflow-auto">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between pb-2 border-b border-border/50">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-2xs">
                <Layers className="w-5 h-5" />
              </div>  
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">도금두께 관리</h1>
                <p className="text-xs text-muted-foreground mt-0.5">등록된 도금두께 측정 데이터를 조회하고 효율적으로 관리합니다.</p>
              </div>
            </div>
          </div>
        </div>
        <PlatingThicknessViewer />
      </div>
    </div>
  )
}
