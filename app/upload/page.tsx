'use client'

import { Upload } from 'lucide-react'
import { UploadForm } from '@/components/upload/upload-form'
import { useAuth } from '@/components/auth/auth-context'

export default function UploadPage() {
  const { user, loading } = useAuth()

  if (loading) {
    return null
  }

  if (user?.role === 'viewer') {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
            <Upload className="w-7 h-7 text-red-500" />
          </div>

          <h1 className="text-2xl font-bold text-foreground">
            권한이 없습니다.
          </h1>

          <p className="mt-2 text-muted-foreground">
            문서 등록은 편집자 및 관리자만 사용할 수 있습니다.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-green-50 dark:bg-green-950/30 rounded-xl flex items-center justify-center">
            <Upload className="w-5 h-5 text-green-600" />
          </div>

          <div>
            <h1 className="text-xl font-bold text-foreground">
              문서 등록
            </h1>

            <p className="text-sm text-muted-foreground">
              PDF 문서를 등록합니다.
            </p>
          </div>
        </div>
      </div>

      <UploadForm />
    </div>
  )
}