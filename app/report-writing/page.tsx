'use client'

import { FileCheck } from 'lucide-react'
import { useAuth } from '@/components/auth/auth-context'

export default function ReportWritingPage() {
  const { user, loading } = useAuth()

  if (loading) return null

  if (user?.role === 'viewer') {
    return (
      <div className="flex h-[70vh] items-center justify-center p-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-950/30">
            <FileCheck className="size-7 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">권한이 없습니다.</h1>
          <p className="mt-2 text-muted-foreground">성적서 작성은 편집자 및 관리자만 사용할 수 있습니다.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/30">
          <FileCheck className="size-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">성적서 작성</h1>
          <p className="text-sm text-muted-foreground">성적서를 작성하고 관리합니다.</p>
        </div>
      </div>

      <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
        <FileCheck className="mx-auto size-10 text-muted-foreground/50" />
        <p className="mt-4 text-sm text-muted-foreground">성적서 작성 기능을 준비 중입니다.</p>
      </div>
    </div>
  )
}
