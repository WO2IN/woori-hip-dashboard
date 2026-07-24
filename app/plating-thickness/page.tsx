'use client'

import { PlatingThicknessViewer } from '@/components/upload/plating-thickness-viewer'

export default function PlatingThicknessPage() {
  return (
    <div className="w-full h-full p-6 overflow-auto">
      <div className="max-w-7xl mx-auto space-y-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">도금두께 관리</h1>
          <p className="text-sm text-muted-foreground mt-1">등록된 도금두께 측정 데이터를 조회하고 관리합니다.</p>
        </div>
        <PlatingThicknessViewer />
      </div>
    </div>
  )
}
